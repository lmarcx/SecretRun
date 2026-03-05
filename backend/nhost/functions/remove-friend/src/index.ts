import { GraphQLClient, gql } from 'graphql-request';

interface Input {
  other_user_id: string;
}

const deleteMutation = gql`
  mutation RemoveFriend($me: uuid!, $other: uuid!) {
    delete_friendships(
      where: {
        status: { _eq: "accepted" }
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

  const otherUserId = req.body?.other_user_id;
  if (!otherUserId) return { success: false, error: 'other_user_id is required' };

  const url = process.env.NHOST_GRAPHQL_URL;
  const adminSecret = process.env.NHOST_ADMIN_SECRET;
  if (!url || !adminSecret) throw new Error('NHOST_GRAPHQL_URL and NHOST_ADMIN_SECRET are required');

  const client = new GraphQLClient(url, { headers: { 'x-hasura-admin-secret': adminSecret } });
  const result = await client.request<{ delete_friendships: { affected_rows: number } }>(deleteMutation, {
    me: currentUserId,
    other: otherUserId,
  });

  return { success: true, removed: result.delete_friendships.affected_rows };
}
