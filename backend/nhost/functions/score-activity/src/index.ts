import { GraphQLClient, gql } from 'graphql-request';

interface Input {
  activityId: string;
}

const queryActivity = gql`
  query GetActivity($id: uuid!) {
    activities_by_pk(id: $id) {
      id
      distance_km
      duration_seconds
      status
    }
  }
`;

const updateActivity = gql`
  mutation UpdateActivity($id: uuid!, $points: Int!) {
    update_activities_by_pk(pk_columns: { id: $id }, _set: { points: $points, status: validated }) {
      id
      points
      status
    }
  }
`;

function calculatePoints(distanceKm: number, durationSeconds: number): number {
  const paceFactor = durationSeconds > 0 ? Math.max(1, 3600 / durationSeconds) : 1;
  return Math.round(distanceKm * 100 * paceFactor);
}

export default async function handler(req: { body?: Input }) {
  const url = process.env.NHOST_GRAPHQL_URL;
  const adminSecret = process.env.NHOST_ADMIN_SECRET;

  if (!url || !adminSecret) {
    throw new Error('NHOST_GRAPHQL_URL and NHOST_ADMIN_SECRET are required');
  }

  const activityId = req.body?.activityId;
  if (!activityId) {
    return { error: 'activityId is required' };
  }

  const client = new GraphQLClient(url, {
    headers: {
      'x-hasura-admin-secret': adminSecret,
    },
  });

  const activityResponse = await client.request<{ activities_by_pk: { distance_km: number; duration_seconds: number } | null }>(
    queryActivity,
    { id: activityId },
  );

  const activity = activityResponse.activities_by_pk;
  if (!activity) {
    return { error: 'Activity not found' };
  }

  const points = calculatePoints(Number(activity.distance_km), Number(activity.duration_seconds));

  const update = await client.request(updateActivity, {
    id: activityId,
    points,
  });

  return {
    message: 'Activity scored',
    points,
    update,
  };
}
