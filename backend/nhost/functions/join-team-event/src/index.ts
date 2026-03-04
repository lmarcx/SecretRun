import { GraphQLClient, gql } from 'graphql-request';

interface Input {
  event_id: string;
  user_id: string;
}

const getEventTeamQuery = gql`
  query GetEventTeam($eventId: uuid!, $userId: uuid!) {
    events_by_pk(id: $eventId) {
      id
      team_id
    }
    team_members(where: { user_id: { _eq: $userId } }) {
      team_id
    }
  }
`;

function getFunctionsBaseUrl(): string {
  return process.env.NHOST_FUNCTIONS_BASE_URL ?? 'http://127.0.0.1:1337/v1/functions';
}

export default async function handler(req: { body?: Input }) {
  const url = process.env.NHOST_GRAPHQL_URL;
  const adminSecret = process.env.NHOST_ADMIN_SECRET;

  if (!url || !adminSecret) {
    throw new Error('NHOST_GRAPHQL_URL and NHOST_ADMIN_SECRET are required');
  }

  const payload = req.body;
  if (!payload?.event_id || !payload?.user_id) {
    return { success: false, error: 'event_id and user_id are required' };
  }

  const client = new GraphQLClient(url, {
    headers: { 'x-hasura-admin-secret': adminSecret },
  });

  const eventResponse = await client.request<{
    events_by_pk: { id: string; team_id: string | null } | null;
    team_members: Array<{ team_id: string }>;
  }>(getEventTeamQuery, {
    eventId: payload.event_id,
    userId: payload.user_id,
  });

  const event = eventResponse.events_by_pk;
  if (!event) {
    return { success: false, error: 'Event not found' };
  }

  if (!event.team_id) {
    return { success: false, error: 'Event is not a team event' };
  }

  const isTeamMember = eventResponse.team_members.some((member) => member.team_id === event.team_id);
  if (!isTeamMember) {
    return { success: false, error: 'User is not a member of event team' };
  }

  const participationResponse = await fetch(`${getFunctionsBaseUrl()}/participation-reward`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': adminSecret,
    },
    body: JSON.stringify({
      event_id: payload.event_id,
      user_id: payload.user_id,
    }),
  });

  if (!participationResponse.ok) {
    const body = await participationResponse.text();
    return {
      success: false,
      error: `participation-reward failed: ${participationResponse.status} ${body}`,
    };
  }

  let participationResult: unknown = null;
  try {
    participationResult = await participationResponse.json();
  } catch {
    participationResult = { success: false, error: 'Invalid participation-reward response' };
  }

  return {
    success: true,
    event_id: payload.event_id,
    user_id: payload.user_id,
    participation: participationResult,
  };
}
