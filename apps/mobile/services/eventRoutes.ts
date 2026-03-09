import { gql } from 'graphql-request';
import type { EventRoute } from '@/utils/route';
import { normalizeEventRoute } from '@/utils/route';
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

export async function fetchEventRoute(eventId: string): Promise<EventRoute | null> {
  const response = await requestGraphql<EventRouteQuery>(EVENT_ROUTE_QUERY, {
    eventId,
  });

  const route = response.event_routes[0];
  return normalizeEventRoute(route?.route_polyline ?? null);
}
