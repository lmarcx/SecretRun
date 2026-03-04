import { GraphQLClient, gql } from 'graphql-request';

interface Input {
  activity_id: string;
}

interface ActivityInfo {
  id: string;
  user_id: string;
  points: number;
  status: 'pending' | 'validated' | 'rejected';
  event: { team_id: string | null } | null;
}

interface SeasonInfo {
  id: string;
}

const getActivityQuery = gql`
  query GetActivity($activityId: uuid!) {
    activities_by_pk(id: $activityId) {
      id
      user_id
      points
      status
      event {
        team_id
      }
    }
  }
`;

const getActiveSeasonQuery = gql`
  query GetActiveSeason {
    seasons(where: { is_active: { _eq: true } }, order_by: { starts_at: desc }, limit: 1) {
      id
    }
  }
`;

const getUserEntryQuery = gql`
  query GetUserEntry($seasonId: uuid!, $userId: uuid!) {
    leaderboard_user_season(
      where: { season_id: { _eq: $seasonId }, user_id: { _eq: $userId } }
      limit: 1
    ) {
      season_id
      user_id
    }
  }
`;

const insertUserEntryMutation = gql`
  mutation InsertUserEntry($seasonId: uuid!, $userId: uuid!, $points: Int!) {
    insert_leaderboard_user_season_one(
      object: { season_id: $seasonId, user_id: $userId, points: $points }
    ) {
      season_id
      user_id
      points
    }
  }
`;

const updateUserEntryMutation = gql`
  mutation UpdateUserEntry($seasonId: uuid!, $userId: uuid!, $points: Int!, $now: timestamptz!) {
    update_leaderboard_user_season(
      where: { season_id: { _eq: $seasonId }, user_id: { _eq: $userId } }
      _inc: { points: $points }
      _set: { updated_at: $now }
    ) {
      affected_rows
    }
  }
`;

const getTeamMembershipQuery = gql`
  query GetTeamMembership($userId: uuid!) {
    team_members(where: { user_id: { _eq: $userId } }, limit: 1) {
      team_id
    }
  }
`;

const getTeamEntryQuery = gql`
  query GetTeamEntry($seasonId: uuid!, $teamId: uuid!) {
    leaderboard_team_season(
      where: { season_id: { _eq: $seasonId }, team_id: { _eq: $teamId } }
      limit: 1
    ) {
      season_id
      team_id
    }
  }
`;

const insertTeamEntryMutation = gql`
  mutation InsertTeamEntry($seasonId: uuid!, $teamId: uuid!, $points: Int!) {
    insert_leaderboard_team_season_one(
      object: { season_id: $seasonId, team_id: $teamId, points: $points }
    ) {
      season_id
      team_id
      points
    }
  }
`;

const updateTeamEntryMutation = gql`
  mutation UpdateTeamEntry($seasonId: uuid!, $teamId: uuid!, $points: Int!, $now: timestamptz!) {
    update_leaderboard_team_season(
      where: { season_id: { _eq: $seasonId }, team_id: { _eq: $teamId } }
      _inc: { points: $points }
      _set: { updated_at: $now }
    ) {
      affected_rows
    }
  }
`;

const getUserSeasonRowsQuery = gql`
  query UserSeasonRows($seasonId: uuid!) {
    leaderboard_user_season(
      where: { season_id: { _eq: $seasonId } }
      order_by: [{ points: desc }, { updated_at: asc }]
    ) {
      user_id
    }
  }
`;

const getTeamSeasonRowsQuery = gql`
  query TeamSeasonRows($seasonId: uuid!) {
    leaderboard_team_season(
      where: { season_id: { _eq: $seasonId } }
      order_by: [{ points: desc }, { updated_at: asc }]
    ) {
      team_id
    }
  }
`;

const updateUserRankMutation = gql`
  mutation UpdateUserRank($seasonId: uuid!, $userId: uuid!, $rank: Int!, $now: timestamptz!) {
    update_leaderboard_user_season(
      where: { season_id: { _eq: $seasonId }, user_id: { _eq: $userId } }
      _set: { rank: $rank, updated_at: $now }
    ) {
      affected_rows
    }
  }
`;

const updateTeamRankMutation = gql`
  mutation UpdateTeamRank($seasonId: uuid!, $teamId: uuid!, $rank: Int!, $now: timestamptz!) {
    update_leaderboard_team_season(
      where: { season_id: { _eq: $seasonId }, team_id: { _eq: $teamId } }
      _set: { rank: $rank, updated_at: $now }
    ) {
      affected_rows
    }
  }
`;

async function recomputeUserRanks(client: GraphQLClient, seasonId: string, now: string): Promise<void> {
  const rows = await client.request<{ leaderboard_user_season: Array<{ user_id: string }> }>(
    getUserSeasonRowsQuery,
    { seasonId },
  );

  for (let index = 0; index < rows.leaderboard_user_season.length; index += 1) {
    const row = rows.leaderboard_user_season[index];
    await client.request(updateUserRankMutation, {
      seasonId,
      userId: row.user_id,
      rank: index + 1,
      now,
    });
  }
}

async function recomputeTeamRanks(client: GraphQLClient, seasonId: string, now: string): Promise<void> {
  const rows = await client.request<{ leaderboard_team_season: Array<{ team_id: string }> }>(
    getTeamSeasonRowsQuery,
    { seasonId },
  );

  for (let index = 0; index < rows.leaderboard_team_season.length; index += 1) {
    const row = rows.leaderboard_team_season[index];
    await client.request(updateTeamRankMutation, {
      seasonId,
      teamId: row.team_id,
      rank: index + 1,
      now,
    });
  }
}

export default async function handler(req: { body?: Input }) {
  const url = process.env.NHOST_GRAPHQL_URL;
  const adminSecret = process.env.NHOST_ADMIN_SECRET;

  if (!url || !adminSecret) {
    throw new Error('NHOST_GRAPHQL_URL and NHOST_ADMIN_SECRET are required');
  }

  const activityId = req.body?.activity_id;
  if (!activityId) {
    return {
      success: false,
      error: 'activity_id is required',
    };
  }

  const client = new GraphQLClient(url, {
    headers: {
      'x-hasura-admin-secret': adminSecret,
    },
  });

  const activityResponse = await client.request<{ activities_by_pk: ActivityInfo | null }>(getActivityQuery, {
    activityId,
  });

  const activity = activityResponse.activities_by_pk;
  if (!activity) {
    return {
      success: false,
      error: 'Activity not found',
    };
  }

  if (activity.status !== 'validated') {
    return {
      success: false,
      error: 'Activity must be validated before leaderboard update',
    };
  }

  const seasonResponse = await client.request<{ seasons: SeasonInfo[] }>(getActiveSeasonQuery);
  const seasonId = seasonResponse.seasons[0]?.id;

  if (!seasonId) {
    return {
      success: false,
      error: 'No active season found',
    };
  }

  const now = new Date().toISOString();
  const teamBonusPoints = Number(process.env.TEAM_EVENT_BONUS_POINTS ?? '5');

  const userEntryResponse = await client.request<{
    leaderboard_user_season: Array<{ season_id: string; user_id: string }>;
  }>(getUserEntryQuery, {
    seasonId,
    userId: activity.user_id,
  });

  if (userEntryResponse.leaderboard_user_season.length === 0) {
    await client.request(insertUserEntryMutation, {
      seasonId,
      userId: activity.user_id,
      points: activity.points,
    });
  } else {
    await client.request(updateUserEntryMutation, {
      seasonId,
      userId: activity.user_id,
      points: activity.points,
      now,
    });
  }

  const teamMembership = await client.request<{ team_members: Array<{ team_id: string }> }>(
    getTeamMembershipQuery,
    {
      userId: activity.user_id,
    },
  );

  const teamId = activity.event?.team_id ?? teamMembership.team_members[0]?.team_id;
  const teamPointsToAdd = activity.points + (activity.event?.team_id ? teamBonusPoints : 0);

  if (teamId) {
    const teamEntryResponse = await client.request<{
      leaderboard_team_season: Array<{ season_id: string; team_id: string }>;
    }>(getTeamEntryQuery, {
      seasonId,
      teamId,
    });

    if (teamEntryResponse.leaderboard_team_season.length === 0) {
      await client.request(insertTeamEntryMutation, {
        seasonId,
        teamId,
        points: teamPointsToAdd,
      });
    } else {
      await client.request(updateTeamEntryMutation, {
        seasonId,
        teamId,
        points: teamPointsToAdd,
        now,
      });
    }
  }

  await recomputeUserRanks(client, seasonId, now);
  await recomputeTeamRanks(client, seasonId, now);

  return {
    success: true,
    activity_id: activity.id,
    season_id: seasonId,
    user_id: activity.user_id,
    team_id: teamId ?? null,
    added_points: activity.points,
    team_bonus_points: activity.event?.team_id ? teamBonusPoints : 0,
  };
}
