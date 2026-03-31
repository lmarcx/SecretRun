import type { EventRoute } from '@/utils/route';
import { normalizeEventRoute } from '@/utils/route';
import { BackendApiError, requestBackendApi } from './backendApiClient';
import { nhost } from './nhostClient';

interface FetchEventRouteOptions {
  allowRequest?: boolean;
}

export function canFetchProtectedEventRoute(viewerParticipationStatus: string | null | undefined): boolean {
  return Boolean(nhost.auth.getUser()?.id && viewerParticipationStatus === 'registered');
}

export async function fetchEventRoute(eventId: string, options: FetchEventRouteOptions = {}): Promise<EventRoute | null> {
  if (!options.allowRequest) {
    return null;
  }

  const response = await requestBackendApi<{ routePolyline: string | null }>(`/events/${eventId}/route`);
  return normalizeEventRoute(response.routePolyline ?? null);
}

export function getEventRouteErrorMessage(error: unknown): string {
  if (error instanceof BackendApiError) {
    switch (error.code) {
      case 'route_not_revealed':
        return 'Route sealed until reveal.';
      case 'route_participation_required':
        return 'Join this event to unlock the route.';
      case 'event_route_not_found':
        return 'Route not published yet.';
      case 'beta_access_denied':
        return 'This account does not have closed beta access yet.';
      case 'missing_authorization':
      case 'invalid_authorization':
      case 'invalid_token':
        return 'Sign in to unlock the route.';
      case 'event_not_found':
        return 'Event not found.';
      default:
        break;
    }
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('fetch failed') || message.includes('network request failed')) {
      return 'Route unavailable right now.';
    }
  }

  return 'Route unavailable right now.';
}
