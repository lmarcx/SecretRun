DROP TABLE IF EXISTS public.friendships CASCADE;

CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friendships_requester_addressee_diff CHECK (requester_id <> addressee_id)
);

CREATE UNIQUE INDEX friendships_unique_direction_non_cancelled
ON public.friendships(requester_id, addressee_id)
WHERE status <> 'cancelled';

CREATE UNIQUE INDEX friendships_unique_pair_active
ON public.friendships(
  LEAST(requester_id, addressee_id),
  GREATEST(requester_id, addressee_id)
)
WHERE status IN ('pending', 'accepted');

CREATE INDEX idx_friendships_requester_status
ON public.friendships(requester_id, status);

CREATE INDEX idx_friendships_addressee_status
ON public.friendships(addressee_id, status);

CREATE OR REPLACE FUNCTION public.set_friendship_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_friendship_updated_at ON public.friendships;
CREATE TRIGGER trg_friendship_updated_at
BEFORE UPDATE ON public.friendships
FOR EACH ROW
EXECUTE FUNCTION public.set_friendship_updated_at();

CREATE TABLE IF NOT EXISTS public.blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blocks_blocker_blocked_diff CHECK (blocker_id <> blocked_id),
  CONSTRAINT blocks_unique_pair UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id
ON public.blocks(blocker_id);

CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id
ON public.blocks(blocked_id);

CREATE OR REPLACE FUNCTION public.prevent_blocked_activity_comments()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  owner_id uuid;
  blocked_exists boolean;
BEGIN
  SELECT a.user_id INTO owner_id
  FROM public.activities a
  WHERE a.id = NEW.activity_id;

  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'Activity not found';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.blocks b
    WHERE (b.blocker_id = NEW.user_id AND b.blocked_id = owner_id)
       OR (b.blocker_id = owner_id AND b.blocked_id = NEW.user_id)
  ) INTO blocked_exists;

  IF blocked_exists THEN
    RAISE EXCEPTION 'Cannot comment due to block relation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_blocked_activity_comments ON public.activity_comments;
CREATE TRIGGER trg_prevent_blocked_activity_comments
BEFORE INSERT ON public.activity_comments
FOR EACH ROW
EXECUTE FUNCTION public.prevent_blocked_activity_comments();
