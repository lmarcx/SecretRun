DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_job_status') THEN
    CREATE TYPE public.notification_job_status AS ENUM ('pending', 'sent', 'failed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_devices (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  push_token text NOT NULL,
  platform text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, push_token)
);

CREATE TABLE IF NOT EXISTS public.notification_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.notification_job_status NOT NULL DEFAULT 'pending',
  error text,
  reference_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON public.user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_jobs_status_created_at ON public.notification_jobs(status, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_jobs_reference_key ON public.notification_jobs(reference_key);

CREATE OR REPLACE FUNCTION public.enqueue_event_reveal_notifications()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.revealed = true AND (OLD.revealed IS DISTINCT FROM true) THEN
    INSERT INTO public.notification_jobs (user_id, title, body, data, reference_key)
    SELECT
      ep.user_id,
      'Your secret run route is revealed',
      'Open Secret Run to view your route.',
      jsonb_build_object('type', 'event_reveal', 'event_id', NEW.event_id),
      'event-reveal:' || NEW.event_id::text || ':' || ep.user_id::text
    FROM public.event_participants ep
    WHERE ep.event_id = NEW.event_id
    ON CONFLICT (reference_key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_routes_revealed_notification ON public.event_routes;
CREATE TRIGGER trg_event_routes_revealed_notification
AFTER UPDATE OF revealed ON public.event_routes
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_event_reveal_notifications();

CREATE OR REPLACE FUNCTION public.enqueue_activity_comment_notification()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  owner_id uuid;
BEGIN
  SELECT a.user_id INTO owner_id
  FROM public.activities a
  WHERE a.id = NEW.activity_id;

  IF owner_id IS NOT NULL AND owner_id <> NEW.user_id THEN
    INSERT INTO public.notification_jobs (user_id, title, body, data, reference_key)
    VALUES (
      owner_id,
      'New comment on your activity',
      'Someone commented on your run.',
      jsonb_build_object('type', 'activity_comment', 'activity_id', NEW.activity_id, 'comment_id', NEW.id),
      'activity-comment:' || NEW.id::text || ':' || owner_id::text
    )
    ON CONFLICT (reference_key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activity_comment_notification ON public.activity_comments;
CREATE TRIGGER trg_activity_comment_notification
AFTER INSERT ON public.activity_comments
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_activity_comment_notification();
