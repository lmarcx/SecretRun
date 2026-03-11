import { nhost } from './nhostClient';

export const DEV_RUNNER_MODE = true;

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
