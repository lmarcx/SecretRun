import { GraphQLClient, gql } from 'graphql-request';

interface Input {
  user_id: string;
  push_token: string;
  platform: 'ios' | 'android' | 'web';
}

const mutation = gql`
  mutation RegisterDevice($userId: uuid!, $pushToken: String!, $platform: String!, $createdAt: timestamptz!) {
    insert_user_devices_one(
      object: {
        user_id: $userId
        push_token: $pushToken
        platform: $platform
        created_at: $createdAt
      }
      on_conflict: {
        constraint: user_devices_pkey
        update_columns: [platform, created_at]
      }
    ) {
      user_id
      push_token
      platform
      created_at
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
  if (!payload?.user_id || !payload?.push_token || !payload?.platform) {
    return { success: false, error: 'user_id, push_token and platform are required' };
  }

  const client = new GraphQLClient(url, {
    headers: { 'x-hasura-admin-secret': adminSecret },
  });

  const response = await client.request<{ insert_user_devices_one: Input & { created_at: string } }>(mutation, {
    userId: payload.user_id,
    pushToken: payload.push_token,
    platform: payload.platform,
    createdAt: new Date().toISOString(),
  });

  return {
    success: true,
    device: response.insert_user_devices_one,
  };
}
