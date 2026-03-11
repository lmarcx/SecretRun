INSERT INTO auth.users (id, email, created_at)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'alice.dev@secretrun.local', now() - interval '30 days'),
  ('22222222-2222-4222-8222-222222222222', 'bruno.dev@secretrun.local', now() - interval '28 days'),
  ('33333333-3333-4333-8333-333333333333', 'chloe.dev@secretrun.local', now() - interval '26 days')
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email;

INSERT INTO public.profiles (id, username, display_name, avatar_url, created_at, updated_at)
VALUES
  (
    '11111111-1111-4111-8111-111111111111',
    'alice_runner',
    'Alice Runner',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
    now() - interval '30 days',
    now() - interval '1 day'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'bruno_stride',
    'Bruno Stride',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    now() - interval '28 days',
    now() - interval '2 days'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'chloe_dash',
    'Chloe Dash',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=256&q=80',
    now() - interval '26 days',
    now() - interval '3 days'
  )
ON CONFLICT (id) DO UPDATE
SET
  username = EXCLUDED.username,
  display_name = EXCLUDED.display_name,
  avatar_url = EXCLUDED.avatar_url,
  updated_at = EXCLUDED.updated_at;

INSERT INTO public.teams (id, name, created_by, created_at)
VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Night Owls', '11111111-1111-4111-8111-111111111111', now() - interval '20 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'River Sprinters', '22222222-2222-4222-8222-222222222222', now() - interval '18 days')
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  created_by = EXCLUDED.created_by;

INSERT INTO public.team_members (team_id, user_id, role, joined_at)
VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'leader', now() - interval '20 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '33333333-3333-4333-8333-333333333333', 'member', now() - interval '15 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '22222222-2222-4222-8222-222222222222', 'leader', now() - interval '18 days')
ON CONFLICT (team_id, user_id) DO UPDATE
SET role = EXCLUDED.role;

INSERT INTO public.seasons (id, name, starts_at, ends_at, is_active, created_at)
VALUES (
  '99999999-9999-4999-8999-999999999999',
  'Spring 2026',
  now() - interval '7 days',
  now() + interval '45 days',
  true,
  now() - interval '7 days'
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  starts_at = EXCLUDED.starts_at,
  ends_at = EXCLUDED.ends_at,
  is_active = EXCLUDED.is_active;

UPDATE public.seasons
SET is_active = CASE WHEN id = '99999999-9999-4999-8999-999999999999' THEN true ELSE false END
WHERE is_active IS DISTINCT FROM CASE WHEN id = '99999999-9999-4999-8999-999999999999' THEN true ELSE false END;

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
  created_by,
  created_at
)
VALUES
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
    'Sunrise Bridge Dash',
    'A fast city loop with the route revealed shortly before kickoff.',
    now() + interval '2 hours',
    now() + interval '6 hours',
    now() + interval '8 hours',
    ST_GeogFromText('SRID=4326;POINT(-6.2603 53.3498)'),
    ST_GeogFromText('SRID=4326;POINT(-6.2559 53.3512)'),
    ST_GeogFromText('SRID=4326;POINT(-6.2603 53.3498)'),
    1.50,
    '11111111-1111-4111-8111-111111111111',
    now() - interval '2 days'
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2',
    'Canal Twilight Run',
    'An evening tempo event with a reveal timed for the commute home.',
    now() + interval '1 day',
    now() + interval '1 day 4 hours',
    now() + interval '1 day 6 hours',
    ST_GeogFromText('SRID=4326;POINT(-6.2675 53.3441)'),
    ST_GeogFromText('SRID=4326;POINT(-6.2620 53.3414)'),
    ST_GeogFromText('SRID=4326;POINT(-6.2675 53.3441)'),
    2.00,
    '22222222-2222-4222-8222-222222222222',
    now() - interval '1 day'
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3',
    'Local Dev Test Loop',
    'A short revealed route seeded around the local dev fallback coordinates for field testing.',
    now() - interval '3 hours',
    now() - interval '90 minutes',
    now() + interval '6 hours',
    ST_GeogFromText('SRID=4326;POINT(-6.2603 53.3498)'),
    ST_GeogFromText('SRID=4326;POINT(-6.2579 53.3489)'),
    ST_GeogFromText('SRID=4326;POINT(-6.2603 53.3498)'),
    0.35,
    '11111111-1111-4111-8111-111111111111',
    now() - interval '12 hours'
  )
ON CONFLICT (id) DO UPDATE
SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  reveal_at = EXCLUDED.reveal_at,
  starts_at = EXCLUDED.starts_at,
  ends_at = EXCLUDED.ends_at,
  start_point = EXCLUDED.start_point,
  end_point = EXCLUDED.end_point,
  start_area_center = EXCLUDED.start_area_center,
  start_area_radius_km = EXCLUDED.start_area_radius_km,
  created_by = EXCLUDED.created_by;

INSERT INTO public.event_routes (
  event_id,
  route_encrypted,
  route_polyline,
  revealed,
  revealed_at,
  distance_m,
  duration_sec
)
VALUES (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3',
  'local-dev-test-route-v1',
  '{"type":"LineString","coordinates":[[-6.2603,53.3498],[-6.2591,53.3510],[-6.2571,53.3504],[-6.2579,53.3489]]}',
  true,
  now() - interval '3 hours',
  420.00,
  540
)
ON CONFLICT (event_id) DO UPDATE
SET
  route_encrypted = EXCLUDED.route_encrypted,
  route_polyline = EXCLUDED.route_polyline,
  revealed = EXCLUDED.revealed,
  revealed_at = EXCLUDED.revealed_at,
  distance_m = EXCLUDED.distance_m,
  duration_sec = EXCLUDED.duration_sec;

INSERT INTO public.leaderboard_user_season (season_id, user_id, points, rank, updated_at)
VALUES
  ('99999999-9999-4999-8999-999999999999', '11111111-1111-4111-8111-111111111111', 140, 1, now() - interval '30 minutes'),
  ('99999999-9999-4999-8999-999999999999', '22222222-2222-4222-8222-222222222222', 115, 2, now() - interval '30 minutes'),
  ('99999999-9999-4999-8999-999999999999', '33333333-3333-4333-8333-333333333333', 92, 3, now() - interval '30 minutes')
ON CONFLICT (season_id, user_id) DO UPDATE
SET
  points = EXCLUDED.points,
  rank = EXCLUDED.rank,
  updated_at = EXCLUDED.updated_at;

INSERT INTO public.leaderboard_team_season (season_id, team_id, points, rank, updated_at)
VALUES
  ('99999999-9999-4999-8999-999999999999', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 255, 1, now() - interval '30 minutes'),
  ('99999999-9999-4999-8999-999999999999', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 198, 2, now() - interval '30 minutes')
ON CONFLICT (season_id, team_id) DO UPDATE
SET
  points = EXCLUDED.points,
  rank = EXCLUDED.rank,
  updated_at = EXCLUDED.updated_at;
