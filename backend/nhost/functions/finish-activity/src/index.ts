import { GraphQLClient, gql } from 'graphql-request';

interface Input {
  activity_id: string;
}

interface AuthenticatedRequest {
  body?: Input;
  headers?: Record<string, string | string[] | undefined>;
}

interface ActivityPayload {
  id: string;
  user_id: string;
  event_id: string;
  status: string;
  points: number | null;
  distance_km: number | string;
  duration_seconds: number;
  avg_speed_kmh: number | string | null;
  started_at: string | null;
  finished_at: string | null;
  suspected_vehicle: boolean;
}

const getActivityQuery = gql`
  query GetActivity($activityId: uuid!) {
    activities_by_pk(id: $activityId) {
      id
      user_id
      event_id
      status
      points
      distance_km
      duration_seconds
      avg_speed_kmh
      started_at
      finished_at
      suspected_vehicle
    }
  }
`;

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
  }
`;

function getFunctionsBaseUrl(): string {
  return process.env.NHOST_FUNCTIONS_BASE_URL ?? 'http://127.0.0.1:1337/v1/functions';
}

function getHeaderValue(
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string,
): string | null {
  const direct = headers?.[name] ?? headers?.[name.toLowerCase()] ?? headers?.[name.toUpperCase()];
  if (!direct) {
    return null;
  }

  return Array.isArray(direct) ? direct[0] ?? null : direct;
}

function getAuthenticatedUserId(req: AuthenticatedRequest): string | null {
  return getHeaderValue(req.headers, 'x-hasura-user-id') ?? getHeaderValue(req.headers, 'X-Hasura-User-Id');
}

function logEvent(event: string, payload: Record<string, unknown>) {
  console.log(JSON.stringify({ scope: 'activity.finish', event, ...payload }));
}

async function fetchActivity(client: GraphQLClient, activityId: string) {
  return client.request<{
    activities_by_pk: ActivityPayload | null;
  }>(getActivityQuery, {
    activityId,
  });
}

export default async function handler(req: AuthenticatedRequest) {
  const url = process.env.NHOST_GRAPHQL_URL;
  const adminSecret = process.env.NHOST_ADMIN_SECRET;

  if (!url || !adminSecret) {
    throw new Error('NHOST_GRAPHQL_URL and NHOST_ADMIN_SECRET are required');
  }

  const payload = req.body;
  if (!payload?.activity_id) {
    logEvent('rejected', {
      reason: 'missing_activity_id',
    });
    return {
      success: false,
      error: 'activity_id is required',
    };
  }

  const currentUserId = getAuthenticatedUserId(req);
  if (!currentUserId) {
    logEvent('denied', {
      activity_id: payload.activity_id,
      reason: 'missing_auth',
    });
    return {
      success: false,
      error: 'Missing authenticated user context.',
    };
  }

  const client = new GraphQLClient(url, {
    headers: {
      'x-hasura-admin-secret': adminSecret,
    },
  });

  const currentActivity = await fetchActivity(client, payload.activity_id);
  const activity = currentActivity.activities_by_pk;

  if (!activity) {
    logEvent('denied', {
      activity_id: payload.activity_id,
      user_id: currentUserId,
      reason: 'activity_not_found',
    });
    return {
      success: false,
      error: 'Activity not found.',
    };
  }

  if (activity.user_id !== currentUserId) {
    logEvent('denied', {
      activity_id: payload.activity_id,
      user_id: currentUserId,
      reason: 'activity_owner_mismatch',
    });
    return {
      success: false,
      error: 'You cannot finish another runner activity.',
    };
  }

  const participation = await client.request<{
    event_participants: Array<{ event_id: string }>;
  }>(getParticipationQuery, {
    eventId: activity.event_id,
    userId: currentUserId,
  });

  if (participation.event_participants.length === 0) {
    logEvent('denied', {
      activity_id: payload.activity_id,
      user_id: currentUserId,
      reason: 'participant_not_registered',
    });
    return {
      success: false,
      error: 'Only registered participants can finish this activity.',
    };
  }

  if (activity.status === 'validated' || activity.status === 'rejected') {
    logEvent('reused', {
      activity_id: activity.id,
      user_id: currentUserId,
      status: activity.status,
    });

    return {
      success: true,
      activity,
      reused: true,
    };
  }

  logEvent('started', {
    activity_id: activity.id,
    user_id: currentUserId,
    status: activity.status,
  });

  const validateResponse = await fetch(`${getFunctionsBaseUrl()}/validate-activity`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': adminSecret,
    },
    body: JSON.stringify({ activity_id: payload.activity_id }),
  });

  const validateResult = (await validateResponse.json().catch(() => null)) as
    | { success?: boolean; error?: string; status?: string; reason?: string | null; reused?: boolean }
    | null;

  if (!validateResponse.ok || !validateResult?.success) {
    logEvent('validation_failed', {
      activity_id: activity.id,
      user_id: currentUserId,
      status_code: validateResponse.status,
      reason: validateResult?.error ?? 'unknown',
    });
    return {
      success: false,
      error: validateResult?.error ?? `validate-activity failed with status ${validateResponse.status}.`,
    };
  }

  const finalizedActivity = await fetchActivity(client, payload.activity_id);
  if (!finalizedActivity.activities_by_pk) {
    return {
      success: false,
      error: 'Activity disappeared during finalization.',
    };
  }

  logEvent('completed', {
    activity_id: finalizedActivity.activities_by_pk.id,
    user_id: currentUserId,
    status: finalizedActivity.activities_by_pk.status,
  });

  return {
    success: true,
    activity: finalizedActivity.activities_by_pk,
    reason: validateResult?.reason ?? null,
    reused: Boolean(validateResult?.reused),
  };
}
