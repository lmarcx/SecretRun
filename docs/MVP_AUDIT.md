# Secret Run MVP Technical Audit

Date: 2026-03-12

## Overall assessment

The codebase has a solid MVP foundation:

- clear monorepo separation between `apps/mobile`, `backend/nhost`, and shared packages
- a simple Expo Router structure that is easy to navigate
- a readable service layer for GraphQL and Nhost access
- most user-facing screens already include loading, empty, and retry states
- backend migrations and functions show that the product model has been thought through beyond the UI

The main issue is not readability. It is integration discipline. The mobile app, Hasura metadata, and Nhost functions are not fully aligned. There are two competing architectures in the repo:

- direct client side GraphQL writes from the mobile app
- server side workflow functions for participation, activity lifecycle, validation, rewards, and notifications

Because those paths are only partially connected, the MVP currently carries real security, data integrity, and beta-readiness risks.

## 1. Repository architecture

### Current structure

- `apps/mobile` contains all Expo / React Native app code.
- `backend/nhost` contains SQL migrations, Hasura metadata, Docker setup, and Nhost functions.
- `packages/config` and `packages/types` are present for workspace sharing, but shared business logic is still minimal.
- `docs` already contains architecture and audit notes, although some of them are now stale relative to the code.

### Architecture quality

The top level repository structure is clean and scalable. Frontend and backend concerns are physically separated, and the backend is versioned with migrations plus metadata, which is the right direction for a Hasura based project.

The mobile app structure is also understandable:

- route files live in `apps/mobile/app`
- presentational components live in `apps/mobile/components`
- API and integration logic lives in `apps/mobile/services`
- low level helpers live in `apps/mobile/utils`

### Strengths

- The monorepo layout is easy to reason about.
- Expo Router file based routing keeps entry points obvious.
- The service folder gives the UI a consistent access point to GraphQL, Nhost, notifications, and local dev mode helpers.
- Backend concerns are split into migrations, metadata, and functions rather than being mixed together.

### Weaknesses

- Screen files still own too much orchestration logic. UI, data loading, permission management, and business rules are often colocated in the same route component.
- Shared packages are underused. Domain types are redefined manually inside services instead of being centralized.
- The service layer is thin and mostly wraps handwritten GraphQL strings. It does not yet provide a stronger domain boundary.
- Navigation is split between Expo Router file routing and a manually maintained bottom shell in `apps/mobile/components/AppNavigationShell.tsx`, which duplicates route knowledge.
- The root layout manually lists every stack screen in `apps/mobile/app/_layout.tsx`, which reduces the benefit of file based routing as the app grows.

### Scalability verdict

Clean enough for an MVP, but not yet clean enough for a growing beta team. The repo structure scales. The current frontend implementation style does not scale as well because business rules are spreading into route components rather than being consolidated into reusable hooks or domain modules.

## 2. Mobile app architecture

### Screen organization

The screen map is simple and coherent:

- events list
- event detail
- run tracker and result view
- feed
- leaderboard
- teams
- profile
- auth routes

The overall route coverage matches the MVP scope.

### Component reuse

Component reuse is limited. There are reusable primitives like `RouteMap`, `DebugAuthBanner`, and `AppNavigationShell`, but most screen UI patterns are duplicated:

- loading blocks
- error + retry blocks
- empty states
- button styles
- date formatting
- duration formatting
- card layouts

### Navigation patterns

Navigation is understandable, but there are structural issues:

- `AppNavigationShell` is always visible, including during auth and run flows.
- Run access is gated in the event detail CTA, but not at the route level.
- `index.tsx` redirects to `/events`, while `/home` and `HomeScreen` remain as older navigation artifacts.

### State management approach

State is currently local `useState` / `useEffect` state with no shared async state layer. That keeps the MVP lightweight, but it also means:

- no cache
- no request deduplication
- no stale data policy
- repeated fetch boilerplate across screens
- no standard mutation lifecycle handling

`runSessionStore.ts` is a module level in-memory map, not persisted storage. That is acceptable for quick testing, but fragile for a real beta.

### Service usage patterns

Services are called directly from screens. This keeps the code readable, but it also creates tight coupling between route components and backend behavior.

Examples:

- `apps/mobile/app/events/[id].tsx` handles event loading, route loading, join behavior, and action state selection.
- `apps/mobile/app/run/[eventId].tsx` handles permission flow, live GPS tracking, distance calculation, local persistence, upload logic, and result rendering in one file.
- `apps/mobile/app/profile.tsx` mixes auth state, profile loading, notification capability checks, and push registration.

### Duplicated logic

- Async load/retry patterns are repeated on almost every screen.
- Event field selections are duplicated across list and detail queries.
- Date and duration formatting are duplicated in multiple screens.
- Auth branching logic is repeated between screens and services.
- `useEventRoute` exists but the main screens do not use it.

### Coupling problems

- The run screen is highly coupled to Expo Location, route parsing, device-local session storage, and GraphQL writes.
- The event detail screen is coupled to both participation state and route reveal timing.
- The UI depends on backend specific assumptions such as `viewerParticipationStatus`, active season availability, and direct write permissions on activities and trackpoints.

### Refactoring opportunities

- Extract a reusable async resource hook for load / error / retry behavior.
- Extract `useEventDetails`, `useLeaderboard`, `useTeams`, and especially `useRunTracker`.
- Centralize formatting helpers.
- Move route guards into reusable navigation or screen-level guards.
- Introduce a query/mutation layer such as TanStack Query before the beta surface grows.

## 3. GraphQL and backend usage

### Query design

The GraphQL layer is readable, but hand maintained:

- queries are inline in service files
- TypeScript response types are handwritten
- field selections are duplicated
- there is no schema code generation

This is manageable today, but brittle as Hasura metadata evolves.

### Service layer observations

- `eventsService.ts` separates public and authenticated event reads, which is practical.
- `leaderboardService.ts` and `teamsService.ts` perform extra follow-up queries instead of using a stronger shared model.
- `activitiesService.ts` writes activities and trackpoints directly from the client.
- `feedService.ts` uses direct GraphQL even though a richer backend feed function exists.

### Overfetching and inefficiency

- `teamsService.ts` fetches all `team_members` rows for all teams to compute counts client side.
- `leaderboardService.ts` performs a second query just to find the current user's team memberships.
- `joinEvent()` does a read-before-write flow, which adds a round trip and still relies on conflict handling for correctness.
- Event detail and run screens both fetch the same event and route data independently with no shared cache.

### Missing or weak error handling

- Most services simply surface the first GraphQL error string to the UI.
- Backend schema details can leak directly into user-visible copy.
- There is no retry policy besides manual "Retry" buttons.
- No partial data handling exists when one part of a multi-step load succeeds and another fails.

### Client side assumptions about backend data

The app currently assumes:

- `events`, `event_routes`, `activities`, `activity_trackpoints`, and `team_members` are all exposed exactly as queried
- direct inserts on `activities` and `activity_trackpoints` are valid and durable
- the current user already has a `profiles` row when needed
- there is always at most one relevant active season
- route data can be safely interpreted as a LineString payload

Those assumptions are fragile because the repo already contains evidence of schema and metadata drift in previous audits and in the parallel function-based backend path.

### Major integration mismatches

- The mobile app joins events through `insert_event_participants_one`, but the backend also contains a `participation-reward` function. Standard joins do not go through that reward flow.
- The mobile app uploads completed runs through direct GraphQL inserts, but the backend also contains `start-activity`, `finish-activity`, `detect-cheating`, `validate-activity`, and `update-leaderboards`. The mobile flow does not invoke that lifecycle.
- The mobile feed uses `activities(where: { user_id: { _eq: $userId } })`, while the backend contains a richer `get-activity-feed` function for social feed aggregation.
- The notification client expects types like `event_start`, while `event-start-reminders` enqueues `event_start_reminder`.

### Improvements

- Pick one architecture for writes: either direct Hasura mutations or authenticated server-side workflow functions. Do not keep both active for the same business flow.
- Generate GraphQL types from the schema.
- Consolidate event field selections into fragments or generated documents.
- Move reward, validation, and leaderboard updates behind a single trusted backend entry point.
- Add consistent error normalization so raw schema messages do not reach the UI.

## 4. Security review

### DEV_RUNNER_MODE

`apps/mobile/services/devRunnerMode.ts` hardcodes:

- `DEV_RUNNER_MODE = true`

This is the most obvious production risk in the mobile codebase. It means the dev fallback is not build-time gated. If this file ships unchanged, signed-out users keep a local bypass path in every build.

### Authentication and authorization risks

#### 1. Dev mode can leak into production

Risks:

- signed-out local join flow remains enabled
- reveal and start timing can be bypassed
- start-zone validation can be bypassed
- UI explicitly advertises DEV mode

This must be moved behind an environment gate and stripped from production builds.

#### 2. Run route is not actually guarded

`apps/mobile/app/run/[eventId].tsx` does not verify that the user joined the event before starting a run. The event detail screen prevents the normal user path, but the route itself does not.

Impact:

- a user can deep link or navigate directly to `/run/[eventId]`
- if the route is revealed and location permission is available, the app can start local tracking without confirmed participation
- upload then fails or becomes inconsistent later, but the protected flow is already bypassed

#### 3. Client side activity writes are too trusted

The mobile app writes:

- `insert_activities_one`
- `insert_activity_trackpoints`

directly from the client.

Impact:

- authenticated users can fabricate timestamps, distance, speed, and full trackpoint history
- anti-cheat logic exists, but the main mobile path does not force the run through it
- pending or malformed activity data can enter the database before validation

For a running product, the client should not be the trusted writer of final activity metrics.

#### 4. Function endpoints appear underprotected

Multiple functions accept `user_id`, `activity_id`, or `x-hasura-user-id` and then use the Hasura admin secret internally:

- `register-device`
- `start-activity`
- `finish-activity`
- `join-team-event`
- `participation-reward`
- `send-notification`
- `trackpoints`

The repo does not show an explicit auth requirement in these `function.yaml` files, and several handlers trust caller supplied identifiers rather than deriving identity from a verified session.

Impact if exposed publicly:

- device registration spoofing
- unauthorized activity lifecycle writes
- arbitrary notification dispatch
- joining team events on behalf of another user

At minimum, these functions need explicit auth enforcement and server-side identity derivation.

#### 5. Broad data exposure in Hasura metadata

Current metadata grants broad read access to:

- `profiles` for `anonymous`
- `events` for `anonymous`
- `seasons` and leaderboards for `anonymous`
- `event_routes` for `anonymous` once revealed
- `team_members` for any authenticated `user`

Risks:

- profile enumeration
- team membership enumeration
- revealed route scraping without participation
- privacy exposure larger than a closed beta usually needs

#### 6. Push token handling is too permissive

- `register-device` accepts `user_id` in the body.
- `ProfileScreen` displays the raw Expo push token back to the user.

This is unnecessary token exposure and weak server-side ownership validation.

#### 7. Local stores are not user scoped

`runSessionStore.ts` stores sessions by `eventId` only. If auth changes during the same app process, local run results are not partitioned by user.

### Security verdict

In its current form, the MVP is not safe for production deployment. The most important issues are the hardcoded dev mode, insufficient route guarding, client-trusted activity writes, and potentially underprotected admin-secret-backed functions.

## 5. GPS and run tracking

### Current implementation

The run screen:

- requests foreground permission only
- uses `watchPositionAsync`
- tracks points locally in component state
- computes distance on device
- stores the finished result in an in-memory map
- uploads only after the run is completed

### Strengths

- start-zone gating exists
- there is basic duplicate point suppression
- the route and user path are visually distinct
- the flow handles abandon, finish, upload retry, and local fallback states

### Risks and edge cases

#### Lifecycle management

- No background location permission is requested.
- No background task is registered.
- Tracking stops if the app is backgrounded, suspended, or killed.
- Active runs are not persisted across process restarts.

For a running app, this means real world run sessions are fragile.

#### GPS drift and data quality

- No accuracy threshold filtering is applied.
- No smoothing or snap-to-route logic exists.
- No stale location rejection exists.
- No minimum duration or minimum distance guard exists before finishing.
- Finish can happen anywhere; there is no end-point or route completion validation.

#### Performance and battery

- The screen rerenders on every accepted trackpoint.
- The map receives ever-growing polyline arrays.
- Trackpoints are stored in memory for the whole run.
- The location watcher is recreated when `runPhase` changes.

This is acceptable for short demo runs, but it will age poorly on longer sessions.

#### Backend alignment

- The app computes metrics on device, but backend validation functions exist separately.
- `useTrackpointSync.ts` and `services/trackpoints.ts` are unused and their payload contract does not match the `trackpoint` function.

### GPS verdict

Good enough for supervised MVP demos, not good enough for reliable field use. The current implementation is foreground-only, easy to spoof, and likely to lose state when the mobile lifecycle becomes less controlled.

## 6. UX robustness

### What is already good

- Most major screens have loading states.
- Error states usually offer a retry button.
- Empty states exist for events, teams, feed, and leaderboard.
- Profile handles signed-out and signed-in states separately.
- Run upload retry is present after a failed completion upload.

### Missing protections and UX gaps

- No pull-to-refresh patterns on list screens.
- No offline state or connectivity-specific messaging beyond generic backend errors.
- No pagination for events, teams, feed, or leaderboard.
- No route-level guard preventing direct access to protected flows.
- Bottom navigation remains visible during auth and run flows, making accidental exits more likely.
- No confirmation dialog before abandoning a run.
- No recovery flow if registration succeeds but profile creation fails.
- No clear indication that active run state will be lost if the app closes.
- Error copy often exposes backend wording instead of user-friendly product language.
- Notification deep links are inconsistent with backend notification types.

### UX verdict

The MVP is usable, but still feels engineering-led rather than beta-ready. The app handles common empty/error paths, yet several edge cases still degrade into confusing or leaky states.

## 7. Performance

### Main concerns

- `EventsScreen` uses `ScrollView` rather than a virtualized list.
- The run screen keeps all trackpoints in React state and rerenders the entire screen on updates.
- `RouteMap` recomputes the region from full point sets whenever dependencies change.
- GraphQL responses are not cached.
- Event detail and run screens refetch overlapping data.
- Teams and leaderboard services make extra queries that will scale poorly as row counts grow.

### What is acceptable today

- Feed, teams, and leaderboard use `FlatList`.
- The codebase is still small enough that the current lack of caching is not yet catastrophic.
- Queries are mostly simple and bounded for MVP sized datasets.

### Performance verdict

The app is acceptable for a small data set and short runs. It is not yet prepared for larger beta cohorts, longer activities, or heavier social/feed usage.

## 8. Technical debt

### High debt areas

- Hardcoded `DEV_RUNNER_MODE`
- duplicated async screen boilerplate
- dual write architectures: direct GraphQL vs workflow functions
- no generated GraphQL types
- no automated tests
- in-memory run persistence
- stale repo documentation such as old frontend audit notes no longer matching the current UI
- unused or partially obsolete code paths such as `useEventRoute`, `useTrackpointSync`, `sendTrackpoint`, `HomeScreen`, and `PlaceholderScreen`

### Why this matters later

- schema changes will become expensive because contracts are manually duplicated
- security fixes will be harder if privileged functions remain loosely defined
- run tracking bugs will be difficult to reproduce without tests or stronger state modeling
- onboarding new contributors becomes slower when docs and code diverge

## 9. Beta readiness

### Small closed beta

Current verdict: not ready without a short round of hardening.

The app is close from a product-surface perspective, but there are still functional and security blockers that are too large to ignore even for a small closed beta.

### Blockers for production deployment

- `DEV_RUNNER_MODE` is hardcoded on.
- Run access is not enforced at the route level.
- The client can write activities and trackpoints directly.
- The intended server-side validation/reward pipeline is not the active mobile path.
- Several admin-secret-backed functions appear insufficiently protected.
- Notification stack and social/feed backend paths are not coherently wired.

### Blockers for a public beta

- all production blockers above
- no robust background or resumed run tracking
- no persistent active session recovery
- no test suite for critical flows
- broad data exposure through GraphQL permissions
- no stronger monitoring / observability / failure reporting path visible in the repo

### What is already beta-leaning

- the core route structure is clear
- the main MVP screens exist
- most screens degrade gracefully under missing data
- the code is readable enough to harden quickly

## 10. Recommended next steps

### Critical

- Remove hardcoded `DEV_RUNNER_MODE` from release builds and gate it behind a build-time environment check.
- Enforce route-level authorization for `/run/[eventId]` and verify joined participation before tracking starts.
- Move activity creation, trackpoint ingestion, validation, scoring, and leaderboard updates behind a single trusted backend workflow.
- Lock down Nhost functions so identity comes from verified auth context, not caller supplied `user_id`.
- Decide whether revealed routes are public or participant-only, then align Hasura permissions to that rule.
- Align notification event types between mobile and backend and verify that all notification tables are actually tracked and queryable.

### Important

- Introduce a shared async data layer such as TanStack Query for caching, retries, and mutation state.
- Extract reusable hooks for event detail and run tracking.
- Replace duplicated screen state blocks with shared UI primitives.
- Persist active and completed run sessions with user scoping, not only in-memory module state.
- Add stronger GPS data quality checks: accuracy filter, stale fix rejection, minimum run validity thresholds, and finish validation.
- Reduce overfetching in teams and leaderboard services.
- Stop returning raw backend error strings to the UI.

### Nice to have

- Add generated GraphQL types and fragments.
- Add pull-to-refresh and pagination where appropriate.
- Hide the bottom navigation during auth and active run flows.
- Add confirmation dialogs for abandoning or discarding a run.
- Clean out unused hooks/components and archive stale audit documents.
- Add automated tests for auth, join event, run completion, and upload failure recovery.

## Final conclusion

Secret Run is a credible MVP codebase with a clean repository shape and a mostly implemented mobile surface. The main problem is not missing screens. It is that trust boundaries, backend workflows, and runtime protections are still too loose.

If the team fixes the dev-mode leak, secures write paths, and makes the activity lifecycle consistent end-to-end, this can become a solid closed beta candidate quickly. In its current state, it is better described as an advanced internal MVP than a beta-ready build.
