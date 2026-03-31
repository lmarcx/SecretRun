import { BackendApiError, requestBackendApi } from './backendApiClient';
import { nhost } from './nhostClient';

export interface CurrentProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface CurrentProfileStats {
  validatedRuns: number;
}

export interface CreateCurrentProfileInput {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface BackendProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

export async function fetchCurrentProfile(): Promise<CurrentProfile | null> {
  const userId = nhost.auth.getUser()?.id;
  if (!userId) {
    return null;
  }

  const response = await requestBackendApi<{ profile: BackendProfile | null }>('/profile');
  return response.profile ? mapProfile(response.profile) : null;
}

export async function createCurrentProfile(input: CreateCurrentProfileInput): Promise<CurrentProfile> {
  if (!nhost.auth.getUser()?.id) {
    throw new Error('Sign in before creating a profile.');
  }

  const response = await requestBackendApi<{ profile: BackendProfile }>('/profile', {
    method: 'POST',
    body: {
      username: input.username,
      displayName: input.displayName,
      avatarUrl: input.avatarUrl ?? null,
    },
  });

  return mapProfile(response.profile);
}

export async function fetchCurrentProfileStats(): Promise<CurrentProfileStats> {
  if (!nhost.auth.getUser()?.id) {
    return {
      validatedRuns: 0,
    };
  }

  return requestBackendApi<CurrentProfileStats>('/profile/stats');
}

function mapProfile(profile: BackendProfile): CurrentProfile {
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    createdAt: profile.createdAt,
  };
}

export function getProfileErrorMessage(error: unknown): string {
  if (error instanceof BackendApiError) {
    switch (error.code) {
      case 'username_taken':
        return 'This username is already taken.';
      case 'beta_access_denied':
        return 'This account does not have closed beta access yet.';
      case 'missing_authorization':
      case 'invalid_authorization':
      case 'invalid_token':
        return 'Sign in before finishing your profile.';
      case 'validation_error':
        return 'Profile details look invalid. Check the username and display name.';
      default:
        break;
    }
  }

  if (error instanceof Error) {
    const lowerMessage = error.message.toLowerCase();
    if (lowerMessage.includes('fetch failed') || lowerMessage.includes('network request failed')) {
      return 'Profile details are unavailable right now. Try again in a moment.';
    }
  }

  return 'We could not finish your profile right now.';
}
