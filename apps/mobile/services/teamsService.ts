import { ClientError, gql } from 'graphql-request';
import { nhost } from './nhostClient';
import { requestGraphql } from './graphqlClient';

export interface TeamListItem {
  id: string;
  name: string;
  createdAt: string;
  memberCount: number | null;
  isCurrentUserMember: boolean;
}

export interface TeamsData {
  items: TeamListItem[];
  supportsMembershipDetails: boolean;
}

export type TeamMembershipState = 'member' | 'not_member' | 'pending';

export interface TeamMemberDetails {
  id: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  role: string;
  joinedAt: string;
  isCaptain: boolean;
  isCurrentUser: boolean;
}

export interface TeamStandingDetails {
  seasonId: string;
  seasonName: string;
  rank: number | null;
  points: number;
}

export interface TeamDetailsData {
  id: string;
  name: string;
  createdAt: string;
  descriptor: string;
  memberCount: number | null;
  membershipState: TeamMembershipState;
  viewerRole: string | null;
  isCurrentUserMember: boolean;
  supportsMembershipDetails: boolean;
  members: TeamMemberDetails[];
  standing: TeamStandingDetails | null;
}

const TEAMS_QUERY_PUBLIC = gql`
  query TeamsScreenPublic {
    teams(order_by: [{ created_at: asc }, { name: asc }]) {
      id
      name
      created_at
    }
  }
`;

const TEAMS_QUERY_AUTHENTICATED = gql`
  query TeamsScreenAuthenticated($userId: uuid!) {
    teams(order_by: [{ created_at: asc }, { name: asc }]) {
      id
      name
      created_at
    }
    team_members(order_by: [{ team_id: asc }, { joined_at: asc }]) {
      team_id
      user_id
    }
    viewer_memberships: team_members(where: { user_id: { _eq: $userId } }) {
      team_id
    }
  }
`;

const TEAM_DETAILS_QUERY_PUBLIC = gql`
  query TeamDetailsPublic($teamId: uuid!) {
    team: teams_by_pk(id: $teamId) {
      id
      name
      created_at
      created_by
    }
    seasons(where: { is_active: { _eq: true } }, order_by: { starts_at: desc }, limit: 1) {
      id
      name
      team_leaderboard(where: { team_id: { _eq: $teamId } }, limit: 1) {
        rank
        points
      }
    }
  }
`;

const TEAM_DETAILS_QUERY_AUTHENTICATED = gql`
  query TeamDetailsAuthenticated($teamId: uuid!, $userId: uuid!) {
    team: teams_by_pk(id: $teamId) {
      id
      name
      created_at
      created_by
    }
    team_members(where: { team_id: { _eq: $teamId } }, order_by: [{ joined_at: asc }], limit: 6) {
      user_id
      role
      joined_at
      profile {
        username
        display_name
        avatar_url
      }
    }
    team_members_aggregate(where: { team_id: { _eq: $teamId } }) {
      aggregate {
        count
      }
    }
    viewer_membership: team_members(where: { team_id: { _eq: $teamId }, user_id: { _eq: $userId } }, limit: 1) {
      user_id
      role
      joined_at
      profile {
        username
        display_name
        avatar_url
      }
    }
    seasons(where: { is_active: { _eq: true } }, order_by: { starts_at: desc }, limit: 1) {
      id
      name
      team_leaderboard(where: { team_id: { _eq: $teamId } }, limit: 1) {
        rank
        points
      }
    }
  }
`;

interface TeamsQueryPublic {
  teams: Array<{
    id: string;
    name: string;
    created_at: string;
  }>;
}

interface TeamsQueryAuthenticated extends TeamsQueryPublic {
  team_members: Array<{
    team_id: string;
    user_id: string;
  }>;
  viewer_memberships: Array<{
    team_id: string;
  }>;
}

interface TeamDetailsQueryPublic {
  team: {
    id: string;
    name: string;
    created_at: string;
    created_by: string;
  } | null;
  seasons: Array<{
    id: string;
    name: string;
    team_leaderboard: Array<{
      rank: number | null;
      points: number;
    }>;
  }>;
}

interface TeamDetailsQueryAuthenticated extends TeamDetailsQueryPublic {
  team_members: Array<{
    user_id: string;
    role: string;
    joined_at: string;
    profile: {
      username: string | null;
      display_name: string | null;
      avatar_url: string | null;
    } | null;
  }>;
  team_members_aggregate: {
    aggregate: {
      count: number;
    } | null;
  };
  viewer_membership: Array<{
    user_id: string;
    role: string;
    joined_at: string;
    profile: {
      username: string | null;
      display_name: string | null;
      avatar_url: string | null;
    } | null;
  }>;
}

export async function fetchTeams(): Promise<TeamsData> {
  const currentUserId = nhost.auth.getUser()?.id ?? null;

  if (!currentUserId) {
    const response = await requestGraphql<TeamsQueryPublic>(TEAMS_QUERY_PUBLIC, {});
    return {
      supportsMembershipDetails: false,
      items: response.teams.map((team) => ({
        id: team.id,
        name: team.name,
        createdAt: team.created_at,
        memberCount: null,
        isCurrentUserMember: false,
      })),
    };
  }

  const response = await requestGraphql<TeamsQueryAuthenticated>(TEAMS_QUERY_AUTHENTICATED, {
    userId: currentUserId,
  });

  const memberCounts = response.team_members.reduce<Record<string, number>>((accumulator, member) => {
    accumulator[member.team_id] = (accumulator[member.team_id] ?? 0) + 1;
    return accumulator;
  }, {});
  const viewerTeamIds = new Set(response.viewer_memberships.map((entry) => entry.team_id));

  return {
    supportsMembershipDetails: true,
    items: response.teams.map((team) => ({
      id: team.id,
      name: team.name,
      createdAt: team.created_at,
      memberCount: memberCounts[team.id] ?? 0,
      isCurrentUserMember: viewerTeamIds.has(team.id),
    })),
  };
}

export async function fetchTeamDetails(teamId: string): Promise<TeamDetailsData | null> {
  const currentUserId = nhost.auth.getUser()?.id ?? null;

  if (!currentUserId) {
    const response = await requestGraphql<TeamDetailsQueryPublic>(TEAM_DETAILS_QUERY_PUBLIC, { teamId });
    if (!response.team) {
      return null;
    }

    return {
      id: response.team.id,
      name: response.team.name,
      createdAt: response.team.created_at,
      descriptor: getTeamDescriptor({
        memberCount: null,
        membershipState: 'not_member',
        standing: getStanding(response.seasons),
      }),
      memberCount: null,
      membershipState: 'not_member',
      viewerRole: null,
      isCurrentUserMember: false,
      supportsMembershipDetails: false,
      members: [],
      standing: getStanding(response.seasons),
    };
  }

  const response = await requestGraphql<TeamDetailsQueryAuthenticated>(TEAM_DETAILS_QUERY_AUTHENTICATED, {
    teamId,
    userId: currentUserId,
  });

  if (!response.team) {
    return null;
  }

  const viewerMembership = response.viewer_membership[0] ?? null;
  const membershipState = resolveMembershipState(viewerMembership?.role ?? null);
  const standing = getStanding(response.seasons);
  const memberCount = response.team_members_aggregate.aggregate?.count ?? response.team_members.length;
  const members = dedupeMembers(
    [...response.team_members, ...(viewerMembership ? [viewerMembership] : [])].map((member) => {
      const profileMissing = !member.profile?.display_name && !member.profile?.username;

      return {
        id: member.user_id,
        displayName: member.profile?.display_name ?? member.profile?.username ?? 'Hidden runner',
        username: member.profile?.username ?? null,
        avatarUrl: member.profile?.avatar_url ?? null,
        role: member.role,
        joinedAt: member.joined_at,
        isCaptain: response.team?.created_by === member.user_id || isLeaderRole(member.role),
        isCurrentUser: member.user_id === currentUserId,
        sortKey: profileMissing ? 1 : 0,
      };
    }),
  )
    .sort((left, right) => {
      if (left.isCurrentUser !== right.isCurrentUser) {
        return left.isCurrentUser ? -1 : 1;
      }

      if (left.isCaptain !== right.isCaptain) {
        return left.isCaptain ? -1 : 1;
      }

      if (left.sortKey !== right.sortKey) {
        return left.sortKey - right.sortKey;
      }

      return left.joinedAt.localeCompare(right.joinedAt);
    })
    .map(({ sortKey: _sortKey, ...member }) => member);

  return {
    id: response.team.id,
    name: response.team.name,
    createdAt: response.team.created_at,
    descriptor: getTeamDescriptor({
      memberCount,
      membershipState,
      standing,
    }),
    memberCount,
    membershipState,
    viewerRole: viewerMembership?.role ?? null,
    isCurrentUserMember: membershipState === 'member',
    supportsMembershipDetails: true,
    members,
    standing,
  };
}

export function getTeamsErrorMessage(error: unknown): string {
  if (error instanceof ClientError) {
    const firstMessage = error.response.errors?.[0]?.message;
    if (firstMessage) {
      return 'We could not load teams right now.';
    }
  }

  if (error instanceof Error) {
    const lowerMessage = error.message.toLowerCase();
    if (lowerMessage.includes('fetch failed') || lowerMessage.includes('network request failed')) {
      return 'Teams are unavailable right now. Try again in a moment.';
    }
  }

  return 'We could not load teams right now.';
}

export function getTeamDetailsErrorMessage(error: unknown): string {
  if (error instanceof ClientError) {
    const firstMessage = error.response.errors?.[0]?.message;
    if (firstMessage) {
      return 'We could not load this team right now.';
    }
  }

  if (error instanceof Error) {
    const lowerMessage = error.message.toLowerCase();
    if (lowerMessage.includes('fetch failed') || lowerMessage.includes('network request failed')) {
      return 'Team details are unavailable right now. Try again in a moment.';
    }
  }

  return 'We could not load this team right now.';
}

function getStanding(seasons: TeamDetailsQueryPublic['seasons']): TeamStandingDetails | null {
  const season = seasons[0];
  const entry = season?.team_leaderboard[0];
  if (!season || !entry) {
    return null;
  }

  return {
    seasonId: season.id,
    seasonName: season.name,
    rank: entry.rank,
    points: entry.points,
  };
}

function resolveMembershipState(role: string | null): TeamMembershipState {
  if (!role) {
    return 'not_member';
  }

  const normalized = role.trim().toLowerCase();
  if (normalized.includes('pending') || normalized.includes('request')) {
    return 'pending';
  }

  return 'member';
}

function isLeaderRole(role: string) {
  const normalized = role.trim().toLowerCase();
  return normalized.includes('lead') || normalized.includes('capt');
}

function getTeamDescriptor({
  memberCount,
  membershipState,
  standing,
}: {
  memberCount: number | null;
  membershipState: TeamMembershipState;
  standing: TeamStandingDetails | null;
}) {
  if (membershipState === 'member') {
    return 'Your current squad';
  }

  if (membershipState === 'pending') {
    return 'Join request in review';
  }

  if (standing?.rank === 1) {
    return 'Leading this season';
  }

  if (standing?.rank != null && standing.rank <= 3) {
    return 'Top season squad';
  }

  if (memberCount != null && memberCount >= 6) {
    return 'Active closed beta squad';
  }

  return 'Closed beta squad';
}

function dedupeMembers(
  members: Array<TeamMemberDetails & { sortKey: number }>,
): Array<TeamMemberDetails & { sortKey: number }> {
  const seen = new Set<string>();

  return members.filter((member) => {
    if (seen.has(member.id)) {
      return false;
    }

    seen.add(member.id);
    return true;
  });
}
