# Mobile Env Notes

## Cloud mode

Use this when mobile should talk to the hosted stack:

```env
EXPO_PUBLIC_NHOST_SUBDOMAIN=your-project-subdomain
EXPO_PUBLIC_NHOST_REGION=eu-central-1
EXPO_PUBLIC_HASURA_GRAPHQL_URL=https://your-project-subdomain.graphql.eu-central-1.nhost.run/v1/graphql
EXPO_PUBLIC_BACKEND_API_URL=https://your-secret-run-api.onrender.com
```

## Local public-data mode

Use this when you want seeded local public data in mobile:

```env
EXPO_PUBLIC_NHOST_SUBDOMAIN=your-project-subdomain
EXPO_PUBLIC_NHOST_REGION=eu-central-1
EXPO_PUBLIC_HASURA_GRAPHQL_URL=http://YOUR_LOCAL_IP:8080/v1/graphql
EXPO_PUBLIC_BACKEND_API_URL=http://YOUR_LOCAL_IP:10000
EXPO_PUBLIC_TRACKPOINTS_ENDPOINT=http://YOUR_LOCAL_IP:1337/v1/functions/trackpoints
```

Notes:
- Keep the cloud `EXPO_PUBLIC_NHOST_*` values if local auth is not wired yet.
- This is enough to validate local `events` and `leaderboard` against the seeded stack.
- Account-backed flows are only fully valid if the local backend API and auth setup match the tokens used by the app.

## What each env does

- `EXPO_PUBLIC_HASURA_GRAPHQL_URL`: public GraphQL reads used by guest `events` fallback and `leaderboard`.
- `EXPO_PUBLIC_NHOST_SUBDOMAIN` + `EXPO_PUBLIC_NHOST_REGION`: enable Nhost Auth and derive auth/functions/storage URLs. They can also derive the GraphQL URL when you do not set `EXPO_PUBLIC_HASURA_GRAPHQL_URL` explicitly.
- `EXPO_PUBLIC_BACKEND_API_URL`: backend-owned reads and all private/account flows such as `feed`, `profile`, joins, and run sync.
- `EXPO_PUBLIC_TRACKPOINTS_ENDPOINT`: optional override for the functions endpoint.

## Behavior when backend API URL is missing

- `events` list/detail still work through the public GraphQL fallback.
- `leaderboard` still works if GraphQL env is configured.
- `feed`, `profile`, joins, and run sync still require `EXPO_PUBLIC_BACKEND_API_URL`.

## Guest/public behavior

- Guest users can open public `events` and `leaderboard`.
- Guest users cannot join events.
- `feed` stays private.

## Quick verification

1. Start the local stack and replay the seed if needed: `pnpm dev:backend` then `pnpm db:seed`.
2. Set mobile env to local GraphQL and local backend API.
3. Launch Expo.
4. Check the debug banner:
   - `GraphQL local`
   - `Backend local`
5. Open `/events` and confirm seeded cards appear.
6. Open `/leaderboard` and confirm season standings load from the local source.
