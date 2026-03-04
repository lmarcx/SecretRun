import { GraphQLClient, gql } from 'graphql-request';

interface Input {
  activityId: string;
}

const getSpeeds = gql`
  query Trackpoints($activityId: uuid!) {
    activity_trackpoints(where: { activity_id: { _eq: $activityId } }, order_by: { recorded_at: asc }) {
      speed_kmh
    }
  }
`;

const createReport = gql`
  mutation FlagActivity($activityId: uuid!) {
    update_activities_by_pk(pk_columns: { id: $activityId }, _set: { status: rejected }) {
      id
      status
    }
  }
`;

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

  const data = await client.request<{ activity_trackpoints: Array<{ speed_kmh: number | null }> }>(getSpeeds, {
    activityId,
  });

  const maxSpeed = data.activity_trackpoints.reduce((max, row) => {
    const speed = row.speed_kmh ?? 0;
    return speed > max ? speed : max;
  }, 0);

  const suspicious = maxSpeed > 30;

  if (suspicious) {
    await client.request(createReport, { activityId });
  }

  return {
    suspicious,
    maxSpeed,
  };
}
