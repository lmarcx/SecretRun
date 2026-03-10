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

## Environment Variables

Create `apps/mobile/.env`:

EXPO_PUBLIC_NHOST_SUBDOMAIN=local
EXPO_PUBLIC_NHOST_REGION=local
EXPO_PUBLIC_HASURA_GRAPHQL_URL=http://YOUR_LOCAL_IP:8080/v1/graphql
EXPO_PUBLIC_NHOST_BASE_URL=http://YOUR_LOCAL_IP:1337
EXPO_PUBLIC_TRACKPOINTS_ENDPOINT=http://YOUR_LOCAL_IP:1337/v1/functions/trackpoints

Expo Go note:
- On a real phone, `localhost` points to the phone itself, not your PC.
- Use your development machine LAN IP for `EXPO_PUBLIC_HASURA_GRAPHQL_URL`, `EXPO_PUBLIC_NHOST_BASE_URL`, and `EXPO_PUBLIC_TRACKPOINTS_ENDPOINT`.
- Public frontend GraphQL requests use the local Hasura `anonymous` role. Do not send the Hasura admin secret from mobile or web code.

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
2. Start local development in two terminals:
   - Terminal 1: `pnpm dev:backend`
   - Terminal 2: `pnpm dev:mobile`

`pnpm dev` still starts backend and mobile together. The backend command uses `docker compose up -d` and exits once containers are started, so the root script is configured to keep Expo running after backend startup completes.

Useful commands:
- `pnpm dev:backend`
- `pnpm dev:mobile`
- `pnpm backend:stop`
- `pnpm backend:logs`

## Local Backend with Docker (No Nhost CLI)

1. Copy `backend/nhost/.env.example` to `backend/nhost/.env` and set `POSTGRES_PASSWORD` and `HASURA_GRAPHQL_ADMIN_SECRET`.
2. From `backend/nhost`, run `docker compose down -v`.
3. Run `docker compose up -d`.
4. Follow startup logs with `docker compose logs -f`.
5. GraphQL endpoint: `http://localhost:8080/v1/graphql`.
6. Local frontend requests without a user session run as the Hasura `anonymous` role via `HASURA_GRAPHQL_UNAUTHORIZED_ROLE=anonymous`.
7. Local Hasura metadata from `backend/nhost/metadata` is reapplied automatically on container startup, so tracked tables and permissions come back after a reset.
8. Local dev seed data from `backend/nhost/seeds/seed.sql` is applied automatically on a fresh Postgres volume.
9. Use `docker compose down -v` followed by `docker compose up -d` whenever init SQL or seed files change, because `docker-entrypoint-initdb.d` runs only when the data volume is created.

## Database Migration

- `pnpm db:migrate`
- `pnpm db:seed`

## Connect Mobile to Nhost

1. Ensure the local backend is running with Docker Compose (`pnpm dev:backend` or `pnpm dev`).
2. GraphQL endpoint is available at `http://localhost:8080/v1/graphql` on the development machine.
3. In `apps/mobile/.env`, use your PC LAN IP for Expo Go on a phone, for example:
   - `EXPO_PUBLIC_HASURA_GRAPHQL_URL=http://192.168.1.42:8080/v1/graphql`
   - `EXPO_PUBLIC_NHOST_BASE_URL=http://192.168.1.42:1337`
   - `EXPO_PUBLIC_TRACKPOINTS_ENDPOINT=http://192.168.1.42:1337/v1/functions/trackpoints`
4. Launch Expo (`pnpm dev:mobile`) and authenticate via Nhost Auth.

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
