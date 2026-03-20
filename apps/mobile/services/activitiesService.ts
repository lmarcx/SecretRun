import { ClientError } from 'graphql-request';
import { recordActivityDiagnostic } from './betaDiagnostics';
import { getEffectiveRunner } from './devRunnerMode';
import { getFunctionsBaseUrl, nhost } from './nhostClient';

export interface LocalTrackpoint {
  latitude: number;
  longitude: number;
  recordedAt: string;
  speedKmh: number | null;
  accuracyMeters?: number | null;
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
  activity?: TPayload;
  reason?: string | null;
  reused?: boolean;
}

interface TrackpointsWorkflowResponse {
  success?: boolean;
  error?: string;
  accepted?: number;
  rejected?: number;
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

  constructor(message: string, activity: UploadedActivity | null = null) {
    super(message);
    this.name = 'ActivityUploadError';
    this.activity = activity;
  }
}

export async function startRunActivity(eventId: string, startedAt: string): Promise<UploadedActivity | null> {
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
    recordActivityDiagnostic({
      phase: 'sync_failed',
      eventId,
      activityId: null,
      message: getActivityErrorMessage(error),
    });
    throw new ActivityUploadError(getActivityErrorMessage(error));
  }
}

export async function ingestTrackpoints(
  activityId: string,
  trackpoints: LocalTrackpoint[],
): Promise<TrackpointBatchResult> {
  if (trackpoints.length === 0) {
    return {
      insertedCount: 0,
      skippedCount: 0,
      suspiciousPoints: 0,
      warning: null,
    };
  }

  const accessToken = nhost.auth.getAccessToken();
  recordActivityDiagnostic({
    phase: 'ingesting',
    activityId,
    message: 'Uploading filtered trackpoints to the beta backend.',
  });

  const response = await fetch(`${getFunctionsBaseUrl()}/ingest-trackpoints`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      activity_id: activityId,
      points: trackpoints.map((point) => ({
        lat: point.latitude,
        lng: point.longitude,
        timestamp: point.recordedAt,
        speed_kmh: point.speedKmh,
      })),
    }),
  });

  const payload = (await response.json().catch(() => null)) as TrackpointsWorkflowResponse | null;
  if (!response.ok || !payload?.success) {
    recordActivityDiagnostic({
      phase: 'sync_failed',
      activityId,
      message: getActivityErrorMessage(payload?.error ?? `trackpoints failed with status ${response.status}.`),
    });
    throw new Error(payload?.error ?? `trackpoints failed with status ${response.status}.`);
  }

  const result = {
    insertedCount: payload.accepted ?? 0,
    skippedCount: payload.rejected ?? 0,
    suspiciousPoints: 0,
    warning: null,
  };

  recordActivityDiagnostic({
    phase: 'ingesting',
    activityId,
    message: 'Trackpoints uploaded for backend validation.',
    acceptedTrackpoints: result.insertedCount,
    rejectedTrackpoints: result.skippedCount,
  });

  return result;
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

  const activity = payload.activity ?? payload.existingActivity ?? (await startRunActivity(payload.eventId, payload.startedAt));
  if (!activity) {
    throw new ActivityUploadError('We could not start run sync right now.');
  }

  try {
    await ingestTrackpoints(activity.id, payload.trackpoints);
    return await finishActivityWorkflow(activity.id);
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

async function finishActivityWorkflow(activityId: string): Promise<UploadedActivity> {
  try {
    recordActivityDiagnostic({
      phase: 'finish_requested',
      activityId,
      message: 'Finishing this run on the beta backend.',
    });

    const response = await callActivityWorkflow('finish-activity', {
      activity_id: activityId,
    });
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
    recordActivityDiagnostic({
      phase: 'sync_failed',
      activityId,
      message: getActivityErrorMessage(error),
    });
    throw new ActivityUploadError(getActivityErrorMessage(error));
  }
}

async function callActivityWorkflow(
  name: 'start-activity' | 'finish-activity',
  body: Record<string, unknown>,
): Promise<WorkflowResponse<WorkflowActivityPayload> & { activity: WorkflowActivityPayload }> {
  const accessToken = nhost.auth.getAccessToken();
  const response = await fetch(`${getFunctionsBaseUrl()}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as WorkflowResponse<WorkflowActivityPayload> | null;
  if (!response.ok || !payload?.success || !payload.activity) {
    throw new Error(payload?.error ?? `${name} failed with status ${response.status}.`);
  }

  return payload as WorkflowResponse<WorkflowActivityPayload> & { activity: WorkflowActivityPayload };
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
      return 'We could not sync this run right now. The result stays saved on this device.';
    }

    if (lowerMessage.includes('status 5') || lowerMessage.includes('failed with status 5')) {
      return 'The beta backend is unavailable right now. Your result stays saved on this device.';
    }
  }

  return 'We could not finish syncing this run right now.';
}

function getRejectedRunMessage(reason: string | null | undefined): string {
  switch (reason) {
    case 'participant_not_registered':
      return 'This run was rejected because the beta account was not registered for the event.';
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
