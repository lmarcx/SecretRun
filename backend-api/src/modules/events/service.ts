import { ClientError, gql } from 'graphql-request';
import { AppError } from '../../lib/errors';
import { requestHasura } from '../../lib/hasura';
import { assertEventWindow } from './policy';

const JOIN_EVENT_GUARD_QUERY = gql`
  query JoinEventGuard($eventId: uuid!, $userId: uuid!) {
    event: events_by_pk(id: $eventId) {
      id
      team_id
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

interface JoinEventGuardQuery {
  event: {
    id: string;
    team_id: string | null;
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

export async function joinEvent(userId: string, eventId: string): Promise<'joined' | 'already_joined'> {
  const guard = await requestHasura<JoinEventGuardQuery>(JOIN_EVENT_GUARD_QUERY, {
    eventId,
    userId,
  });

  if (!guard.event) {
    throw new AppError(404, 'event_not_found', 'Event not found.');
  }

  if (guard.existing.length > 0) {
    return 'already_joined';
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
    await requestHasura<JoinEventMutation>(JOIN_EVENT_MUTATION, {
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

    if (message.includes('event not found')) {
      return new AppError(404, 'event_not_found', 'Event not found.');
    }

    if (message.includes('event_participants_user_id_fkey')) {
      return new AppError(409, 'profile_required', 'Finish setting up your runner profile before joining events.');
    }
  }

  return new AppError(500, 'join_event_failed', 'Could not join this event right now.');
}
