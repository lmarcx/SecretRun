import { ClientError, gql } from 'graphql-request';
import { nhost } from './nhostClient';
import { requestGraphql } from './graphqlClient';

export interface EventListItem {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  revealAt: string;
}

export interface EventDetail extends EventListItem {
  startAreaRadiusKm: number;
  participantCount: number | null;
  viewerParticipationStatus: string | null;
}

const PUBLIC_EVENTS_QUERY = gql`
  query PublicEvents {
    events(order_by: { starts_at: asc }) {
      id
      title
      description
      starts_at
      reveal_at
    }
  }
`;

const EVENT_DETAIL_QUERY = gql`
  query EventDetail($eventId: uuid!, $viewerId: uuid!) {
    events_by_pk(id: $eventId) {
      id
      title
      description
      starts_at
      reveal_at
      start_area_radius_km
      participants(where: { user_id: { _eq: $viewerId } }, limit: 1) {
        status
      }
      participants_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

const EVENT_DETAIL_QUERY_PUBLIC = gql`
  query EventDetailPublic($eventId: uuid!) {
    events_by_pk(id: $eventId) {
      id
      title
      description
      starts_at
      reveal_at
      start_area_radius_km
    }
  }
`;

const JOIN_EVENT_MUTATION = gql`
  mutation JoinEvent($eventId: uuid!) {
    insert_event_participants_one(object: { event_id: $eventId }) {
      event_id
      status
      joined_at
    }
  }
`;

interface PublicEventsQuery {
  events: Array<{
    id: string;
    title: string;
    description: string | null;
    starts_at: string;
    reveal_at: string;
  }>;
}

interface EventDetailQuery {
  events_by_pk: {
    id: string;
    title: string;
    description: string | null;
    starts_at: string;
    reveal_at: string;
    start_area_radius_km: number | string;
    participants?: Array<{
      status: string;
    }>;
    participants_aggregate?: {
      aggregate: {
        count: number;
      } | null;
    };
  } | null;
}

interface JoinEventMutation {
  insert_event_participants_one: {
    event_id: string;
    status: string;
    joined_at: string;
  } | null;
}

function mapEventListItem(event: PublicEventsQuery['events'][number]): EventListItem {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startsAt: event.starts_at,
    revealAt: event.reveal_at,
  };
}

function mapEventDetail(event: NonNullable<EventDetailQuery['events_by_pk']>, includeParticipantData: boolean): EventDetail {
  const viewerParticipationStatus = event.participants?.[0]?.status ?? null;
  const participantCount =
    includeParticipantData && viewerParticipationStatus
      ? event.participants_aggregate?.aggregate?.count ?? null
      : null;

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startsAt: event.starts_at,
    revealAt: event.reveal_at,
    startAreaRadiusKm: Number(event.start_area_radius_km),
    participantCount,
    viewerParticipationStatus,
  };
}

export async function fetchPublicEvents(): Promise<EventListItem[]> {
  const response = await requestGraphql<PublicEventsQuery>(PUBLIC_EVENTS_QUERY, {});
  return response.events.map(mapEventListItem);
}

export async function fetchEventDetails(eventId: string): Promise<EventDetail | null> {
  const viewerId = nhost.auth.getUser()?.id;

  if (!viewerId) {
    const response = await requestGraphql<EventDetailQuery>(EVENT_DETAIL_QUERY_PUBLIC, {
      eventId,
    });

    if (!response.events_by_pk) {
      return null;
    }

    return mapEventDetail(response.events_by_pk, false);
  }

  const response = await requestGraphql<EventDetailQuery>(EVENT_DETAIL_QUERY, {
    eventId,
    viewerId,
  });

  if (!response.events_by_pk) {
    return null;
  }

  return mapEventDetail(response.events_by_pk, true);
}

export async function joinEvent(eventId: string): Promise<void> {
  if (!nhost.auth.getUser()) {
    throw new Error('Sign in to join an event.');
  }

  await requestGraphql<JoinEventMutation>(JOIN_EVENT_MUTATION, { eventId });
}

export function getEventErrorMessage(error: unknown): string {
  if (error instanceof ClientError) {
    const firstMessage = error.response.errors?.[0]?.message;
    if (firstMessage) {
      if (firstMessage.toLowerCase().includes('event_participants_pkey')) {
        return 'You already joined this event.';
      }

      return firstMessage;
    }
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('event_participants_pkey') || message.includes('already exists')) {
      return 'You already joined this event.';
    }

    return error.message;
  }

  return 'Something went wrong. Please try again.';
}
