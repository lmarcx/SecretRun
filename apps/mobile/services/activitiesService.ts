import { ClientError } from 'graphql-request';
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
}

interface TrackpointsWorkflowResponse {
  success?: boolean;
  error?: string;
  inserted_count?: number;
  skipped_count?: number;
  suspicious_points?: number;
  warning?: string | null;
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
    const response = await callActivityWorkflow('start-activity', {
      event_id: eventId,
      started_at: startedAt,
    });
    return mapWorkflowActivity(response);
  } catch (error) {
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
  const response = await fetch(`${getFunctionsBaseUrl()}/trackpoints`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      activity_id: activityId,
      trackpoints: trackpoints.map((point) => ({
        lat: point.latitude,
        lng: point.longitude,
        timestamp: point.recordedAt,
        speed_kmh: point.speedKmh,
      })),
    }),
  });

  const payload = (await response.json().catch(() => null)) as TrackpointsWorkflowResponse | null;
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error ?? `trackpoints failed with status ${response.status}.`);
  }

  return {
    insertedCount: payload.inserted_count ?? 0,
    skippedCount: payload.skipped_count ?? 0,
    suspiciousPoints: payload.suspicious_points ?? 0,
    warning: payload.warning ?? null,
  };
}

export async function persistCompletedRun(payload: CompletedRunPayload): Promise<UploadedActivity> {
  const realUser = nhost.auth.getUser();
  const effectiveRunner = getEffectiveRunner();

  if (!realUser) {
    if (effectiveRunner?.isDev) {
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
    throw new ActivityUploadError(getActivityErrorMessage(error), activity);
  }
}

async function finishActivityWorkflow(activityId: string): Promise<UploadedActivity> {
  try {
    const response = await callActivityWorkflow('finish-activity', {
      activity_id: activityId,
    });
    return mapWorkflowActivity(response);
  } catch (error) {
    throw new ActivityUploadError(getActivityErrorMessage(error));
  }
}

async function callActivityWorkflow(
  name: 'start-activity' | 'finish-activity',
  body: Record<string, unknown>,
): Promise<WorkflowActivityPayload> {
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

  return payload.activity;
}

function mapWorkflowActivity(activity: WorkflowActivityPayload): UploadedActivity {
  return {
    id: activity.id,
    status: activity.status,
    points: activity.points ?? 0,
    distanceKm: Number(activity.distance_km),
    durationSeconds: activity.duration_seconds,
    avgSpeedKmh: activity.avg_speed_kmh === null ? null : Number(activity.avg_speed_kmh),
    startedAt: activity.started_at,
    finishedAt: activity.finished_at,
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
    if (lowerMessage.includes('fetch failed') || lowerMessage.includes('network request failed')) {
      return 'We could not sync this run right now. The result stays saved on this device.';
    }
  }

  return 'We could not finish syncing this run right now.';
}
