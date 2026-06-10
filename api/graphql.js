// Lightweight mock of the Hasura GraphQL endpoint for the portfolio demo.
//
// The deployed Expo web app talks to this single serverless function instead of
// a real Hasura instance. It only implements the read-only operations the app
// issues for anonymous (logged-out) browsing:
//   - DevFallbackEvents        -> events list
//   - DevFallbackEventDetail   -> single event
//   - LeaderboardScreen        -> active season + user/team leaderboards
//   - TeamsScreenPublic        -> teams list
//   - TeamDetailsPublic        -> single team + season standing
//   - CurrentUserTeamMemberships -> empty (no authenticated user in the demo)
//
// Auth-gated screens (feed, profile) intentionally fall back to their sign-in
// state because no Nhost Auth project is wired up in the demo.

const {
  buildEvents,
  buildEventById,
  buildTeams,
  buildTeamById,
  buildSeasonWithLeaderboards,
  buildSeasonWithTeamStanding,
} = require('./_data');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string' && req.body.length > 0) {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

function detectOperation(query, explicitName) {
  if (explicitName) {
    return explicitName;
  }
  const match = /(?:query|mutation)\s+([A-Za-z0-9_]+)/.exec(query || '');
  return match ? match[1] : null;
}

function resolve(operation, variables) {
  switch (operation) {
    case 'DevFallbackEvents':
      return { events: buildEvents() };

    case 'DevFallbackEventDetail':
      return { event: buildEventById(variables.eventId) };

    case 'LeaderboardScreen':
      return { seasons: [buildSeasonWithLeaderboards()] };

    case 'TeamsScreenPublic':
      return { teams: buildTeams() };

    case 'TeamDetailsPublic': {
      const team = buildTeamById(variables.teamId);
      return {
        team,
        seasons: team ? [buildSeasonWithTeamStanding(variables.teamId)] : [],
      };
    }

    // Authenticated-only operations: there is no signed-in user in the demo,
    // so return empty membership data rather than an error.
    case 'CurrentUserTeamMemberships':
      return { team_members: [] };

    default:
      return null;
  }
}

module.exports = (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({ status: 'ok', service: 'secret-run-demo-graphql-mock' });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ errors: [{ message: 'Method not allowed.' }] });
    return;
  }

  const body = readBody(req);
  const operation = detectOperation(body.query, body.operationName);
  const variables = body.variables || {};

  const data = resolve(operation, variables);

  if (data === null) {
    res.status(200).json({
      data: null,
      errors: [
        { message: `Operation '${operation ?? 'unknown'}' is not supported by the demo backend.` },
      ],
    });
    return;
  }

  res.status(200).json({ data });
};
