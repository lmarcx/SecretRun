import { GraphQLClient, gql } from 'graphql-request';

interface Input {
  activity_id: string;
}

interface AuthenticatedRequest {
  body?: Input;
  headers?: Record<string, string | string[] | undefined>;
}

interface PointGeoJson {
  coordinates?: [number, number];
}

interface Trackpoint {
  seq: number;
  point: PointGeoJson | string | null;
  recorded_at: string;
  speed_mps: number | null;
  speed_kmh: number | null;
}

interface ActivityInfo {
  id: string;
  user_id: string;
  event_id: string;
  status: 'pending' | 'validated' | 'rejected';
  distance_km: number | string;
  duration_seconds: number;
  avg_speed_kmh: number | string | null;
  points: number;
  finished_at: string | null;
  suspected_vehicle: boolean;
}

interface ValidationSummary {
  distanceMeters: number;
  durationSeconds: number;
  avgSpeedKmh: number;
  finishedAt: string;
  suspectedVehicle: boolean;
  reason: string | null;
}

const MAX_JUMP_METERS = 250;
const MAX_JUMP_WINDOW_SECONDS = 10;
const MAX_SPEED_MPS = 8.5;
const DUPLICATE_DISTANCE_METERS = 2;
const DUPLICATE_WINDOW_MS = 1500;
const MIN_RUN_DURATION_SECONDS = 60;
const MIN_RUN_DISTANCE_METERS = 250;
const BASE_POINTS = 10;

const getActivityQuery = gql`
  query GetActivity($activityId: uuid!) {
    activities_by_pk(id: $activityId) {
      id
      user_id
      event_id
      status
      distance_km
      duration_seconds
      avg_speed_kmh
      points
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

const getTrackpointsQuery = gql`
  query GetTrackpoints($activityId: uuid!) {
    activity_trackpoints(
      where: { activity_id: { _eq: $activityId } }
      order_by: [{ recorded_at: asc }, { seq: asc }]
    ) {
      seq
      point
      recorded_at
      speed_mps
      speed_kmh
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

const rejectActivityMutation = gql`
  mutation RejectActivity(
    $activityId: uuid!
    $finishedAt: timestamptz!
    $distanceKm: numeric!
    $durationSeconds: Int!
    $avgSpeedKmh: numeric!
    $reasonIsVehicle: Boolean!
  ) {
    update_activities_by_pk(
      pk_columns: { id: $activityId }
      _set: {
        status: rejected
        finished_at: $finishedAt
        distance_km: $distanceKm
        duration_seconds: $durationSeconds
        avg_speed_kmh: $avgSpeedKmh
        points: 0
        suspected_vehicle: $reasonIsVehicle
      }
    ) {
      id
      status
    }
  }
`;

const finalizeValidatedActivityMutation = gql`
  mutation FinalizeValidatedActivity(
    $activityId: uuid!
    $finishedAt: timestamptz!
    $distanceKm: numeric!
    $durationSeconds: Int!
    $avgSpeedKmh: numeric!
    $points: Int!
    $teamBonusPoints: Int!
  ) {
    finalize_validated_activity(
      args: {
        _activity_id: $activityId
        _finished_at: $finishedAt
        _distance_km: $distanceKm
        _duration_seconds: $durationSeconds
        _avg_speed_kmh: $avgSpeedKmh
        _points: $points
        _team_bonus_points: $teamBonusPoints
      }
    ) {
      activity_id
      season_id
      user_id
      team_id
      user_points
      team_points
      created_at
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

function requireInternalRequest(req: AuthenticatedRequest, adminSecret: string): boolean {
  const providedSecret =
    getHeaderValue(req.headers, 'x-hasura-admin-secret') ?? getHeaderValue(req.headers, 'X-Hasura-Admin-Secret');

  return providedSecret === adminSecret;
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

function buildFallbackFinishedAt(trackpoints: Trackpoint[]): string {
  const lastRecordedAt = trackpoints[trackpoints.length - 1]?.recorded_at;
  const finishedAt = lastRecordedAt ? new Date(lastRecordedAt) : new Date();
  return Number.isNaN(finishedAt.getTime()) ? new Date().toISOString() : finishedAt.toISOString();
}

function validateTrackpoints(trackpoints: Trackpoint[]): ValidationSummary {
  if (trackpoints.length < 2) {
    return {
      distanceMeters: 0,
      durationSeconds: 0,
      avgSpeedKmh: 0,
      finishedAt: buildFallbackFinishedAt(trackpoints),
      suspectedVehicle: false,
      reason: 'insufficient_trackpoints',
    };
  }

  const firstTrackpoint = trackpoints[0];
  const lastTrackpoint = trackpoints[trackpoints.length - 1];

  if (!firstTrackpoint || !lastTrackpoint) {
    return {
      distanceMeters: 0,
      durationSeconds: 0,
      avgSpeedKmh: 0,
      finishedAt: buildFallbackFinishedAt(trackpoints),
      suspectedVehicle: false,
      reason: 'insufficient_trackpoints',
    };
  }

  const firstTimestampMs = new Date(firstTrackpoint.recorded_at).getTime();
  const lastTimestampMs = new Date(lastTrackpoint.recorded_at).getTime();

  if (Number.isNaN(firstTimestampMs) || Number.isNaN(lastTimestampMs) || lastTimestampMs <= firstTimestampMs) {
    return {
      distanceMeters: 0,
      durationSeconds: 0,
      avgSpeedKmh: 0,
      finishedAt: buildFallbackFinishedAt(trackpoints),
      suspectedVehicle: false,
      reason: 'invalid_timestamps',
    };
  }

  let totalDistanceMeters = 0;

  for (let index = 1; index < trackpoints.length; index += 1) {
    const previous = trackpoints[index - 1];
    const current = trackpoints[index];

    if (!previous || !current) {
      continue;
    }

    const previousPoint = parsePoint(previous.point);
    const currentPoint = parsePoint(current.point);

    if (!previousPoint || !currentPoint) {
      return {
        distanceMeters: totalDistanceMeters,
        durationSeconds: Math.max(0, Math.round((lastTimestampMs - firstTimestampMs) / 1000)),
        avgSpeedKmh: 0,
        finishedAt: new Date(lastTimestampMs).toISOString(),
        suspectedVehicle: false,
        reason: 'malformed_trackpoint',
      };
    }

    const previousTimestampMs = new Date(previous.recorded_at).getTime();
    const currentTimestampMs = new Date(current.recorded_at).getTime();
    const deltaMs = currentTimestampMs - previousTimestampMs;

    if (Number.isNaN(previousTimestampMs) || Number.isNaN(currentTimestampMs) || deltaMs <= 0) {
      return {
        distanceMeters: totalDistanceMeters,
        durationSeconds: Math.max(0, Math.round((lastTimestampMs - firstTimestampMs) / 1000)),
        avgSpeedKmh: 0,
        finishedAt: new Date(lastTimestampMs).toISOString(),
        suspectedVehicle: false,
        reason: 'out_of_order_timestamps',
      };
    }

    const distanceMeters = haversineDistanceMeters(
      previousPoint.lat,
      previousPoint.lng,
      currentPoint.lat,
      currentPoint.lng,
    );

    if (distanceMeters < DUPLICATE_DISTANCE_METERS && deltaMs < DUPLICATE_WINDOW_MS) {
      continue;
    }

    const deltaSeconds = deltaMs / 1000;
    const computedSpeedMps = distanceMeters / deltaSeconds;
    const reportedSpeedMps = current.speed_mps ?? computedSpeedMps;

    if (distanceMeters > MAX_JUMP_METERS && deltaSeconds <= MAX_JUMP_WINDOW_SECONDS) {
      return {
        distanceMeters: totalDistanceMeters,
        durationSeconds: Math.max(0, Math.round((lastTimestampMs - firstTimestampMs) / 1000)),
        avgSpeedKmh: 0,
        finishedAt: new Date(lastTimestampMs).toISOString(),
        suspectedVehicle: true,
        reason: 'impossible_jump',
      };
    }

    if (computedSpeedMps > MAX_SPEED_MPS || reportedSpeedMps > MAX_SPEED_MPS) {
      return {
        distanceMeters: totalDistanceMeters,
        durationSeconds: Math.max(0, Math.round((lastTimestampMs - firstTimestampMs) / 1000)),
        avgSpeedKmh: 0,
        finishedAt: new Date(lastTimestampMs).toISOString(),
        suspectedVehicle: true,
        reason: 'speed_limit_exceeded',
      };
    }

    totalDistanceMeters += distanceMeters;
  }

  const durationSeconds = Math.max(0, Math.round((lastTimestampMs - firstTimestampMs) / 1000));

  if (durationSeconds < MIN_RUN_DURATION_SECONDS) {
    return {
      distanceMeters: totalDistanceMeters,
      durationSeconds,
      avgSpeedKmh: durationSeconds > 0 ? Number((((totalDistanceMeters / 1000) / durationSeconds) * 3600).toFixed(2)) : 0,
      finishedAt: new Date(lastTimestampMs).toISOString(),
      suspectedVehicle: false,
      reason: 'too_short_duration',
    };
  }

  if (totalDistanceMeters < MIN_RUN_DISTANCE_METERS) {
    return {
      distanceMeters: totalDistanceMeters,
      durationSeconds,
      avgSpeedKmh: durationSeconds > 0 ? Number((((totalDistanceMeters / 1000) / durationSeconds) * 3600).toFixed(2)) : 0,
      finishedAt: new Date(lastTimestampMs).toISOString(),
      suspectedVehicle: false,
      reason: 'too_short_distance',
    };
  }

  return {
    distanceMeters: totalDistanceMeters,
    durationSeconds,
    avgSpeedKmh: Number((((totalDistanceMeters / 1000) / durationSeconds) * 3600).toFixed(2)),
    finishedAt: new Date(lastTimestampMs).toISOString(),
    suspectedVehicle: false,
    reason: null,
  };
}

function logEvent(event: string, payload: Record<string, unknown>) {
  console.log(JSON.stringify({ scope: 'activity.validation', event, ...payload }));
}

async function rejectActivity(
  client: GraphQLClient,
  activityId: string,
  summary: ValidationSummary,
): Promise<void> {
  await client.request(rejectActivityMutation, {
    activityId,
    finishedAt: summary.finishedAt,
    distanceKm: Number((summary.distanceMeters / 1000).toFixed(3)),
    durationSeconds: summary.durationSeconds,
    avgSpeedKmh: summary.avgSpeedKmh,
    reasonIsVehicle: summary.suspectedVehicle,
  });
}

export default async function handler(req: AuthenticatedRequest) {
  const url = process.env.NHOST_GRAPHQL_URL;
  const adminSecret = process.env.NHOST_ADMIN_SECRET;

  if (!url || !adminSecret) {
    throw new Error('NHOST_GRAPHQL_URL and NHOST_ADMIN_SECRET are required');
  }

  if (!requireInternalRequest(req, adminSecret)) {
    logEvent('denied', {
      reason: 'forbidden',
    });
    return {
      success: false,
      error: 'Forbidden.',
    };
  }

  const activityId = req.body?.activity_id;
  if (!activityId) {
    logEvent('rejected', {
      reason: 'missing_activity_id',
    });
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
    logEvent('denied', {
      activity_id: activityId,
      reason: 'activity_not_found',
    });
    return {
      success: false,
      error: 'Activity not found.',
    };
  }

  if (activity.status === 'validated' || activity.status === 'rejected') {
    logEvent('reused', {
      activity_id: activity.id,
      user_id: activity.user_id,
      status: activity.status,
    });

    return {
      success: true,
      activity_id: activity.id,
      status: activity.status,
      reused: true,
    };
  }

  const participationResponse = await client.request<{
    event_participants: Array<{ event_id: string }>;
  }>(getParticipationQuery, {
    eventId: activity.event_id,
    userId: activity.user_id,
  });

  if (participationResponse.event_participants.length === 0) {
    const rejectedSummary: ValidationSummary = {
      distanceMeters: 0,
      durationSeconds: 0,
      avgSpeedKmh: 0,
      finishedAt: new Date().toISOString(),
      suspectedVehicle: false,
      reason: 'participant_not_registered',
    };

    await rejectActivity(client, activity.id, rejectedSummary);
    logEvent('rejected', {
      activity_id: activity.id,
      user_id: activity.user_id,
      reason: rejectedSummary.reason,
    });

    return {
      success: true,
      activity_id: activity.id,
      status: 'rejected',
      reason: rejectedSummary.reason,
    };
  }

  const trackpointsResponse = await client.request<{ activity_trackpoints: Trackpoint[] }>(getTrackpointsQuery, {
    activityId,
  });

  logEvent('started', {
    activity_id: activity.id,
    user_id: activity.user_id,
    trackpoint_count: trackpointsResponse.activity_trackpoints.length,
  });

  const summary = validateTrackpoints(trackpointsResponse.activity_trackpoints);
  if (summary.reason) {
    await rejectActivity(client, activity.id, summary);
    logEvent('rejected', {
      activity_id: activity.id,
      user_id: activity.user_id,
      reason: summary.reason,
      duration_seconds: summary.durationSeconds,
      distance_meters: Number(summary.distanceMeters.toFixed(2)),
    });

    return {
      success: true,
      activity_id: activity.id,
      status: 'rejected',
      reason: summary.reason,
      distance_km: Number((summary.distanceMeters / 1000).toFixed(3)),
      duration_seconds: summary.durationSeconds,
    };
  }

  const distanceKm = Number((summary.distanceMeters / 1000).toFixed(3));
  const estimateResponse = await client.request<{
    event_routes: Array<{ duration_sec: number | null }>;
  }>(getEventEstimateQuery, {
    eventId: activity.event_id,
  });

  const estimatedSeconds = estimateResponse.event_routes[0]?.duration_sec ?? summary.durationSeconds;
  const delta = Math.abs(estimatedSeconds - summary.durationSeconds);
  const bonus = Math.max(0, 10 - delta);
  const totalPoints = Math.round(BASE_POINTS + bonus);
  const teamBonusPoints = Number(process.env.TEAM_EVENT_BONUS_POINTS ?? '5');

  let finalizeResponse: {
    finalize_validated_activity: Array<{
      activity_id: string;
      season_id: string;
      user_id: string;
      team_id: string | null;
      user_points: number;
      team_points: number;
      created_at: string;
    }>;
  };

  try {
    finalizeResponse = await client.request<{
      finalize_validated_activity: Array<{
        activity_id: string;
        season_id: string;
        user_id: string;
        team_id: string | null;
        user_points: number;
        team_points: number;
        created_at: string;
      }>;
    }>(finalizeValidatedActivityMutation, {
      activityId: activity.id,
      finishedAt: summary.finishedAt,
      distanceKm,
      durationSeconds: summary.durationSeconds,
      avgSpeedKmh: summary.avgSpeedKmh,
      points: totalPoints,
      teamBonusPoints,
    });
  } catch (error) {
    logEvent('finalize_failed', {
      activity_id: activity.id,
      user_id: activity.user_id,
      message: error instanceof Error ? error.message : 'unknown',
    });
    return {
      success: false,
      error: 'Could not finalize this validated activity right now.',
    };
  }

  const scoring = finalizeResponse.finalize_validated_activity[0] ?? null;

  logEvent('validated', {
    activity_id: activity.id,
    user_id: activity.user_id,
    duration_seconds: summary.durationSeconds,
    distance_meters: Number(summary.distanceMeters.toFixed(2)),
    points: totalPoints,
  });

  return {
    success: true,
    activity_id: activity.id,
    status: 'validated',
    reason: null,
    distance_km: distanceKm,
    duration_seconds: summary.durationSeconds,
    estimated_duration_seconds: estimatedSeconds,
    points: {
      base_points: BASE_POINTS,
      delta,
      bonus,
      total_points: totalPoints,
    },
    scoring,
  };
}
