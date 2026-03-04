import { GraphQLClient, gql } from 'graphql-request';

interface Input {
  activity_id: string;
}

interface PointGeoJson {
  coordinates?: [number, number];
}

interface Trackpoint {
  point: PointGeoJson | string | null;
  recorded_at: string;
}

interface ActivityInfo {
  id: string;
  user_id: string;
  event_id: string;
  status: 'pending' | 'validated' | 'rejected';
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadiusM = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthRadiusM * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function parsePoint(point: PointGeoJson | string | null): { lat: number; lng: number } | null {
  if (!point) {
    return null;
  }

  if (typeof point === 'string') {
    try {
      const parsed = JSON.parse(point) as PointGeoJson;
      if (!parsed.coordinates || parsed.coordinates.length < 2) {
        return null;
      }

      return {
        lng: parsed.coordinates[0],
        lat: parsed.coordinates[1],
      };
    } catch {
      return null;
    }
  }

  if (!point.coordinates || point.coordinates.length < 2) {
    return null;
  }

  return {
    lng: point.coordinates[0],
    lat: point.coordinates[1],
  };
}

function computeDistanceMeters(trackpoints: Trackpoint[]): number {
  let total = 0;

  for (let i = 1; i < trackpoints.length; i += 1) {
    const prev = parsePoint(trackpoints[i - 1].point);
    const current = parsePoint(trackpoints[i].point);

    if (!prev || !current) {
      continue;
    }

    total += haversineDistanceMeters(prev.lat, prev.lng, current.lat, current.lng);
  }

  return total;
}

const getActivityQuery = gql`
  query GetActivity($activityId: uuid!) {
    activities_by_pk(id: $activityId) {
      id
      user_id
      event_id
      status
    }
  }
`;

const getTrackpointsQuery = gql`
  query GetTrackpoints($activityId: uuid!) {
    activity_trackpoints(
      where: { activity_id: { _eq: $activityId } }
      order_by: [{ recorded_at: asc }, { seq: asc }]
    ) {
      point
      recorded_at
    }
  }
`;

const getEventEstimateQuery = gql`
  query GetEventEstimate($eventId: uuid!) {
    event_routes(where: { event_id: { _eq: $eventId } }, limit: 1) {
      duration_sec
    }
  }
`;

const ensureWalletMutation = gql`
  mutation EnsureWallet($userId: uuid!) {
    insert_wallets_one(
      object: { user_id: $userId, balance: 0 }
      on_conflict: { constraint: wallets_user_id_key, update_columns: [updated_at] }
    ) {
      id
      balance
    }
  }
`;

const updateWalletMutation = gql`
  mutation UpdateWallet($userId: uuid!, $delta: Int!, $now: timestamptz!) {
    update_wallets(
      where: { user_id: { _eq: $userId } }
      _inc: { balance: $delta }
      _set: { updated_at: $now }
    ) {
      returning {
        id
        balance
      }
    }
  }
`;

const insertLedgerMutation = gql`
  mutation InsertLedger($walletId: uuid!, $delta: Int!, $reason: String!) {
    insert_wallet_ledger_one(object: { wallet_id: $walletId, delta: $delta, reason: $reason }) {
      id
    }
  }
`;

const updateActivityMutation = gql`
  mutation UpdateActivity(
    $activityId: uuid!
    $distanceKm: numeric!
    $durationSeconds: Int!
    $points: Int!
    $avgSpeedKmh: numeric!
    $finishedAt: timestamptz!
  ) {
    update_activities_by_pk(
      pk_columns: { id: $activityId }
      _set: {
        status: validated
        distance_km: $distanceKm
        duration_seconds: $durationSeconds
        points: $points
        avg_speed_kmh: $avgSpeedKmh
        finished_at: $finishedAt
      }
    ) {
      id
      status
      points
      distance_km
      duration_seconds
    }
  }
`;

function getFunctionsBaseUrl(): string {
  return process.env.NHOST_FUNCTIONS_BASE_URL ?? 'http://127.0.0.1:1337/v1/functions';
}

export default async function handler(req: { body?: Input }) {
  const url = process.env.NHOST_GRAPHQL_URL;
  const adminSecret = process.env.NHOST_ADMIN_SECRET;

  if (!url || !adminSecret) {
    throw new Error('NHOST_GRAPHQL_URL and NHOST_ADMIN_SECRET are required');
  }

  const activityId = req.body?.activity_id;
  if (!activityId) {
    return {
      success: false,
      error: 'activity_id is required',
    };
  }

  const client = new GraphQLClient(url, {
    headers: {
      'x-hasura-admin-secret': adminSecret,
    },
  });

  const activityResponse = await client.request<{ activities_by_pk: ActivityInfo | null }>(getActivityQuery, {
    activityId,
  });

  const activity = activityResponse.activities_by_pk;
  if (!activity) {
    return {
      success: false,
      error: 'Activity not found',
    };
  }

  if (activity.status === 'rejected') {
    return {
      success: false,
      error: 'Activity rejected, cannot validate',
    };
  }

  const trackpointsResponse = await client.request<{ activity_trackpoints: Trackpoint[] }>(getTrackpointsQuery, {
    activityId,
  });

  const trackpoints = trackpointsResponse.activity_trackpoints;
  if (trackpoints.length < 2) {
    return {
      success: false,
      error: 'At least 2 trackpoints are required',
    };
  }

  const distanceMeters = computeDistanceMeters(trackpoints);
  const distanceKm = Number((distanceMeters / 1000).toFixed(3));

  const startedAtMs = new Date(trackpoints[0].recorded_at).getTime();
  const finishedAtMs = new Date(trackpoints[trackpoints.length - 1].recorded_at).getTime();
  const durationSeconds = Math.max(0, Math.round((finishedAtMs - startedAtMs) / 1000));

  const estimateResponse = await client.request<{
    event_routes: Array<{ duration_sec: number | null }>;
  }>(getEventEstimateQuery, {
    eventId: activity.event_id,
  });

  const estimatedSeconds = estimateResponse.event_routes[0]?.duration_sec ?? durationSeconds;

  const basePoints = 10;
  const delta = Math.abs(estimatedSeconds - durationSeconds);
  const bonus = Math.max(0, 10 - delta);
  const totalPoints = Math.round(basePoints + bonus);

  await client.request(ensureWalletMutation, {
    userId: activity.user_id,
  });

  const now = new Date().toISOString();
  const walletResponse = await client.request<{
    update_wallets: { returning: Array<{ id: string; balance: number }> };
  }>(updateWalletMutation, {
    userId: activity.user_id,
    delta: totalPoints,
    now,
  });

  const wallet = walletResponse.update_wallets.returning[0];
  if (!wallet) {
    return {
      success: false,
      error: 'Wallet update failed',
    };
  }

  await client.request(insertLedgerMutation, {
    walletId: wallet.id,
    delta: totalPoints,
    reason: `activity:${activity.id}:validation`,
  });

  const avgSpeedKmh =
    durationSeconds > 0 ? Number(((distanceKm / durationSeconds) * 3600).toFixed(2)) : 0;

  await client.request(updateActivityMutation, {
    activityId: activity.id,
    distanceKm,
    durationSeconds,
    points: totalPoints,
    avgSpeedKmh,
    finishedAt: new Date(finishedAtMs).toISOString(),
  });

  const leaderboardResponse = await fetch(`${getFunctionsBaseUrl()}/update-leaderboards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': adminSecret,
    },
    body: JSON.stringify({ activity_id: activity.id }),
  });

  if (!leaderboardResponse.ok) {
    const body = await leaderboardResponse.text();
    return {
      success: false,
      error: `update-leaderboards failed: ${leaderboardResponse.status} ${body}`,
      activity_id: activity.id,
    };
  }

  let leaderboardResult: unknown = null;
  try {
    leaderboardResult = await leaderboardResponse.json();
  } catch {
    leaderboardResult = { success: false, error: 'Invalid update-leaderboards response' };
  }

  return {
    success: true,
    activity_id: activity.id,
    distance_km: distanceKm,
    duration_seconds: durationSeconds,
    estimated_duration_seconds: estimatedSeconds,
    points: {
      base_points: basePoints,
      delta,
      bonus,
      total_points: totalPoints,
    },
    leaderboard: leaderboardResult,
  };
}
