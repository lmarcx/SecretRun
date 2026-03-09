import { ClientError, gql } from 'graphql-request';
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
  seasonName: string;
  users: UserLeaderboardEntry[];
  teams: TeamLeaderboardEntry[];
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

const LEADERBOARD_QUERY_PUBLIC = gql`
  query LeaderboardScreenPublic {
    seasons(where: { is_active: { _eq: true } }, order_by: { starts_at: desc }, limit: 1) {
      id
      name
      user_leaderboard(order_by: [{ rank: asc_nulls_last }, { points: desc }]) {
        user_id
        rank
        points
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

export async function fetchLeaderboard(): Promise<LeaderboardData | null> {
  const isAuthenticated = Boolean(nhost.auth.getUser());
  const response = await requestGraphql<LeaderboardQuery>(
    isAuthenticated ? LEADERBOARD_QUERY : LEADERBOARD_QUERY_PUBLIC,
    {},
  );
  const season = response.seasons[0];

  if (!season) {
    return null;
  }

  return {
    seasonName: season.name,
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
  if (error instanceof ClientError) {
    const firstMessage = error.response.errors?.[0]?.message;
    if (firstMessage) {
      return firstMessage;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong while loading the leaderboard.';
}
