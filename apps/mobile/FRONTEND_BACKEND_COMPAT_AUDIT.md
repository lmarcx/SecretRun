# Frontend/Backend Compatibility Audit

Date: 2026-03-10

## Working queries

### `apps/mobile/services/profileService.ts`

Query:

- `profiles_by_pk(id: $userId) { id username display_name avatar_url created_at }`

Compatibility:

- Matches the live `profiles` table columns.
- `profiles_by_pk` exists in the anonymous and admin GraphQL schema.
- Signed-out behavior is fine because the service returns early when there is no `userId`.

Current limitation:

- Live DB currently has `0` profile rows, so even a signed-in user would get `null` unless a profile is created first.

### `apps/mobile/services/leaderboardService.ts`

Queries:

- `seasons(where: { is_active: { _eq: true } }, order_by: { starts_at: desc }, limit: 1)`
- nested `user_leaderboard`
- nested `team_leaderboard`

Compatibility:

- `seasons`, `leaderboard_user_season`, and `leaderboard_team_season` are present in the anonymous GraphQL schema.
- Queried fields match the live table columns.
- Nested relations used by the query are valid against the loaded metadata.

Current limitation:

- Live DB currently has `0` rows in `seasons`, `leaderboard_user_season`, and `leaderboard_team_season`.
- Result: the screen falls back to "No active season is available yet."

## Broken queries

### `apps/mobile/services/eventsService.ts`

Queries:

- `events(order_by: { starts_at: asc })`
- `events_by_pk(id: $eventId)`
- `insert_event_participants_one(object: { event_id: $eventId })`

Frontend query shape:

- The current mobile query no longer asks for `is_private` or `max_participants`.
- The requested event fields are valid against the live `events` table.

Actual failure source:

- Anonymous `query_root` does not currently expose `events`.
- This is not a frontend field mismatch anymore.
- It is caused by inconsistent Hasura metadata on the `events` table for anonymous/user select permissions.

Specific live inconsistency causing the break:

- Hasura reports the `events` select permissions reference missing column `team_id`.
- The live DB also lacks `is_private` and `max_participants`, which are still present in the current `public_events.yaml`.

Secondary risk:

- `EVENT_DETAIL_QUERY` also depends on the `participants` relationship and `participants_aggregate`.
- Those are likely fine once `events` select permission becomes consistent again, but they are currently blocked by the missing `events` root exposure.

## Missing data

Current live row counts:

- `profiles`: 0
- `events`: 0
- `seasons`: 0
- `leaderboard_user_season`: 0
- `leaderboard_team_season`: 0

Impact:

- Events screen would still be empty after schema repair unless seed data is actually loaded.
- Leaderboard screen is currently empty because there is no active season row and no leaderboard rows.
- Profile queries return no profile row unless profile creation happens elsewhere.

## Missing schema exposure

### Anonymous GraphQL schema

Present:

- `profiles`
- `seasons`
- `leaderboard_user_season`
- `leaderboard_team_season`
- `teams`

Missing:

- `events`

Why `events` is missing:

- The live Hasura metadata is inconsistent against the live DB schema.
- Inconsistent permissions are omitted from the anonymous schema.

### Metadata/DB mismatches still active

- `events` metadata references missing `team_id`
- `events` metadata also still references missing `is_private` and `max_participants`
- `event_routes` metadata references missing `distance_m`
- `activity_trackpoints` metadata references missing `seq` and `speed_mps`
- `activities` metadata references missing `suspected_vehicle`
- `wallet_ledger` metadata references missing `transaction_type`, `reference_key`, `metadata`

## Recommended minimal fixes for MVP

1. Repair `public_events.yaml` against the live DB, not the repo-expected future schema.
   Safe minimum:
   - keep only `id`, `title`, `description`, `reveal_at`, `starts_at`, `ends_at`, `start_area_center`, `start_area_radius_km`, `created_by`, `created_at`
   - remove `team_id`, `is_private`, `max_participants`

2. Repair other inconsistent metadata files even if the current mobile app does not use them yet.
   Minimum live-schema cleanup:
   - `public_event_routes.yaml`: remove `distance_m`, `duration_sec`
   - `public_activity_trackpoints.yaml`: remove `seq`, `speed_mps`
   - `public_activities.yaml`: remove `suspected_vehicle`
   - `public_wallet_ledger.yaml`: remove `transaction_type`, `reference_key`, `metadata`

3. Reapply Hasura metadata after the cleanup.
   Expected result:
   - anonymous `query_root` should expose `events`

4. Rerun local Docker init/seed on a fresh volume.
   Required commands:
   - `docker compose down -v`
   - `docker compose up -d`

5. Verify seed application after reset.
   Minimum checks:
   - `events` row count >= 2
   - `seasons` row count >= 1
   - `leaderboard_user_season` row count >= 1
   - `leaderboard_team_season` row count >= 1

6. Optional tiny frontend safeguard:
   - keep the current leaderboard fallback to `null` when `seasons` is absent from `query_root`
   - add the same kind of explicit fallback only if `events` remains temporarily unavailable during local reset/debug
