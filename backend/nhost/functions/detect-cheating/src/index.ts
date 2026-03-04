import { GraphQLClient, gql } from 'graphql-request';

interface Input {
  activity_id: string;
}

interface TrackpointRow {
  point: unknown;
  speed_mps: number | null;
  recorded_at: string;
}

interface LatLng {
  lat: number;
  lng: number;
}

const getTrackpoints = gql`
  query Trackpoints($activityId: uuid!) {
    activity_trackpoints(where: { activity_id: { _eq: $activityId } }, order_by: [{ recorded_at: asc }, { seq: asc }]) {
      point
      speed_mps
      recorded_at
    }
  }
`;

const updateActivity = gql`
  mutation UpdateActivity($activityId: uuid!, $status: activity_status!, $suspectedVehicle: Boolean!) {
    update_activities_by_pk(
      pk_columns: { id: $activityId }
      _set: { status: $status, suspected_vehicle: $suspectedVehicle }
    ) {
      id
      status
      suspected_vehicle
    }
  }
`;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineDistanceMeters(a: LatLng, b: LatLng): number {
  const earthRadiusM = 6371000;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(a.lat)) *
      Math.cos(toRadians(b.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return 2 * earthRadiusM * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function parsePoint(point: unknown): LatLng | null {
  if (!point) {
    return null;
  }

  if (typeof point === 'string') {
    try {
      const parsed = JSON.parse(point) as { coordinates?: [number, number] };
      if (parsed.coordinates && parsed.coordinates.length >= 2) {
        return { lng: parsed.coordinates[0], lat: parsed.coordinates[1] };
      }
    } catch {
      return null;
    }
  }

  if (typeof point === 'object') {
    const maybeGeo = point as { coordinates?: [number, number] };
    if (maybeGeo.coordinates && maybeGeo.coordinates.length >= 2) {
      return { lng: maybeGeo.coordinates[0], lat: maybeGeo.coordinates[1] };
    }
  }

  return null;
}

function detectSuspicious(trackpoints: TrackpointRow[]): {
  suspected: boolean;
  reason: 'speed' | 'jump' | 'acceleration' | null;
  maxSpeedMps: number;
  maxJumpM: number;
  maxAcceleration: number;
} {
  let maxSpeedMps = 0;
  let maxJumpM = 0;
  let maxAcceleration = 0;
  let previousSpeed = 0;

  for (let i = 1; i < trackpoints.length; i += 1) {
    const previous = trackpoints[i - 1];
    const current = trackpoints[i];

    const prevPoint = parsePoint(previous.point);
    const currentPoint = parsePoint(current.point);
    if (!prevPoint || !currentPoint) {
      continue;
    }

    const prevTime = new Date(previous.recorded_at).getTime();
    const currentTime = new Date(current.recorded_at).getTime();
    const deltaSeconds = (currentTime - prevTime) / 1000;
    if (deltaSeconds <= 0) {
      continue;
    }

    const jumpMeters = haversineDistanceMeters(prevPoint, currentPoint);
    maxJumpM = Math.max(maxJumpM, jumpMeters);

    const speedMps = current.speed_mps ?? jumpMeters / deltaSeconds;
    maxSpeedMps = Math.max(maxSpeedMps, speedMps);

    const acceleration = (speedMps - previousSpeed) / deltaSeconds;
    maxAcceleration = Math.max(maxAcceleration, acceleration);
    previousSpeed = speedMps;

    if (speedMps > 7) {
      return { suspected: true, reason: 'speed', maxSpeedMps, maxJumpM, maxAcceleration };
    }

    if (jumpMeters > 50) {
      return { suspected: true, reason: 'jump', maxSpeedMps, maxJumpM, maxAcceleration };
    }

    if (acceleration > 4) {
      return { suspected: true, reason: 'acceleration', maxSpeedMps, maxJumpM, maxAcceleration };
    }
  }

  return { suspected: false, reason: null, maxSpeedMps, maxJumpM, maxAcceleration };
}

export default async function handler(req: { body?: Input }) {
  const url = process.env.NHOST_GRAPHQL_URL;
  const adminSecret = process.env.NHOST_ADMIN_SECRET;

  if (!url || !adminSecret) {
    throw new Error('NHOST_GRAPHQL_URL and NHOST_ADMIN_SECRET are required');
  }

  const activityId = req.body?.activity_id;
  if (!activityId) {
    return { success: false, error: 'activity_id is required' };
  }

  const client = new GraphQLClient(url, {
    headers: {
      'x-hasura-admin-secret': adminSecret,
    },
  });

  const data = await client.request<{ activity_trackpoints: TrackpointRow[] }>(getTrackpoints, { activityId });
  const verdict = detectSuspicious(data.activity_trackpoints);
  const status = verdict.suspected ? 'rejected' : 'validated';

  await client.request(updateActivity, {
    activityId,
    status,
    suspectedVehicle: verdict.suspected,
  });

  return {
    success: true,
    activity_id: activityId,
    suspected_vehicle: verdict.suspected,
    reason: verdict.reason,
    status,
    metrics: {
      max_speed_mps: Number(verdict.maxSpeedMps.toFixed(3)),
      max_jump_m: Number(verdict.maxJumpM.toFixed(3)),
      max_acceleration_mps2: Number(verdict.maxAcceleration.toFixed(3)),
    },
  };
}
