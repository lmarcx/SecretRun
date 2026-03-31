import { BackendApiError, isBackendApiConfigError, requestBackendApi } from './backendApiClient';
import { nhost } from './nhostClient';

export type FeedActivityType = 'joined_event' | 'completed_run' | 'result_available';

export interface FeedActivityItem {
  id: string;
  type: FeedActivityType;
  createdAt: string;
  status: string | null;
  points: number | null;
  distanceKm: number | null;
  durationSeconds: number | null;
  avgSpeedKmh: number | null;
  event: {
    id: string;
    title: string;
  } | null;
  profile: {
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
  } | null;
}

export interface FeedData {
  requiresAuth: boolean;
  items: FeedActivityItem[];
}

export async function fetchFeed(limit = 20): Promise<FeedData> {
  if (!nhost.auth.getUser()?.id) {
    return {
      requiresAuth: true,
      items: [],
    };
  }

  return requestBackendApi<FeedData>(`/feed?limit=${encodeURIComponent(String(limit))}`);
}

export function getFeedErrorMessage(error: unknown): string {
  if (isBackendApiConfigError(error)) {
    return 'Feed needs EXPO_PUBLIC_BACKEND_API_URL. Public fallback is only enabled for events.';
  }

  if (error instanceof BackendApiError) {
    switch (error.code) {
      case 'beta_access_denied':
        return 'This account does not have closed beta access yet.';
      case 'missing_authorization':
      case 'invalid_authorization':
      case 'invalid_token':
        return 'Sign in to load your feed.';
      case 'validation_error':
        return 'Feed request looked invalid. Retry in a moment.';
      default:
        break;
    }
  }

  if (error instanceof Error) {
    const lowerMessage = error.message.toLowerCase();
    if (lowerMessage.includes('fetch failed') || lowerMessage.includes('network request failed')) {
      return 'Feed is unavailable right now. Try again in a moment.';
    }
  }

  return 'We could not load the feed right now.';
}
