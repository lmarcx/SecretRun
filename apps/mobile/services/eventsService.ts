import { ClientError, gql } from 'graphql-request';
import { nhost } from './nhostClient';
import { requestGraphql } from './graphqlClient';

export interface EventListItem {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  revealAt: string;
  startAreaRadiusKm: number;
}

export interface EventDetail extends EventListItem {
  participantCount: number | null;
  viewerParticipationStatus: string | null;
  viewerJoinedAt: string | null;
}

const PUBLIC_EVENTS_QUERY = gql`
  query PublicEvents {
    events(order_by: { starts_at: asc }) {
      id
      title
      description
      starts_at
      reveal_at
      start_area_radius_km
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
    }
    event_participants(where: { event_id: { _eq: $eventId }, user_id: { _eq: $viewerId } }, limit: 1) {
      status
      joined_at
    }
    event_participants_aggregate(where: { event_id: { _eq: $eventId } }) {
      aggregate {
        count
      }
    }
  }
`;

const EVENT_PARTICIPATION_QUERY = gql`
  query EventParticipation($eventId: uuid!, $viewerId: uuid!) {
    event_participants(where: { event_id: { _eq: $eventId }, user_id: { _eq: $viewerId } }, limit: 1) {
        status
        joined_at
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
    start_area_radius_km: number | string;
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
  } | null;
  event_participants?: Array<{
    status: string;
    joined_at: string;
  }>;
  event_participants_aggregate?: {
    aggregate: {
      count: number;
    } | null;
  };
}

interface EventParticipationQuery {
  event_participants: Array<{
    status: string;
    joined_at: string;
  }>;
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
    startAreaRadiusKm: Number(event.start_area_radius_km),
  };
}

function mapEventDetail(
  event: NonNullable<EventDetailQuery['events_by_pk']>,
  participation?: EventDetailQuery['event_participants'],
  participantCount?: number | null,
): EventDetail {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startsAt: event.starts_at,
    revealAt: event.reveal_at,
    startAreaRadiusKm: Number(event.start_area_radius_km),
    participantCount: participantCount ?? null,
    viewerParticipationStatus: participation?.[0]?.status ?? null,
    viewerJoinedAt: participation?.[0]?.joined_at ?? null,
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

    return mapEventDetail(response.events_by_pk);
  }

  const response = await requestGraphql<EventDetailQuery>(EVENT_DETAIL_QUERY, {
    eventId,
    viewerId,
  });

  if (!response.events_by_pk) {
    return null;
  }

  return mapEventDetail(
    response.events_by_pk,
    response.event_participants,
    response.event_participants_aggregate?.aggregate?.count ?? null,
  );
}

export async function joinEvent(eventId: string): Promise<'joined' | 'already_joined'> {
  const viewerId = nhost.auth.getUser()?.id;
  if (!viewerId) {
    throw new Error('Sign in to join an event.');
  }

  const existingParticipation = await requestGraphql<EventParticipationQuery>(EVENT_PARTICIPATION_QUERY, {
    eventId,
    viewerId,
  });

  if (existingParticipation.event_participants.length > 0) {
    return 'already_joined';
  }

  try {
    await requestGraphql<JoinEventMutation>(JOIN_EVENT_MUTATION, { eventId });
    return 'joined';
  } catch (error) {
    if (isAlreadyJoinedError(error)) {
      return 'already_joined';
    }

    throw error;
  }
}

export function getEventErrorMessage(error: unknown): string {
  if (error instanceof ClientError) {
    const firstMessage = error.response.errors?.[0]?.message;
    if (firstMessage) {
      const lowerMessage = firstMessage.toLowerCase();
      if (lowerMessage.includes('event_participants_pkey')) {
        return 'You already joined this event.';
      }

      if (lowerMessage.includes('event_participants_user_id_fkey')) {
        return 'Your account is missing a profile record, so you cannot join events yet.';
      }

      if (lowerMessage.includes("field 'events' not found")) {
        return 'Events are not exposed by the backend yet. Check the local Hasura metadata.';
      }

      return firstMessage;
    }
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('event_participants_pkey') || message.includes('already exists')) {
      return 'You already joined this event.';
    }

    if (message.includes('event_participants_user_id_fkey') || message.includes('foreign key constraint')) {
      return 'Your account is missing a profile record, so you cannot join events yet.';
    }

    return error.message;
  }

  return 'Something went wrong. Please try again.';
}

function isAlreadyJoinedError(error: unknown): boolean {
  if (error instanceof ClientError) {
    return Boolean(error.response.errors?.some((entry) => entry.message.toLowerCase().includes('event_participants_pkey')));
  }

  return error instanceof Error && error.message.toLowerCase().includes('event_participants_pkey');
}
