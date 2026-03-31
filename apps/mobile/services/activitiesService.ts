import { ClientError } from 'graphql-request';
import { recordActivityDiagnostic } from './betaDiagnostics';
import { BackendApiError, requestBackendApi } from './backendApiClient';
import { getEffectiveRunner } from './devRunnerMode';
import { nhost } from './nhostClient';

export interface LocalTrackpoint {
  latitude: number;
  longitude: number;
  recordedAt: string;
  speedKmh: number | null;
  accuracyMeters?: number | null;
}

export interface StartRunLocation {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  recordedAt?: string | null;
}

export interface CompletedRunPayload {
  eventId: string;
  startedAt: string;
  finishedAt: string;
  durationSeconds: number;
  distanceKm: number;
  avgSpeedKmh: number;
  trackpoints: LocalTrackpoint[];
  activity?: UploadedActivity | null;
  existingActivity?: UploadedActivity | null;
}

export interface UploadedActivity {
  id: string;
  status: string;
  points: number;
  distanceKm: number;
  durationSeconds: number;
  avgSpeedKmh: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  validationReason?: string | null;
}

export interface TrackpointBatchResult {
  insertedCount: number;
  skippedCount: number;
  suspiciousPoints: number;
  warning: string | null;
}

interface WorkflowResponse<TPayload> {
  success?: boolean;
  error?: string;
  message?: string;
  activity?: TPayload;
  reason?: string | null;
  reused?: boolean;
}

interface WorkflowActivityPayload {
  id: string;
  status: string;
  points: number | null;
  distance_km: number | string;
  duration_seconds: number;
  avg_speed_kmh: number | string | null;
  started_at: string | null;
  finished_at: string | null;
}

export class ActivityUploadError extends Error {
  activity: UploadedActivity | null;
  code: string | null;
  status: number | null;

  constructor(
    message: string,
    activity: UploadedActivity | null = null,
    options: { code?: string | null; status?: number | null } = {},
  ) {
    super(message);
    this.name = 'ActivityUploadError';
    this.activity = activity;
    this.code = options.code ?? null;
    this.status = options.status ?? null;
  }
}

export async function startRunActivity(
  eventId: string,
  startedAt: string,
  startLocation?: StartRunLocation,
): Promise<UploadedActivity | null> {
  const realUser = nhost.auth.getUser();
  if (!realUser) {
    return null;
  }

  try {
    recordActivityDiagnostic({
      phase: 'start_requested',
      eventId,
      activityId: null,
      message: 'Starting run sync on the beta backend.',
      validationReason: null,
      acceptedTrackpoints: null,
      rejectedTrackpoints: null,
      idempotent: false,
    });

    const response = await callActivityWorkflow('start-activity', {
      event_id: eventId,
      started_at: startedAt,
      ...(startLocation
        ? {
            lat: startLocation.latitude,
            lng: startLocation.longitude,
            ...(startLocation.accuracyMeters == null ? {} : { accuracy_meters: startLocation.accuracyMeters }),
            ...(startLocation.recordedAt ? { timestamp: startLocation.recordedAt } : {}),
          }
        : {}),
    });
    const activity = mapWorkflowActivity(response.activity, response.reason ?? null);

    recordActivityDiagnostic({
      phase: 'started',
      eventId,
      activityId: activity.id,
      message: response.reused ? 'Recovered an open beta activity for this event.' : 'Activity started on the beta backend.',
      validationReason: null,
      idempotent: Boolean(response.reused),
    });

    return activity;
  } catch (error) {
    if (error instanceof ActivityUploadError) {
      throw error;
    }

    const activityError = toActivityUploadError(error);
    recordActivityDiagnostic({
      phase: 'sync_failed',
      eventId,
      activityId: null,
      message: activityError.message,
    });
    throw activityError;
  }
}

export async function ingestTrackpoints(
  _activityId: string,
  trackpoints: LocalTrackpoint[],
): Promise<TrackpointBatchResult> {
  return {
    insertedCount: trackpoints.length,
    skippedCount: 0,
    suspiciousPoints: 0,
    warning: null,
  };
}

export async function persistCompletedRun(payload: CompletedRunPayload): Promise<UploadedActivity> {
  const realUser = nhost.auth.getUser();
  const effectiveRunner = getEffectiveRunner();

  if (!realUser) {
    if (effectiveRunner?.isDev) {
      recordActivityDiagnostic({
        phase: 'synced',
        eventId: payload.eventId,
        activityId: null,
        message: 'DEV runner kept this run local on the device.',
      });

      return {
        id: `dev-activity-${Date.now()}`,
        status: 'completed',
        points: 0,
        distanceKm: Number(payload.distanceKm.toFixed(3)),
        durationSeconds: payload.durationSeconds,
        avgSpeedKmh: Number(payload.avgSpeedKmh.toFixed(2)),
        startedAt: payload.startedAt,
        finishedAt: payload.finishedAt,
      };
    }

    throw new ActivityUploadError('Sign in to sync this run. The result stays saved on this device.');
  }

  const activity =
    payload.activity ??
    payload.existingActivity ??
    (await startRunActivity(payload.eventId, payload.startedAt, getStartLocation(payload.trackpoints)));
  if (!activity) {
    throw new ActivityUploadError('We could not start run sync right now.');
  }

  try {
    recordActivityDiagnostic({
      phase: 'ingesting',
      eventId: payload.eventId,
      activityId: activity.id,
      message: 'Uploading filtered trackpoints to the standalone backend API.',
    });

    return await finishActivityWorkflow(activity.id, payload.trackpoints);
  } catch (error) {
    recordActivityDiagnostic({
      phase: 'sync_failed',
      eventId: payload.eventId,
      activityId: error instanceof ActivityUploadError && error.activity ? error.activity.id : activity.id,
      message: getActivityErrorMessage(error),
    });
    throw new ActivityUploadError(getActivityErrorMessage(error), activity);
  }
}

async function finishActivityWorkflow(activityId: string, trackpoints: LocalTrackpoint[]): Promise<UploadedActivity> {
  try {
    recordActivityDiagnostic({
      phase: 'finish_requested',
      activityId,
      message: 'Finishing this run on the beta backend.',
    });

    const response = await requestBackendApi<WorkflowResponse<WorkflowActivityPayload> & { activity?: WorkflowActivityPayload }>(
      '/runs/finish',
      {
        method: 'POST',
        body: {
          activityId,
          trackpoints: trackpoints.map((point) => ({
            lat: point.latitude,
            lng: point.longitude,
            timestamp: point.recordedAt,
            speed_kmh: point.speedKmh,
          })),
        },
      },
    );

    if (!response.success || !response.activity) {
      throw new Error(response.error ?? response.message ?? 'finish failed.');
    }

    const activity = mapWorkflowActivity(response.activity, response.reason ?? null);

    recordActivityDiagnostic({
      phase: activity.status === 'rejected' ? 'rejected' : 'synced',
      activityId: activity.id,
      message:
        activity.status === 'rejected'
          ? getRejectedRunMessage(activity.validationReason)
          : response.reused
            ? 'Finish reused the existing backend result for this activity.'
            : 'Run synced successfully and leaderboard scoring completed.',
      validationReason: activity.validationReason ?? null,
      idempotent: Boolean(response.reused),
    });

    return activity;
  } catch (error) {
    if (error instanceof ActivityUploadError) {
      throw error;
    }

    const activityError = toActivityUploadError(error);
    recordActivityDiagnostic({
      phase: 'sync_failed',
      activityId,
      message: activityError.message,
    });
    throw activityError;
  }
}

async function callActivityWorkflow(
  name: 'start-activity',
  body: {
    event_id: string;
    started_at?: string;
    lat?: number;
    lng?: number;
    accuracy_meters?: number;
    timestamp?: string;
  },
): Promise<WorkflowResponse<WorkflowActivityPayload> & { activity: WorkflowActivityPayload }> {
  const payload = await requestBackendApi<WorkflowResponse<WorkflowActivityPayload> & { activity?: WorkflowActivityPayload }>(
    '/runs/start',
    {
      method: 'POST',
      body: {
        eventId: body.event_id,
        startedAt: body.started_at,
        lat: body.lat,
        lng: body.lng,
        accuracy_meters: body.accuracy_meters,
        timestamp: body.timestamp,
      },
    },
  );

  if (!payload.success || !payload.activity) {
    throw new Error(payload.error ?? payload.message ?? `${name} failed.`);
  }

  return payload as WorkflowResponse<WorkflowActivityPayload> & { activity: WorkflowActivityPayload };
}

function getStartLocation(trackpoints: LocalTrackpoint[]): StartRunLocation | undefined {
  const firstPoint = trackpoints[0];
  if (!firstPoint) {
    return undefined;
  }

  return {
    latitude: firstPoint.latitude,
    longitude: firstPoint.longitude,
    accuracyMeters: firstPoint.accuracyMeters ?? null,
    recordedAt: firstPoint.recordedAt,
  };
}

function mapWorkflowActivity(activity: WorkflowActivityPayload, validationReason: string | null): UploadedActivity {
  return {
    id: activity.id,
    status: activity.status,
    points: activity.points ?? 0,
    distanceKm: Number(activity.distance_km),
    durationSeconds: activity.duration_seconds,
    avgSpeedKmh: activity.avg_speed_kmh === null ? null : Number(activity.avg_speed_kmh),
    startedAt: activity.started_at,
    finishedAt: activity.finished_at,
    validationReason,
  };
}

export function getActivityErrorMessage(error: unknown): string {
  if (error instanceof ActivityUploadError) {
    return error.message;
  }

  if (error instanceof BackendApiError) {
    switch (error.code) {
      case 'participant_not_registered':
        return 'This beta account is not registered for that event yet.';
      case 'outside_start_zone':
        return 'Move into the event start zone before starting this run.';
      case 'start_gps_too_imprecise':
        return 'GPS too imprecise. Wait for a better fix before starting.';
      case 'invalid_start_location_timestamp':
        return 'GPS timing looked inconsistent. Wait for a fresh fix before starting.';
      case 'validation_error':
        return 'The start payload was invalid. Refresh GPS and try again.';
      case 'activity_not_found':
        return 'We could not find this run on the beta backend.';
      case 'activity_owner_mismatch':
      case 'forbidden':
        return 'This beta action is not available in the current app state.';
      case 'event_not_revealed':
        return 'This event is not revealed yet on the beta backend.';
      case 'event_not_started':
        return 'This event has not started yet on the beta backend.';
      case 'event_finished':
        return 'This event is already closed on the beta backend.';
      case 'trackpoints_closed':
        return 'This run is already closed on the beta backend. Retry sync to refresh the latest result.';
      default:
        break;
    }
  }

  if (error instanceof ClientError) {
    const firstMessage = error.response.errors?.[0]?.message;
    if (firstMessage) {
      return 'We could not finish syncing this run right now.';
    }
  }

  if (error instanceof Error) {
    const lowerMessage = error.message.toLowerCase();

    if (lowerMessage.includes('only registered participants')) {
      return 'This beta account is not registered for that event yet.';
    }

    if (lowerMessage.includes('activity not found')) {
      return 'We could not find this run on the beta backend.';
    }

    if (lowerMessage.includes('missing authenticated user context')) {
      return 'Sign in again before retrying run sync on this device.';
    }

    if (lowerMessage.includes('trackpoints cannot be added after')) {
      return 'This run is already closed on the beta backend. Retry sync to refresh the latest result.';
    }

    if (lowerMessage.includes('forbidden')) {
      return 'This beta action is not available in the current app state.';
    }

    if (lowerMessage.includes('fetch failed') || lowerMessage.includes('network request failed')) {
      return 'Backend unavailable right now. This run stays local on this device.';
    }

    if (lowerMessage.includes('status 5') || lowerMessage.includes('failed with status 5')) {
      return 'The beta backend is unavailable right now. This run stays local on this device.';
    }
  }

  return 'We could not finish syncing this run right now.';
}

function getRejectedRunMessage(reason: string | null | undefined): string {
  switch (reason) {
    case 'participant_not_registered':
      return 'This run was rejected because the beta account was not registered for the event.';
    case 'outside_start_zone':
      return 'This run was rejected because it did not start inside the event start zone.';
    case 'insufficient_trackpoints':
      return 'This run was rejected because the backend did not receive enough stable GPS points.';
    case 'invalid_timestamps':
    case 'out_of_order_timestamps':
      return 'This run was rejected because the recorded GPS timestamps were inconsistent.';
    case 'malformed_trackpoint':
      return 'This run was rejected because some GPS samples were incomplete.';
    case 'impossible_jump':
      return 'This run was rejected because the backend detected an impossible GPS jump.';
    case 'speed_limit_exceeded':
      return 'This run was rejected because the backend detected unrealistic speed.';
    case 'too_short_duration':
      return 'This run was rejected because it finished below the beta duration requirement.';
    case 'too_short_distance':
      return 'This run was rejected because it finished below the beta distance requirement.';
    default:
      return 'This run was flagged during backend review and was not scored.';
  }
}

function toActivityUploadError(error: unknown, activity: UploadedActivity | null = null): ActivityUploadError {
  if (error instanceof ActivityUploadError) {
    return error;
  }

  if (error instanceof BackendApiError) {
    return new ActivityUploadError(getActivityErrorMessage(error), activity, {
      code: error.code,
      status: error.status,
    });
  }

  return new ActivityUploadError(getActivityErrorMessage(error), activity);
}
