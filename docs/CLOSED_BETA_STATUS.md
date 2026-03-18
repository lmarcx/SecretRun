# Secret Run Closed Beta Status

## 1. Product Overview

Secret Run is a location-based running product built around scheduled events with hidden routes. Runners browse upcoming events, join before start, wait for reveal timing, travel to the start zone, complete the run, and then receive a validated result that feeds the leaderboard.

The current product loop is focused and narrow by design: events lead into run tracking, run completion leads into result validation, and validated results feed season leaderboard standings. Profile, feed, teams, and notifications support that loop, but they do not yet extend it into a full social platform.

## 2. What Works (Validated)

- Events browsing and segmentation are stable, including past, upcoming, and ready-to-run sections.
- Event participation rules are enforced in the app flow, including signed-in registration and local DEV runner fallback.
- Run tracking flow is stable for start, active tracking, finish, and local result review.
- GPS filtering and anti-cheat protections exist for stale fixes, low-accuracy fixes, impossible jumps, unrealistic segment speed, and incoherent timestamps.
- Invalid run handling exists for runs that are too short, too short in duration, or not backed by enough stable GPS samples.
- Local session recovery restores in-progress or completed local run state on the same device.
- Leaderboard basics are working for solo and team season views.
- Teams are available in browse-only mode with read-only messaging aligned to closed beta scope.
- Feed is intentionally scoped to the signed-in runner’s own activity and stays locked or empty in unsupported contexts.
- Auth flows now clearly distinguish signed-in, guest, auth-unavailable, and DEV runner states.
- Notifications are partially implemented, with route reveal support available on supported signed-in mobile devices.

## 3. Security Model (Current State)

Secret Run relies on Hasura role-based access and row-level data exposure rules. The frontend is expected to operate safely against restricted schemas rather than assuming every root field exists for every role.

Sensitive event data such as revealed routes remains participant-only. Guest users, signed-out users, and DEV runner fallback paths do not receive trusted backend route access.

Backend functions enforce identity from the authenticated session instead of trusting client-provided `user_id` values. Activity lifecycle operations, device registration, and protected workflows are intended to derive identity from the token-backed session.

DEV runner is isolated to local testing behavior. It is not a trusted identity, does not grant backend-only access, and must not be treated as equivalent to a real authenticated beta account.

## 4. Known Limitations (Intentional)

- Team join and team creation flows remain disabled.
- Feed is limited to the current signed-in runner and does not expose a broader social timeline.
- Notifications are incomplete: route reveal is the only clearly active beta capability; event start and results-ready remain later-beta items.
- DEV runner bypasses some real-world constraints for local testing, including parts of reveal timing, start timing, and start-zone enforcement.
- Trackpoint collection still begins on-device before trusted backend validation and scoring complete; the trust boundary is improved, but the full ingestion path is not fully finished.
- Production-grade observability, moderation tooling, and operational controls are not complete yet.

## 5. Known Risks / Gaps

- GPS reliability can still vary significantly across devices, signal conditions, and dense urban environments.
- Backend function type safety and consistency are improved but not fully cleaned up across the whole stack.
- ESLint configuration is currently inconsistent with the installed ESLint version, which weakens automated lint validation.
- Mobile edge cases still need more real-device coverage, especially around permission prompts, app lifecycle transitions, and long-running sessions.
- Notification reliability is still dependent on device state, platform behavior, and partial backend readiness.

## 6. Beta Readiness Verdict

Secret Run is ready for a controlled closed beta with limited users.

It is not ready for an open or public release. The main operating condition is a controlled environment with real authentication enabled, a limited runner cohort, and close monitoring of run quality, device behavior, and backend workflows.
