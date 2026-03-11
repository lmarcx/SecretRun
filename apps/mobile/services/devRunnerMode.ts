import { nhost } from './nhostClient';

export const DEV_RUNNER_MODE = true;
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
      return 'Local event participation can be tested without real authentication.';
    case 'event_detail':
      return 'Join, reveal timing, and run entry remain testable locally without backend auth.';
    case 'run':
      return 'Reveal timing, event start timing, and start-zone validation are bypassed for local testing.';
    case 'profile':
      return 'This device is browsing in local DEV runner mode. Backend-only profile and push actions still require real auth.';
    case 'global':
    default:
      return 'Closed beta build running with the local DEV runner fallback.';
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
