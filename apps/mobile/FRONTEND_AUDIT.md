# Secret Run Mobile Frontend Audit

## Entrypoint and Layout

- Entrypoint: `/` from `apps/mobile/app/index.tsx`
- Root screen component: `HomeScreen` from `apps/mobile/components/HomeScreen.tsx`
- Root layout: `apps/mobile/app/_layout.tsx`
- Layout structure:
  - `NhostProvider` wraps the app
  - `DebugAuthBanner` is always visible
  - single `Stack` navigator controls all routes
  - auth routes live under `apps/mobile/app/(auth)`
  - `/home` is only an alias route and redirects back to `/`

## Route Audit

| Route path | File | Current status | Recommended MVP priority |
| --- | --- | --- | --- |
| `/` | `apps/mobile/app/index.tsx` | Real navigation hub. Visible home screen with links to main MVP areas. | P0 |
| `/home` | `apps/mobile/app/home.tsx` | Alias only. Redirects to `/`. | P3 |
| `/(auth)/login` | `apps/mobile/app/(auth)/login.tsx` | Partially connected. Uses `useAuth`, demo sign-in, and env-aware disabled state. Still a temporary auth UI. | P1 |
| `/(auth)/register` | `apps/mobile/app/(auth)/register.tsx` | Partially connected. Uses `useAuth`, demo sign-up, and env-aware disabled state. Still a temporary auth UI. | P2 |
| `/events` | `apps/mobile/app/events/index.tsx` | Placeholder screen with one demo link to an event detail route. No real event list or data loading yet. | P0 |
| `/events/[id]` | `apps/mobile/app/events/[id].tsx` | Partially connected. Reads route params and links into run mode, but shows static event copy only. | P1 |
| `/run/[eventId]` | `apps/mobile/app/run/[eventId].tsx` | Most connected screen so far. Loads route data through GraphQL, shows map or web fallback, requests location permission, and sends trackpoints. UI is still minimal. | P0 |
| `/feed` | `apps/mobile/app/feed.tsx` | Pure placeholder via `PlaceholderScreen`. | P2 |
| `/profile` | `apps/mobile/app/profile.tsx` | Pure placeholder via `PlaceholderScreen`. | P1 |
| `/leaderboard` | `apps/mobile/app/leaderboard.tsx` | Pure placeholder via `PlaceholderScreen`. | P2 |
| `/teams` | `apps/mobile/app/teams/index.tsx` | Pure placeholder via `PlaceholderScreen`. | P2 |

## Status Summary

### Existing screens

- `/`
- `/home`
- `/(auth)/login`
- `/(auth)/register`
- `/events`
- `/events/[id]`
- `/run/[eventId]`
- `/feed`
- `/profile`
- `/leaderboard`
- `/teams`

### Placeholder screens

- `/events`
- `/feed`
- `/profile`
- `/leaderboard`
- `/teams`

### Screens already partially connected

- `/(auth)/login`
  - wired to `useAuth`
  - demo sign-in action
  - reacts to missing backend env
- `/(auth)/register`
  - wired to `useAuth`
  - demo sign-up action
  - reacts to missing backend env
- `/events/[id]`
  - uses route params
  - links to live run mode
- `/run/[eventId]`
  - reads route params
  - fetches event route over GraphQL
  - renders native map on mobile and fallback map preview on web
  - requests foreground location and posts trackpoints
- `/`
  - real home shell for navigation testing, but still not product UI

### Missing screens

- Event join or RSVP flow
- Event creation or host management flow
- Event results or post-run summary screen
- Team detail screen
- Team creation and join flow
- Feed detail or activity detail screen
- Profile edit/settings sub-screens
- Wallet, sanctions, privacy, or notification settings screens
- Auth recovery/session screens beyond login/register

## Recommended MVP Implementation Order

1. `/events`
   - Replace the placeholder with a real event list fed by backend data.
2. `/events/[id]`
   - Add real event metadata, join state, reveal timing, and CTA into run mode.
3. `/run/[eventId]`
   - Keep this as the live activity core and harden loading, permission, and error states.
4. `/profile`
   - Add basic current-user info and sign-out state before deeper account settings.
5. `/(auth)/login`
   - Replace demo credentials with a usable login form if MVP requires public access.
6. `/teams`, `/feed`, `/leaderboard`
   - Implement after events and run mode unless one of them is required for first-user activation.

## Notes for MVP Scope

- The current app shell is stable enough for navigation testing.
- `PlaceholderScreen` is the main indicator that a route has no product logic yet.
- `run/[eventId]` is the strongest base for MVP because it already touches real services.
- `events` should be implemented first because it is the entry into the actual Secret Run flow.
