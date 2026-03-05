import { GraphQLClient, gql } from 'graphql-request';

interface Input {
  blocked_id: string;
}

const upsertBlock = gql`
  mutation UpsertBlock($blockerId: uuid!, $blockedId: uuid!) {
    insert_blocks_one(
      object: { blocker_id: $blockerId, blocked_id: $blockedId }
      on_conflict: { constraint: blocks_unique_pair, update_columns: [created_at] }
    ) {
      id
      blocker_id
      blocked_id
      created_at
    }
  }
`;

const removeFriendships = gql`
  mutation RemoveFriendships($me: uuid!, $other: uuid!) {
    delete_friendships(
      where: {
        _or: [
          { requester_id: { _eq: $me }, addressee_id: { _eq: $other } }
          { requester_id: { _eq: $other }, addressee_id: { _eq: $me } }
        ]
      }
    ) {
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
  if (blockedId === currentUserId) return { success: false, error: 'Cannot block yourself' };

  const url = process.env.NHOST_GRAPHQL_URL;
  const adminSecret = process.env.NHOST_ADMIN_SECRET;
  if (!url || !adminSecret) throw new Error('NHOST_GRAPHQL_URL and NHOST_ADMIN_SECRET are required');

  const client = new GraphQLClient(url, { headers: { 'x-hasura-admin-secret': adminSecret } });

  const block = await client.request<{ insert_blocks_one: { id: string; blocker_id: string; blocked_id: string; created_at: string } }>(
    upsertBlock,
    { blockerId: currentUserId, blockedId },
  );

  const deleted = await client.request<{ delete_friendships: { affected_rows: number } }>(removeFriendships, {
    me: currentUserId,
    other: blockedId,
  });

  return {
    success: true,
    block: block.insert_blocks_one,
    removed_friendship_rows: deleted.delete_friendships.affected_rows,
  };
}
