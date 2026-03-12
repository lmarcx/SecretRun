import { GraphQLClient, gql } from 'graphql-request';

interface Input {
  event_id: string;
  user_id?: string;
}

interface AuthenticatedRequest {
  body?: Input;
  headers?: Record<string, string | string[] | undefined>;
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

function getHeaderValue(
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string,
): string | null {
  const direct = headers?.[name] ?? headers?.[name.toLowerCase()] ?? headers?.[name.toUpperCase()];
  if (!direct) {
    return null;
  }

  return Array.isArray(direct) ? direct[0] : direct;
}

function getEffectiveUserId(req: AuthenticatedRequest, adminSecret: string): string | null {
  const headerUserId =
    getHeaderValue(req.headers, 'x-hasura-user-id') ?? getHeaderValue(req.headers, 'X-Hasura-User-Id');
  const bodyUserId = req.body?.user_id;
  const internalAdminSecret =
    getHeaderValue(req.headers, 'x-hasura-admin-secret') ?? getHeaderValue(req.headers, 'X-Hasura-Admin-Secret');
  const isInternalAdminCall = internalAdminSecret === adminSecret;

  if (headerUserId) {
    if (bodyUserId && bodyUserId !== headerUserId) {
      throw new Error('Body user_id does not match authenticated user.');
    }

    return headerUserId;
  }

  if (isInternalAdminCall && bodyUserId) {
    return bodyUserId;
  }

  return null;
}

export default async function handler(req: AuthenticatedRequest) {
  const url = process.env.NHOST_GRAPHQL_URL;
  const adminSecret = process.env.NHOST_ADMIN_SECRET;

  if (!url || !adminSecret) {
    throw new Error('NHOST_GRAPHQL_URL and NHOST_ADMIN_SECRET are required');
  }

  const payload = req.body;
  if (!payload?.event_id) {
    return { success: false, error: 'event_id is required' };
  }

  let currentUserId: string | null;
  try {
    currentUserId = getEffectiveUserId(req, adminSecret);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Could not verify user identity.',
    };
  }

  if (!currentUserId) {
    return { success: false, error: 'Missing verified user identity.' };
  }

  const client = new GraphQLClient(url, {
    headers: { 'x-hasura-admin-secret': adminSecret },
  });

  const eventResponse = await client.request<{
    events_by_pk: { id: string; team_id: string | null } | null;
    team_members: Array<{ team_id: string }>;
  }>(getEventTeamQuery, {
    eventId: payload.event_id,
    userId: currentUserId,
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
      user_id: currentUserId,
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

  if (
    typeof participationResult === 'object' &&
    participationResult !== null &&
    'success' in participationResult &&
    participationResult.success === false
  ) {
    return {
      success: false,
      error:
        'error' in participationResult && typeof participationResult.error === 'string'
          ? participationResult.error
          : 'participation-reward refused the request.',
    };
  }

  return {
    success: true,
    event_id: payload.event_id,
    user_id: currentUserId,
    participation: participationResult,
  };
}
