import { ClientError, gql } from 'graphql-request';
import { nhost } from './nhostClient';
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

const INSERT_ACTIVITY_MUTATION = gql`
  mutation InsertCompletedActivity(
    $eventId: uuid!
    $startedAt: timestamptz!
    $finishedAt: timestamptz!
    $distanceKm: numeric!
    $durationSeconds: Int!
    $avgSpeedKmh: numeric!
  ) {
    insert_activities_one(
      object: {
        event_id: $eventId
        started_at: $startedAt
        finished_at: $finishedAt
        distance_km: $distanceKm
        duration_seconds: $durationSeconds
        avg_speed_kmh: $avgSpeedKmh
      }
    ) {
      id
      status
      points
      distance_km
      duration_seconds
      avg_speed_kmh
      started_at
      finished_at
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

interface InsertActivityMutation {
  insert_activities_one: {
    id: string;
    status: string;
    points: number | null;
    distance_km: number | string;
    duration_seconds: number;
    avg_speed_kmh: number | string | null;
    started_at: string | null;
    finished_at: string | null;
  } | null;
}

interface InsertTrackpointsMutation {
  insert_activity_trackpoints: {
    affected_rows: number;
  };
}

export async function persistCompletedRun(payload: CompletedRunPayload): Promise<UploadedActivity> {
  if (!nhost.auth.getUser()) {
    throw new ActivityUploadError('Sign in to upload this run. Local result is still available.');
  }

  const activity = payload.existingActivity ?? (await createCompletedActivity(payload));

  try {
    if (payload.trackpoints.length > 0) {
      await requestGraphql<InsertTrackpointsMutation>(INSERT_TRACKPOINTS_MUTATION, {
        objects: payload.trackpoints.map((point) => ({
          activity_id: activity.id,
          point: `SRID=4326;POINT(${point.longitude} ${point.latitude})`,
          recorded_at: point.recordedAt,
          speed_kmh: point.speedKmh,
        })),
      });
    }

    return activity;
  } catch (error) {
    throw new ActivityUploadError(getActivityErrorMessage(error), activity);
  }
}

async function createCompletedActivity(payload: CompletedRunPayload): Promise<UploadedActivity> {
  try {
    const response = await requestGraphql<InsertActivityMutation>(INSERT_ACTIVITY_MUTATION, {
      eventId: payload.eventId,
      startedAt: payload.startedAt,
      finishedAt: payload.finishedAt,
      distanceKm: Number(payload.distanceKm.toFixed(3)),
      durationSeconds: payload.durationSeconds,
      avgSpeedKmh: Number(payload.avgSpeedKmh.toFixed(2)),
    });

    if (!response.insert_activities_one) {
      throw new ActivityUploadError('Activity could not be created.');
    }

    return mapUploadedActivity(response.insert_activities_one);
  } catch (error) {
    throw new ActivityUploadError(getActivityErrorMessage(error));
  }
}

function mapUploadedActivity(activity: NonNullable<InsertActivityMutation['insert_activities_one']>): UploadedActivity {
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
