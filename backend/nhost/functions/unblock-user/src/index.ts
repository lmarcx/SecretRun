import { GraphQLClient, gql } from 'graphql-request';

interface Input {
  blocked_id: string;
}

const mutation = gql`
  mutation Unblock($blockerId: uuid!, $blockedId: uuid!) {
    delete_blocks(where: { blocker_id: { _eq: $blockerId }, blocked_id: { _eq: $blockedId } }) {
      affected_rows
    }
  }
`;

function getCurrentUserId(headers?: Record<string, string | string[] | undefined>): string | null {
  const value = headers?.['x-hasura-user-id'] ?? headers?.['X-Hasura-User-Id'];
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(req: { body?: Input; headers?: Record<string, string | string[] | undefined> }) {
  const currentUserId = getCurrentUserId(req.headers);
  if (!currentUserId) return { success: false, error: 'Unauthorized: missing user id header' };

  const blockedId = req.body?.blocked_id;
  if (!blockedId) return { success: false, error: 'blocked_id is required' };

  const url = process.env.NHOST_GRAPHQL_URL;
  const adminSecret = process.env.NHOST_ADMIN_SECRET;
  if (!url || !adminSecret) throw new Error('NHOST_GRAPHQL_URL and NHOST_ADMIN_SECRET are required');

  const client = new GraphQLClient(url, { headers: { 'x-hasura-admin-secret': adminSecret } });
  const res = await client.request<{ delete_blocks: { affected_rows: number } }>(mutation, {
    blockerId: currentUserId,
    blockedId,
  });

  return { success: true, unblocked: res.delete_blocks.affected_rows };
}
