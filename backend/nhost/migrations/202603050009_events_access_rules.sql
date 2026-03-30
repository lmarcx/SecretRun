ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS max_participants integer;

ALTER TABLE public.events
DROP CONSTRAINT IF EXISTS events_max_participants_check;

ALTER TABLE public.events
ADD CONSTRAINT events_max_participants_check
CHECK (max_participants IS NULL OR max_participants > 0);

CREATE OR REPLACE FUNCTION public.enforce_event_participant_rules()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  ev RECORD;
  current_count integer;
  is_team_member boolean;
BEGIN
  SELECT e.id, e.team_id, e.max_participants
  INTO ev
  FROM public.events e
  WHERE e.id = NEW.event_id;

  IF ev.id IS NULL THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF ev.max_participants IS NOT NULL THEN
    SELECT COUNT(*)
    INTO current_count
    FROM public.event_participants ep
    WHERE ep.event_id = NEW.event_id;

    IF current_count >= ev.max_participants THEN
      RAISE EXCEPTION 'Event is full';
    END IF;
  END IF;

  IF ev.team_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.team_members tm
      WHERE tm.team_id = ev.team_id
      AND tm.user_id = NEW.user_id
    )
    INTO is_team_member;

    IF NOT is_team_member THEN
      RAISE EXCEPTION 'Only team members can join this team event';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_participant_rules ON public.event_participants;
CREATE TRIGGER trg_event_participant_rules
BEFORE INSERT ON public.event_participants
FOR EACH ROW
EXECUTE FUNCTION public.enforce_event_participant_rules();
