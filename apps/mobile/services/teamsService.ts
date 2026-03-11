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

export function getTeamsErrorMessage(error: unknown): string {
  if (error instanceof ClientError) {
    const firstMessage = error.response.errors?.[0]?.message;
    if (firstMessage) {
      return firstMessage;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong while loading teams.';
}
