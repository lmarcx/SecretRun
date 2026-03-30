import { GraphQLClient, gql } from 'graphql-request';

interface Input {
  friendship_id: string;
  action: 'accept' | 'reject';
}

const getQuery = gql`
  query GetFriendship($id: uuid!) {
    friendships_by_pk(id: $id) {
      id
      requester_id
      addressee_id
      status
    }
  }
`;

const updateMutation = gql`
  mutation Respond($id: uuid!, $status: String!, $updatedAt: timestamptz!) {
    update_friendships_by_pk(
      pk_columns: { id: $id }
      _set: { status: $status, updated_at: $updatedAt }
    ) {
      id
      status
      updated_at
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

  const friendshipId = req.body?.friendship_id;
  const action = req.body?.action;

  if (!friendshipId || !action) return { success: false, error: 'friendship_id and action are required' };
  if (action !== 'accept' && action !== 'reject') return { success: false, error: 'action must be accept or reject' };

  const url = process.env.NHOST_GRAPHQL_URL;
  const adminSecret = process.env.NHOST_ADMIN_SECRET;
  if (!url || !adminSecret) throw new Error('NHOST_GRAPHQL_URL and NHOST_ADMIN_SECRET are required');

  const client = new GraphQLClient(url, { headers: { 'x-hasura-admin-secret': adminSecret } });
  const fr = await client.request<{ friendships_by_pk: { id: string; requester_id: string; addressee_id: string; status: string } | null }>(
    getQuery,
    { id: friendshipId },
  );

  if (!fr.friendships_by_pk) return { success: false, error: 'Friendship not found' };
  if (fr.friendships_by_pk.addressee_id !== currentUserId) return { success: false, error: 'Only addressee can respond' };
  if (fr.friendships_by_pk.status !== 'pending') return { success: false, error: 'Friend request is not pending' };

  const status = action === 'accept' ? 'accepted' : 'rejected';
  const updated = await client.request<{ update_friendships_by_pk: { id: string; status: string; updated_at: string } | null }>(
    updateMutation,
    { id: friendshipId, status, updatedAt: new Date().toISOString() },
  );

  return { success: true, friendship: updated.update_friendships_by_pk };
}
