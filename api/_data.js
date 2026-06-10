// Frozen seed data for the Secret Run portfolio demo backend.
//
// This mirrors backend/nhost/seeds/secret_run_full_seed.sql so the statically
// deployed Expo web app can show realistic events, leaderboards and teams
// without a live Postgres/Hasura/Fastify stack. Timestamps are recomputed on
// every request (relative to "now") so event states stay coherent: some events
// are live, some upcoming, some already finished.

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const fromNow = (hours) => new Date(Date.now() + hours * HOUR).toISOString();
const daysAgo = (days) => new Date(Date.now() - days * DAY).toISOString();

const avatar = (seed, backgroundColor) =>
  `https://api.dicebear.com/9.x/notionists/png?seed=${seed}&backgroundColor=${backgroundColor}&radius=50`;

const SEASON = {
  id: '99999999-9999-4999-8999-999999999999',
  name: 'Spring 2026',
};

// Profiles keyed by user id (matches the seed identities).
const PROFILES = {
  '10000000-0000-4000-8000-000000000001': {
    username: 'you_runner',
    display_name: 'Lena Nightfall',
    avatar_url: avatar('lena-nightfall', '0f172a'),
  },
  '10000000-0000-4000-8000-000000000002': {
    username: 'alice_runner',
    display_name: 'Alice Riverline',
    avatar_url: avatar('alice-riverline', 'b6e3f4'),
  },
  '10000000-0000-4000-8000-000000000003': {
    username: 'bruno_stride',
    display_name: 'Bruno Stride',
    avatar_url: avatar('bruno-stride', 'c0aede'),
  },
  '10000000-0000-4000-8000-000000000004': {
    username: 'chloe_dash',
    display_name: 'Chloe Dashwell',
    avatar_url: avatar('chloe-dashwell', 'ffd5dc'),
  },
  '10000000-0000-4000-8000-000000000005': {
    username: 'diego_pace',
    display_name: 'Diego Pacecraft',
    avatar_url: avatar('diego-pacecraft', 'ffdfbf'),
  },
  '10000000-0000-4000-8000-000000000006': {
    username: 'eva_night',
    display_name: 'Eva Nightlane',
    avatar_url: avatar('eva-nightlane', 'd1d4f9'),
  },
  '10000000-0000-4000-8000-000000000007': {
    username: 'finn_bridge',
    display_name: 'Finn Bridgeway',
    avatar_url: avatar('finn-bridgeway', 'c0aede'),
  },
  '10000000-0000-4000-8000-000000000008': {
    username: 'gia_canal',
    display_name: 'Gia Canalrun',
    avatar_url: avatar('gia-canalrun', 'b6e3f4'),
  },
  '10000000-0000-4000-8000-000000000009': {
    username: 'hugo_trail',
    display_name: 'Hugo Trailmark',
    avatar_url: avatar('hugo-trailmark', 'ffdfbf'),
  },
};

// Events ordered by starts_at asc (matches DevFallbackEvents order_by).
const EVENT_DEFS = [
  {
    id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee8',
    title: 'Midnight Sprint Series',
    description: 'Past race used to seed older result cards in the private feed.',
    revealH: -124,
    startsH: -122,
    endsH: -120,
    radiusKm: 1.0,
    maxParticipants: 40,
    participantCount: 2,
  },
  {
    id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5',
    title: 'Old Town Finishers Loop',
    description: 'Completed event with seeded results for feed and leaderboard testing.',
    revealH: -53,
    startsH: -50,
    endsH: -48,
    radiusKm: 1.2,
    maxParticipants: 32,
    participantCount: 4,
  },
  {
    id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
    title: 'Local Launch Loop',
    description:
      'Ready to launch now. Use this event to test join, route reveal, and the run flow.',
    revealH: -3,
    startsH: -1,
    endsH: 5,
    radiusKm: 0.35,
    maxParticipants: 40,
    participantCount: 2,
  },
  {
    id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4',
    title: 'Docklands Night Relay',
    description: 'Reveal is already live and the start window is approaching.',
    revealH: -0.75,
    startsH: 1.5,
    endsH: 4,
    radiusKm: 0.8,
    maxParticipants: 36,
    participantCount: 2,
  },
  {
    id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2',
    title: 'Sunrise Bridge Dash',
    description:
      'Registration is full and the race starts soon, useful for validated/full event states.',
    revealH: 1,
    startsH: 5,
    endsH: 7,
    radiusKm: 1.2,
    maxParticipants: 6,
    participantCount: 6,
  },
  {
    id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee6',
    title: 'Night Owls Relay Brief',
    description: 'Private squad event reserved for Night Owls members.',
    revealH: 8,
    startsH: 12,
    endsH: 14,
    radiusKm: 0.8,
    maxParticipants: 20,
    participantCount: 2,
  },
  {
    id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3',
    title: 'Canal Twilight Run',
    description: 'Open hidden route with plenty of spots left.',
    revealH: 24,
    startsH: 28,
    endsH: 30,
    radiusKm: 2.0,
    maxParticipants: 30,
    participantCount: 2,
  },
  {
    id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee7',
    title: 'Phoenix Park Cipher',
    description: 'Longer public course for map browsing and distance sorting.',
    revealH: 48,
    startsH: 51,
    endsH: 54,
    radiusKm: 2.5,
    maxParticipants: 80,
    participantCount: 1,
  },
];

// Teams ordered by created_at asc (matches TeamsScreenPublic order_by).
const TEAM_DEFS = [
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    name: 'Night Owls',
    createdBy: '10000000-0000-4000-8000-000000000001',
    createdDaysAgo: 36,
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    name: 'River Sprinters',
    createdBy: '10000000-0000-4000-8000-000000000002',
    createdDaysAgo: 35,
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    name: 'Storm Pacers',
    createdBy: '10000000-0000-4000-8000-000000000003',
    createdDaysAgo: 34,
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
    name: 'Urban Ghosts',
    createdBy: '10000000-0000-4000-8000-000000000005',
    createdDaysAgo: 33,
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
    name: 'Dark Knights',
    createdBy: '10000000-0000-4000-8000-000000000006',
    createdDaysAgo: 32,
  },
];

// Season standings (leaderboard_user_season / leaderboard_team_season).
const USER_STANDINGS = [
  { userId: '10000000-0000-4000-8000-000000000002', points: 520, rank: 1 },
  { userId: '10000000-0000-4000-8000-000000000001', points: 420, rank: 2 },
  { userId: '10000000-0000-4000-8000-000000000003', points: 360, rank: 3 },
  { userId: '10000000-0000-4000-8000-000000000004', points: 300, rank: 4 },
  { userId: '10000000-0000-4000-8000-000000000006', points: 260, rank: 5 },
  { userId: '10000000-0000-4000-8000-000000000005', points: 190, rank: 6 },
  { userId: '10000000-0000-4000-8000-000000000007', points: 120, rank: 7 },
  { userId: '10000000-0000-4000-8000-000000000008', points: 80, rank: 8 },
  { userId: '10000000-0000-4000-8000-000000000009', points: 40, rank: 9 },
];

const TEAM_STANDINGS = [
  { teamId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', points: 900, rank: 1 },
  { teamId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', points: 760, rank: 2 },
  { teamId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', points: 630, rank: 3 },
  { teamId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', points: 410, rank: 4 },
  { teamId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', points: 260, rank: 5 },
];

// Shape an event row exactly like the DevFallbackEvents GraphQL selection set.
function eventRow(def) {
  return {
    id: def.id,
    title: def.title,
    description: def.description,
    starts_at: fromNow(def.startsH),
    reveal_at: fromNow(def.revealH),
    ends_at: fromNow(def.endsH),
    start_area_radius_km: def.radiusKm,
    max_participants: def.maxParticipants,
    participant_count: {
      aggregate: { count: def.participantCount },
    },
  };
}

function teamName(teamId) {
  const team = TEAM_DEFS.find((entry) => entry.id === teamId);
  return team ? team.name : null;
}

function buildEvents() {
  return EVENT_DEFS.map(eventRow);
}

function buildEventById(eventId) {
  const def = EVENT_DEFS.find((entry) => entry.id === eventId);
  return def ? eventRow(def) : null;
}

function buildTeams() {
  return TEAM_DEFS.map((team) => ({
    id: team.id,
    name: team.name,
    created_at: daysAgo(team.createdDaysAgo),
  }));
}

function buildTeamById(teamId) {
  const team = TEAM_DEFS.find((entry) => entry.id === teamId);
  if (!team) {
    return null;
  }
  return {
    id: team.id,
    name: team.name,
    created_at: daysAgo(team.createdDaysAgo),
    created_by: team.createdBy,
  };
}

function buildSeasonWithLeaderboards() {
  return {
    id: SEASON.id,
    name: SEASON.name,
    user_leaderboard: USER_STANDINGS.map((entry) => ({
      user_id: entry.userId,
      rank: entry.rank,
      points: entry.points,
      profile: PROFILES[entry.userId] ?? null,
    })),
    team_leaderboard: TEAM_STANDINGS.map((entry) => ({
      team_id: entry.teamId,
      rank: entry.rank,
      points: entry.points,
      team: { name: teamName(entry.teamId) },
    })),
  };
}

function buildSeasonWithTeamStanding(teamId) {
  const standing = TEAM_STANDINGS.find((entry) => entry.teamId === teamId);
  return {
    id: SEASON.id,
    name: SEASON.name,
    team_leaderboard: standing ? [{ rank: standing.rank, points: standing.points }] : [],
  };
}

module.exports = {
  buildEvents,
  buildEventById,
  buildTeams,
  buildTeamById,
  buildSeasonWithLeaderboards,
  buildSeasonWithTeamStanding,
};
