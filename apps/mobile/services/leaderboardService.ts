import { ClientError, gql } from 'graphql-request';
import { isPublicGraphqlConfigError } from './graphqlClient';
import { nhost } from './nhostClient';
import { requestGraphql } from './graphqlClient';

export interface UserLeaderboardEntry {
  id: string;
  rank: number | null;
  points: number;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface TeamLeaderboardEntry {
  id: string;
  rank: number | null;
  points: number;
  name: string | null;
}

export interface LeaderboardData {
  seasonId: string;
  seasonName: string;
  users: UserLeaderboardEntry[];
  teams: TeamLeaderboardEntry[];
  currentUserId: string | null;
  currentTeamIds: string[];
}

const LEADERBOARD_QUERY = gql`
  query LeaderboardScreen {
    seasons(where: { is_active: { _eq: true } }, order_by: { starts_at: desc }, limit: 1) {
      id
      name
      user_leaderboard(order_by: [{ rank: asc_nulls_last }, { points: desc }]) {
        user_id
        rank
        points
        profile {
          username
          display_name
          avatar_url
        }
      }
      team_leaderboard(order_by: [{ rank: asc_nulls_last }, { points: desc }]) {
        team_id
        rank
        points
        team {
          name
        }
      }
    }
  }
`;

const CURRENT_USER_TEAM_MEMBERSHIPS_QUERY = gql`
  query CurrentUserTeamMemberships($userId: uuid!) {
    team_members(where: { user_id: { _eq: $userId } }) {
      team_id
    }
  }
`;

interface LeaderboardQuery {
  seasons: Array<{
    id: string;
    name: string;
    user_leaderboard: Array<{
      user_id: string;
      rank: number | null;
      points: number;
      profile?: {
        username: string | null;
        display_name: string | null;
        avatar_url: string | null;
      } | null;
    }>;
    team_leaderboard: Array<{
      team_id: string;
      rank: number | null;
      points: number;
      team: {
        name: string | null;
      } | null;
    }>;
  }>;
}

interface CurrentUserTeamMembershipsQuery {
  team_members: Array<{
    team_id: string;
  }>;
}

export async function fetchLeaderboard(): Promise<LeaderboardData | null> {
  let response: LeaderboardQuery;

  try {
    response = await requestGraphql<LeaderboardQuery>(LEADERBOARD_QUERY, {});
  } catch (error) {
    if (error instanceof ClientError) {
      const firstMessage = error.response.errors?.[0]?.message?.toLowerCase() ?? '';
      if (firstMessage.includes("field 'seasons' not found in type: 'query_root'")) {
        return null;
      }
    }

    throw error;
  }

  const season = response.seasons[0];
  if (!season) {
    return null;
  }

  const currentUserId = nhost.auth.getUser()?.id ?? null;
  let currentTeamIds: string[] = [];

  if (currentUserId) {
    try {
      const memberships = await requestGraphql<CurrentUserTeamMembershipsQuery>(CURRENT_USER_TEAM_MEMBERSHIPS_QUERY, {
        userId: currentUserId,
      });
      currentTeamIds = memberships.team_members.map((entry) => entry.team_id);
    } catch {
      currentTeamIds = [];
    }
  }

  return {
    seasonId: season.id,
    seasonName: season.name,
    currentUserId,
    currentTeamIds,
    users: season.user_leaderboard.map((entry) => ({
      id: entry.user_id,
      rank: entry.rank,
      points: entry.points,
      username: entry.profile?.username ?? null,
      displayName: entry.profile?.display_name ?? null,
      avatarUrl: entry.profile?.avatar_url ?? null,
    })),
    teams: season.team_leaderboard.map((entry) => ({
      id: entry.team_id,
      rank: entry.rank,
      points: entry.points,
      name: entry.team?.name ?? null,
    })),
  };
}

export function getLeaderboardErrorMessage(error: unknown): string {
  if (isPublicGraphqlConfigError(error)) {
    return 'Leaderboard needs EXPO_PUBLIC_HASURA_GRAPHQL_URL or EXPO_PUBLIC_NHOST_SUBDOMAIN + EXPO_PUBLIC_NHOST_REGION.';
  }

  if (error instanceof ClientError) {
    const firstMessage = error.response.errors?.[0]?.message;
    if (firstMessage) {
      return 'We could not load the leaderboard right now.';
    }
  }

  if (error instanceof Error) {
    const lowerMessage = error.message.toLowerCase();
    if (lowerMessage.includes('fetch failed') || lowerMessage.includes('network request failed')) {
      return 'Leaderboard data is unavailable right now. Try again in a moment.';
    }
  }

  return 'We could not load the leaderboard right now.';
}
