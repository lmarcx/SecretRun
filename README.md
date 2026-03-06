# Secret Run Monorepo

## Stack

- Mobile: React Native, Expo, TypeScript, Expo Router
- Backend: Nhost, PostgreSQL, Hasura GraphQL, PostGIS, Nhost Auth, Nhost Storage, Nhost Functions
- Tooling: pnpm workspaces, ESLint, Prettier, Docker

## Structure

secret-run/
  apps/mobile
  backend/nhost
  packages/types
  packages/config
  scripts

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker Desktop
- Nhost CLI

## Environment Variables

Create `apps/mobile/.env`:

EXPO_PUBLIC_NHOST_SUBDOMAIN=local
EXPO_PUBLIC_NHOST_REGION=local
EXPO_PUBLIC_HASURA_GRAPHQL_URL=http://localhost:1337/v1/graphql
EXPO_PUBLIC_NHOST_BASE_URL=http://localhost:1337
EXPO_PUBLIC_TRACKPOINTS_ENDPOINT=http://localhost:1337/v1/functions/trackpoints

Create `backend/nhost/config/.env` (or copy `.env.example`):

NHOST_SUBDOMAIN=local
NHOST_REGION=local
NHOST_GRAPHQL_URL=http://localhost:1337/v1/graphql
NHOST_ADMIN_SECRET=nhost-admin-secret
ORS_API_KEY=replace-with-openrouteservice-key
ROUTE_ENCRYPTION_SECRET=replace-with-32-byte-secret
NHOST_FUNCTIONS_BASE_URL=http://127.0.0.1:1337/v1/functions
PARTICIPATION_REWARD_AMOUNT=5
DAILY_LOGIN_REWARD_AMOUNT=2
RATING_REWARD_AMOUNT=1
TEAM_EVENT_BONUS_POINTS=5
DEFAULT_START_AREA_RADIUS_KM=1
EXPO_PUSH_API_URL=https://exp.host/--/api/v2/push/send

## Start Development

1. `pnpm install`
2. `pnpm dev`

## Local Backend with Docker (No Nhost CLI)

1. Copy `backend/nhost/.env.example` to `backend/nhost/.env` and set `POSTGRES_PASSWORD` and `HASURA_GRAPHQL_ADMIN_SECRET`.
2. From `backend/nhost`, run `docker compose down -v`.
3. Run `docker compose up -d`.
4. Follow startup logs with `docker compose logs -f`.
5. GraphQL endpoint: `http://localhost:8080/v1/graphql`.
6. Use `docker compose down -v` whenever init SQL scripts change, because Postgres `docker-entrypoint-initdb.d` runs only when the data volume is created.

## Database Migration

- `pnpm db:migrate`
- `pnpm db:seed`

## Connect Mobile to Nhost

1. Ensure Nhost is running locally (`pnpm dev:backend` or `pnpm dev`).
2. You can start only Nhost with `nhost dev` inside `backend/nhost`.
3. Read the local Hasura GraphQL endpoint from the `nhost dev` logs (look for `/v1/graphql`).
4. Set `EXPO_PUBLIC_NHOST_BASE_URL=http://localhost:1337` in `apps/mobile/.env` for local mobile development.
5. Launch Expo (`pnpm dev:mobile`) and authenticate via Nhost Auth.

## Route Lifecycle Functions

- `generate-event-route`: builds route candidates with OpenRouteService, retries up to 3 times for distance tolerance (15%), encrypts payload, and upserts `event_routes`.
- `reveal-events`: scheduled function that reveals due routes by decrypting payload and publishing `route_polyline`.
- `validate-activity`: computes distance, duration, score, wallet credit, and marks activity as validated.
- `update-leaderboards`: triggered by `validate-activity` to update user/team seasonal points and recompute ranks by points descending.
- `participation-reward`: rewards wallet with `participation_reward` when user joins an event.
- `daily-login-reward`: rewards wallet with `daily_login_reward` once per user/day.
- `rating-reward`: rewards wallet with `rating_reward` once per rating action.
- `create-team-event`: leader-only team event creation (min 3 team members), then route generation.
- `join-team-event`: verifies team membership, joins event through participation flow.
- `get-activity-feed`: returns paginated activities from user, friends, and team members with profile and route details.
- `register-device`: registers Expo push tokens per user device.
- `send-notification`: sends push notifications to all devices of a user through Expo Push API.
- `dispatch-notification-jobs`: scheduled worker that delivers queued notifications.
- `event-start-reminders`: scheduled 30-minute reminder enqueue for event participants.
- `send-friend-request`: send a friend request (`pending`) to another user.
- `respond-friend-request`: accept/reject an incoming friend request.
- `cancel-friend-request`: cancel an outgoing pending friend request.
- `remove-friend`: remove an accepted friendship.
- `block-user`: block a user and remove existing friendship/pending requests.
- `unblock-user`: remove an existing block.
- `list-friends`: list accepted friends with profile info (excluding blocked users).

## Friend and Block Tables

- `friendships`: friend requests and accepted friendships (`pending`, `accepted`, `rejected`, `cancelled`).
- `blocks`: one-way blocking relation (`blocker_id`, `blocked_id`).

