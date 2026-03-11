import type { LocalTrackpoint, UploadedActivity } from './activitiesService';

export interface StoredRunResult {
  status: 'completed' | 'abandoned';
  startedAt: string;
  finishedAt: string;
  durationSeconds: number;
  distanceKm: number;
  avgSpeedKmh: number;
  trackpoints: LocalTrackpoint[];
}

export interface StoredRunSession {
  phase: 'running' | 'completed' | 'abandoned';
  result: StoredRunResult | null;
  uploadedActivity: UploadedActivity | null;
  uploadError: string | null;
}

const sessions = new Map<string, StoredRunSession>();

export function getStoredRunSession(eventId: string): StoredRunSession | null {
  return sessions.get(eventId) ?? null;
}

export function setStoredRunSession(eventId: string, session: StoredRunSession): void {
  sessions.set(eventId, session);
}
