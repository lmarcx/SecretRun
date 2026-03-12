import { GraphQLClient, gql } from 'graphql-request';

interface Input {
  event_id: string;
  started_at?: string;
  user_id?: string;
}

interface AuthenticatedRequest {
  body?: Input;
  headers?: Record<string, string | string[] | undefined>;
}

const getParticipationQuery = gql`
  query GetParticipation($eventId: uuid!, $userId: uuid!) {
    event_participants(
      where: {
        event_id: { _eq: $eventId }
        user_id: { _eq: $userId }
        status: { _eq: "registered" }
      }
      limit: 1
    ) {
      event_id
    }
    pending_activities: activities(
      where: {
        event_id: { _eq: $eventId }
        user_id: { _eq: $userId }
        finished_at: { _is_null: true }
      }
      order_by: [{ created_at: desc }, { id: desc }]
      limit: 1
    ) {
      id
      status
      points
      distance_km
      duration_seconds
      avg_speed_kmh
      started_at
      finished_at
    }
  }
`;

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
      status
      points
      distance_km
      duration_seconds
      avg_speed_kmh
      started_at
      finished_at
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

function normalizeStartedAt(value?: string): string {
  if (!value) {
    return new Date().toISOString();
  }

  const startedAt = new Date(value);
  if (Number.isNaN(startedAt.getTime())) {
    throw new Error('started_at must be a valid ISO timestamp.');
  }

  return startedAt.toISOString();
}

export default async function handler(req: AuthenticatedRequest) {
  const url = process.env.NHOST_GRAPHQL_URL;
  const adminSecret = process.env.NHOST_ADMIN_SECRET;

  if (!url || !adminSecret) {
    throw new Error('NHOST_GRAPHQL_URL and NHOST_ADMIN_SECRET are required');
  }

  const payload = req.body;
  if (!payload?.event_id) {
    return {
      success: false,
      error: 'event_id is required',
    };
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

  const startedAt = normalizeStartedAt(payload.started_at);

  const client = new GraphQLClient(url, {
    headers: {
      'x-hasura-admin-secret': adminSecret,
    },
  });

  const participation = await client.request<{
    event_participants: Array<{ event_id: string }>;
    pending_activities: Array<{
      id: string;
      status: string;
      points: number | null;
      distance_km: number | string;
      duration_seconds: number;
      avg_speed_kmh: number | string | null;
      started_at: string | null;
      finished_at: string | null;
    }>;
  }>(getParticipationQuery, {
    eventId: payload.event_id,
    userId: currentUserId,
  });

  if (participation.event_participants.length === 0) {
    return {
      success: false,
      error: 'Only registered participants can start an activity.',
    };
  }

  const existingActivity = participation.pending_activities[0];
  if (existingActivity) {
    return {
      success: true,
      activity: existingActivity,
      reused: true,
    };
  }

  const response = await client.request<{
    insert_activities_one: {
      id: string;
      status: string;
      points: number | null;
      distance_km: number | string;
      duration_seconds: number;
      avg_speed_kmh: number | string | null;
      started_at: string | null;
      finished_at: string | null;
    };
  }>(mutation, {
    eventId: payload.event_id,
    userId: currentUserId,
    startedAt,
    status: 'pending',
  });

  return {
    success: true,
    activity: response.insert_activities_one,
  };
}
