import { nhost } from './nhostClient';

const configuredDevRunnerMode = process.env.EXPO_PUBLIC_DEV_RUNNER_MODE;
const devRuntimeEnabled = typeof __DEV__ !== 'undefined' && __DEV__;

function isConfiguredDevRunnerEnabled(): boolean {
  if (!devRuntimeEnabled) {
    return false;
  }

  if (configuredDevRunnerMode === undefined) {
    return true;
  }

  return configuredDevRunnerMode === 'true';
}

export const DEV_RUNNER_MODE = isConfiguredDevRunnerEnabled();
export const DEV_MODE_LABEL = 'DEV MODE';

export const DEV_RUNNER = {
  id: 'dev-runner',
  username: 'Dev Runner',
} as const;

const joinedEvents = new Map<string, string>();

export interface EffectiveRunner {
  id: string;
  username: string;
  isDev: boolean;
}

export type DevModeContext = 'global' | 'events' | 'event_detail' | 'run' | 'profile';

export function getEffectiveRunner(): EffectiveRunner | null {
  const realUser = nhost.auth.getUser();
  if (realUser) {
    return {
      id: realUser.id,
      username: realUser.displayName ?? realUser.email ?? 'Runner',
      isDev: false,
    };
  }

  if (DEV_RUNNER_MODE) {
    return {
      ...DEV_RUNNER,
      isDev: true,
    };
  }

  return null;
}

export function isDevRunnerActive(): boolean {
  return !nhost.auth.getUser() && DEV_RUNNER_MODE;
}

export function getDevModeMessage(context: DevModeContext): string {
  switch (context) {
    case 'events':
      return 'DEV runner keeps local event joins and run entry testable on this device without a beta account.';
    case 'event_detail':
      return 'DEV runner keeps join, reveal timing, and run entry testable locally on this device.';
    case 'run':
      return 'Reveal timing, start timing, and start-zone checks are relaxed so local run testing stays possible.';
    case 'profile':
      return 'DEV runner is active on this device for local event and run testing. Profile sync, personal feed, team membership, and notifications still require a signed-in beta account.';
    case 'global':
    default:
      return 'Local DEV runner is active for event and run testing on this device.';
  }
}

export function getDevJoinLabel(): string {
  return 'Join (Dev Mode)';
}

export function getDevJoinedEvent(eventId: string): { status: 'registered'; joinedAt: string } | null {
  const joinedAt = joinedEvents.get(eventId);
  if (!joinedAt || !isDevRunnerActive()) {
    return null;
  }

  return {
    status: 'registered',
    joinedAt,
  };
}

export function markDevJoinedEvent(eventId: string): 'joined' | 'already_joined' {
  if (!isDevRunnerActive()) {
    throw new Error('DEV runner mode is not active.');
  }

  const existingJoinedAt = joinedEvents.get(eventId);
  if (existingJoinedAt) {
    return 'already_joined';
  }

  joinedEvents.set(eventId, new Date().toISOString());
  return 'joined';
}
