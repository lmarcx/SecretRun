import { GraphQLClient, gql } from 'graphql-request';

interface LatLng {
  lat: number;
  lng: number;
}

interface Input {
  team_id: string;
  distance_km: number;
  start_time: string;
  start_area_center: LatLng;
}

function getUserId(req: { headers?: Record<string, string | string[] | undefined> }): string | null {
  const direct = req.headers?.['x-hasura-user-id'] ?? req.headers?.['X-Hasura-User-Id'];
  if (!direct) {
    return null;
  }
  return Array.isArray(direct) ? direct[0] : direct;
}

const getTeamQuery = gql`
  query GetTeam($teamId: uuid!, $userId: uuid!) {
    teams_by_pk(id: $teamId) {
      id
      created_by
      members: team_members {
        user_id
        role
      }
    }
    team_members(where: { team_id: { _eq: $teamId } }) {
      user_id
    }
    leaderMembership: team_members(
      where: { team_id: { _eq: $teamId }, user_id: { _eq: $userId }, role: { _eq: "leader" } }
      limit: 1
    ) {
      user_id
    }
  }
`;

const insertEventMutation = gql`
  mutation InsertTeamEvent(
    $title: String!
    $description: String!
    $revealAt: timestamptz!
    $startsAt: timestamptz!
    $startAreaCenter: geography!
    $startAreaRadiusKm: numeric!
    $createdBy: uuid!
    $teamId: uuid!
  ) {
    insert_events_one(
      object: {
        title: $title
        description: $description
        reveal_at: $revealAt
        starts_at: $startsAt
        start_area_center: $startAreaCenter
        start_area_radius_km: $startAreaRadiusKm
        created_by: $createdBy
        team_id: $teamId
      }
    ) {
      id
      team_id
      starts_at
    }
  }
`;

function getFunctionsBaseUrl(): string {
  return process.env.NHOST_FUNCTIONS_BASE_URL ?? 'http://127.0.0.1:1337/v1/functions';
}

function getDefaultStartAreaRadiusKm(): number {
  return Number(process.env.DEFAULT_START_AREA_RADIUS_KM ?? '1');
}

export default async function handler(req: {
  body?: Input;
  headers?: Record<string, string | string[] | undefined>;
}) {
  const url = process.env.NHOST_GRAPHQL_URL;
  const adminSecret = process.env.NHOST_ADMIN_SECRET;

  if (!url || !adminSecret) {
    throw new Error('NHOST_GRAPHQL_URL and NHOST_ADMIN_SECRET are required');
  }

  const payload = req.body;
  if (!payload?.team_id || !payload.distance_km || !payload.start_time || !payload.start_area_center) {
    return {
      success: false,
      error: 'team_id, distance_km, start_time and start_area_center are required',
    };
  }

  const userId = getUserId(req);
  if (!userId) {
    return {
      success: false,
      error: 'Missing x-hasura-user-id header',
    };
  }

  const client = new GraphQLClient(url, {
    headers: { 'x-hasura-admin-secret': adminSecret },
  });

  const teamResponse = await client.request<{
    teams_by_pk: { id: string; created_by: string; members: Array<{ user_id: string; role: string }> } | null;
    team_members: Array<{ user_id: string }>;
    leaderMembership: Array<{ user_id: string }>;
  }>(getTeamQuery, {
    teamId: payload.team_id,
    userId,
  });

  const team = teamResponse.teams_by_pk;
  if (!team) {
    return { success: false, error: 'Team not found' };
  }

  const isLeader = team.created_by === userId || teamResponse.leaderMembership.length > 0;
  if (!isLeader) {
    return { success: false, error: 'Only team leader can create a team event' };
  }

  const teamMemberCount = teamResponse.team_members.length;
  if (teamMemberCount < 3) {
    return { success: false, error: 'Minimum 3 team members are required to start a team event' };
  }

  const startsAt = new Date(payload.start_time);
  if (Number.isNaN(startsAt.getTime())) {
    return { success: false, error: 'Invalid start_time' };
  }

  const revealAt = new Date(startsAt.getTime() - 4 * 60 * 60 * 1000);

  const title = `Team Event ${startsAt.toISOString().slice(0, 16).replace('T', ' ')}`;
  const description = `Team event for team ${payload.team_id}`;
  const startAreaCenter = `SRID=4326;POINT(${payload.start_area_center.lng} ${payload.start_area_center.lat})`;

  const eventResponse = await client.request<{
    insert_events_one: { id: string; team_id: string; starts_at: string };
  }>(insertEventMutation, {
    title,
    description,
    revealAt: revealAt.toISOString(),
    startsAt: startsAt.toISOString(),
    startAreaCenter,
    startAreaRadiusKm: getDefaultStartAreaRadiusKm(),
    createdBy: userId,
    teamId: payload.team_id,
  });

  const eventId = eventResponse.insert_events_one.id;

  const routeResponse = await fetch(`${getFunctionsBaseUrl()}/generate-event-route`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': adminSecret,
    },
    body: JSON.stringify({
      event_id: eventId,
      distance_km: payload.distance_km,
      start_area_center: payload.start_area_center,
    }),
  });

  if (!routeResponse.ok) {
    const body = await routeResponse.text();
    return {
      success: false,
      error: `generate-event-route failed: ${routeResponse.status} ${body}`,
      event_id: eventId,
    };
  }

  let routeResult: unknown = null;
  try {
    routeResult = await routeResponse.json();
  } catch {
    routeResult = { success: false, error: 'Invalid generate-event-route response' };
  }

  return {
    success: true,
    event_id: eventId,
    team_id: payload.team_id,
    starts_at: startsAt.toISOString(),
    reveal_at: revealAt.toISOString(),
    route: routeResult,
  };
}
