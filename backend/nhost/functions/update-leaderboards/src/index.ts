import { GraphQLClient, gql } from 'graphql-request';

interface Input {
  activity_id: string;
}

const getActivityStateQuery = gql`
  query GetActivityState($activityId: uuid!) {
    activities_by_pk(id: $activityId) {
      id
      user_id
      status
      points
    }
    activity_score_applications(where: { activity_id: { _eq: $activityId } }, limit: 1) {
      activity_id
      season_id
      user_id
      team_id
      user_points
      team_points
      created_at
    }
  }
`;

function logEvent(event: string, payload: Record<string, unknown>) {
  console.log(JSON.stringify({ scope: 'activity.leaderboard', event, ...payload }));
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

  const activityResponse = await client.request<{
    activities_by_pk: { id: string; user_id: string; status: string; points: number } | null;
    activity_score_applications: Array<{
      activity_id: string;
      season_id: string;
      user_id: string;
      team_id: string | null;
      user_points: number;
      team_points: number;
      created_at: string;
    }>;
  }>(getActivityStateQuery, {
    activityId,
  });

  const activity = activityResponse.activities_by_pk;
  if (!activity) {
    return {
      success: false,
      error: 'Activity not found.',
    };
  }

  if (activity.status !== 'validated') {
    return {
      success: false,
      error: 'Only validated activities can appear on leaderboards.',
    };
  }

  const application = activityResponse.activity_score_applications[0] ?? null;
  if (!application) {
    return {
      success: false,
      error: 'No finalized leaderboard application exists for this activity.',
    };
  }

  logEvent('read', {
    activity_id: activity.id,
    user_id: activity.user_id,
    season_id: application.season_id,
  });

  return {
    success: true,
    activity_id: activity.id,
    season_id: application.season_id,
    user_id: application.user_id,
    team_id: application.team_id,
    added_points: application.user_points,
    team_points: application.team_points,
    legacy: true,
  };
}
