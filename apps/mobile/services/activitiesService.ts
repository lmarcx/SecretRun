import { ClientError, gql } from 'graphql-request';
import { getEffectiveRunner } from './devRunnerMode';
import { getFunctionsBaseUrl, nhost } from './nhostClient';
import { requestGraphql } from './graphqlClient';

export interface LocalTrackpoint {
  latitude: number;
  longitude: number;
  recordedAt: string;
  speedKmh: number | null;
}

export interface CompletedRunPayload {
  eventId: string;
  startedAt: string;
  finishedAt: string;
  durationSeconds: number;
  distanceKm: number;
  avgSpeedKmh: number;
  trackpoints: LocalTrackpoint[];
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

export class ActivityUploadError extends Error {
  activity: UploadedActivity | null;

  constructor(message: string, activity: UploadedActivity | null = null) {
    super(message);
    this.name = 'ActivityUploadError';
    this.activity = activity;
  }
}

const INSERT_TRACKPOINTS_MUTATION = gql`
  mutation InsertTrackpoints($objects: [activity_trackpoints_insert_input!]!) {
    insert_activity_trackpoints(objects: $objects) {
      affected_rows
    }
  }
`;

interface InsertTrackpointsMutation {
  insert_activity_trackpoints: {
    affected_rows: number;
  };
}

interface WorkflowResponse<TPayload> {
  success?: boolean;
  error?: string;
  activity?: TPayload;
  status?: string;
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

    throw new ActivityUploadError('Sign in to upload this run. Local result is still available.');
  }

  const activity = payload.existingActivity ?? (await startActivityWorkflow(payload));

  try {
    if (payload.trackpoints.length > 0) {
      // TODO(security): move trackpoint ingestion to a batched trusted function endpoint.
      // Sprint 5 makes the backend workflow the preferred source of truth for activity
      // creation and final validation, but trackpoints still flow through Hasura directly.
      await requestGraphql<InsertTrackpointsMutation>(INSERT_TRACKPOINTS_MUTATION, {
        objects: payload.trackpoints.map((point) => ({
          activity_id: activity.id,
          point: `SRID=4326;POINT(${point.longitude} ${point.latitude})`,
          recorded_at: point.recordedAt,
          speed_kmh: point.speedKmh,
        })),
      });
    }

    return await finishActivityWorkflow(activity.id);
  } catch (error) {
    throw new ActivityUploadError(getActivityErrorMessage(error), activity);
  }
}

async function startActivityWorkflow(payload: CompletedRunPayload): Promise<UploadedActivity> {
  try {
    const response = await callWorkflowFunction<WorkflowActivityPayload>('start-activity', {
      event_id: payload.eventId,
      started_at: payload.startedAt,
    });
    return mapWorkflowActivity(response);
  } catch (error) {
    throw new ActivityUploadError(getActivityErrorMessage(error));
  }
}

async function finishActivityWorkflow(activityId: string): Promise<UploadedActivity> {
  try {
    const response = await callWorkflowFunction<WorkflowActivityPayload>('finish-activity', {
      activity_id: activityId,
    });
    return mapWorkflowActivity(response);
  } catch (error) {
    throw new ActivityUploadError(getActivityErrorMessage(error));
  }
}

async function callWorkflowFunction<TPayload>(
  name: 'start-activity' | 'finish-activity',
  body: Record<string, unknown>,
): Promise<TPayload> {
  const accessToken = nhost.auth.getAccessToken();
  const response = await fetch(`${getFunctionsBaseUrl()}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as WorkflowResponse<TPayload> | null;
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
      if (firstMessage.toLowerCase().includes("field 'insert_activities_one' not found")) {
        return 'Activity upload is not exposed by the current backend permissions.';
      }

      return firstMessage;
    }
  }

  if (error instanceof Error) {
    const lowerMessage = error.message.toLowerCase();
    if (lowerMessage.includes('fetch failed') || lowerMessage.includes('network request failed')) {
      return 'Activity upload failed because the backend is unreachable.';
    }

    return error.message;
  }

  return 'Activity upload failed. Please try again.';
}
