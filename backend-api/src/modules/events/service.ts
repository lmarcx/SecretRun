import { ClientError, gql } from 'graphql-request';
import { AppError } from '../../lib/errors';
import * as hasura from '../../lib/hasura';
import { assertEventWindow } from './policy';

const EVENT_FIELDS = gql`
  fragment EventReadFields on events {
    id
    title
    description
    reveal_at
    starts_at
    ends_at
    start_area_radius_km
    start_area_center
    team_id
    is_private
    created_by
  }
`;

const PUBLIC_EVENTS_QUERY = gql`
  ${EVENT_FIELDS}
  query PublicEvents {
    events(order_by: [{ starts_at: asc }, { reveal_at: asc }]) {
      ...EventReadFields
    }
  }
`;

const AUTHENTICATED_EVENTS_QUERY = gql`
  ${EVENT_FIELDS}
  query AuthenticatedEvents($userId: uuid!) {
    events(order_by: [{ starts_at: asc }, { reveal_at: asc }]) {
      ...EventReadFields
    }
    event_participants(where: { user_id: { _eq: $userId } }) {
      event_id
      status
      joined_at
    }
    memberships: team_members(where: { user_id: { _eq: $userId } }) {
      team_id
    }
  }
`;

const PUBLIC_EVENT_DETAIL_QUERY = gql`
  ${EVENT_FIELDS}
  query PublicEventDetail($eventId: uuid!) {
    event: events_by_pk(id: $eventId) {
      ...EventReadFields
    }
    participant_count: event_participants_aggregate(where: { event_id: { _eq: $eventId } }) {
      aggregate {
        count
      }
    }
  }
`;

const AUTHENTICATED_EVENT_DETAIL_QUERY = gql`
  ${EVENT_FIELDS}
  query AuthenticatedEventDetail($eventId: uuid!, $userId: uuid!) {
    event: events_by_pk(id: $eventId) {
      ...EventReadFields
    }
    participant: event_participants(where: { event_id: { _eq: $eventId }, user_id: { _eq: $userId } }, limit: 1) {
      status
      joined_at
    }
    memberships: team_members(where: { user_id: { _eq: $userId } }) {
      team_id
    }
    participant_count: event_participants_aggregate(where: { event_id: { _eq: $eventId } }) {
      aggregate {
        count
      }
    }
  }
`;

const EVENT_ROUTE_QUERY = gql`
  ${EVENT_FIELDS}
  query EventRoute($eventId: uuid!, $userId: uuid!) {
    event: events_by_pk(id: $eventId) {
      ...EventReadFields
    }
    participant: event_participants(where: { event_id: { _eq: $eventId }, user_id: { _eq: $userId } }, limit: 1) {
      status
      joined_at
    }
    memberships: team_members(where: { user_id: { _eq: $userId } }) {
      team_id
    }
    route: event_routes(where: { event_id: { _eq: $eventId } }, limit: 1) {
      route_polyline
      revealed
      revealed_at
    }
  }
`;

const JOIN_EVENT_GUARD_QUERY = gql`
  query JoinEventGuard($eventId: uuid!, $userId: uuid!) {
    event: events_by_pk(id: $eventId) {
      id
      team_id
      is_private
      created_by
      max_participants
      reveal_at
      starts_at
      ends_at
    }
    existing: event_participants(
      where: { event_id: { _eq: $eventId }, user_id: { _eq: $userId } }
      limit: 1
    ) {
      event_id
      status
      joined_at
    }
    memberships: team_members(where: { user_id: { _eq: $userId } }) {
      team_id
    }
    participant_count: event_participants_aggregate(where: { event_id: { _eq: $eventId } }) {
      aggregate {
        count
      }
    }
  }
`;

const JOIN_EVENT_MUTATION = gql`
  mutation JoinEvent($eventId: uuid!, $userId: uuid!) {
    insert_event_participants_one(
      object: {
        event_id: $eventId
        user_id: $userId
        status: "registered"
      }
    ) {
      event_id
      status
      joined_at
    }
  }
`;

interface EventRecord {
  id: string;
  title: string;
  description: string | null;
  reveal_at: string;
  starts_at: string;
  ends_at: string | null;
  start_area_radius_km: number | string;
  start_area_center: unknown;
  team_id: string | null;
  is_private: boolean;
  created_by: string;
}

interface EventParticipation {
  status: string;
  joined_at: string;
}

interface EventParticipantRow extends EventParticipation {
  event_id: string;
}

interface EventReadModel {
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

interface EventDetailReadModel extends EventReadModel {
  participantCount: number | null;
}

interface PublicEventsQuery {
  events: EventRecord[];
}

interface AuthenticatedEventsQuery extends PublicEventsQuery {
  event_participants: EventParticipantRow[];
  memberships: Array<{
    team_id: string;
  }>;
}

interface PublicEventDetailQuery {
  event: EventRecord | null;
  participant_count: {
    aggregate: {
      count: number;
    } | null;
  };
}

interface AuthenticatedEventDetailQuery extends PublicEventDetailQuery {
  participant: EventParticipation[];
  memberships: Array<{
    team_id: string;
  }>;
}

interface EventRouteQuery {
  event: EventRecord | null;
  participant: EventParticipation[];
  memberships: Array<{
    team_id: string;
  }>;
  route: Array<{
    route_polyline: string | null;
    revealed: boolean;
    revealed_at: string | null;
  }>;
}

interface JoinEventGuardQuery {
  event: {
    id: string;
    team_id: string | null;
    is_private: boolean;
    created_by: string;
    max_participants: number | null;
    reveal_at: string;
    starts_at: string;
    ends_at: string | null;
  } | null;
  existing: Array<{
    event_id: string;
    status: string;
    joined_at: string;
  }>;
  memberships: Array<{
    team_id: string;
  }>;
  participant_count: {
    aggregate: {
      count: number;
    } | null;
  };
}

interface JoinEventMutation {
  insert_event_participants_one: {
    event_id: string;
    status: string;
    joined_at: string;
  } | null;
}

export async function listEvents(userId: string | null): Promise<EventReadModel[]> {
  if (!userId) {
    const response = await hasura.requestHasura<PublicEventsQuery>(PUBLIC_EVENTS_QUERY);
    return response.events.filter((event) => isPublicEvent(event)).map((event) => mapEventReadModel(event, null, false));
  }

  const response = await hasura.requestHasura<AuthenticatedEventsQuery>(AUTHENTICATED_EVENTS_QUERY, {
    userId,
  });

  const participationByEventId = new Map(
    response.event_participants.map((entry) => [entry.event_id, { status: entry.status, joined_at: entry.joined_at }] as const),
  );
  const membershipTeamIds = new Set(response.memberships.map((entry) => entry.team_id));

  return response.events
    .filter((event) => canViewEvent(event, userId, membershipTeamIds, participationByEventId.get(event.id) ?? null))
    .map((event) => mapEventReadModel(event, participationByEventId.get(event.id) ?? null, false));
}

export async function getEvent(userId: string | null, eventId: string): Promise<EventDetailReadModel | null> {
  if (!userId) {
    const response = await hasura.requestHasura<PublicEventDetailQuery>(PUBLIC_EVENT_DETAIL_QUERY, {
      eventId,
    });

    if (!response.event || !isPublicEvent(response.event)) {
      return null;
    }

    return mapEventDetailReadModel(response.event, null, response.participant_count.aggregate?.count ?? null, false);
  }

  const response = await hasura.requestHasura<AuthenticatedEventDetailQuery>(AUTHENTICATED_EVENT_DETAIL_QUERY, {
    eventId,
    userId,
  });

  const event = response.event;
  if (!event) {
    return null;
  }

  const participation = response.participant[0] ?? null;
  const membershipTeamIds = new Set(response.memberships.map((entry) => entry.team_id));
  if (!canViewEvent(event, userId, membershipTeamIds, participation)) {
    return null;
  }

  return mapEventDetailReadModel(
    event,
    participation,
    response.participant_count.aggregate?.count ?? null,
    canViewSensitiveEventFields(event, userId, participation),
  );
}

export async function getEventRoute(userId: string, eventId: string): Promise<{ routePolyline: string }> {
  const response = await hasura.requestHasura<EventRouteQuery>(EVENT_ROUTE_QUERY, {
    eventId,
    userId,
  });

  const event = response.event;
  if (!event) {
    throw new AppError(404, 'event_not_found', 'Event not found.');
  }

  const participation = response.participant[0] ?? null;
  const membershipTeamIds = new Set(response.memberships.map((entry) => entry.team_id));
  if (!canViewEvent(event, userId, membershipTeamIds, participation)) {
    throw new AppError(404, 'event_not_found', 'Event not found.');
  }

  if (!participation || participation.status !== 'registered') {
    throw new AppError(403, 'route_participation_required', 'Join this event to unlock the route preview.');
  }

  assertRouteVisible(event, response.route[0] ?? null);

  return {
    routePolyline: response.route[0]!.route_polyline!,
  };
}

export async function joinEvent(userId: string, eventId: string): Promise<'joined' | 'already_joined'> {
  const guard = await hasura.requestHasura<JoinEventGuardQuery>(JOIN_EVENT_GUARD_QUERY, {
    eventId,
    userId,
  });

  if (!guard.event) {
    throw new AppError(404, 'event_not_found', 'Event not found.');
  }

  if (guard.existing.length > 0) {
    return 'already_joined';
  }

  if (guard.event.is_private && !guard.event.team_id && guard.event.created_by !== userId) {
    throw new AppError(403, 'private_event_locked', 'This private event cannot be joined from the beta app.');
  }

  assertEventWindow(guard.event, 'join');

  if (guard.event.team_id && !guard.memberships.some((membership) => membership.team_id === guard.event!.team_id)) {
    throw new AppError(403, 'team_membership_required', 'Only team members can join this team event.');
  }

  const participantCount = guard.participant_count.aggregate?.count ?? 0;
  if (guard.event.max_participants !== null && participantCount >= guard.event.max_participants) {
    throw new AppError(409, 'event_full', 'This event has reached its participant limit.');
  }

  try {
    await hasura.requestHasura<JoinEventMutation>(JOIN_EVENT_MUTATION, {
      eventId,
      userId,
    });
    return 'joined';
  } catch (error) {
    if (isAlreadyJoinedError(error)) {
      return 'already_joined';
    }

    throw mapGraphqlError(error);
  }
}

function isPublicEvent(event: EventRecord): boolean {
  return !event.team_id && !event.is_private;
}

function canViewEvent(
  event: EventRecord,
  userId: string | null,
  membershipTeamIds: ReadonlySet<string>,
  participation: EventParticipation | null,
): boolean {
  if (isPublicEvent(event)) {
    return true;
  }

  if (!userId) {
    return false;
  }

  if (event.created_by === userId) {
    return true;
  }

  if (event.team_id && membershipTeamIds.has(event.team_id)) {
    return true;
  }

  return participation?.status === 'registered';
}

function mapEventReadModel(
  event: EventRecord,
  participation: EventParticipation | null = null,
  includeSensitiveLocation = false,
): EventReadModel {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startsAt: event.starts_at,
    revealAt: event.reveal_at,
    endsAt: event.ends_at,
    startAreaRadiusKm: Number(event.start_area_radius_km),
    startAreaCenter: includeSensitiveLocation ? event.start_area_center : null,
    viewerParticipationStatus: participation?.status ?? null,
    viewerJoinedAt: participation?.joined_at ?? null,
  };
}

function mapEventDetailReadModel(
  event: EventRecord,
  participation: EventParticipation | null,
  participantCount: number | null,
  includeSensitiveLocation: boolean,
): EventDetailReadModel {
  return {
    ...mapEventReadModel(event, participation, includeSensitiveLocation),
    participantCount,
  };
}

function canViewSensitiveEventFields(
  event: Pick<EventRecord, 'created_by'>,
  userId: string,
  participation: EventParticipation | null,
): boolean {
  if (event.created_by === userId) {
    return true;
  }

  return participation?.status === 'registered';
}

function assertRouteVisible(
  event: Pick<EventRecord, 'reveal_at'>,
  route:
    | {
        route_polyline: string | null;
        revealed: boolean;
        revealed_at: string | null;
      }
    | null,
  now = new Date(),
) {
  const revealAtMs = new Date(event.reveal_at).getTime();
  if (Number.isNaN(revealAtMs)) {
    throw new AppError(500, 'invalid_event_schedule', 'This event has an invalid schedule configuration.');
  }

  if (now.getTime() < revealAtMs) {
    throw new AppError(403, 'route_not_revealed', 'This route is not revealed yet.', {
      revealAt: event.reveal_at,
    });
  }

  if (!route?.route_polyline) {
    throw new AppError(404, 'event_route_not_found', 'Route preview is not available for this event yet.');
  }

  if (!route.revealed) {
    throw new AppError(403, 'route_not_revealed', 'This route is not revealed yet.', {
      revealAt: event.reveal_at,
    });
  }

  if (route.revealed_at) {
    const revealedAtMs = new Date(route.revealed_at).getTime();
    if (!Number.isNaN(revealedAtMs) && now.getTime() < revealedAtMs) {
      throw new AppError(403, 'route_not_revealed', 'This route is not revealed yet.', {
        revealAt: route.revealed_at,
      });
    }
  }
}

function isAlreadyJoinedError(error: unknown): boolean {
  if (error instanceof ClientError) {
    return Boolean(error.response.errors?.some((entry) => entry.message.toLowerCase().includes('event_participants_pkey')));
  }

  return error instanceof Error && error.message.toLowerCase().includes('event_participants_pkey');
}

function mapGraphqlError(error: unknown): AppError {
  if (error instanceof ClientError) {
    const message = error.response.errors?.[0]?.message?.toLowerCase() ?? '';

    if (message.includes('only team members can join this team event')) {
      return new AppError(403, 'team_membership_required', 'Only team members can join this team event.');
    }

    if (message.includes('event is full')) {
      return new AppError(409, 'event_full', 'This event has reached its participant limit.');
    }

    if (message.includes('private event cannot be joined')) {
      return new AppError(403, 'private_event_locked', 'This private event cannot be joined from the beta app.');
    }

    if (message.includes('event not found')) {
      return new AppError(404, 'event_not_found', 'Event not found.');
    }

    if (message.includes('event_participants_user_id_fkey')) {
      return new AppError(409, 'profile_required', 'Finish setting up your runner profile before joining events.');
    }
  }

  return new AppError(500, 'join_event_failed', 'Could not join this event right now.');
}
