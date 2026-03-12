import { GraphQLClient, gql } from 'graphql-request';

interface Input {
  user_id?: string;
  push_token: string;
  platform: 'ios' | 'android' | 'web';
}

interface AuthenticatedRequest {
  body?: Input;
  headers?: Record<string, string | string[] | undefined>;
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

function getHeaderValue(
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string,
): string | null {
  const direct = headers?.[name] ?? headers?.[name.toLowerCase()] ?? headers?.[name.toUpperCase()];
  if (!direct) {
    return null;
  }

  return Array.isArray(direct) ? direct[0] : direct;
}

function getAuthenticatedUserId(req: AuthenticatedRequest): string | null {
  const headerUserId =
    getHeaderValue(req.headers, 'x-hasura-user-id') ?? getHeaderValue(req.headers, 'X-Hasura-User-Id');
  const bodyUserId = req.body?.user_id;

  if (!headerUserId) {
    return null;
  }

  if (bodyUserId && bodyUserId !== headerUserId) {
    throw new Error('Body user_id does not match authenticated user.');
  }

  return headerUserId;
}

export default async function handler(req: AuthenticatedRequest) {
  const url = process.env.NHOST_GRAPHQL_URL;
  const adminSecret = process.env.NHOST_ADMIN_SECRET;

  if (!url || !adminSecret) {
    throw new Error('NHOST_GRAPHQL_URL and NHOST_ADMIN_SECRET are required');
  }

  const payload = req.body;
  if (!payload?.push_token || !payload?.platform) {
    return { success: false, error: 'push_token and platform are required' };
  }

  let currentUserId: string | null;
  try {
    currentUserId = getAuthenticatedUserId(req);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Could not verify user identity.',
    };
  }

  if (!currentUserId) {
    return {
      success: false,
      error: 'Missing authenticated user context.',
    };
  }

  const client = new GraphQLClient(url, {
    headers: { 'x-hasura-admin-secret': adminSecret },
  });

  const response = await client.request<{ insert_user_devices_one: Input & { created_at: string } }>(mutation, {
    userId: currentUserId,
    pushToken: payload.push_token,
    platform: payload.platform,
    createdAt: new Date().toISOString(),
  });

  return {
    success: true,
    device: response.insert_user_devices_one,
  };
}
