# Secret Run Closed Beta Launch Checklist

## Purpose

Use this checklist during real-device beta sessions to confirm the core MVP loop and the new Sprint 9 diagnostics surface.

## Before Testing

- [ ] Install a build that shows the closed beta banner and build label.
- [ ] Confirm the tester is using a real beta account when auth-backed behavior is expected.
- [ ] Confirm the device has location permissions enabled.
- [ ] Confirm the device has network access.
- [ ] Confirm the tester knows where to find the `Profile > Beta support` card.

## Event Join

- [ ] Open an event detail screen.
- [ ] Join the event with a signed-in beta account.
- [ ] Confirm the UI shows the joined state without refresh confusion.
- [ ] If joining fails, capture:
  - current screen
  - build label
  - beta account state

## Valid Run

- [ ] Start a run from a joined event.
- [ ] Complete a run above the minimum duration and distance thresholds.
- [ ] Confirm the run result reaches `completed`.
- [ ] Confirm sync finishes without a blocking error.
- [ ] Confirm the `Profile > Beta support` card shows:
  - last run sync state
  - activity ID
  - accepted/rejected trackpoint counts

## Invalid Run

- [ ] Start a run from a joined event.
- [ ] Finish before the minimum duration or distance.
- [ ] Confirm the run is kept local and clearly marked invalid.
- [ ] Confirm no leaderboard scoring is shown for that attempt.

## Backend Rejection

- [ ] If a completed run is rejected after backend review, confirm the app shows a human-readable rejection reason.
- [ ] Confirm the `Profile > Beta support` card shows the last validation note.
- [ ] Capture the activity ID before escalating to backend review.

## Leaderboard

- [ ] After a valid run sync, open the leaderboard.
- [ ] Confirm the user score updates after validation completes.
- [ ] If the leaderboard does not update, capture:
  - activity ID
  - current screen
  - build label
  - last run sync state

## Notification Registration

- [ ] Open Profile.
- [ ] Review the notification card.
- [ ] Confirm the app clearly distinguishes:
  - device unsupported
  - signed out
  - build not ready
  - ready
  - registered
- [ ] If registration fails, capture the notification state shown in `Beta support`.

## Issue Reporting

- [ ] Use the `Report beta issue` entry point from Profile when a blocker occurs.
- [ ] Include a short human description of what happened.
- [ ] Include whether the issue happened during:
  - event join
  - run start
  - run finish
  - sync
  - leaderboard review
  - notification setup
