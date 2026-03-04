import { GraphQLClient, gql } from 'graphql-request';

interface Input {
  activity_id: string;
}

const mutation = gql`
  mutation FinishActivity($activityId: uuid!, $finishedAt: timestamptz!) {
    update_activities_by_pk(
      pk_columns: { id: $activityId }
      _set: { finished_at: $finishedAt }
    ) {
      id
      finished_at
    }
  }
`;

export default async function handler(req: { body?: Input }) {
  const url = process.env.NHOST_GRAPHQL_URL;
  const adminSecret = process.env.NHOST_ADMIN_SECRET;

  if (!url || !adminSecret) {
    throw new Error('NHOST_GRAPHQL_URL and NHOST_ADMIN_SECRET are required');
  }

  const payload = req.body;
  if (!payload?.activity_id) {
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

  const response = await client.request<{
    update_activities_by_pk: { id: string; finished_at: string } | null;
  }>(mutation, {
    activityId: payload.activity_id,
    finishedAt: new Date().toISOString(),
  });

  if (!response.update_activities_by_pk) {
    return {
      success: false,
      error: 'Activity not found',
    };
  }

  return {
    success: true,
    activity_id: response.update_activities_by_pk.id,
    finished_at: response.update_activities_by_pk.finished_at,
  };
}
