-- Production note:
-- RLS only protects Hasura traffic if Hasura connects with a non-superuser Postgres role.
-- If Hasura connects as `postgres` or another role with BYPASSRLS, these policies are bypassed.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.current_hasura_claim(claim_key text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  WITH claims AS (
    SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::jsonb AS payload
  )
  SELECT COALESCE(
    payload ->> claim_key,
    payload #>> ARRAY['https://hasura.io/jwt/claims', claim_key]
  )
  FROM claims;
$$;

CREATE OR REPLACE FUNCTION public.current_hasura_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(public.current_hasura_claim('x-hasura-user-id'), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.current_hasura_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(public.current_hasura_claim('x-hasura-role'), ''), 'anonymous');
$$;

CREATE OR REPLACE FUNCTION public.is_admin_session()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.current_hasura_role() = 'admin';
$$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_id uuid GENERATED ALWAYS AS (id) STORED;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS start_date timestamptz GENERATED ALWAYS AS (starts_at) STORED,
  ADD COLUMN IF NOT EXISTS end_date timestamptz GENERATED ALWAYS AS (ends_at) STORED,
  ADD COLUMN IF NOT EXISTS is_public boolean GENERATED ALWAYS AS ((NOT COALESCE(is_private, false))) STORED;

CREATE TABLE IF NOT EXISTS public.runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  distance numeric(10,3) NOT NULL CHECK (distance >= 0),
  duration integer NOT NULL CHECK (duration >= 0),
  route geometry(LineString, 4326) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leaderboard_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score numeric(12,3) NOT NULL DEFAULT 0,
  rank integer,
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_events_is_public_starts_at ON public.events (is_public, starts_at);
CREATE INDEX IF NOT EXISTS idx_runs_user_created_at ON public.runs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_event_created_at ON public.runs (event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_route_gist ON public.runs USING GIST (route);
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_event_rank ON public.leaderboard_cache (event_id, rank ASC, score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_user_event ON public.leaderboard_cache (user_id, event_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select_public ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own_or_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own_or_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_admin_only ON public.profiles;

CREATE POLICY profiles_select_public
ON public.profiles
FOR SELECT
USING (true);

CREATE POLICY profiles_insert_own_or_admin
ON public.profiles
FOR INSERT
WITH CHECK (
  public.is_admin_session()
  OR id = public.current_hasura_user_id()
);

CREATE POLICY profiles_update_own_or_admin
ON public.profiles
FOR UPDATE
USING (
  public.is_admin_session()
  OR user_id = public.current_hasura_user_id()
)
WITH CHECK (
  public.is_admin_session()
  OR user_id = public.current_hasura_user_id()
);

CREATE POLICY profiles_delete_admin_only
ON public.profiles
FOR DELETE
USING (public.is_admin_session());

DROP POLICY IF EXISTS events_select_public ON public.events;
DROP POLICY IF EXISTS events_insert_admin_only ON public.events;
DROP POLICY IF EXISTS events_update_admin_only ON public.events;
DROP POLICY IF EXISTS events_delete_admin_only ON public.events;

CREATE POLICY events_select_public
ON public.events
FOR SELECT
USING (
  public.is_admin_session()
  OR is_public = true
);

CREATE POLICY events_insert_admin_only
ON public.events
FOR INSERT
WITH CHECK (public.is_admin_session());

CREATE POLICY events_update_admin_only
ON public.events
FOR UPDATE
USING (public.is_admin_session())
WITH CHECK (public.is_admin_session());

CREATE POLICY events_delete_admin_only
ON public.events
FOR DELETE
USING (public.is_admin_session());

DROP POLICY IF EXISTS runs_select_visible ON public.runs;
DROP POLICY IF EXISTS runs_insert_self_or_admin ON public.runs;
DROP POLICY IF EXISTS runs_update_admin_only ON public.runs;
DROP POLICY IF EXISTS runs_delete_admin_only ON public.runs;

CREATE POLICY runs_select_visible
ON public.runs
FOR SELECT
USING (
  public.is_admin_session()
  OR user_id = public.current_hasura_user_id()
  OR EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = runs.event_id
    AND e.is_public = true
  )
);

CREATE POLICY runs_insert_self_or_admin
ON public.runs
FOR INSERT
WITH CHECK (
  public.is_admin_session()
  OR user_id = public.current_hasura_user_id()
);

CREATE POLICY runs_update_admin_only
ON public.runs
FOR UPDATE
USING (public.is_admin_session())
WITH CHECK (public.is_admin_session());

CREATE POLICY runs_delete_admin_only
ON public.runs
FOR DELETE
USING (public.is_admin_session());

DROP POLICY IF EXISTS leaderboard_cache_select_public ON public.leaderboard_cache;
DROP POLICY IF EXISTS leaderboard_cache_insert_admin_only ON public.leaderboard_cache;
DROP POLICY IF EXISTS leaderboard_cache_update_admin_only ON public.leaderboard_cache;
DROP POLICY IF EXISTS leaderboard_cache_delete_admin_only ON public.leaderboard_cache;

CREATE POLICY leaderboard_cache_select_public
ON public.leaderboard_cache
FOR SELECT
USING (true);

CREATE POLICY leaderboard_cache_insert_admin_only
ON public.leaderboard_cache
FOR INSERT
WITH CHECK (public.is_admin_session());

CREATE POLICY leaderboard_cache_update_admin_only
ON public.leaderboard_cache
FOR UPDATE
USING (public.is_admin_session())
WITH CHECK (public.is_admin_session());

CREATE POLICY leaderboard_cache_delete_admin_only
ON public.leaderboard_cache
FOR DELETE
USING (public.is_admin_session());
