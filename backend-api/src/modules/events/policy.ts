import { AppError } from '../../lib/errors';

export interface EventAccessSnapshot {
  id: string;
  reveal_at: string;
  starts_at: string;
  ends_at: string | null;
  start_area_center?: unknown;
  start_area_radius_km?: number | string | null;
}

type EventAction = 'join' | 'start' | 'finish';

export function assertEventWindow(event: EventAccessSnapshot, action: EventAction, now = new Date()) {
  const nowMs = now.getTime();
  const revealAtMs = new Date(event.reveal_at).getTime();
  const startsAtMs = new Date(event.starts_at).getTime();
  const endsAtMs = event.ends_at ? new Date(event.ends_at).getTime() : null;

  if (Number.isNaN(revealAtMs) || Number.isNaN(startsAtMs) || (endsAtMs !== null && Number.isNaN(endsAtMs))) {
    throw new AppError(500, 'invalid_event_schedule', 'This event has an invalid schedule configuration.');
  }

  if (action === 'join') {
    if (nowMs < revealAtMs) {
      throw new AppError(403, 'event_not_revealed', 'This event is not open for joining yet.');
    }

    if (nowMs >= startsAtMs) {
      throw new AppError(409, 'event_join_closed', 'This event is no longer open for joining.');
    }

    if (endsAtMs !== null && nowMs > endsAtMs) {
      throw new AppError(409, 'event_finished', 'This event has already finished.');
    }

    return;
  }

  if (nowMs < revealAtMs) {
    throw new AppError(403, 'event_not_revealed', 'This event is not revealed yet.');
  }

  if (nowMs < startsAtMs) {
    throw new AppError(409, 'event_not_started', 'This event has not started yet.');
  }

  if (endsAtMs !== null && nowMs > endsAtMs) {
    throw new AppError(409, 'event_finished', 'This event has already finished.');
  }
}
