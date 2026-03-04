import { GraphQLClient, gql } from 'graphql-request';

interface Input {
  event_id: string;
  user_id: string;
}

const mutation = gql`
  mutation StartActivity(
    $eventId: uuid!
    $userId: uuid!
    $startedAt: timestamptz!
    $status: activity_status!
  ) {
    insert_activities_one(
      object: {
        event_id: $eventId
        user_id: $userId
        started_at: $startedAt
        status: $status
      }
    ) {
      id
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
  if (!payload?.event_id || !payload.user_id) {
    return {
      success: false,
      error: 'event_id and user_id are required',
    };
  }

  const client = new GraphQLClient(url, {
    headers: {
      'x-hasura-admin-secret': adminSecret,
    },
  });

  const response = await client.request<{ insert_activities_one: { id: string } }>(mutation, {
    eventId: payload.event_id,
    userId: payload.user_id,
    startedAt: new Date().toISOString(),
    status: 'pending',
  });

  return {
    success: true,
    activity_id: response.insert_activities_one.id,
  };
}
