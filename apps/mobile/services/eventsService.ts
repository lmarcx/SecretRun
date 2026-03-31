import type { LatLng } from 'react-native-maps';
import { gql } from 'graphql-request';
import { BackendApiError, requestBackendApi } from './backendApiClient';
import { getDevJoinedEvent, isDevRunnerActive, markDevJoinedEvent } from './devRunnerMode';
import { requestGraphql } from './graphqlClient';
import { nhost } from './nhostClient';
import { parseGeoPoint } from '@/utils/route';

export interface EventListItem {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  revealAt: string;
  endsAt: string | null;
  startAreaRadiusKm: number;
  startAreaCenter: LatLng | null;
  viewerParticipationStatus: string | null;
  viewerJoinedAt: string | null;
}

export interface EventDetail extends EventListItem {
  participantCount: number | null;
}

interface BackendEventRead {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  revealAt: string;
  endsAt: string | null;
  startAreaRadiusKm: number;
  startAreaCenter: unknown;
  viewerParticipationStatus: string | null;
  viewerJoinedAt: string | null;
}

interface BackendEventDetail extends BackendEventRead {
  participantCount: number | null;
}

const DEV_FALLBACK_EVENTS_QUERY = gql`
  query DevFallbackEvents {
    events(order_by: [{ starts_at: asc }, { reveal_at: asc }]) {
      id
      title
      description
      starts_at
      reveal_at
      ends_at
      start_area_radius_km
    }
  }
`;

const DEV_FALLBACK_EVENT_DETAIL_QUERY = gql`
  query DevFallbackEventDetail($eventId: uuid!) {
    event: events_by_pk(id: $eventId) {
      id
      title
      description
      starts_at
      reveal_at
      ends_at
      start_area_radius_km
    }
  }
`;

interface DevFallbackEventRow {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  reveal_at: string;
  ends_at: string | null;
  start_area_radius_km: number | string;
}

interface DevFallbackEventsQuery {
  events: DevFallbackEventRow[];
}

interface DevFallbackEventDetailQuery {
  event: DevFallbackEventRow | null;
}

function mapEventListItem(
  event: BackendEventRead,
  participation?: { status: string; joinedAt: string } | null,
): EventListItem {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startsAt: event.startsAt,
    revealAt: event.revealAt,
    endsAt: event.endsAt,
    startAreaRadiusKm: Number(event.startAreaRadiusKm),
    startAreaCenter: parseGeoPoint(event.startAreaCenter),
    viewerParticipationStatus: participation?.status ?? event.viewerParticipationStatus ?? null,
    viewerJoinedAt: participation?.joinedAt ?? event.viewerJoinedAt ?? null,
  };
}

function mapEventDetail(
  event: BackendEventDetail,
  participation?: { status: string; joinedAt: string } | null,
): EventDetail {
  return {
    ...mapEventListItem(event, participation),
    participantCount: event.participantCount ?? null,
  };
}

export async function fetchPublicEvents(): Promise<EventListItem[]> {
  const viewerId = nhost.auth.getUser()?.id;

  try {
    const response = await requestBackendApi<{ events: BackendEventRead[] }>('/events');

    return response.events.map((event) => {
      const devParticipation = !viewerId ? getDevJoinedEvent(event.id) : null;

      return mapEventListItem(
        event,
        devParticipation
          ? {
              status: devParticipation.status,
              joinedAt: devParticipation.joinedAt,
            }
          : null,
      );
    });
  } catch (error) {
    if (shouldUseDevFallbackEvents(error)) {
      const response = await requestGraphql<DevFallbackEventsQuery>(DEV_FALLBACK_EVENTS_QUERY, {});
      return response.events.map(mapDevFallbackListItem);
    }

    throw error;
  }
}

export async function fetchEventDetails(eventId: string): Promise<EventDetail | null> {
  const viewerId = nhost.auth.getUser()?.id;
  const devParticipation = !viewerId ? getDevJoinedEvent(eventId) : null;

  try {
    const response = await requestBackendApi<BackendEventDetail>(`/events/${eventId}`);
    return mapEventDetail(
      response,
      devParticipation
        ? {
            status: devParticipation.status,
            joinedAt: devParticipation.joinedAt,
          }
        : null,
    );
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404 && error.code === 'event_not_found') {
      return null;
    }

    if (shouldUseDevFallbackEvents(error)) {
      const response = await requestGraphql<DevFallbackEventDetailQuery>(DEV_FALLBACK_EVENT_DETAIL_QUERY, {
        eventId,
      });

      if (!response.event) {
        return null;
      }

      return mapDevFallbackDetail(response, devParticipation);
    }

    throw error;
  }
}

export async function joinEvent(eventId: string): Promise<'joined' | 'already_joined'> {
  const viewerId = nhost.auth.getUser()?.id;
  if (!viewerId) {
    return markDevJoinedEvent(eventId);
  }

  try {
    const response = await requestBackendApi<{ status: 'joined' | 'already_joined' }>(`/events/${eventId}/join`, {
      method: 'POST',
    });
    return response.status;
  } catch (error) {
    if (isAlreadyJoinedError(error)) {
      return 'already_joined';
    }

    throw error;
  }
}

export function getEventErrorMessage(error: unknown): string {
  if (error instanceof BackendApiError) {
    switch (error.code) {
      case 'event_not_found':
        return 'Event not found.';
      case 'team_membership_required':
        return 'Only team members can join this event.';
      case 'event_full':
        return 'This event is full.';
      case 'private_event_locked':
        return 'This private event is not open for joining in the beta app.';
      case 'profile_required':
        return 'Finish setting up your runner profile before joining events.';
      case 'event_not_revealed':
        return 'This event is not open yet.';
      case 'beta_access_denied':
        return 'This account does not have closed beta access yet.';
      case 'missing_authorization':
      case 'invalid_authorization':
      case 'invalid_token':
        return 'Sign in to access this event.';
      default:
        break;
    }
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('fetch failed') || message.includes('network request failed')) {
      return 'Events are unavailable right now. Try again in a moment.';
    }
  }

  return 'We could not load this event right now.';
}

function isAlreadyJoinedError(error: unknown): boolean {
  return error instanceof BackendApiError && error.code === 'already_joined';
}

function shouldUseDevFallbackEvents(error: unknown): boolean {
  return Boolean(
    !nhost.auth.getUser() &&
      isDevRunnerActive() &&
      error instanceof BackendApiError &&
      ['missing_authorization', 'invalid_authorization', 'beta_access_denied'].includes(error.code),
  );
}

function mapDevFallbackListItem(event: DevFallbackEventRow): EventListItem {
  const devParticipation = getDevJoinedEvent(event.id);

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startsAt: event.starts_at,
    revealAt: event.reveal_at,
    endsAt: event.ends_at,
    startAreaRadiusKm: Number(event.start_area_radius_km),
    startAreaCenter: null,
    viewerParticipationStatus: devParticipation?.status ?? null,
    viewerJoinedAt: devParticipation?.joinedAt ?? null,
  };
}

function mapDevFallbackDetail(
  response: DevFallbackEventDetailQuery,
  devParticipation: { status: string; joinedAt: string } | null,
): EventDetail {
  return {
    ...mapDevFallbackListItem(response.event!),
    viewerParticipationStatus: devParticipation?.status ?? getDevJoinedEvent(response.event!.id)?.status ?? null,
    viewerJoinedAt: devParticipation?.joinedAt ?? getDevJoinedEvent(response.event!.id)?.joinedAt ?? null,
    participantCount: null,
  };
}
