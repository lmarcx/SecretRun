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
EXPO_PUBLIC_NHOST_GRAPHQL_URL=http://localhost:1337/v1/graphql
EXPO_PUBLIC_TRACKPOINTS_ENDPOINT=http://localhost:1337/v1/functions/trackpoints

Create `backend/nhost/config/.env` (or copy `.env.example`):

NHOST_SUBDOMAIN=local
NHOST_REGION=local
NHOST_GRAPHQL_URL=http://localhost:1337/v1/graphql
NHOST_ADMIN_SECRET=nhost-admin-secret
ORS_API_KEY=replace-with-openrouteservice-key
ROUTE_ENCRYPTION_SECRET=replace-with-32-byte-secret
NHOST_FUNCTIONS_BASE_URL=http://127.0.0.1:1337/v1/functions

## Start Development

1. `pnpm install`
2. `pnpm dev`

## Database Migration

- `pnpm db:migrate`
- `pnpm db:seed`

## Connect Mobile to Nhost

1. Ensure Nhost is running locally (`pnpm dev:backend` or `pnpm dev`).
2. Use backend GraphQL URL in `apps/mobile/.env`.
3. Launch Expo (`pnpm dev:mobile`) and authenticate via Nhost Auth.

## Route Lifecycle Functions

- `generate-event-route`: builds route candidates with OpenRouteService, retries up to 3 times for distance tolerance (15%), encrypts payload, and upserts `event_routes`.
- `reveal-events`: scheduled function that reveals due routes by decrypting payload and publishing `route_polyline`.
- `validate-activity`: computes distance, duration, score, wallet credit, and marks activity as validated.
- `update-leaderboards`: triggered by `validate-activity` to update user/team seasonal points and recompute ranks by points descending.

