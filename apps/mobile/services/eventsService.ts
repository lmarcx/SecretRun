import type { LatLng } from 'react-native-maps';
import { gql } from 'graphql-request';
import {
  BackendApiError,
  isBackendApiConfigured,
  isBackendApiConfigError,
  requestBackendApi,
} from './backendApiClient';
import { getDevJoinedEvent, isDevRunnerActive, markDevJoinedEvent } from './devRunnerMode';
import { debugEvents } from './eventsDebug';
import { isPublicGraphqlConfigError, requestPublicGraphql } from './graphqlClient';
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

const devRuntimeEnabled = typeof __DEV__ !== 'undefined' && __DEV__;

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

  if (!isBackendApiConfigured()) {
    return fetchPublicEventsFallback();
  }

  try {
    const response = await requestBackendApi<{ events: BackendEventRead[] }>('/events');
    debugEvents('list.raw.backend', {
      source: 'backend_api',
      count: response.events.length,
      eventIds: response.events.map((event) => event.id),
      events: response.events,
    });

    const mappedEvents = response.events.map((event) => {
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

    debugEvents('list.mapped.backend', {
      source: 'backend_api',
      count: mappedEvents.length,
      events: mappedEvents,
    });

    if (mappedEvents.length === 0 && shouldUseSeededDevDemoFallback()) {
      const demoEvents = buildSeededDevDemoEvents();
      debugEvents('list.demo_fallback', {
        source: 'seeded_dev_demo',
        reason: 'empty_backend_list',
        count: demoEvents.length,
        eventIds: demoEvents.map((event) => event.id),
      });
      return demoEvents;
    }

    return mappedEvents;
  } catch (error) {
    if (shouldUseDevFallbackEvents(error)) {
      return fetchPublicEventsFallback();
    }

    throw error;
  }
}

export async function fetchEventDetails(eventId: string): Promise<EventDetail | null> {
  const viewerId = nhost.auth.getUser()?.id;
  const devParticipation = !viewerId ? getDevJoinedEvent(eventId) : null;

  if (!isBackendApiConfigured()) {
    return fetchPublicEventDetailsFallback(eventId, devParticipation);
  }

  try {
    const response = await requestBackendApi<BackendEventDetail>(`/events/${eventId}`);
    debugEvents('detail.raw.backend', {
      source: 'backend_api',
      eventId,
      event: response,
    });

    const mappedEvent = mapEventDetail(
      response,
      devParticipation
        ? {
            status: devParticipation.status,
            joinedAt: devParticipation.joinedAt,
          }
        : null,
    );

    debugEvents('detail.mapped.backend', {
      source: 'backend_api',
      eventId,
      event: mappedEvent,
    });

    return mappedEvent;
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404 && error.code === 'event_not_found') {
      const demoEvent = getSeededDevDemoEventDetail(eventId, devParticipation);
      if (demoEvent) {
        debugEvents('detail.demo_fallback', {
          source: 'seeded_dev_demo',
          reason: 'backend_not_found',
          eventId,
        });
        return demoEvent;
      }

      return null;
    }

    if (shouldUseDevFallbackEvents(error)) {
      return fetchPublicEventDetailsFallback(eventId, devParticipation);
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
  if (isBackendApiConfigError(error)) {
    return 'Event detail needs EXPO_PUBLIC_BACKEND_API_URL or the public GraphQL fallback.';
  }

  if (isPublicGraphqlConfigError(error)) {
    return 'Event detail needs EXPO_PUBLIC_HASURA_GRAPHQL_URL or EXPO_PUBLIC_NHOST_SUBDOMAIN + EXPO_PUBLIC_NHOST_REGION.';
  }

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

export function getEventsListErrorMessage(error: unknown): string {
  if (isBackendApiConfigError(error)) {
    return 'Events list needs EXPO_PUBLIC_BACKEND_API_URL or the public GraphQL fallback.';
  }

  if (isPublicGraphqlConfigError(error)) {
    return 'Events list needs EXPO_PUBLIC_HASURA_GRAPHQL_URL or EXPO_PUBLIC_NHOST_SUBDOMAIN + EXPO_PUBLIC_NHOST_REGION.';
  }

  const detailMessage = getEventErrorMessage(error);
  if (detailMessage === 'We could not load this event right now.') {
    return 'We could not load events right now.';
  }

  if (detailMessage === 'Sign in to access this event.') {
    return 'Sign in to access events.';
  }

  return detailMessage;
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

async function fetchPublicEventsFallback(): Promise<EventListItem[]> {
  const response = await requestPublicGraphql<DevFallbackEventsQuery>(DEV_FALLBACK_EVENTS_QUERY, {});
  debugEvents('list.raw.public_graphql', {
    source: 'public_graphql',
    count: response.events.length,
    eventIds: response.events.map((event) => event.id),
    events: response.events,
  });

  const mappedEvents = response.events.map(mapDevFallbackListItem);
  debugEvents('list.mapped.public_graphql', {
    source: 'public_graphql',
    count: mappedEvents.length,
    events: mappedEvents,
  });

  if (mappedEvents.length === 0 && shouldUseSeededDevDemoFallback()) {
    const demoEvents = buildSeededDevDemoEvents();
    debugEvents('list.demo_fallback', {
      source: 'seeded_dev_demo',
      reason: 'empty_public_graphql_list',
      count: demoEvents.length,
      eventIds: demoEvents.map((event) => event.id),
    });
    return demoEvents;
  }

  return mappedEvents;
}

async function fetchPublicEventDetailsFallback(
  eventId: string,
  devParticipation: { status: string; joinedAt: string } | null,
): Promise<EventDetail | null> {
  const response = await requestPublicGraphql<DevFallbackEventDetailQuery>(DEV_FALLBACK_EVENT_DETAIL_QUERY, {
    eventId,
  });
  debugEvents('detail.raw.public_graphql', {
    source: 'public_graphql',
    eventId,
    event: response.event,
  });

  if (!response.event) {
    const demoEvent = getSeededDevDemoEventDetail(eventId, devParticipation);
    if (demoEvent) {
      debugEvents('detail.demo_fallback', {
        source: 'seeded_dev_demo',
        reason: 'public_graphql_not_found',
        eventId,
      });
      return demoEvent;
    }

    return null;
  }

  const mappedEvent = mapDevFallbackDetail(response, devParticipation);
  debugEvents('detail.mapped.public_graphql', {
    source: 'public_graphql',
    eventId,
    event: mappedEvent,
  });

  return mappedEvent;
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

function shouldUseSeededDevDemoFallback(): boolean {
  return devRuntimeEnabled;
}

function buildSeededDevDemoEvents(now = new Date()): EventListItem[] {
  const nowMs = now.getTime();
  const makeIso = (offsetMs: number) => new Date(nowMs + offsetMs).toISOString();

  return [
    {
      id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3',
      title: 'Local Dev Test Loop',
      description: 'A short revealed route seeded around the local dev fallback coordinates for field testing.',
      revealAt: makeIso(-3 * 60 * 60 * 1000),
      startsAt: makeIso(-90 * 60 * 1000),
      endsAt: makeIso(6 * 60 * 60 * 1000),
      startAreaRadiusKm: 0.35,
      startAreaCenter: null,
      viewerParticipationStatus: getDevJoinedEvent('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3')?.status ?? null,
      viewerJoinedAt: getDevJoinedEvent('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3')?.joinedAt ?? null,
    },
    {
      id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
      title: 'Sunrise Bridge Dash',
      description: 'A fast city loop with the route revealed shortly before kickoff.',
      revealAt: makeIso(2 * 60 * 60 * 1000),
      startsAt: makeIso(6 * 60 * 60 * 1000),
      endsAt: makeIso(8 * 60 * 60 * 1000),
      startAreaRadiusKm: 1.5,
      startAreaCenter: null,
      viewerParticipationStatus: getDevJoinedEvent('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1')?.status ?? null,
      viewerJoinedAt: getDevJoinedEvent('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1')?.joinedAt ?? null,
    },
    {
      id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2',
      title: 'Canal Twilight Run',
      description: 'An evening tempo event with a reveal timed for the commute home.',
      revealAt: makeIso(24 * 60 * 60 * 1000),
      startsAt: makeIso(28 * 60 * 60 * 1000),
      endsAt: makeIso(30 * 60 * 60 * 1000),
      startAreaRadiusKm: 2,
      startAreaCenter: null,
      viewerParticipationStatus: getDevJoinedEvent('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2')?.status ?? null,
      viewerJoinedAt: getDevJoinedEvent('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2')?.joinedAt ?? null,
    },
  ];
}

function getSeededDevDemoEventDetail(
  eventId: string,
  devParticipation: { status: string; joinedAt: string } | null,
): EventDetail | null {
  if (!shouldUseSeededDevDemoFallback()) {
    return null;
  }

  const event = buildSeededDevDemoEvents().find((entry) => entry.id === eventId);
  if (!event) {
    return null;
  }

  return {
    ...event,
    viewerParticipationStatus: devParticipation?.status ?? event.viewerParticipationStatus,
    viewerJoinedAt: devParticipation?.joinedAt ?? event.viewerJoinedAt,
    participantCount: null,
  };
}
