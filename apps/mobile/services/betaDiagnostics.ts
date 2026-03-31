import Constants from 'expo-constants';
import { useSyncExternalStore } from 'react';

export type ActivityDiagnosticPhase =
  | 'idle'
  | 'start_requested'
  | 'start_accepted'
  | 'start_warning'
  | 'start_blocked'
  | 'start_local_fallback'
  | 'ingesting'
  | 'finish_requested'
  | 'synced'
  | 'rejected'
  | 'sync_failed';

export type NotificationDiagnosticState =
  | 'idle'
  | 'ready'
  | 'registered'
  | 'unsupported'
  | 'not_ready'
  | 'failed';

export interface ActivityDiagnostic {
  phase: ActivityDiagnosticPhase;
  eventId: string | null;
  activityId: string | null;
  message: string | null;
  validationReason: string | null;
  acceptedTrackpoints: number | null;
  rejectedTrackpoints: number | null;
  idempotent: boolean;
  updatedAt: string | null;
}

export interface NotificationDiagnostic {
  state: NotificationDiagnosticState;
  message: string | null;
  updatedAt: string | null;
}

export interface StartCalibrationSummary {
  acceptedCount: number;
  warningCount: number;
  blockedGpsTooImpreciseCount: number;
  blockedOutsideZoneCount: number;
  blockedOtherCount: number;
  localFallbackCount: number;
}

export interface BetaDiagnosticsSnapshot {
  currentScreen: string | null;
  activity: ActivityDiagnostic;
  notification: NotificationDiagnostic;
  startCalibration: StartCalibrationSummary;
}

const defaultSnapshot: BetaDiagnosticsSnapshot = {
  currentScreen: null,
  activity: {
    phase: 'idle',
    eventId: null,
    activityId: null,
    message: null,
    validationReason: null,
    acceptedTrackpoints: null,
    rejectedTrackpoints: null,
    idempotent: false,
    updatedAt: null,
  },
  notification: {
    state: 'idle',
    message: null,
    updatedAt: null,
  },
  startCalibration: {
    acceptedCount: 0,
    warningCount: 0,
    blockedGpsTooImpreciseCount: 0,
    blockedOutsideZoneCount: 0,
    blockedOtherCount: 0,
    localFallbackCount: 0,
  },
};

let snapshot = defaultSnapshot;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

export function useBetaDiagnostics(): BetaDiagnosticsSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function setCurrentBetaScreen(screen: string | null): void {
  if (snapshot.currentScreen === screen) {
    return;
  }

  snapshot = {
    ...snapshot,
    currentScreen: screen,
  };
  emit();
}

export function recordActivityDiagnostic(update: Partial<ActivityDiagnostic>): void {
  snapshot = {
    ...snapshot,
    activity: {
      ...snapshot.activity,
      ...update,
      updatedAt: update.updatedAt ?? new Date().toISOString(),
    },
  };
  emit();
}

export function recordNotificationDiagnostic(update: Partial<NotificationDiagnostic>): void {
  snapshot = {
    ...snapshot,
    notification: {
      ...snapshot.notification,
      ...update,
      updatedAt: update.updatedAt ?? new Date().toISOString(),
    },
  };
  emit();
}

export function recordStartCalibrationOutcome(
  outcome:
    | 'accepted'
    | 'warning'
    | 'blocked_gps_too_imprecise'
    | 'blocked_outside_zone'
    | 'blocked_other'
    | 'local_fallback',
): void {
  snapshot = {
    ...snapshot,
    startCalibration: {
      ...snapshot.startCalibration,
      acceptedCount: snapshot.startCalibration.acceptedCount + (outcome === 'accepted' ? 1 : 0),
      warningCount: snapshot.startCalibration.warningCount + (outcome === 'warning' ? 1 : 0),
      blockedGpsTooImpreciseCount:
        snapshot.startCalibration.blockedGpsTooImpreciseCount + (outcome === 'blocked_gps_too_imprecise' ? 1 : 0),
      blockedOutsideZoneCount:
        snapshot.startCalibration.blockedOutsideZoneCount + (outcome === 'blocked_outside_zone' ? 1 : 0),
      blockedOtherCount: snapshot.startCalibration.blockedOtherCount + (outcome === 'blocked_other' ? 1 : 0),
      localFallbackCount: snapshot.startCalibration.localFallbackCount + (outcome === 'local_fallback' ? 1 : 0),
    },
  };
  emit();
}

export function getBetaBuildLabel(): string {
  const version = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? 'dev';
  const build = Constants.nativeBuildVersion ?? null;
  const channel = __DEV__ ? 'DEV' : 'BETA';

  return build ? `${channel} ${version} (${build})` : `${channel} ${version}`;
}

export function formatBetaTimestamp(value: string | null): string {
  if (!value) {
    return 'No recent activity';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'No recent activity';
  }

  return date.toLocaleString();
}

export function buildBetaIssueMailto(current: BetaDiagnosticsSnapshot): string {
  const recipient = process.env.EXPO_PUBLIC_BETA_FEEDBACK_EMAIL ?? '';
  const subject = encodeURIComponent(`Secret Run beta issue - ${current.currentScreen ?? 'unknown screen'}`);
  const body = encodeURIComponent(
    [
      'Secret Run closed beta issue report',
      '',
      `Build: ${getBetaBuildLabel()}`,
      `Screen: ${current.currentScreen ?? 'unknown'}`,
      '',
      `Last run state: ${current.activity.phase}`,
      `Event ID: ${current.activity.eventId ?? 'n/a'}`,
      `Activity ID: ${current.activity.activityId ?? 'n/a'}`,
      `Validation reason: ${current.activity.validationReason ?? 'n/a'}`,
      `Trackpoints accepted/rejected: ${current.activity.acceptedTrackpoints ?? 'n/a'} / ${
        current.activity.rejectedTrackpoints ?? 'n/a'
      }`,
      `Run note: ${current.activity.message ?? 'n/a'}`,
      `Start calibration: accepted=${current.startCalibration.acceptedCount}, warnings=${current.startCalibration.warningCount}, blocked_gps=${current.startCalibration.blockedGpsTooImpreciseCount}, blocked_zone=${current.startCalibration.blockedOutsideZoneCount}, blocked_other=${current.startCalibration.blockedOtherCount}, local_fallback=${current.startCalibration.localFallbackCount}`,
      '',
      `Notification state: ${current.notification.state}`,
      `Notification note: ${current.notification.message ?? 'n/a'}`,
      '',
      'What happened:',
      '',
    ].join('\n'),
  );

  return `mailto:${recipient}?subject=${subject}&body=${body}`;
}

export function formatValidationReason(reason: string | null | undefined): string | null {
  switch (reason) {
    case 'participant_not_registered':
      return 'This beta account was not registered for the event when the run was reviewed.';
    case 'outside_start_zone':
      return 'The run did not start inside the configured event start zone.';
    case 'start_gps_too_imprecise':
      return 'The GPS fix was too imprecise to allow the start.';
    case 'invalid_start_location_timestamp':
    case 'stale_start_fix':
      return 'The start GPS sample was too old or timing looked inconsistent.';
    case 'insufficient_trackpoints':
      return 'The backend did not receive enough stable GPS points to validate this run.';
    case 'invalid_timestamps':
    case 'out_of_order_timestamps':
      return 'The recorded GPS timestamps were inconsistent, so this run could not be validated.';
    case 'malformed_trackpoint':
      return 'Some GPS samples were incomplete or unreadable during validation.';
    case 'impossible_jump':
      return 'The run included an impossible GPS jump during validation.';
    case 'speed_limit_exceeded':
      return 'The run exceeded the beta speed limit during validation.';
    case 'too_short_duration':
      return 'The run finished below the minimum beta duration requirement.';
    case 'too_short_distance':
      return 'The run finished below the minimum beta distance requirement.';
    default:
      return null;
  }
}
