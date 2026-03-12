import { getEffectiveRunner } from './devRunnerMode';
import type { LocalTrackpoint, UploadedActivity } from './activitiesService';

export interface StoredRunResult {
  status: 'completed' | 'abandoned' | 'invalid';
  startedAt: string;
  finishedAt: string;
  durationSeconds: number;
  distanceKm: number;
  avgSpeedKmh: number;
  trackpoints: LocalTrackpoint[];
}

export interface ActiveRunDraft {
  startedAt: string;
  distanceMeters: number;
  trackpoints: LocalTrackpoint[];
  activity: UploadedActivity | null;
  suspiciousWarning: string | null;
}

export interface StoredRunSession {
  phase: 'running' | 'completed' | 'abandoned' | 'invalid';
  draft: ActiveRunDraft | null;
  result: StoredRunResult | null;
  uploadedActivity: UploadedActivity | null;
  uploadError: string | null;
}

const sessions = new Map<string, StoredRunSession>();

function buildSessionKey(eventId: string): string {
  const runnerId = getEffectiveRunner()?.id ?? 'signed-out';
  return `${runnerId}:${eventId}`;
}

export function getStoredRunSession(eventId: string): StoredRunSession | null {
  return sessions.get(buildSessionKey(eventId)) ?? null;
}

export function setStoredRunSession(eventId: string, session: StoredRunSession): void {
  sessions.set(buildSessionKey(eventId), session);
}

export function clearStoredRunSession(eventId: string): void {
  sessions.delete(buildSessionKey(eventId));
}
