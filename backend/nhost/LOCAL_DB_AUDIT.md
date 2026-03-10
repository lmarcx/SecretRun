# Local DB Audit

Date: 2026-03-10

## Runtime inspected

- Postgres container: `nhost-postgres-1`
- Hasura container: `nhost-hasura-1`
- Hasura image: `hasura/graphql-engine:v2.48.4.cli-migrations-v3`

## Database state

The live database does not match the latest repo migration expectations. Several columns referenced by current metadata are missing from the running Postgres schema.

### MVP tables

| Table | Exists | Row count | Key columns present | Key columns missing vs current repo expectations |
| --- | --- | ---: | --- | --- |
| `profiles` | yes | 0 | `id`, `username`, `display_name`, `avatar_url`, `created_at`, `updated_at` | none for current mobile profile query |
| `events` | yes | 0 | `id`, `title`, `description`, `reveal_at`, `starts_at`, `ends_at`, `start_point`, `end_point`, `start_area_center`, `start_area_radius_km`, `created_by`, `created_at` | `team_id`, `is_private`, `max_participants` |
| `event_participants` | yes | not checked | `event_id`, `user_id`, `status`, `joined_at` | none for current mobile join flow |
| `event_routes` | yes | not checked | `id`, `event_id`, `route_encrypted`, `route_polyline`, `revealed`, `revealed_at`, `created_at` | `distance_m`, `duration_sec` |
| `activities` | yes | not checked | `id`, `event_id`, `user_id`, `status`, `distance_km`, `duration_seconds`, `avg_speed_kmh`, `points`, `started_at`, `finished_at`, `created_at` | `suspected_vehicle` |
| `activity_trackpoints` | yes | not checked | `id`, `activity_id`, `point`, `recorded_at`, `speed_kmh` | `seq`, `speed_mps` |
| `seasons` | yes | 0 | `id`, `name`, `starts_at`, `ends_at`, `is_active`, `created_at` | none for leaderboard query |
| `leaderboard_user_season` | yes | 0 | `season_id`, `user_id`, `points`, `rank`, `updated_at` | none for leaderboard query |
| `leaderboard_team_season` | yes | 0 | `season_id`, `team_id`, `points`, `rank`, `updated_at` | none for leaderboard query |
| `teams` | yes | not checked | `id`, `name`, `created_by`, `created_at` | none for leaderboard relation |
| `team_members` | yes | not checked | `team_id`, `user_id`, `role`, `joined_at` | none in tracked subset |
| `wallets` | yes | not checked | `id`, `user_id`, `balance`, `updated_at` | none for current metadata subset |
| `wallet_ledger` | yes | not checked | `id`, `wallet_id`, `delta`, `reason`, `created_at` | `transaction_type`, `reference_key`, `metadata` |
| `sanctions` | yes | not checked | `id`, `user_id`, `report_id`, `sanction_type`, `reason`, `starts_at`, `ends_at`, `created_at` | none in tracked subset |

### Row counts checked

| Table | Row count |
| --- | ---: |
| `profiles` | 0 |
| `events` | 0 |
| `seasons` | 0 |
| `leaderboard_user_season` | 0 |
| `leaderboard_team_season` | 0 |

### Foreign keys present for MVP tables

- `profiles.id -> auth.users.id`
- `teams.created_by -> profiles.id`
- `team_members.team_id -> teams.id`
- `team_members.user_id -> profiles.id`
- `events.created_by -> profiles.id`
- `event_participants.event_id -> events.id`
- `event_participants.user_id -> profiles.id`
- `event_routes.event_id -> events.id`
- `activities.event_id -> events.id`
- `activities.user_id -> profiles.id`
- `activity_trackpoints.activity_id -> activities.id`
- `wallets.user_id -> profiles.id`
- `wallet_ledger.wallet_id -> wallets.id`
- `leaderboard_user_season.season_id -> seasons.id`
- `leaderboard_user_season.user_id -> profiles.id`
- `leaderboard_team_season.season_id -> seasons.id`
- `leaderboard_team_season.team_id -> teams.id`
- `sanctions.user_id -> profiles.id`
- `sanctions.report_id -> reports.id`

## Hasura GraphQL schema observed

### Anonymous query root fields actually exposed

Observed via anonymous introspection on `http://localhost:8080/v1/graphql`:

- present: `profiles`
- present: `seasons`
- present: `leaderboard_user_season`
- present: `leaderboard_team_season`
- present: `teams`
- missing: `events`

Anonymous `query { events(limit: 1) { id } }` currently fails with:

`field 'events' not found in type: 'query_root'`

Anonymous `query { seasons(limit: 1) { id name } }` currently succeeds but returns an empty array.

### Admin query root fields actually exposed

Observed via admin introspection:

- present: `events`
- present: `seasons`
- present: `leaderboard_user_season`
- present: `leaderboard_team_season`
- present: `profiles`
- present: `teams`
- present: `event_participants`
- present: `event_routes`
- present: `activities`
- present: `activity_trackpoints`
- present: `wallets`
- present: `wallet_ledger`
- present: `sanctions`

## Hasura metadata consistency

Live Hasura metadata is inconsistent.

Observed inconsistent objects:

- `events` anonymous select permission: references missing column `team_id`
- `events` user select permission: references missing column `team_id`
- `event_routes` anonymous/user select permissions: reference missing column `distance_m`
- `activity_trackpoints` user select/insert permissions: reference missing column `seq`
- `activities` user select permission: references missing column `suspected_vehicle`
- `wallet_ledger` user select permission: references missing column `transaction_type`

These inconsistencies explain the schema behavior:

- `events` is available to admin but not to anonymous
- `seasons` and leaderboard tables remain exposed anonymously because their metadata is consistent

## Seed state

The repository seed file contains active season and event rows, but the live database currently has zero rows in all audited MVP tables. That means the active Postgres volume was not seeded from the current seed file.

Most likely causes:

1. The current Docker volume predates the seed/init changes.
2. `docker compose down -v` and `docker compose up -d` have not been rerun since the seed/init wiring changed.

## Immediate conclusions

- The leaderboard empty state is caused by missing data, not missing anonymous schema exposure.
- The events runtime failure is caused by inconsistent Hasura metadata against the live DB schema.
- The running DB schema is behind the repo's later migrations for several tables.
