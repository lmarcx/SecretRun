import { GraphQLClient, gql } from 'graphql-request';

interface Input {
  user_id?: string;
  limit?: number;
  cursor?: string;
}

interface FeedActivity {
  id: string;
  user_id: string;
  event_id: string;
  status: string;
  created_at: string;
  distance_km: number;
  duration_seconds: number;
  profile: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  event: {
    route: {
      route_polyline: string | null;
    } | null;
  } | null;
}

const getSocialGraphQuery = gql`
  query GetSocialGraph($userId: uuid!) {
    outgoing: friendships(
      where: { requester_id: { _eq: $userId }, status: { _eq: "accepted" } }
    ) {
      addressee_id
    }
    incoming: friendships(
      where: { addressee_id: { _eq: $userId }, status: { _eq: "accepted" } }
    ) {
      requester_id
    }
    memberships: team_members(where: { user_id: { _eq: $userId } }) {
      team_id
    }
    blocks_out: blocks(where: { blocker_id: { _eq: $userId } }) {
      blocked_id
    }
    blocks_in: blocks(where: { blocked_id: { _eq: $userId } }) {
      blocker_id
    }
  }
`;

const getTeamMembersQuery = gql`
  query GetTeamMembers($teamIds: [uuid!]!) {
    team_members(where: { team_id: { _in: $teamIds } }) {
      user_id
    }
  }
`;

const getFeedWithoutCursorQuery = gql`
  query Feed($userIds: [uuid!]!, $limit: Int!) {
    activities(
      where: { user_id: { _in: $userIds } }
      order_by: [{ created_at: desc }, { id: desc }]
      limit: $limit
    ) {
      id
      user_id
      event_id
      status
      created_at
      distance_km
      duration_seconds
      profile {
        id
        username
        display_name
        avatar_url
      }
      event {
        route {
          route_polyline
        }
      }
    }
  }
`;

const getFeedWithCursorQuery = gql`
  query FeedWithCursor($userIds: [uuid!]!, $limit: Int!, $cursor: timestamptz!) {
    activities(
      where: { user_id: { _in: $userIds }, created_at: { _lt: $cursor } }
      order_by: [{ created_at: desc }, { id: desc }]
      limit: $limit
    ) {
      id
      user_id
      event_id
      status
      created_at
      distance_km
      duration_seconds
      profile {
        id
        username
        display_name
        avatar_url
      }
      event {
        route {
          route_polyline
        }
      }
    }
  }
`;

function getCurrentUserId(
  headers?: Record<string, string | string[] | undefined>,
  bodyUserId?: string,
): string | null {
  const value = headers?.['x-hasura-user-id'] ?? headers?.['X-Hasura-User-Id'];
  if (value) {
    return Array.isArray(value) ? value[0] : value;
  }
  return bodyUserId ?? null;
}

function clampLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit)) {
    return 20;
  }

  return Math.min(100, Math.max(1, Math.floor(limit)));
}

function normalizeCursor(cursor?: string): string | null {
  if (!cursor) {
    return null;
  }

  const parsed = new Date(cursor);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

export default async function handler(req: {
  body?: Input;
  headers?: Record<string, string | string[] | undefined>;
}) {
  const url = process.env.NHOST_GRAPHQL_URL;
  const adminSecret = process.env.NHOST_ADMIN_SECRET;

  if (!url || !adminSecret) {
    throw new Error('NHOST_GRAPHQL_URL and NHOST_ADMIN_SECRET are required');
  }

  const payload = req.body;
  const currentUserId = getCurrentUserId(req.headers, payload?.user_id);
  if (!currentUserId) {
    return { success: false, error: 'user_id is required' };
  }

  const limit = clampLimit(payload?.limit);
  const cursor = normalizeCursor(payload?.cursor);

  const client = new GraphQLClient(url, {
    headers: { 'x-hasura-admin-secret': adminSecret },
  });

  const social = await client.request<{
    outgoing: Array<{ addressee_id: string }>;
    incoming: Array<{ requester_id: string }>;
    memberships: Array<{ team_id: string }>;
    blocks_out: Array<{ blocked_id: string }>;
    blocks_in: Array<{ blocker_id: string }>;
  }>(getSocialGraphQuery, {
    userId: currentUserId,
  });

  const teamIds = social.memberships.map((m) => m.team_id);

  let teammateUserIds: string[] = [];
  if (teamIds.length > 0) {
    const teammates = await client.request<{ team_members: Array<{ user_id: string }> }>(getTeamMembersQuery, {
      teamIds,
    });
    teammateUserIds = teammates.team_members.map((row) => row.user_id);
  }

  const blocked = new Set<string>([
    ...social.blocks_out.map((b) => b.blocked_id),
    ...social.blocks_in.map((b) => b.blocker_id),
  ]);

  const candidateUserIds = Array.from(
    new Set([
      currentUserId,
      ...social.outgoing.map((f) => f.addressee_id),
      ...social.incoming.map((f) => f.requester_id),
      ...teammateUserIds,
    ]),
  );

  const sourceUserIds = candidateUserIds.filter((id) => id === currentUserId || !blocked.has(id));

  const queryLimit = limit + 1;

  const feedResponse = cursor
    ? await client.request<{ activities: FeedActivity[] }>(getFeedWithCursorQuery, {
        userIds: sourceUserIds,
        limit: queryLimit,
        cursor,
      })
    : await client.request<{ activities: FeedActivity[] }>(getFeedWithoutCursorQuery, {
        userIds: sourceUserIds,
        limit: queryLimit,
      });

  const hasMore = feedResponse.activities.length > limit;
  const activities = hasMore ? feedResponse.activities.slice(0, limit) : feedResponse.activities;
  const nextCursor = hasMore ? activities[activities.length - 1]?.created_at ?? null : null;

  return {
    success: true,
    items: activities.map((activity) => ({
      id: activity.id,
      created_at: activity.created_at,
      status: activity.status,
      user_id: activity.user_id,
      event_id: activity.event_id,
      distance_km: activity.distance_km,
      duration_seconds: activity.duration_seconds,
      route_polyline: activity.event?.route?.route_polyline ?? null,
      profile: activity.profile,
    })),
    pagination: {
      limit,
      cursor,
      next_cursor: nextCursor,
      has_more: hasMore,
    },
  };
}
