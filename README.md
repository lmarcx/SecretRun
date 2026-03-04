# Secret Run Monorepo

## Stack

- Mobile: React Native, Expo, TypeScript, Expo Router
- Backend: Nhost, PostgreSQL, Hasura GraphQL, PostGIS, Nhost Auth, Nhost Storage, Nhost Functions
- Tooling: pnpm workspaces, ESLint, Prettier, Docker

## Structure

```
secret-run/
  apps/mobile
  backend/nhost
  packages/types
  packages/config
  scripts
```

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker Desktop
- Nhost CLI

## Environment Variables

Create `apps/mobile/.env`:

```
EXPO_PUBLIC_NHOST_SUBDOMAIN=local
EXPO_PUBLIC_NHOST_REGION=local
EXPO_PUBLIC_NHOST_GRAPHQL_URL=http://localhost:1337/v1/graphql
```

Create `backend/nhost/config/.env` (or copy `.env.example`):

```
NHOST_SUBDOMAIN=local
NHOST_REGION=local
NHOST_GRAPHQL_URL=http://localhost:1337/v1/graphql
NHOST_ADMIN_SECRET=nhost-admin-secret
```

## Start Development

1. Install dependencies:

   `pnpm install`

2. Start local backend and mobile app:

   `pnpm dev`

This runs local Nhost services with Docker and Expo dev server in parallel.

## Database Migration

- Apply migrations:

  `pnpm db:migrate`

- Apply seeds:

  `pnpm db:seed`

## Connect Mobile to Nhost

1. Ensure Nhost is running locally (`pnpm dev:backend` or `pnpm dev`).
2. Use the backend GraphQL URL in `apps/mobile/.env`.
3. Launch Expo (`pnpm dev:mobile`) and authenticate via Nhost Auth.

## Core Business Rule

Event routes must remain hidden until `events.reveal_at` and are exposed by either:

- Scheduled `reveal-events` function.
- Hasura permission filter that allows access only when route is revealed or user is a participant.
