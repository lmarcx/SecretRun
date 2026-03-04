import { GraphQLClient, gql } from 'graphql-request';

interface Input {
  activity_id: string;
  lat: number;
  lng: number;
  timestamp: string;
}

interface PrevTrackpoint {
  seq: number;
  point: { coordinates?: [number, number] } | null;
  recorded_at: string;
}

const getPreviousTrackpointQuery = gql`
  query PreviousTrackpoint($activityId: uuid!) {
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

const insertTrackpointMutation = gql`
  mutation InsertTrackpoint(
    $activityId: uuid!
    $seq: Int!
    $recordedAt: timestamptz!
    $point: geography!
    $speedMps: numeric
    $speedKmh: numeric
  ) {
    insert_activity_trackpoints_one(
      object: {
        activity_id: $activityId
        seq: $seq
        recorded_at: $recordedAt
        point: $point
        speed_mps: $speedMps
        speed_kmh: $speedKmh
      }
    ) {
      id
      seq
      speed_mps
    }
  }
`;

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

function computeSpeedMps(previous: PrevTrackpoint | null, lat: number, lng: number, timestamp: string): number {
  if (!previous?.point?.coordinates) {
    return 0;
  }

  const [prevLng, prevLat] = previous.point.coordinates;
  const prevTimestampMs = new Date(previous.recorded_at).getTime();
  const currentTimestampMs = new Date(timestamp).getTime();

  const deltaSeconds = (currentTimestampMs - prevTimestampMs) / 1000;
  if (deltaSeconds <= 0) {
    return 0;
  }

  const distanceMeters = haversineDistanceMeters(prevLat, prevLng, lat, lng);
  return Number((distanceMeters / deltaSeconds).toFixed(3));
}

export default async function handler(req: { body?: Input }) {
  const url = process.env.NHOST_GRAPHQL_URL;
  const adminSecret = process.env.NHOST_ADMIN_SECRET;

  if (!url || !adminSecret) {
    throw new Error('NHOST_GRAPHQL_URL and NHOST_ADMIN_SECRET are required');
  }

  const payload = req.body;
  if (!payload?.activity_id || payload.lat === undefined || payload.lng === undefined || !payload.timestamp) {
    return {
      success: false,
      error: 'activity_id, lat, lng and timestamp are required',
    };
  }

  const client = new GraphQLClient(url, {
    headers: {
      'x-hasura-admin-secret': adminSecret,
    },
  });

  const previousResponse = await client.request<{ activity_trackpoints: PrevTrackpoint[] }>(
    getPreviousTrackpointQuery,
    {
      activityId: payload.activity_id,
    },
  );

  const previous = previousResponse.activity_trackpoints[0] ?? null;
  const nextSeq = (previous?.seq ?? 0) + 1;
  const speedMps = computeSpeedMps(previous, payload.lat, payload.lng, payload.timestamp);
  const speedKmh = Number((speedMps * 3.6).toFixed(2));
  const point = `SRID=4326;POINT(${payload.lng} ${payload.lat})`;

  const insertResponse = await client.request<{
    insert_activity_trackpoints_one: { id: number; seq: number; speed_mps: number | null };
  }>(insertTrackpointMutation, {
    activityId: payload.activity_id,
    seq: nextSeq,
    recordedAt: payload.timestamp,
    point,
    speedMps,
    speedKmh,
  });

  return {
    success: true,
    trackpoint_id: insertResponse.insert_activity_trackpoints_one.id,
    seq: insertResponse.insert_activity_trackpoints_one.seq,
    speed_mps: insertResponse.insert_activity_trackpoints_one.speed_mps,
  };
}
