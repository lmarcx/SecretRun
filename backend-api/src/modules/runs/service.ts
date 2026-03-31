import { ClientError, gql } from 'graphql-request';
import { env } from '../../config/env';
import { AppError } from '../../lib/errors';
import { requestHasura } from '../../lib/hasura';
import { runSingleFlight } from '../../lib/single-flight';
import { assertEventWindow, type EventAccessSnapshot } from '../events/policy';

export interface ApiTrackpointInput {
  lat: number;
  lng: number;
  timestamp: string;
  speed_kmh?: number | null;
}

interface StartLocationInput {
  lat: number;
  lng: number;
  accuracyMeters?: number;
  timestamp?: string;
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
  suspected_vehicle?: boolean;
  event?: EventAccessSnapshot | null;
}

interface PrevTrackpoint {
  seq: number;
  point: { coordinates?: [number, number] } | string | null;
  recorded_at: string;
}

interface Trackpoint extends PrevTrackpoint {
  speed_mps: number | null;
  speed_kmh: number | null;
}

type ReviewStatus = 'completed' | 'flagged' | 'rejected';

interface ValidationSummary {
  distanceMeters: number;
  durationSeconds: number;
  avgSpeedKmh: number;
  finishedAt: string;
  suspectedVehicle: boolean;
  reason: string | null;
  reviewStatus: ReviewStatus;
}

const MAX_JUMP_METERS = 250;
const MAX_JUMP_WINDOW_SECONDS = 10;
const MAX_SPEED_MPS = 8.5;
const MAX_AVG_SPEED_KMH = 20;
const MAX_TOTAL_DISTANCE_METERS = 100_000;
const DUPLICATE_DISTANCE_METERS = 2;
const DUPLICATE_WINDOW_MS = 1500;
const MIN_RUN_DURATION_SECONDS = 60;
const MIN_RUN_DISTANCE_METERS = 250;
const BASE_POINTS = 10;
const MAX_STARTED_AT_FUTURE_SKEW_MS = 2 * 60 * 1000;
const MAX_TRACKPOINT_FUTURE_SKEW_MS = 2 * 60 * 1000;
const START_GRACE_MS = 15 * 1000;
const MAX_START_GPS_ACCURACY_METERS = 80;
const MAX_START_GPS_STARTED_AT_DELTA_MS = 15 * 1000;

const GET_PARTICIPATION_AND_PENDING_QUERY = gql`
  query GetParticipationAndPending($eventId: uuid!, $userId: uuid!) {
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
    event: events_by_pk(id: $eventId) {
      id
      reveal_at
      starts_at
      ends_at
      start_area_center
      start_area_radius_km
    }
    pending_activities: activities(
      where: {
        user_id: { _eq: $userId }
        finished_at: { _is_null: true }
      }
      order_by: [{ created_at: desc }, { id: desc }]
      limit: 1
    ) {
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

const START_ACTIVITY_MUTATION = gql`
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

const GET_ACTIVITY_QUERY = gql`
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
      event {
        id
        reveal_at
        starts_at
        ends_at
        start_area_center
        start_area_radius_km
      }
    }
  }
`;

const GET_PARTICIPATION_QUERY = gql`
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

const GET_PREVIOUS_TRACKPOINT_QUERY = gql`
  query PreviousTrackpoint($activityId: uuid!) {
    activities_by_pk(id: $activityId) {
      id
      user_id
      finished_at
      status
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

const INSERT_TRACKPOINTS_MUTATION = gql`
  mutation InsertTrackpoints($objects: [activity_trackpoints_insert_input!]!) {
    insert_activity_trackpoints(objects: $objects) {
      affected_rows
    }
  }
`;

const GET_TRACKPOINTS_QUERY = gql`
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

const GET_EVENT_ESTIMATE_QUERY = gql`
  query GetEventEstimate($eventId: uuid!) {
    event_routes(where: { event_id: { _eq: $eventId } }, limit: 1) {
      duration_sec
    }
  }
`;

const REJECT_ACTIVITY_MUTATION = gql`
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
      suspected_vehicle
      finished_at
      distance_km
      duration_seconds
      avg_speed_kmh
      points
    }
  }
`;

const FINALIZE_VALIDATED_ACTIVITY_MUTATION = gql`
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
    }
  }
`;

export async function startRun(userId: string, eventId: string, startedAt?: string, startLocation?: StartLocationInput) {
  const normalizedStartedAt = normalizeStartedAt(startedAt);
  const normalizedStartLocation = normalizeStartLocation(startLocation);
  const response = await requestHasura<{
    event_participants: Array<{ event_id: string }>;
    event: EventAccessSnapshot | null;
    pending_activities: ActivityPayload[];
  }>(GET_PARTICIPATION_AND_PENDING_QUERY, {
    eventId,
    userId,
  });

  if (!response.event) {
    throw new AppError(404, 'event_not_found', 'Event not found.');
  }

  assertEventWindow(response.event, 'start');

  if (response.event_participants.length === 0) {
    throw new AppError(403, 'participant_not_registered', 'Only registered participants can start an activity.');
  }

  const existingActivity = response.pending_activities[0];
  if (existingActivity) {
    if (existingActivity.event_id !== eventId) {
      throw new AppError(
        409,
        'activity_already_running',
        'Finish your current activity before starting another one.',
        {
          activityId: existingActivity.id,
          eventId: existingActivity.event_id,
        },
      );
    }

    return {
      success: true,
      activity: existingActivity,
      reused: true,
      serverStatus: 'running' as const,
    };
  }

  assertStartLocationInZone(response.event, normalizedStartedAt, normalizedStartLocation);

  const created = await requestHasura<{
    insert_activities_one: ActivityPayload;
  }>(START_ACTIVITY_MUTATION, {
    eventId,
    userId,
    startedAt: normalizedStartedAt,
    status: 'pending',
  });

  return {
    success: true,
    activity: created.insert_activities_one,
    serverStatus: 'running' as const,
  };
}

export async function finishRun(userId: string, activityId: string, trackpoints: ApiTrackpointInput[]) {
  return runSingleFlight(`finish:${userId}:${activityId}`, async () => {
    const currentActivity = await fetchActivity(activityId);
    const activity = currentActivity.activities_by_pk;

    if (!activity) {
      throw new AppError(404, 'activity_not_found', 'Activity not found.');
    }

    if (activity.user_id !== userId) {
      throw new AppError(403, 'activity_owner_mismatch', 'You cannot finish another runner activity.');
    }

    if (!activity.event) {
      throw new AppError(404, 'event_not_found', 'Event not found.');
    }

    if (activity.status === 'validated' || activity.status === 'rejected') {
      return {
        success: true,
        activity,
        reused: true,
        serverStatus: mapActivityToServerStatus(activity),
        reason: activity.status === 'rejected' ? 'already_finalized' : null,
      };
    }

    assertEventWindow(activity.event, 'finish');

    const participation = await requestHasura<{
      event_participants: Array<{ event_id: string }>;
    }>(GET_PARTICIPATION_QUERY, {
      eventId: activity.event_id,
      userId,
    });

    if (participation.event_participants.length === 0) {
      throw new AppError(403, 'participant_not_registered', 'Only registered participants can finish this activity.');
    }

    if (activity.status !== 'pending') {
      throw new AppError(409, 'invalid_activity_state', 'Only pending activities can be finished.');
    }

    if (trackpoints.length > 0) {
      await insertTrackpoints(userId, activityId, trackpoints);
    }

    const trackpointsResponse = await requestHasura<{
      activity_trackpoints: Trackpoint[];
    }>(GET_TRACKPOINTS_QUERY, {
      activityId,
    });

    const summary = validateTrackpoints(
      activity.started_at,
      activity.event,
      trackpointsResponse.activity_trackpoints,
    );
    if (summary.reviewStatus !== 'completed') {
      await rejectActivity(activityId, summary);

      const rejectedActivity = await fetchActivity(activityId);
      return {
        success: true,
        activity: rejectedActivity.activities_by_pk,
        reason: summary.reason,
        serverStatus: summary.reviewStatus,
      };
    }

    const distanceKm = Number((summary.distanceMeters / 1000).toFixed(3));
    const estimateResponse = await requestHasura<{
      event_routes: Array<{ duration_sec: number | null }>;
    }>(GET_EVENT_ESTIMATE_QUERY, {
      eventId: activity.event_id,
    });

    const estimatedSeconds = estimateResponse.event_routes[0]?.duration_sec ?? summary.durationSeconds;
    const delta = Math.abs(estimatedSeconds - summary.durationSeconds);
    const bonus = Math.max(0, 10 - delta);
    const totalPoints = Math.round(BASE_POINTS + bonus);

    await requestHasura(FINALIZE_VALIDATED_ACTIVITY_MUTATION, {
      activityId: activity.id,
      finishedAt: summary.finishedAt,
      distanceKm,
      durationSeconds: summary.durationSeconds,
      avgSpeedKmh: summary.avgSpeedKmh,
      points: totalPoints,
      teamBonusPoints: env.TEAM_EVENT_BONUS_POINTS,
    });

    const finalizedActivity = await fetchActivity(activityId);
    return {
      success: true,
      activity: finalizedActivity.activities_by_pk,
      reason: null,
      serverStatus: 'completed' as const,
    };
  });
}

async function fetchActivity(activityId: string) {
  return requestHasura<{
    activities_by_pk: ActivityPayload | null;
  }>(GET_ACTIVITY_QUERY, {
    activityId,
  });
}

async function rejectActivity(activityId: string, summary: ValidationSummary) {
  await requestHasura(REJECT_ACTIVITY_MUTATION, {
    activityId,
    finishedAt: summary.finishedAt,
    distanceKm: Number((summary.distanceMeters / 1000).toFixed(3)),
    durationSeconds: summary.durationSeconds,
    avgSpeedKmh: summary.avgSpeedKmh,
    reasonIsVehicle: summary.suspectedVehicle,
  });
}

async function insertTrackpoints(userId: string, activityId: string, trackpoints: ApiTrackpointInput[]) {
  const normalizedTrackpoints = normalizeTrackpoints(trackpoints);

  const previousResponse = await requestHasura<{
    activities_by_pk: { id: string; user_id: string; finished_at: string | null; status: string } | null;
    activity_trackpoints: PrevTrackpoint[];
  }>(GET_PREVIOUS_TRACKPOINT_QUERY, {
    activityId,
  });

  const activity = previousResponse.activities_by_pk;
  if (!activity) {
    throw new AppError(404, 'activity_not_found', 'Activity not found.');
  }

  if (activity.user_id !== userId) {
    throw new AppError(403, 'activity_owner_mismatch', 'You cannot add trackpoints to another runner activity.');
  }

  if (activity.finished_at || activity.status !== 'pending') {
    throw new AppError(409, 'activity_already_finished', 'Trackpoints cannot be added after the activity is finished.');
  }

  let previousAccepted = previousResponse.activity_trackpoints[0] ?? null;
  let nextSeq = (previousAccepted?.seq ?? 0) + 1;
  const objects: Array<{
    activity_id: string;
    seq: number;
    recorded_at: string;
    point: string;
    speed_mps: number;
    speed_kmh: number;
  }> = [];

  for (const trackpoint of normalizedTrackpoints) {
    const currentTimestampMs = new Date(trackpoint.timestamp).getTime();

    if (previousAccepted?.recorded_at) {
      const previousTimestampMs = new Date(previousAccepted.recorded_at).getTime();
      const deltaMs = currentTimestampMs - previousTimestampMs;

      if (deltaMs <= 0) {
        continue;
      }

      const previousPoint = parsePoint(previousAccepted.point);
      if (previousPoint) {
        const distanceMeters = haversineDistanceMeters(previousPoint.lat, previousPoint.lng, trackpoint.lat, trackpoint.lng);
        if (distanceMeters < DUPLICATE_DISTANCE_METERS && deltaMs < DUPLICATE_WINDOW_MS) {
          continue;
        }

        const deltaSeconds = deltaMs / 1000;
        const computedSpeedMps = distanceMeters / deltaSeconds;
        const looksLikeJump = distanceMeters > MAX_JUMP_METERS && deltaSeconds <= MAX_JUMP_WINDOW_SECONDS;
        if (looksLikeJump || computedSpeedMps > MAX_SPEED_MPS) {
          continue;
        }
      }
    }

    let speedMps = 0;
    const previousPoint = parsePoint(previousAccepted?.point ?? null);
    if (previousAccepted?.recorded_at && previousPoint) {
      const previousTimestampMs = new Date(previousAccepted.recorded_at).getTime();
      const deltaSeconds = (currentTimestampMs - previousTimestampMs) / 1000;

      if (deltaSeconds > 0) {
        const distanceMeters = haversineDistanceMeters(previousPoint.lat, previousPoint.lng, trackpoint.lat, trackpoint.lng);
        speedMps = Number((distanceMeters / deltaSeconds).toFixed(3));
      }
    }

    const speedKmh = Number((speedMps * 3.6).toFixed(2));

    objects.push({
      activity_id: activityId,
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

  if (objects.length === 0) {
    return;
  }

  try {
    await requestHasura(INSERT_TRACKPOINTS_MUTATION, {
      objects,
    });
  } catch (error) {
    if (isDuplicateTrackpointInsertError(error)) {
      return;
    }

    throw error;
  }
}

function normalizeStartedAt(value?: string): string {
  if (!value) {
    return new Date().toISOString();
  }

  const startedAt = new Date(value);
  if (Number.isNaN(startedAt.getTime())) {
    throw new AppError(400, 'invalid_started_at', 'startedAt must be a valid ISO timestamp.');
  }

  if (startedAt.getTime() > Date.now() + MAX_STARTED_AT_FUTURE_SKEW_MS) {
    throw new AppError(400, 'invalid_started_at', 'startedAt cannot be meaningfully in the future.');
  }

  return startedAt.toISOString();
}

function normalizeTrackpoints(trackpoints: ApiTrackpointInput[]) {
  return trackpoints.map((trackpoint) => {
    if (!Number.isFinite(trackpoint.lat) || !Number.isFinite(trackpoint.lng)) {
      throw new AppError(400, 'invalid_trackpoint', 'Trackpoints must include finite lat/lng values.');
    }

    if (trackpoint.lat < -90 || trackpoint.lat > 90 || trackpoint.lng < -180 || trackpoint.lng > 180) {
      throw new AppError(400, 'invalid_trackpoint', 'Trackpoints must stay within valid lat/lng bounds.');
    }

    const timestamp = new Date(trackpoint.timestamp);
    if (Number.isNaN(timestamp.getTime())) {
      throw new AppError(400, 'invalid_trackpoint', 'Trackpoints must include valid ISO timestamps.');
    }

    if (timestamp.getTime() > Date.now() + MAX_TRACKPOINT_FUTURE_SKEW_MS) {
      throw new AppError(400, 'invalid_trackpoint', 'Trackpoints cannot be meaningfully in the future.');
    }

    return {
      lat: trackpoint.lat,
      lng: trackpoint.lng,
      timestamp: timestamp.toISOString(),
    };
  });
}

function normalizeStartLocation(value?: StartLocationInput): StartLocationInput | undefined {
  if (!value) {
    return undefined;
  }

  let normalizedTimestamp: string | undefined;
  if (value.timestamp) {
    const timestamp = new Date(value.timestamp);
    if (Number.isNaN(timestamp.getTime())) {
      throw new AppError(400, 'invalid_start_location_timestamp', 'Start GPS timestamp must be a valid ISO timestamp.');
    }

    if (timestamp.getTime() > Date.now() + MAX_TRACKPOINT_FUTURE_SKEW_MS) {
      throw new AppError(
        400,
        'invalid_start_location_timestamp',
        'Start GPS timestamp cannot be meaningfully in the future.',
      );
    }

    normalizedTimestamp = timestamp.toISOString();
  }

  return {
    lat: value.lat,
    lng: value.lng,
    ...(value.accuracyMeters === undefined ? {} : { accuracyMeters: value.accuracyMeters }),
    ...(normalizedTimestamp ? { timestamp: normalizedTimestamp } : {}),
  };
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

function parsePoint(point: PrevTrackpoint['point']): { lat: number; lng: number } | null {
  if (!point) {
    return null;
  }

  if (typeof point === 'string') {
    try {
      const parsed = JSON.parse(point) as { coordinates?: [number, number] };
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

function validateTrackpoints(
  startedAt: string | null,
  event: EventAccessSnapshot,
  trackpoints: Trackpoint[],
): ValidationSummary {
  if (!startedAt) {
    return buildRejectedSummary(trackpoints, 'missing_start');
  }

  const startedAtMs = new Date(startedAt).getTime();
  if (Number.isNaN(startedAtMs)) {
    return buildRejectedSummary(trackpoints, 'missing_start');
  }

  if (trackpoints.length < 2) {
    return buildRejectedSummary(trackpoints, 'insufficient_trackpoints');
  }

  const firstTrackpoint = trackpoints[0];
  const lastTrackpoint = trackpoints[trackpoints.length - 1];
  if (!firstTrackpoint || !lastTrackpoint) {
    return buildRejectedSummary(trackpoints, 'insufficient_trackpoints');
  }

  const firstTimestampMs = new Date(firstTrackpoint.recorded_at).getTime();
  const lastTimestampMs = new Date(lastTrackpoint.recorded_at).getTime();
  if (Number.isNaN(firstTimestampMs) || Number.isNaN(lastTimestampMs) || lastTimestampMs <= firstTimestampMs) {
    return buildRejectedSummary(trackpoints, 'invalid_timestamps');
  }

  if (lastTimestampMs <= startedAtMs) {
    return buildRejectedSummary(trackpoints, 'finish_before_start');
  }

  if (firstTimestampMs + START_GRACE_MS < startedAtMs) {
    return buildRejectedSummary(trackpoints, 'trackpoints_before_start');
  }

  const startZoneCheck = validateStartZone(event, firstTrackpoint);
  if (startZoneCheck) {
    return startZoneCheck;
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
      return buildRejectedSummary(trackpoints, 'malformed_trackpoint', totalDistanceMeters);
    }

    const previousTimestampMs = new Date(previous.recorded_at).getTime();
    const currentTimestampMs = new Date(current.recorded_at).getTime();
    const deltaMs = currentTimestampMs - previousTimestampMs;
    if (Number.isNaN(previousTimestampMs) || Number.isNaN(currentTimestampMs) || deltaMs <= 0) {
      return buildRejectedSummary(trackpoints, 'out_of_order_timestamps', totalDistanceMeters);
    }

    const distanceMeters = haversineDistanceMeters(previousPoint.lat, previousPoint.lng, currentPoint.lat, currentPoint.lng);
    if (distanceMeters < DUPLICATE_DISTANCE_METERS && deltaMs < DUPLICATE_WINDOW_MS) {
      continue;
    }

    const deltaSeconds = deltaMs / 1000;
    const computedSpeedMps = distanceMeters / deltaSeconds;
    const reportedSpeedMps = current.speed_mps ?? computedSpeedMps;

    if (distanceMeters > MAX_JUMP_METERS && deltaSeconds <= MAX_JUMP_WINDOW_SECONDS) {
      return buildFlaggedSummary(trackpoints, 'impossible_jump', totalDistanceMeters);
    }

    if (computedSpeedMps > MAX_SPEED_MPS || reportedSpeedMps > MAX_SPEED_MPS) {
      return buildFlaggedSummary(trackpoints, 'speed_limit_exceeded', totalDistanceMeters);
    }

    totalDistanceMeters += distanceMeters;

    if (totalDistanceMeters > MAX_TOTAL_DISTANCE_METERS) {
      return buildFlaggedSummary(trackpoints, 'distance_too_long', totalDistanceMeters);
    }
  }

  const durationSeconds = Math.max(0, Math.round((lastTimestampMs - firstTimestampMs) / 1000));
  const avgSpeedKmh =
    durationSeconds > 0 ? Number((((totalDistanceMeters / 1000) / durationSeconds) * 3600).toFixed(2)) : 0;

  if (durationSeconds < MIN_RUN_DURATION_SECONDS) {
    return buildRejectedSummary(trackpoints, 'too_short_duration', totalDistanceMeters, avgSpeedKmh);
  }

  if (totalDistanceMeters < MIN_RUN_DISTANCE_METERS) {
    return buildRejectedSummary(trackpoints, 'too_short_distance', totalDistanceMeters, avgSpeedKmh);
  }

  if (avgSpeedKmh > MAX_AVG_SPEED_KMH) {
    return buildFlaggedSummary(trackpoints, 'avg_speed_too_high', totalDistanceMeters, avgSpeedKmh);
  }

  return {
    distanceMeters: totalDistanceMeters,
    durationSeconds,
    avgSpeedKmh,
    finishedAt: new Date(lastTimestampMs).toISOString(),
    suspectedVehicle: false,
    reason: null,
    reviewStatus: 'completed',
  };
}

function validateStartZone(event: EventAccessSnapshot, firstTrackpoint: Trackpoint): ValidationSummary | null {
  const firstPoint = parsePoint(firstTrackpoint.point);
  if (!firstPoint) {
    return buildRejectedSummary([firstTrackpoint], 'malformed_trackpoint');
  }

  const startZoneCheck = getStartZoneCheck(event, firstPoint);
  if (!startZoneCheck) {
    return null;
  }

  if (startZoneCheck.distanceMeters > startZoneCheck.allowedRadiusMeters) {
    return buildRejectedSummary([firstTrackpoint], 'outside_start_zone');
  }

  return null;
}

function assertStartLocationInZone(
  event: EventAccessSnapshot,
  startedAt: string,
  startLocation?: StartLocationInput,
) {
  if (!startLocation) {
    return;
  }

  if (startLocation.accuracyMeters !== undefined && startLocation.accuracyMeters > MAX_START_GPS_ACCURACY_METERS) {
    throw new AppError(409, 'start_gps_too_imprecise', 'Wait for a more precise GPS fix before starting this run.', {
      accuracyMeters: Math.round(startLocation.accuracyMeters),
      maxAllowedAccuracyMeters: MAX_START_GPS_ACCURACY_METERS,
    });
  }

  if (startLocation.timestamp) {
    const startedAtMs = new Date(startedAt).getTime();
    const gpsTimestampMs = new Date(startLocation.timestamp).getTime();
    const gpsDeltaMs = Math.abs(gpsTimestampMs - startedAtMs);

    if (gpsDeltaMs > MAX_START_GPS_STARTED_AT_DELTA_MS) {
      throw new AppError(
        409,
        'invalid_start_location_timestamp',
        'Start GPS telemetry must be captured close to the run start time.',
        {
          startedAt,
          timestamp: startLocation.timestamp,
          maxAllowedDeltaMs: MAX_START_GPS_STARTED_AT_DELTA_MS,
        },
      );
    }
  }

  const startZoneCheck = getStartZoneCheck(event, startLocation);
  if (!startZoneCheck) {
    return;
  }

  if (startZoneCheck.distanceMeters > startZoneCheck.allowedRadiusMeters) {
    throw new AppError(409, 'outside_start_zone', 'Start this run from inside the event start zone.', {
      distanceMeters: Math.round(startZoneCheck.distanceMeters),
      allowedRadiusMeters: Math.round(startZoneCheck.allowedRadiusMeters),
    });
  }
}

function getStartZoneCheck(event: EventAccessSnapshot, point: StartLocationInput) {
  const center = parseGeoPoint(event.start_area_center);
  const radiusKm = Number(event.start_area_radius_km ?? 0);

  if (!center || !Number.isFinite(radiusKm) || radiusKm <= 0) {
    return null;
  }

  return {
    distanceMeters: haversineDistanceMeters(center.lat, center.lng, point.lat, point.lng),
    allowedRadiusMeters: radiusKm * 1000 + 50,
  };
}

function parseGeoPoint(raw: unknown): { lat: number; lng: number } | null {
  if (!raw) {
    return null;
  }

  if (typeof raw === 'string') {
    const match = raw.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/i);
    if (match) {
      return {
        lng: Number(match[1]),
        lat: Number(match[2]),
      };
    }

    try {
      return parseGeoPoint(JSON.parse(raw) as unknown);
    } catch {
      return null;
    }
  }

  if (typeof raw === 'object' && raw !== null && 'coordinates' in raw) {
    const coordinates = (raw as { coordinates?: unknown }).coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return null;
    }

    return {
      lng: Number(coordinates[0]),
      lat: Number(coordinates[1]),
    };
  }

  return null;
}

function buildRejectedSummary(
  trackpoints: Trackpoint[],
  reason: string,
  distanceMeters = 0,
  avgSpeedKmh = 0,
): ValidationSummary {
  return {
    distanceMeters,
    durationSeconds: buildDurationSeconds(trackpoints),
    avgSpeedKmh,
    finishedAt: buildFallbackFinishedAt(trackpoints),
    suspectedVehicle: false,
    reason,
    reviewStatus: 'rejected',
  };
}

function buildFlaggedSummary(
  trackpoints: Trackpoint[],
  reason: string,
  distanceMeters = 0,
  avgSpeedKmh = 0,
): ValidationSummary {
  return {
    distanceMeters,
    durationSeconds: buildDurationSeconds(trackpoints),
    avgSpeedKmh,
    finishedAt: buildFallbackFinishedAt(trackpoints),
    suspectedVehicle: true,
    reason,
    reviewStatus: 'flagged',
  };
}

function buildDurationSeconds(trackpoints: Trackpoint[]): number {
  const firstTrackpoint = trackpoints[0];
  const lastTrackpoint = trackpoints[trackpoints.length - 1];
  if (!firstTrackpoint || !lastTrackpoint) {
    return 0;
  }

  const firstTimestampMs = new Date(firstTrackpoint.recorded_at).getTime();
  const lastTimestampMs = new Date(lastTrackpoint.recorded_at).getTime();
  if (Number.isNaN(firstTimestampMs) || Number.isNaN(lastTimestampMs) || lastTimestampMs <= firstTimestampMs) {
    return 0;
  }

  return Math.max(0, Math.round((lastTimestampMs - firstTimestampMs) / 1000));
}

function mapActivityToServerStatus(activity: ActivityPayload): ReviewStatus {
  if (activity.status === 'validated') {
    return 'completed';
  }

  return activity.suspected_vehicle ? 'flagged' : 'rejected';
}

function isDuplicateTrackpointInsertError(error: unknown): boolean {
  if (error instanceof ClientError) {
    return Boolean(
      error.response.errors?.some((entry) => {
        const message = entry.message.toLowerCase();
        return message.includes('idx_activity_trackpoints_activity_seq') || message.includes('duplicate key');
      }),
    );
  }

  return (
    error instanceof Error &&
    (error.message.toLowerCase().includes('idx_activity_trackpoints_activity_seq') ||
      error.message.toLowerCase().includes('duplicate key'))
  );
}
