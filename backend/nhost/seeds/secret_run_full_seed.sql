-- Full Secret Run application fixture for local testing.
--
-- Test runner identity seeded in Postgres:
--   email: runner.demo@secretrun.local
--   user id: 10000000-0000-4000-8000-000000000001
--
-- The current local Docker stack does not run a Nhost Auth service, so this SQL
-- creates the database identity/profile but not a real password login. For
-- mobile login, create the same email in the Nhost Auth project used by the app
-- or configure a local auth/JWT setup that issues this user id.

\set ON_ERROR_STOP on

\i /seeds/secret_run_clear_seed.sql

INSERT INTO auth.users (id, email, created_at)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'runner.demo@secretrun.local', now() - interval '45 days'),
  ('10000000-0000-4000-8000-000000000002', 'alice.runner@secretrun.local', now() - interval '44 days'),
  ('10000000-0000-4000-8000-000000000003', 'bruno.stride@secretrun.local', now() - interval '43 days'),
  ('10000000-0000-4000-8000-000000000004', 'chloe.dash@secretrun.local', now() - interval '42 days'),
  ('10000000-0000-4000-8000-000000000005', 'diego.pace@secretrun.local', now() - interval '41 days'),
  ('10000000-0000-4000-8000-000000000006', 'eva.night@secretrun.local', now() - interval '40 days'),
  ('10000000-0000-4000-8000-000000000007', 'finn.bridge@secretrun.local', now() - interval '39 days'),
  ('10000000-0000-4000-8000-000000000008', 'gia.canal@secretrun.local', now() - interval '38 days'),
  ('10000000-0000-4000-8000-000000000009', 'hugo.trail@secretrun.local', now() - interval '37 days')
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email;

INSERT INTO public.profiles (id, username, display_name, avatar_url, created_at, updated_at)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'you_runner', 'You Runner', null, now() - interval '45 days', now() - interval '1 hour'),
  ('10000000-0000-4000-8000-000000000002', 'alice_runner', 'Alice Runner', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80', now() - interval '44 days', now() - interval '2 hours'),
  ('10000000-0000-4000-8000-000000000003', 'bruno_stride', 'Bruno Stride', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80', now() - interval '43 days', now() - interval '3 hours'),
  ('10000000-0000-4000-8000-000000000004', 'chloe_dash', 'Chloe Dash', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=256&q=80', now() - interval '42 days', now() - interval '4 hours'),
  ('10000000-0000-4000-8000-000000000005', 'diego_pace', 'Diego Pace', null, now() - interval '41 days', now() - interval '5 hours'),
  ('10000000-0000-4000-8000-000000000006', 'eva_night', 'Eva Night', null, now() - interval '40 days', now() - interval '6 hours'),
  ('10000000-0000-4000-8000-000000000007', 'finn_bridge', 'Finn Bridge', null, now() - interval '39 days', now() - interval '7 hours'),
  ('10000000-0000-4000-8000-000000000008', 'gia_canal', 'Gia Canal', null, now() - interval '38 days', now() - interval '8 hours'),
  ('10000000-0000-4000-8000-000000000009', 'hugo_trail', 'Hugo Trail', null, now() - interval '37 days', now() - interval '9 hours')
ON CONFLICT (id) DO UPDATE
SET
  username = EXCLUDED.username,
  display_name = EXCLUDED.display_name,
  avatar_url = EXCLUDED.avatar_url,
  updated_at = EXCLUDED.updated_at;

INSERT INTO public.teams (id, name, created_by, created_at)
VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Night Owls', '10000000-0000-4000-8000-000000000001', now() - interval '36 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'River Sprinters', '10000000-0000-4000-8000-000000000002', now() - interval '35 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'Storm Pacers', '10000000-0000-4000-8000-000000000003', now() - interval '34 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'Urban Ghosts', '10000000-0000-4000-8000-000000000005', now() - interval '33 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', 'Dark Knights', '10000000-0000-4000-8000-000000000006', now() - interval '32 days')
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  created_by = EXCLUDED.created_by;

INSERT INTO public.team_members (team_id, user_id, role, joined_at)
VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '10000000-0000-4000-8000-000000000001', 'leader', now() - interval '36 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '10000000-0000-4000-8000-000000000004', 'member', now() - interval '30 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '10000000-0000-4000-8000-000000000007', 'member', now() - interval '22 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '10000000-0000-4000-8000-000000000002', 'leader', now() - interval '35 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '10000000-0000-4000-8000-000000000008', 'member', now() - interval '24 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', '10000000-0000-4000-8000-000000000003', 'leader', now() - interval '34 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', '10000000-0000-4000-8000-000000000009', 'member', now() - interval '18 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', '10000000-0000-4000-8000-000000000005', 'leader', now() - interval '33 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', '10000000-0000-4000-8000-000000000006', 'leader', now() - interval '32 days')
ON CONFLICT (team_id, user_id) DO UPDATE
SET role = EXCLUDED.role,
    joined_at = EXCLUDED.joined_at;

INSERT INTO public.friendships (id, requester_id, addressee_id, status, created_at, updated_at)
VALUES
  ('f0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'accepted', now() - interval '25 days', now() - interval '25 days'),
  ('f0000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'accepted', now() - interval '21 days', now() - interval '21 days'),
  ('f0000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'accepted', now() - interval '19 days', now() - interval '19 days'),
  ('f0000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000008', 'pending', now() - interval '3 days', now() - interval '3 days'),
  ('f0000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 'rejected', now() - interval '10 days', now() - interval '8 days')
ON CONFLICT (id) DO UPDATE
SET status = EXCLUDED.status,
    updated_at = EXCLUDED.updated_at;

INSERT INTO public.seasons (id, name, starts_at, ends_at, is_active, created_at)
VALUES (
  '99999999-9999-4999-8999-999999999999',
  'Spring 2026',
  now() - interval '14 days',
  now() + interval '45 days',
  true,
  now() - interval '14 days'
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  starts_at = EXCLUDED.starts_at,
  ends_at = EXCLUDED.ends_at,
  is_active = EXCLUDED.is_active;

UPDATE public.seasons
SET is_active = (id = '99999999-9999-4999-8999-999999999999')
WHERE is_active IS DISTINCT FROM (id = '99999999-9999-4999-8999-999999999999');

INSERT INTO public.events (
  id,
  title,
  description,
  reveal_at,
  starts_at,
  ends_at,
  start_point,
  end_point,
  start_area_center,
  start_area_radius_km,
  team_id,
  is_private,
  max_participants,
  created_by,
  created_at
)
VALUES
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
    'Local Launch Loop',
    'Ready to launch now. Use this event to test join, route reveal, and the run flow.',
    now() - interval '3 hours',
    now() - interval '1 hour',
    now() + interval '5 hours',
    ST_GeogFromText('SRID=4326;POINT(-6.2603 53.3498)'),
    ST_GeogFromText('SRID=4326;POINT(-6.2579 53.3489)'),
    ST_GeogFromText('SRID=4326;POINT(-6.2603 53.3498)'),
    0.35,
    NULL,
    false,
    40,
    '10000000-0000-4000-8000-000000000001',
    now() - interval '2 days'
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2',
    'Sunrise Bridge Dash',
    'Registration is full and the race starts soon, useful for validated/full event states.',
    now() + interval '1 hour',
    now() + interval '5 hours',
    now() + interval '7 hours',
    ST_GeogFromText('SRID=4326;POINT(-6.2541 53.3466)'),
    ST_GeogFromText('SRID=4326;POINT(-6.2484 53.3499)'),
    ST_GeogFromText('SRID=4326;POINT(-6.2541 53.3466)'),
    1.20,
    NULL,
    false,
    6,
    '10000000-0000-4000-8000-000000000002',
    now() - interval '28 hours'
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3',
    'Canal Twilight Run',
    'Open hidden route with plenty of spots left.',
    now() + interval '1 day',
    now() + interval '1 day 4 hours',
    now() + interval '1 day 6 hours',
    ST_GeogFromText('SRID=4326;POINT(-6.2675 53.3441)'),
    ST_GeogFromText('SRID=4326;POINT(-6.2620 53.3414)'),
    ST_GeogFromText('SRID=4326;POINT(-6.2675 53.3441)'),
    2.00,
    NULL,
    false,
    30,
    '10000000-0000-4000-8000-000000000003',
    now() - interval '20 hours'
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4',
    'Docklands Night Relay',
    'Reveal is already live and the start window is approaching.',
    now() - interval '45 minutes',
    now() + interval '90 minutes',
    now() + interval '4 hours',
    ST_GeogFromText('SRID=4326;POINT(-6.2394 53.3509)'),
    ST_GeogFromText('SRID=4326;POINT(-6.2338 53.3484)'),
    ST_GeogFromText('SRID=4326;POINT(-6.2394 53.3509)'),
    0.80,
    NULL,
    false,
    36,
    '10000000-0000-4000-8000-000000000004',
    now() - interval '16 hours'
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5',
    'Old Town Finishers Loop',
    'Completed event with seeded results for feed and leaderboard testing.',
    now() - interval '2 days 5 hours',
    now() - interval '2 days 2 hours',
    now() - interval '2 days',
    ST_GeogFromText('SRID=4326;POINT(-6.2711 53.3432)'),
    ST_GeogFromText('SRID=4326;POINT(-6.2663 53.3462)'),
    ST_GeogFromText('SRID=4326;POINT(-6.2711 53.3432)'),
    1.20,
    NULL,
    false,
    32,
    '10000000-0000-4000-8000-000000000001',
    now() - interval '3 days'
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee6',
    'Night Owls Relay Brief',
    'Private squad event reserved for Night Owls members.',
    now() + interval '8 hours',
    now() + interval '12 hours',
    now() + interval '14 hours',
    ST_GeogFromText('SRID=4326;POINT(-6.2721 53.3470)'),
    ST_GeogFromText('SRID=4326;POINT(-6.2680 53.3458)'),
    ST_GeogFromText('SRID=4326;POINT(-6.2721 53.3470)'),
    0.80,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    true,
    20,
    '10000000-0000-4000-8000-000000000001',
    now() - interval '12 hours'
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee7',
    'Phoenix Park Cipher',
    'Longer public course for map browsing and distance sorting.',
    now() + interval '2 days',
    now() + interval '2 days 3 hours',
    now() + interval '2 days 6 hours',
    ST_GeogFromText('SRID=4326;POINT(-6.3297 53.3567)'),
    ST_GeogFromText('SRID=4326;POINT(-6.3156 53.3609)'),
    ST_GeogFromText('SRID=4326;POINT(-6.3297 53.3567)'),
    2.50,
    NULL,
    false,
    80,
    '10000000-0000-4000-8000-000000000005',
    now() - interval '6 hours'
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee8',
    'Midnight Sprint Series',
    'Past race used to seed older result cards in the private feed.',
    now() - interval '5 days 4 hours',
    now() - interval '5 days 2 hours',
    now() - interval '5 days',
    ST_GeogFromText('SRID=4326;POINT(-6.2600 53.3380)'),
    ST_GeogFromText('SRID=4326;POINT(-6.2520 53.3404)'),
    ST_GeogFromText('SRID=4326;POINT(-6.2600 53.3380)'),
    1.00,
    NULL,
    false,
    40,
    '10000000-0000-4000-8000-000000000002',
    now() - interval '6 days'
  );

INSERT INTO public.event_routes (event_id, route_encrypted, route_polyline, revealed, revealed_at, distance_m, duration_sec)
VALUES
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 'seed-route-local-launch', '{"type":"LineString","coordinates":[[-6.2603,53.3498],[-6.2591,53.3510],[-6.2571,53.3504],[-6.2579,53.3489]]}', true, now() - interval '3 hours', 420.00, 540),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2', 'seed-route-sunrise-bridge', '{"type":"LineString","coordinates":[[-6.2541,53.3466],[-6.2520,53.3485],[-6.2496,53.3492],[-6.2484,53.3499]]}', false, NULL, 3200.00, 1440),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3', 'seed-route-canal-twilight', '{"type":"LineString","coordinates":[[-6.2675,53.3441],[-6.2660,53.3429],[-6.2637,53.3420],[-6.2620,53.3414]]}', false, NULL, 4800.00, 2100),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4', 'seed-route-docklands-night', '{"type":"LineString","coordinates":[[-6.2394,53.3509],[-6.2370,53.3501],[-6.2350,53.3490],[-6.2338,53.3484]]}', true, now() - interval '45 minutes', 2600.00, 1200),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5', 'seed-route-old-town', '{"type":"LineString","coordinates":[[-6.2711,53.3432],[-6.2694,53.3440],[-6.2678,53.3451],[-6.2663,53.3462]]}', true, now() - interval '2 days 5 hours', 3900.00, 1620),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee6', 'seed-route-night-owls', '{"type":"LineString","coordinates":[[-6.2721,53.3470],[-6.2707,53.3465],[-6.2692,53.3461],[-6.2680,53.3458]]}', false, NULL, 2100.00, 960),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee7', 'seed-route-phoenix', '{"type":"LineString","coordinates":[[-6.3297,53.3567],[-6.3252,53.3586],[-6.3201,53.3597],[-6.3156,53.3609]]}', false, NULL, 6100.00, 2600),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee8', 'seed-route-midnight', '{"type":"LineString","coordinates":[[-6.2600,53.3380],[-6.2575,53.3389],[-6.2544,53.3397],[-6.2520,53.3404]]}', true, now() - interval '5 days 4 hours', 4800.00, 1864)
ON CONFLICT (event_id) DO UPDATE
SET
  route_encrypted = EXCLUDED.route_encrypted,
  route_polyline = EXCLUDED.route_polyline,
  revealed = EXCLUDED.revealed,
  revealed_at = EXCLUDED.revealed_at,
  distance_m = EXCLUDED.distance_m,
  duration_sec = EXCLUDED.duration_sec;

INSERT INTO public.event_participants (event_id, user_id, status, joined_at)
VALUES
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', '10000000-0000-4000-8000-000000000001', 'registered', now() - interval '4 hours'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', '10000000-0000-4000-8000-000000000004', 'registered', now() - interval '3 hours'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2', '10000000-0000-4000-8000-000000000001', 'registered', now() - interval '1 day'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2', '10000000-0000-4000-8000-000000000002', 'registered', now() - interval '1 day'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2', '10000000-0000-4000-8000-000000000003', 'registered', now() - interval '1 day'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2', '10000000-0000-4000-8000-000000000004', 'registered', now() - interval '1 day'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2', '10000000-0000-4000-8000-000000000005', 'registered', now() - interval '1 day'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2', '10000000-0000-4000-8000-000000000006', 'registered', now() - interval '1 day'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3', '10000000-0000-4000-8000-000000000003', 'registered', now() - interval '6 hours'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3', '10000000-0000-4000-8000-000000000008', 'registered', now() - interval '5 hours'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4', '10000000-0000-4000-8000-000000000002', 'registered', now() - interval '8 hours'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4', '10000000-0000-4000-8000-000000000005', 'registered', now() - interval '7 hours'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5', '10000000-0000-4000-8000-000000000001', 'registered', now() - interval '3 days'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5', '10000000-0000-4000-8000-000000000002', 'registered', now() - interval '3 days'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5', '10000000-0000-4000-8000-000000000003', 'registered', now() - interval '3 days'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5', '10000000-0000-4000-8000-000000000004', 'registered', now() - interval '3 days'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee6', '10000000-0000-4000-8000-000000000001', 'registered', now() - interval '5 hours'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee6', '10000000-0000-4000-8000-000000000004', 'registered', now() - interval '5 hours'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee7', '10000000-0000-4000-8000-000000000007', 'registered', now() - interval '2 hours'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee8', '10000000-0000-4000-8000-000000000001', 'registered', now() - interval '6 days'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee8', '10000000-0000-4000-8000-000000000002', 'registered', now() - interval '6 days')
ON CONFLICT (event_id, user_id) DO UPDATE
SET status = EXCLUDED.status,
    joined_at = EXCLUDED.joined_at;

INSERT INTO public.activities (
  id,
  event_id,
  user_id,
  status,
  distance_km,
  duration_seconds,
  avg_speed_kmh,
  points,
  started_at,
  finished_at,
  created_at
)
VALUES
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5', '10000000-0000-4000-8000-000000000001', 'validated', 3.900, 1620, 8.67, 120, now() - interval '2 days 2 hours', now() - interval '2 days 1 hour 33 minutes', now() - interval '2 days 1 hour 33 minutes'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee8', '10000000-0000-4000-8000-000000000001', 'validated', 4.800, 1864, 9.27, 140, now() - interval '5 days 2 hours', now() - interval '5 days 1 hour 28 minutes', now() - interval '5 days 1 hour 28 minutes'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', '10000000-0000-4000-8000-000000000001', 'pending', 3.200, 1458, 7.90, 0, now() - interval '40 minutes', now() - interval '16 minutes', now() - interval '16 minutes'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5', '10000000-0000-4000-8000-000000000002', 'validated', 3.900, 1512, 9.29, 150, now() - interval '2 days 2 hours', now() - interval '2 days 1 hour 35 minutes', now() - interval '2 days 1 hour 35 minutes'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee8', '10000000-0000-4000-8000-000000000002', 'validated', 4.800, 1720, 10.05, 170, now() - interval '5 days 2 hours', now() - interval '5 days 1 hour 31 minutes', now() - interval '5 days 1 hour 31 minutes'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb6', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5', '10000000-0000-4000-8000-000000000003', 'validated', 3.900, 1695, 8.28, 95, now() - interval '2 days 2 hours', now() - interval '2 days 1 hour 31 minutes', now() - interval '2 days 1 hour 31 minutes'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb7', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5', '10000000-0000-4000-8000-000000000004', 'validated', 3.900, 1810, 7.76, 75, now() - interval '2 days 2 hours', now() - interval '2 days 1 hour 29 minutes', now() - interval '2 days 1 hour 29 minutes'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb8', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4', '10000000-0000-4000-8000-000000000005', 'validated', 2.600, 1204, 7.77, 60, now() - interval '15 hours', now() - interval '14 hours 40 minutes', now() - interval '14 hours 40 minutes'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb9', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee8', '10000000-0000-4000-8000-000000000006', 'rejected', 4.800, 980, 17.63, 0, now() - interval '5 days 2 hours', now() - interval '5 days 1 hour 44 minutes', now() - interval '5 days 1 hour 44 minutes')
ON CONFLICT (id) DO UPDATE
SET
  event_id = EXCLUDED.event_id,
  user_id = EXCLUDED.user_id,
  status = EXCLUDED.status,
  distance_km = EXCLUDED.distance_km,
  duration_seconds = EXCLUDED.duration_seconds,
  avg_speed_kmh = EXCLUDED.avg_speed_kmh,
  points = EXCLUDED.points,
  started_at = EXCLUDED.started_at,
  finished_at = EXCLUDED.finished_at,
  created_at = EXCLUDED.created_at;

INSERT INTO public.activity_score_applications (activity_id, season_id, user_id, team_id, user_points, team_points, created_at)
VALUES
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '99999999-9999-4999-8999-999999999999', '10000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 120, 120, now() - interval '2 days'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '99999999-9999-4999-8999-999999999999', '10000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 140, 140, now() - interval '5 days'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4', '99999999-9999-4999-8999-999999999999', '10000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 150, 150, now() - interval '2 days'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5', '99999999-9999-4999-8999-999999999999', '10000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 170, 170, now() - interval '5 days'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb6', '99999999-9999-4999-8999-999999999999', '10000000-0000-4000-8000-000000000003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 95, 95, now() - interval '2 days'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb7', '99999999-9999-4999-8999-999999999999', '10000000-0000-4000-8000-000000000004', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 75, 75, now() - interval '2 days'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb8', '99999999-9999-4999-8999-999999999999', '10000000-0000-4000-8000-000000000005', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 60, 60, now() - interval '14 hours')
ON CONFLICT (activity_id) DO UPDATE
SET
  season_id = EXCLUDED.season_id,
  user_id = EXCLUDED.user_id,
  team_id = EXCLUDED.team_id,
  user_points = EXCLUDED.user_points,
  team_points = EXCLUDED.team_points,
  created_at = EXCLUDED.created_at;

INSERT INTO public.activity_likes (activity_id, user_id, created_at)
VALUES
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '10000000-0000-4000-8000-000000000002', now() - interval '2 days'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '10000000-0000-4000-8000-000000000003', now() - interval '2 days'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '10000000-0000-4000-8000-000000000002', now() - interval '5 days'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4', '10000000-0000-4000-8000-000000000001', now() - interval '2 days')
ON CONFLICT (activity_id, user_id) DO UPDATE
SET created_at = EXCLUDED.created_at;

INSERT INTO public.activity_comments (id, activity_id, user_id, body, created_at)
VALUES
  ('c0000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '10000000-0000-4000-8000-000000000002', 'Clean finish through the old town section.', now() - interval '2 days'),
  ('c0000000-0000-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '10000000-0000-4000-8000-000000000003', 'That midnight pace was sharp.', now() - interval '5 days'),
  ('c0000000-0000-4000-8000-000000000003', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4', '10000000-0000-4000-8000-000000000001', 'River Sprinters are flying this week.', now() - interval '2 days')
ON CONFLICT (id) DO UPDATE
SET body = EXCLUDED.body,
    created_at = EXCLUDED.created_at;

INSERT INTO public.leaderboard_user_season (season_id, user_id, points, rank, updated_at)
VALUES
  ('99999999-9999-4999-8999-999999999999', '10000000-0000-4000-8000-000000000002', 520, 1, now() - interval '20 minutes'),
  ('99999999-9999-4999-8999-999999999999', '10000000-0000-4000-8000-000000000001', 420, 2, now() - interval '20 minutes'),
  ('99999999-9999-4999-8999-999999999999', '10000000-0000-4000-8000-000000000003', 360, 3, now() - interval '20 minutes'),
  ('99999999-9999-4999-8999-999999999999', '10000000-0000-4000-8000-000000000004', 300, 4, now() - interval '20 minutes'),
  ('99999999-9999-4999-8999-999999999999', '10000000-0000-4000-8000-000000000006', 260, 5, now() - interval '20 minutes'),
  ('99999999-9999-4999-8999-999999999999', '10000000-0000-4000-8000-000000000005', 190, 6, now() - interval '20 minutes'),
  ('99999999-9999-4999-8999-999999999999', '10000000-0000-4000-8000-000000000007', 120, 7, now() - interval '20 minutes'),
  ('99999999-9999-4999-8999-999999999999', '10000000-0000-4000-8000-000000000008', 80, 8, now() - interval '20 minutes'),
  ('99999999-9999-4999-8999-999999999999', '10000000-0000-4000-8000-000000000009', 40, 9, now() - interval '20 minutes')
ON CONFLICT (season_id, user_id) DO UPDATE
SET
  points = EXCLUDED.points,
  rank = EXCLUDED.rank,
  updated_at = EXCLUDED.updated_at;

INSERT INTO public.leaderboard_team_season (season_id, team_id, points, rank, updated_at)
VALUES
  ('99999999-9999-4999-8999-999999999999', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 900, 1, now() - interval '20 minutes'),
  ('99999999-9999-4999-8999-999999999999', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 760, 2, now() - interval '20 minutes'),
  ('99999999-9999-4999-8999-999999999999', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 630, 3, now() - interval '20 minutes'),
  ('99999999-9999-4999-8999-999999999999', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 410, 4, now() - interval '20 minutes'),
  ('99999999-9999-4999-8999-999999999999', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', 260, 5, now() - interval '20 minutes')
ON CONFLICT (season_id, team_id) DO UPDATE
SET
  points = EXCLUDED.points,
  rank = EXCLUDED.rank,
  updated_at = EXCLUDED.updated_at;

INSERT INTO public.wallets (user_id, balance, updated_at)
VALUES
  ('10000000-0000-4000-8000-000000000001', 420, now() - interval '20 minutes'),
  ('10000000-0000-4000-8000-000000000002', 520, now() - interval '20 minutes'),
  ('10000000-0000-4000-8000-000000000003', 360, now() - interval '20 minutes')
ON CONFLICT (user_id) DO UPDATE
SET balance = EXCLUDED.balance,
    updated_at = EXCLUDED.updated_at;

INSERT INTO public.wallet_ledger (wallet_id, delta, reason, transaction_type, reference_key, metadata, created_at)
SELECT wallet.id, entry.delta, entry.reason, entry.transaction_type::public.wallet_transaction_type, entry.reference_key, entry.metadata, entry.created_at
FROM (
  VALUES
    ('10000000-0000-4000-8000-000000000001'::uuid, 120, 'Seed old town validation', 'run_validation_reward', 'seed:wallet:activity:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '{"activity_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1"}'::jsonb, now() - interval '2 days'),
    ('10000000-0000-4000-8000-000000000001'::uuid, 140, 'Seed midnight validation', 'run_validation_reward', 'seed:wallet:activity:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '{"activity_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2"}'::jsonb, now() - interval '5 days'),
    ('10000000-0000-4000-8000-000000000002'::uuid, 150, 'Seed old town validation', 'run_validation_reward', 'seed:wallet:activity:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4', '{"activity_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4"}'::jsonb, now() - interval '2 days')
) AS entry(user_id, delta, reason, transaction_type, reference_key, metadata, created_at)
JOIN public.wallets wallet ON wallet.user_id = entry.user_id
ON CONFLICT (reference_key) WHERE reference_key IS NOT NULL DO NOTHING;
