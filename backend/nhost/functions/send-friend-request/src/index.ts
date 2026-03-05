import { GraphQLClient, gql } from 'graphql-request';

interface Input {
  addressee_id: string;
}

const blockCheckQuery = gql`
  query BlockCheck($me: uuid!, $other: uuid!) {
    blocks(
      where: {
        _or: [
          { blocker_id: { _eq: $me }, blocked_id: { _eq: $other } }
          { blocker_id: { _eq: $other }, blocked_id: { _eq: $me } }
        ]
      }
      limit: 1
    ) {
      id
    }
  }
`;

const friendshipCheckQuery = gql`
  query FriendshipCheck($me: uuid!, $other: uuid!) {
    friendships(
      where: {
        status: { _in: ["pending", "accepted"] }
        _or: [
          { requester_id: { _eq: $me }, addressee_id: { _eq: $other } }
          { requester_id: { _eq: $other }, addressee_id: { _eq: $me } }
        ]
      }
      limit: 1
    ) {
      id
      status
    }
  }
`;

const insertMutation = gql`
  mutation SendRequest($requesterId: uuid!, $addresseeId: uuid!, $status: String!) {
    insert_friendships_one(
      object: {
        requester_id: $requesterId
        addressee_id: $addresseeId
        status: $status
      }
    ) {
      id
      requester_id
      addressee_id
      status
      created_at
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
  if (!currentUserId) {
    return { success: false, error: 'Unauthorized: missing user id header' };
  }

  const addresseeId = req.body?.addressee_id;
  if (!addresseeId) {
    return { success: false, error: 'addressee_id is required' };
  }

  if (currentUserId === addresseeId) {
    return { success: false, error: 'Cannot send friend request to yourself' };
  }

  const url = process.env.NHOST_GRAPHQL_URL;
  const adminSecret = process.env.NHOST_ADMIN_SECRET;
  if (!url || !adminSecret) {
    throw new Error('NHOST_GRAPHQL_URL and NHOST_ADMIN_SECRET are required');
  }

  const client = new GraphQLClient(url, { headers: { 'x-hasura-admin-secret': adminSecret } });

  const blockCheck = await client.request<{ blocks: Array<{ id: string }> }>(blockCheckQuery, {
    me: currentUserId,
    other: addresseeId,
  });

  if (blockCheck.blocks.length > 0) {
    return { success: false, error: 'Cannot send request due to block relationship' };
  }

  const friendshipCheck = await client.request<{ friendships: Array<{ id: string; status: string }> }>(
    friendshipCheckQuery,
    { me: currentUserId, other: addresseeId },
  );

  if (friendshipCheck.friendships.length > 0) {
    return { success: false, error: 'Friendship or pending request already exists' };
  }

  const inserted = await client.request<{
    insert_friendships_one: {
      id: string;
      requester_id: string;
      addressee_id: string;
      status: string;
      created_at: string;
    };
  }>(insertMutation, {
    requesterId: currentUserId,
    addresseeId,
    status: 'pending',
  });

  return { success: true, friendship: inserted.insert_friendships_one };
}
