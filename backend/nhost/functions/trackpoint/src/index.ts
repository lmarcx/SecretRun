import { GraphQLClient, gql } from 'graphql-request';

interface RawTrackpointInput {
  lat: number;
  lng: number;
  timestamp: string;
  speed_kmh?: number | null;
}

interface Input {
  activity_id: string;
  lat?: number;
  lng?: number;
  timestamp?: string;
  speed_kmh?: number | null;
  trackpoints?: RawTrackpointInput[];
}

interface PrevTrackpoint {
  seq: number;
  point: { coordinates?: [number, number] } | null;
  recorded_at: string;
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

interface AuthenticatedRequest {
  body?: Input;
  headers?: Record<string, string | string[] | undefined>;
}

const MAX_JUMP_METERS = 250;
const MAX_JUMP_WINDOW_SECONDS = 10;
const MAX_SPEED_MPS = 8.5;
const DUPLICATE_DISTANCE_METERS = 2;
const DUPLICATE_WINDOW_MS = 1500;

const getPreviousTrackpointQuery = gql`
  query PreviousTrackpoint($activityId: uuid!) {
    activities_by_pk(id: $activityId) {
      id
      user_id
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

  return Array.isArray(direct) ? direct[0] : direct;
}

function getAuthenticatedUserId(req: AuthenticatedRequest): string | null {
  return (
    getHeaderValue(req.headers, 'x-hasura-user-id') ?? getHeaderValue(req.headers, 'X-Hasura-User-Id')
  );
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

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusM * c;
}

function normalizeTrackpoints(payload: Input | undefined): NormalizedTrackpoint[] {
  if (!payload?.activity_id) {
    return [];
  }

  const rawTrackpoints =
    payload.trackpoints && payload.trackpoints.length > 0
      ? payload.trackpoints
      : payload.lat !== undefined && payload.lng !== undefined && payload.timestamp
        ? [
            {
              lat: payload.lat,
              lng: payload.lng,
              timestamp: payload.timestamp,
              speed_kmh: payload.speed_kmh ?? null,
            },
          ]
        : [];

  return rawTrackpoints.map((trackpoint) => {
    if (!Number.isFinite(trackpoint.lat) || !Number.isFinite(trackpoint.lng)) {
      throw new Error('Trackpoints must include finite lat/lng values.');
    }

    const timestamp = new Date(trackpoint.timestamp);
    if (Number.isNaN(timestamp.getTime())) {
      throw new Error('Trackpoints must include valid ISO timestamps.');
    }

    return {
      lat: trackpoint.lat,
      lng: trackpoint.lng,
      timestamp: timestamp.toISOString(),
      speedKmh:
        trackpoint.speed_kmh === undefined || trackpoint.speed_kmh === null
          ? null
          : Number(Number(trackpoint.speed_kmh).toFixed(2)),
    };
  });
}

function buildWarning(insertedCount: number, skippedCount: number, suspiciousPoints: number): string | null {
  if (insertedCount === 0 && skippedCount > 0) {
    return 'No trackpoints were accepted from this batch.';
  }

  if (suspiciousPoints > 0) {
    return 'Some trackpoints were skipped because they looked inconsistent.';
  }

  if (skippedCount > 0) {
    return 'Some duplicate trackpoints were skipped.';
  }

  return null;
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
      success: false,
      error: 'At least one trackpoint is required.',
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

  const previousResponse = await client.request<{
    activities_by_pk: { id: string; user_id: string; finished_at: string | null } | null;
    activity_trackpoints: PrevTrackpoint[];
  }>(getPreviousTrackpointQuery, {
    activityId: payload.activity_id,
  });

  const activity = previousResponse.activities_by_pk;
  if (!activity) {
    return {
      success: false,
      error: 'Activity not found.',
    };
  }

  if (activity.user_id !== currentUserId) {
    return {
      success: false,
      error: 'You cannot add trackpoints to another runner\'s activity.',
    };
  }

  if (activity.finished_at) {
    return {
      success: false,
      error: 'Trackpoints cannot be added after the activity is finished.',
    };
  }

  let previousAccepted = previousResponse.activity_trackpoints[0] ?? null;
  let nextSeq = (previousAccepted?.seq ?? 0) + 1;
  let skippedCount = 0;
  let suspiciousPoints = 0;
  const objects: TrackpointInsertInput[] = [];

  for (const trackpoint of normalizedTrackpoints) {
    const currentTimestampMs = new Date(trackpoint.timestamp).getTime();

    if (previousAccepted?.recorded_at) {
      const previousTimestampMs = new Date(previousAccepted.recorded_at).getTime();
      const deltaMs = currentTimestampMs - previousTimestampMs;

      if (deltaMs <= 0) {
        skippedCount += 1;
        suspiciousPoints += 1;
        continue;
      }

      if (previousAccepted.point?.coordinates) {
        const [prevLng, prevLat] = previousAccepted.point.coordinates;
        const distanceMeters = haversineDistanceMeters(prevLat, prevLng, trackpoint.lat, trackpoint.lng);
        if (distanceMeters < DUPLICATE_DISTANCE_METERS && deltaMs < DUPLICATE_WINDOW_MS) {
          skippedCount += 1;
          continue;
        }

        const deltaSeconds = deltaMs / 1000;
        const computedSpeedMps = distanceMeters / deltaSeconds;
        const looksLikeJump = distanceMeters > MAX_JUMP_METERS && deltaSeconds <= MAX_JUMP_WINDOW_SECONDS;

        if (looksLikeJump || computedSpeedMps > MAX_SPEED_MPS) {
          skippedCount += 1;
          suspiciousPoints += 1;
          continue;
        }
      }
    }

    let speedMps = 0;
    if (previousAccepted?.point?.coordinates) {
      const [prevLng, prevLat] = previousAccepted.point.coordinates;
      const previousTimestampMs = new Date(previousAccepted.recorded_at).getTime();
      const deltaSeconds = (currentTimestampMs - previousTimestampMs) / 1000;

      if (deltaSeconds > 0) {
        const distanceMeters = haversineDistanceMeters(prevLat, prevLng, trackpoint.lat, trackpoint.lng);
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

  const insertedCount = objects.length;
  const warning = buildWarning(insertedCount, skippedCount, suspiciousPoints);

  return {
    success: true,
    inserted_count: insertedCount,
    skipped_count: skippedCount,
    suspicious_points: suspiciousPoints,
    warning,
  };
}
