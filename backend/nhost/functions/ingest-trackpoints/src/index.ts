import { GraphQLClient, gql } from 'graphql-request';

interface RawPointInput {
  lat: number;
  lng: number;
  timestamp: string;
  speed_kmh?: number | null;
}

interface Input {
  activity_id: string;
  points?: RawPointInput[];
}

interface AuthenticatedRequest {
  body?: Input;
  headers?: Record<string, string | string[] | undefined>;
}

interface ActivityState {
  id: string;
  user_id: string;
  event_id: string;
  status: string;
  finished_at: string | null;
}

interface GeoPoint {
  coordinates?: [number, number];
}

interface PreviousTrackpoint {
  seq: number;
  recorded_at: string;
  point: GeoPoint | string | null;
}

interface NormalizedTrackpoint {
  lat: number;
  lng: number;
  timestamp: string;
  speedKmh: number | null;
}

interface TrackpointInsertInput {
  activity_id: string;
  seq: number;
  recorded_at: string;
  point: string;
  speed_mps: number;
  speed_kmh: number;
}

const MAX_JUMP_METERS = 250;
const MAX_JUMP_WINDOW_SECONDS = 10;
const MAX_SPEED_MPS = 8.5;
const DUPLICATE_DISTANCE_METERS = 2;
const DUPLICATE_WINDOW_MS = 1500;

const getActivityStateQuery = gql`
  query GetActivityState($activityId: uuid!) {
    activities_by_pk(id: $activityId) {
      id
      user_id
      event_id
      status
      finished_at
    }
    activity_trackpoints(
      where: { activity_id: { _eq: $activityId } }
      order_by: [{ seq: desc }, { recorded_at: desc }]
      limit: 1
    ) {
      seq
      recorded_at
      point
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

const insertTrackpointsMutation = gql`
  mutation InsertTrackpoints($objects: [activity_trackpoints_insert_input!]!) {
    insert_activity_trackpoints(objects: $objects) {
      affected_rows
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

  return Array.isArray(direct) ? direct[0] ?? null : direct;
}

function getAuthenticatedUserId(req: AuthenticatedRequest): string | null {
  return getHeaderValue(req.headers, 'x-hasura-user-id') ?? getHeaderValue(req.headers, 'X-Hasura-User-Id');
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadiusM = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthRadiusM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parsePoint(point: GeoPoint | string | null): { lat: number; lng: number } | null {
  if (!point) {
    return null;
  }

  if (typeof point === 'string') {
    try {
      const parsed = JSON.parse(point) as GeoPoint;
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

function normalizeTrackpoints(payload: Input | undefined): NormalizedTrackpoint[] {
  const rawPoints = payload?.points ?? [];

  return rawPoints.map((point) => {
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) {
      throw new Error('Points must include finite lat/lng values.');
    }

    const timestamp = new Date(point.timestamp);
    if (Number.isNaN(timestamp.getTime())) {
      throw new Error('Points must include valid ISO timestamps.');
    }

    return {
      lat: point.lat,
      lng: point.lng,
      timestamp: timestamp.toISOString(),
      speedKmh:
        point.speed_kmh === undefined || point.speed_kmh === null
          ? null
          : Number(Number(point.speed_kmh).toFixed(2)),
    };
  });
}

function logEvent(event: string, payload: Record<string, unknown>) {
  console.log(JSON.stringify({ scope: 'activity.ingest', event, ...payload }));
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

  let normalizedTrackpoints: NormalizedTrackpoint[];
  try {
    normalizedTrackpoints = normalizeTrackpoints(payload);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Trackpoint payload is invalid.',
    };
  }

  if (normalizedTrackpoints.length === 0) {
    return {
      success: true,
      accepted: 0,
      rejected: 0,
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

  const stateResponse = await client.request<{
    activities_by_pk: ActivityState | null;
    activity_trackpoints: PreviousTrackpoint[];
  }>(getActivityStateQuery, {
    activityId: payload.activity_id,
  });

  const activity = stateResponse.activities_by_pk;
  if (!activity) {
    return {
      success: false,
      error: 'Activity not found.',
    };
  }

  if (activity.user_id !== currentUserId) {
    return {
      success: false,
      error: 'You cannot add trackpoints to another runner activity.',
    };
  }

  const participationResponse = await client.request<{
    event_participants: Array<{ event_id: string }>;
  }>(getParticipationQuery, {
    eventId: activity.event_id,
    userId: currentUserId,
  });

  if (participationResponse.event_participants.length === 0) {
    return {
      success: false,
      error: 'Only registered participants can upload trackpoints for this event.',
    };
  }

  if (activity.finished_at || activity.status !== 'pending') {
    return {
      success: false,
      error: 'Trackpoints cannot be added after the activity is finished.',
    };
  }

  logEvent('started', {
    activity_id: payload.activity_id,
    user_id: currentUserId,
    batch_size: normalizedTrackpoints.length,
  });

  let previousAccepted = stateResponse.activity_trackpoints[0] ?? null;
  let nextSeq = (previousAccepted?.seq ?? 0) + 1;
  let rejected = 0;
  const objects: TrackpointInsertInput[] = [];

  for (const trackpoint of normalizedTrackpoints) {
    const currentTimestampMs = new Date(trackpoint.timestamp).getTime();
    const previousPoint = previousAccepted ? parsePoint(previousAccepted.point) : null;

    if (previousAccepted?.recorded_at) {
      const previousTimestampMs = new Date(previousAccepted.recorded_at).getTime();
      const deltaMs = currentTimestampMs - previousTimestampMs;

      if (deltaMs <= 0) {
        rejected += 1;
        continue;
      }

      if (previousPoint) {
        const distanceMeters = haversineDistanceMeters(previousPoint.lat, previousPoint.lng, trackpoint.lat, trackpoint.lng);
        if (distanceMeters < DUPLICATE_DISTANCE_METERS && deltaMs < DUPLICATE_WINDOW_MS) {
          rejected += 1;
          continue;
        }

        const deltaSeconds = deltaMs / 1000;
        const computedSpeedMps = distanceMeters / deltaSeconds;
        const looksLikeJump = distanceMeters > MAX_JUMP_METERS && deltaSeconds <= MAX_JUMP_WINDOW_SECONDS;

        if (looksLikeJump || computedSpeedMps > MAX_SPEED_MPS) {
          rejected += 1;
          continue;
        }
      }
    }

    let speedMps = 0;
    if (previousAccepted?.recorded_at && previousPoint) {
      const previousTimestampMs = new Date(previousAccepted.recorded_at).getTime();
      const deltaSeconds = (currentTimestampMs - previousTimestampMs) / 1000;
      if (deltaSeconds > 0) {
        const distanceMeters = haversineDistanceMeters(previousPoint.lat, previousPoint.lng, trackpoint.lat, trackpoint.lng);
        speedMps = Number((distanceMeters / deltaSeconds).toFixed(3));
      }
    }

    const speedKmh = trackpoint.speedKmh ?? Number((speedMps * 3.6).toFixed(2));
    objects.push({
      activity_id: payload.activity_id,
      seq: nextSeq,
      recorded_at: trackpoint.timestamp,
      point: `SRID=4326;POINT(${trackpoint.lng} ${trackpoint.lat})`,
      speed_mps: speedMps,
      speed_kmh: speedKmh,
    });

    previousAccepted = {
      seq: nextSeq,
      recorded_at: trackpoint.timestamp,
      point: {
        coordinates: [trackpoint.lng, trackpoint.lat],
      },
    };
    nextSeq += 1;
  }

  if (objects.length > 0) {
    await client.request<{
      insert_activity_trackpoints: { affected_rows: number };
    }>(insertTrackpointsMutation, {
      objects,
    });
  }

  const accepted = objects.length;

  logEvent('completed', {
    activity_id: payload.activity_id,
    user_id: currentUserId,
    accepted,
    rejected,
  });

  return {
    success: true,
    accepted,
    rejected,
  };
}
