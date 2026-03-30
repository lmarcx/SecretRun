import { GraphQLClient, gql } from 'graphql-request';

const friendsQuery = gql`
  query ListFriends($me: uuid!) {
    friendships(
      where: {
        status: { _eq: "accepted" }
        _or: [
          { requester_id: { _eq: $me } }
          { addressee_id: { _eq: $me } }
        ]
      }
      order_by: { updated_at: desc }
    ) {
      id
      requester_id
      addressee_id
      updated_at
      requester {
        id
        username
        display_name
        avatar_url
      }
      addressee {
        id
        username
        display_name
        avatar_url
      }
    }
    blocks(
      where: {
        _or: [
          { blocker_id: { _eq: $me } }
          { blocked_id: { _eq: $me } }
        ]
      }
    ) {
      blocker_id
      blocked_id
    }
  }
`;

function getCurrentUserId(headers?: Record<string, string | string[] | undefined>): string | null {
  const value = headers?.['x-hasura-user-id'] ?? headers?.['X-Hasura-User-Id'];
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(req: { headers?: Record<string, string | string[] | undefined> }) {
  const currentUserId = getCurrentUserId(req.headers);
  if (!currentUserId) return { success: false, error: 'Unauthorized: missing user id header' };

  const url = process.env.NHOST_GRAPHQL_URL;
  const adminSecret = process.env.NHOST_ADMIN_SECRET;
  if (!url || !adminSecret) throw new Error('NHOST_GRAPHQL_URL and NHOST_ADMIN_SECRET are required');

  const client = new GraphQLClient(url, { headers: { 'x-hasura-admin-secret': adminSecret } });

  const res = await client.request<{
    friendships: Array<{
      id: string;
      requester_id: string;
      addressee_id: string;
      updated_at: string;
      requester: { id: string; username: string; display_name: string; avatar_url: string | null };
      addressee: { id: string; username: string; display_name: string; avatar_url: string | null };
    }>;
    blocks: Array<{ blocker_id: string; blocked_id: string }>;
  }>(friendsQuery, { me: currentUserId });

  const blockedUsers = new Set<string>();
  for (const b of res.blocks) {
    if (b.blocker_id === currentUserId) blockedUsers.add(b.blocked_id);
    if (b.blocked_id === currentUserId) blockedUsers.add(b.blocker_id);
  }

  const friends = res.friendships
    .map((f) => {
      const other = f.requester_id === currentUserId ? f.addressee : f.requester;
      return {
        friendship_id: f.id,
        friend_id: other.id,
        username: other.username,
        display_name: other.display_name,
        avatar_url: other.avatar_url,
        since: f.updated_at,
      };
    })
    .filter((f) => !blockedUsers.has(f.friend_id));

  return { success: true, friends };
}
