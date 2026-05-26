# Secret Run test seed

This directory contains the local application fixture used to test the app end to end.

## Apply

```bash
pnpm db:seed:full
```

`pnpm db:seed` points to the same fixture through `seeds.sql`.

## Remove

```bash
pnpm db:seed:clear
```

The full seed starts by running the clear seed, so it is safe to replay.

## Main seeded account

- Email: `runner.demo@secretrun.local`
- User id: `10000000-0000-4000-8000-000000000001`
- Profile: `you_runner` / `You Runner`
- Team: `Night Owls`

The local Docker stack seeds `auth.users` for database integrity, but it does not run a Nhost Auth service or create a password credential. To sign in from the mobile app, create the same email in the Nhost Auth project configured by `EXPO_PUBLIC_NHOST_SUBDOMAIN` and `EXPO_PUBLIC_NHOST_REGION`, or configure a local auth/JWT setup that issues this user id. If `BETA_ALLOWED_EMAILS` is set, include `runner.demo@secretrun.local`.

## Coverage

The fixture includes:

- 9 runner profiles
- 5 teams with memberships
- accepted/pending/rejected friendships
- 1 active season
- 8 events covering live, full, future, private, and completed states
- routes for all events
- participants for map counts and join states
- validated, pending, and rejected activities for the feed
- user and team leaderboard rows
- wallet rows and ledger entries for selected rewards
