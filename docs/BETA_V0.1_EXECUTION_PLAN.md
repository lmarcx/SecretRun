# Secret Run Beta V0.1 Execution Plan

## 1. Objective

Beta V0.1 means moving from an internal MVP to a controlled test with a small group of real users. The target is not broad release readiness; it is a stable closed beta where real authentication, real event participation, real runs, and real leaderboard updates work together without weakening the trust model.

## 2. Execution Blocks

### Block A Authentication & Accounts

- Finalize login and registration reliability for real beta accounts.
- Ensure profile creation is consistent after signup and sign-in.
- Remove remaining edge cases where auth succeeds but the profile row is missing or incomplete.
- Verify that guest, signed-in, auth-unavailable, and DEV runner states remain clearly separated in the UI.

### Block B Run Backend Finalization

- Move trackpoint ingestion fully behind the trusted backend workflow boundary.
- Validate the full activity pipeline end-to-end: start activity, ingest trackpoints, finish activity, validate activity, update leaderboards.
- Ensure no client-side trust remains for identity-sensitive activity operations.
- Reconfirm participant-only route access and other Sprint 5 protections after backend cleanup.

### Block C Notifications

- Implement event start notifications.
- Implement results-ready notifications.
- Stabilize device registration and mobile setup across supported platforms.
- Keep unsupported states explicit so notification failures do not look like broken product behavior.

### Block D Observability & Debugging

- Add logging for run start and run finish.
- Add logging for activity validation failures and rejected runs.
- Add logging for notification registration and delivery attempts.
- Add minimal admin or debug visibility where needed to diagnose beta incidents without weakening security boundaries.

### Block E Mobile Stability

- Test background and foreground transitions during active runs.
- Test GPS permission flows across first-run, denied, and re-enabled states.
- Test session recovery on interruption, app relaunch, and upload retry cases.
- Reduce remaining UI inconsistencies on smaller devices and mobile edge cases.

### Block F UX Beta Polish

- Run a final pass on copy consistency across Events, Run, Profile, Feed, Teams, and Leaderboard.
- Tighten empty states and locked states so they read as intentional closed-beta behavior.
- Normalize remaining user-facing error messages.
- Ensure the product feels deliberate and closed-beta ready rather than experimental.

## 3. Pre-Release Checklist

- [ ] Auth works end-to-end
- [ ] Run validation stable
- [ ] Leaderboard updates correctly
- [ ] No blocking crashes
- [ ] Notifications partially working
- [ ] Dev mode disabled in production builds

## 4. Launch Strategy

- Start with a small closed group of real runners.
- Prioritize real-world test runs over broad feature expansion.
- Capture structured feedback on run reliability, auth flow quality, and device-specific issues.
- Keep the release private with no marketing push yet.

## 5. Post-Beta Priorities

- Full teams implementation
- Feed and social feature expansion
- Further anti-cheat improvements
- Performance optimization across mobile and backend flows
