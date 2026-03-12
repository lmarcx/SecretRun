import { GraphQLClient, gql } from 'graphql-request';

interface Input {
  activity_id: string;
}

interface AuthenticatedRequest {
  body?: Input;
  headers?: Record<string, string | string[] | undefined>;
}

const activityQuery = gql`
  query GetActivity($activityId: uuid!) {
    activities_by_pk(id: $activityId) {
      id
      user_id
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
  mutation FinishActivity($activityId: uuid!, $finishedAt: timestamptz!) {
    update_activities_by_pk(
      pk_columns: { id: $activityId }
      _set: { finished_at: $finishedAt }
    ) {
      id
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

  return Array.isArray(direct) ? direct[0] : direct;
}

function getAuthenticatedUserId(req: AuthenticatedRequest): string | null {
  return (
    getHeaderValue(req.headers, 'x-hasura-user-id') ?? getHeaderValue(req.headers, 'X-Hasura-User-Id')
  );
}

async function fetchActivity(client: GraphQLClient, activityId: string) {
  return client.request<{
    activities_by_pk: {
      id: string;
      user_id: string;
      status: string;
      points: number | null;
      distance_km: number | string;
      duration_seconds: number;
      avg_speed_kmh: number | string | null;
      started_at: string | null;
      finished_at: string | null;
    } | null;
  }>(activityQuery, {
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
    return {
      success: false,
      error: 'activity_id is required',
    };
  }

  const currentUserId = getAuthenticatedUserId(req);
  if (!currentUserId) {
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
    return {
      success: false,
      error: 'Activity not found',
    };
  }

  if (activity.user_id !== currentUserId) {
    return {
      success: false,
      error: 'You cannot finish another runner\'s activity.',
    };
  }

  if (!activity.finished_at) {
    await client.request<{
      update_activities_by_pk: { id: string } | null;
    }>(mutation, {
      activityId: payload.activity_id,
      finishedAt: new Date().toISOString(),
    });
  }

  if (activity.status === 'validated' || activity.status === 'rejected') {
    const finalized = await fetchActivity(client, payload.activity_id);

    return {
      success: true,
      activity: (finalized as typeof currentActivity).activities_by_pk,
    };
  }

  const detectResponse = await fetch(`${getFunctionsBaseUrl()}/detect-cheating`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': adminSecret,
    },
    body: JSON.stringify({ activity_id: payload.activity_id }),
  });

  if (!detectResponse.ok) {
    const body = await detectResponse.text();
    return {
      success: false,
      error: `detect-cheating failed: ${detectResponse.status} ${body}`,
    };
  }

  const detectResult = (await detectResponse.json().catch(() => null)) as
    | { success?: boolean; status?: string; error?: string }
    | null;
  if (!detectResult?.success) {
    return {
      success: false,
      error: detectResult?.error ?? 'detect-cheating returned an invalid response.',
    };
  }

  if (detectResult.status === 'rejected') {
    const rejectedActivity = await fetchActivity(client, payload.activity_id);

    return {
      success: true,
      activity: (rejectedActivity as typeof currentActivity).activities_by_pk,
    };
  }

  const validateResponse = await fetch(`${getFunctionsBaseUrl()}/validate-activity`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': adminSecret,
    },
    body: JSON.stringify({ activity_id: payload.activity_id }),
  });

  if (!validateResponse.ok) {
    const body = await validateResponse.text();
    return {
      success: false,
      error: `validate-activity failed: ${validateResponse.status} ${body}`,
    };
  }

  const validateResult = (await validateResponse.json().catch(() => null)) as
    | { success?: boolean; error?: string }
    | null;
  if (!validateResult?.success) {
    return {
      success: false,
      error: validateResult?.error ?? 'validate-activity returned an invalid response.',
    };
  }

  const finalizedActivity = await fetchActivity(client, payload.activity_id);

  if (!finalizedActivity.activities_by_pk) {
    return {
      success: false,
      error: 'Activity disappeared during finalization.',
    };
  }

  return {
    success: true,
    activity: finalizedActivity.activities_by_pk,
  };
}
