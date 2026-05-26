\set ON_ERROR_STOP on

-- Remove only rows owned by Secret Run local test fixtures.
-- Keep this file in sync with secret_run_full_seed.sql.
--
-- This cleanup intentionally recognizes both the current full fixture and the
-- older local demo fixture identities. That makes pnpm db:seed:full replayable
-- on databases that were seeded before the current fixture existed.

CREATE TEMP TABLE IF NOT EXISTS _secret_run_seed_users (
  id uuid PRIMARY KEY
);

CREATE TEMP TABLE IF NOT EXISTS _secret_run_seed_teams (
  id uuid PRIMARY KEY
);

CREATE TEMP TABLE IF NOT EXISTS _secret_run_seed_events (
  id uuid PRIMARY KEY
);

CREATE TEMP TABLE IF NOT EXISTS _secret_run_seed_activities (
  id uuid PRIMARY KEY
);

TRUNCATE _secret_run_seed_users;
TRUNCATE _secret_run_seed_teams;
TRUNCATE _secret_run_seed_events;
TRUNCATE _secret_run_seed_activities;

INSERT INTO _secret_run_seed_users (id)
VALUES
  ('10000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000003'),
  ('10000000-0000-4000-8000-000000000004'),
  ('10000000-0000-4000-8000-000000000005'),
  ('10000000-0000-4000-8000-000000000006'),
  ('10000000-0000-4000-8000-000000000007'),
  ('10000000-0000-4000-8000-000000000008'),
  ('10000000-0000-4000-8000-000000000009'),
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222'),
  ('33333333-3333-4333-8333-333333333333')
ON CONFLICT DO NOTHING;

INSERT INTO _secret_run_seed_users (id)
SELECT id
FROM public.profiles
WHERE username IN (
  'you_runner',
  'alice_runner',
  'bruno_stride',
  'chloe_dash',
  'diego_pace',
  'eva_night',
  'finn_bridge',
  'gia_canal',
  'hugo_trail'
)
ON CONFLICT DO NOTHING;

INSERT INTO _secret_run_seed_users (id)
SELECT id
FROM auth.users
WHERE email IN (
  'runner.demo@secretrun.local',
  'alice.runner@secretrun.local',
  'bruno.stride@secretrun.local',
  'chloe.dash@secretrun.local',
  'diego.pace@secretrun.local',
  'eva.night@secretrun.local',
  'finn.bridge@secretrun.local',
  'gia.canal@secretrun.local',
  'hugo.trail@secretrun.local',
  'alice.dev@secretrun.local',
  'bruno.dev@secretrun.local',
  'chloe.dev@secretrun.local'
)
ON CONFLICT DO NOTHING;

INSERT INTO _secret_run_seed_teams (id)
VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5')
ON CONFLICT DO NOTHING;

INSERT INTO _secret_run_seed_teams (id)
SELECT id
FROM public.teams
WHERE name IN (
  'Night Owls',
  'River Sprinters',
  'Storm Pacers',
  'Urban Ghosts',
  'Dark Knights'
)
OR created_by IN (SELECT id FROM _secret_run_seed_users)
ON CONFLICT DO NOTHING;

INSERT INTO _secret_run_seed_events (id)
VALUES
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee6'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee7'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee8')
ON CONFLICT DO NOTHING;

INSERT INTO _secret_run_seed_events (id)
SELECT id
FROM public.events
WHERE title IN (
  'Local Launch Loop',
  'Sunrise Bridge Dash',
  'Canal Twilight Run',
  'Docklands Night Relay',
  'Old Town Finishers Loop',
  'Night Owls Relay Brief',
  'Phoenix Park Cipher',
  'Midnight Sprint Series'
)
OR created_by IN (SELECT id FROM _secret_run_seed_users)
OR team_id IN (SELECT id FROM _secret_run_seed_teams)
ON CONFLICT DO NOTHING;

INSERT INTO _secret_run_seed_activities (id)
VALUES
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb6'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb7'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb8'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb9')
ON CONFLICT DO NOTHING;

INSERT INTO _secret_run_seed_activities (id)
SELECT id
FROM public.activities
WHERE event_id IN (SELECT id FROM _secret_run_seed_events)
OR user_id IN (SELECT id FROM _secret_run_seed_users)
ON CONFLICT DO NOTHING;

DELETE FROM public.notification_jobs
WHERE user_id IN (SELECT id FROM _secret_run_seed_users)
OR data->>'event_id' IN (SELECT id::text FROM _secret_run_seed_events)
OR data->>'activity_id' IN (SELECT id::text FROM _secret_run_seed_activities);

DELETE FROM public.user_devices
WHERE user_id IN (SELECT id FROM _secret_run_seed_users);

DELETE FROM public.activity_comments
WHERE activity_id IN (SELECT id FROM _secret_run_seed_activities)
OR user_id IN (SELECT id FROM _secret_run_seed_users);

DELETE FROM public.activity_likes
WHERE activity_id IN (SELECT id FROM _secret_run_seed_activities)
OR user_id IN (SELECT id FROM _secret_run_seed_users);

DELETE FROM public.wallet_ledger
WHERE reference_key LIKE 'seed:%'
OR wallet_id IN (
  SELECT id
  FROM public.wallets
  WHERE user_id IN (SELECT id FROM _secret_run_seed_users)
);

DELETE FROM public.activity_score_applications
WHERE activity_id IN (SELECT id FROM _secret_run_seed_activities)
OR user_id IN (SELECT id FROM _secret_run_seed_users)
OR team_id IN (SELECT id FROM _secret_run_seed_teams)
OR season_id = '99999999-9999-4999-8999-999999999999';

DELETE FROM public.activity_trackpoints
WHERE activity_id IN (SELECT id FROM _secret_run_seed_activities);

DELETE FROM public.activities
WHERE id IN (SELECT id FROM _secret_run_seed_activities);

DELETE FROM public.event_routes
WHERE event_id IN (SELECT id FROM _secret_run_seed_events);

DELETE FROM public.event_participants
WHERE event_id IN (SELECT id FROM _secret_run_seed_events)
OR user_id IN (SELECT id FROM _secret_run_seed_users);

DELETE FROM public.sanctions
WHERE user_id IN (SELECT id FROM _secret_run_seed_users)
OR report_id IN (
  SELECT id
  FROM public.reports
  WHERE reporter_user_id IN (SELECT id FROM _secret_run_seed_users)
     OR target_user_id IN (SELECT id FROM _secret_run_seed_users)
     OR event_id IN (SELECT id FROM _secret_run_seed_events)
);

DELETE FROM public.reports
WHERE reporter_user_id IN (SELECT id FROM _secret_run_seed_users)
OR target_user_id IN (SELECT id FROM _secret_run_seed_users)
OR event_id IN (SELECT id FROM _secret_run_seed_events);

DELETE FROM public.events
WHERE id IN (SELECT id FROM _secret_run_seed_events);

DELETE FROM public.leaderboard_team_season
WHERE season_id = '99999999-9999-4999-8999-999999999999'
OR team_id IN (SELECT id FROM _secret_run_seed_teams);

DELETE FROM public.leaderboard_user_season
WHERE season_id = '99999999-9999-4999-8999-999999999999'
OR user_id IN (SELECT id FROM _secret_run_seed_users);

DELETE FROM public.wallets
WHERE user_id IN (SELECT id FROM _secret_run_seed_users);

DELETE FROM public.friendships
WHERE id IN (
  'f0000000-0000-4000-8000-000000000001',
  'f0000000-0000-4000-8000-000000000002',
  'f0000000-0000-4000-8000-000000000003',
  'f0000000-0000-4000-8000-000000000004',
  'f0000000-0000-4000-8000-000000000005'
)
OR requester_id IN (SELECT id FROM _secret_run_seed_users)
OR addressee_id IN (SELECT id FROM _secret_run_seed_users);

DELETE FROM public.blocks
WHERE id = 'd0000000-0000-4000-8000-000000000001'
OR blocker_id IN (SELECT id FROM _secret_run_seed_users)
OR blocked_id IN (SELECT id FROM _secret_run_seed_users);

DELETE FROM public.team_members
WHERE team_id IN (SELECT id FROM _secret_run_seed_teams)
OR user_id IN (SELECT id FROM _secret_run_seed_users);

DELETE FROM public.teams
WHERE id IN (SELECT id FROM _secret_run_seed_teams);

DELETE FROM public.profiles
WHERE id IN (SELECT id FROM _secret_run_seed_users)
OR username IN (
  'you_runner',
  'alice_runner',
  'bruno_stride',
  'chloe_dash',
  'diego_pace',
  'eva_night',
  'finn_bridge',
  'gia_canal',
  'hugo_trail'
);

DELETE FROM auth.users
WHERE id IN (SELECT id FROM _secret_run_seed_users)
OR email IN (
  'runner.demo@secretrun.local',
  'alice.runner@secretrun.local',
  'bruno.stride@secretrun.local',
  'chloe.dash@secretrun.local',
  'diego.pace@secretrun.local',
  'eva.night@secretrun.local',
  'finn.bridge@secretrun.local',
  'gia.canal@secretrun.local',
  'hugo.trail@secretrun.local',
  'alice.dev@secretrun.local',
  'bruno.dev@secretrun.local',
  'chloe.dev@secretrun.local'
);

DELETE FROM public.seasons
WHERE id = '99999999-9999-4999-8999-999999999999'
OR name = 'Spring 2026';
