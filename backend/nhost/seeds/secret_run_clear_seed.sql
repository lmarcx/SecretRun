-- Remove only rows owned by the Secret Run full application fixture.
-- Keep this file in sync with secret_run_full_seed.sql.

DELETE FROM public.activity_comments
WHERE activity_id IN (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb6',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb7',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb8',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb9'
);

DELETE FROM public.activity_likes
WHERE activity_id IN (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb6',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb7',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb8',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb9'
);

DELETE FROM public.wallet_ledger
WHERE reference_key LIKE 'seed:%';

DELETE FROM public.activity_score_applications
WHERE activity_id IN (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb6',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb7',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb8',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb9'
);

DELETE FROM public.activity_trackpoints
WHERE activity_id IN (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb6',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb7',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb8',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb9'
);

DELETE FROM public.activities
WHERE id IN (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb6',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb7',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb8',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb9'
);

DELETE FROM public.event_routes
WHERE event_id IN (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee6',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee7',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee8'
);

DELETE FROM public.event_participants
WHERE event_id IN (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee6',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee7',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee8'
);

DELETE FROM public.events
WHERE id IN (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee6',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee7',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee8'
);

DELETE FROM public.leaderboard_team_season
WHERE season_id = '99999999-9999-4999-8999-999999999999';

DELETE FROM public.leaderboard_user_season
WHERE season_id = '99999999-9999-4999-8999-999999999999';

DELETE FROM public.wallets
WHERE user_id IN (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000005',
  '10000000-0000-4000-8000-000000000006',
  '10000000-0000-4000-8000-000000000007',
  '10000000-0000-4000-8000-000000000008',
  '10000000-0000-4000-8000-000000000009'
);

DELETE FROM public.friendships
WHERE id IN (
  'f0000000-0000-4000-8000-000000000001',
  'f0000000-0000-4000-8000-000000000002',
  'f0000000-0000-4000-8000-000000000003',
  'f0000000-0000-4000-8000-000000000004',
  'f0000000-0000-4000-8000-000000000005'
);

DELETE FROM public.blocks
WHERE id IN (
  'd0000000-0000-4000-8000-000000000001'
);

DELETE FROM public.team_members
WHERE team_id IN (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5'
);

DELETE FROM public.teams
WHERE id IN (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5'
);

DELETE FROM public.profiles
WHERE id IN (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000005',
  '10000000-0000-4000-8000-000000000006',
  '10000000-0000-4000-8000-000000000007',
  '10000000-0000-4000-8000-000000000008',
  '10000000-0000-4000-8000-000000000009'
);

DELETE FROM auth.users
WHERE id IN (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000005',
  '10000000-0000-4000-8000-000000000006',
  '10000000-0000-4000-8000-000000000007',
  '10000000-0000-4000-8000-000000000008',
  '10000000-0000-4000-8000-000000000009'
);

DELETE FROM public.seasons
WHERE id = '99999999-9999-4999-8999-999999999999';
