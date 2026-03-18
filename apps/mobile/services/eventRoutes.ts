import { ClientError, gql } from 'graphql-request';
import type { EventRoute } from '@/utils/route';
import { normalizeEventRoute } from '@/utils/route';
import { nhost } from './nhostClient';
import { requestGraphql } from './graphqlClient';

const EVENT_ROUTE_QUERY = gql`
  query EventRoute($eventId: uuid!) {
    event_routes(where: { event_id: { _eq: $eventId } }, limit: 1) {
      route_polyline
    }
  }
`;

interface EventRouteQuery {
  event_routes: Array<{
    route_polyline: string | null;
  }>;
}

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

  try {
    const response = await requestGraphql<EventRouteQuery>(EVENT_ROUTE_QUERY, {
      eventId,
    });

    const route = response.event_routes[0];
    return normalizeEventRoute(route?.route_polyline ?? null);
  } catch (error) {
    if (isEventRouteUnavailableForRoleError(error)) {
      return null;
    }

    throw error;
  }
}

function isEventRouteUnavailableForRoleError(error: unknown): boolean {
  if (error instanceof ClientError) {
    return Boolean(error.response.errors?.some((entry) => isEventRouteUnavailableMessage(entry.message)));
  }

  if (error instanceof Error) {
    return isEventRouteUnavailableMessage(error.message);
  }

  return false;
}

function isEventRouteUnavailableMessage(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  return (
    lowerMessage.includes('event_routes') &&
    (lowerMessage.includes('query_root') ||
      lowerMessage.includes('not found') ||
      lowerMessage.includes('cannot query field') ||
      lowerMessage.includes('field') ||
      lowerMessage.includes('permission'))
  );
}
