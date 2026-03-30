CREATE TABLE IF NOT EXISTS public.activity_score_applications (
  activity_id uuid PRIMARY KEY REFERENCES public.activities(id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  user_points integer NOT NULL,
  team_points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_score_applications_user_id
ON public.activity_score_applications(user_id);

CREATE INDEX IF NOT EXISTS idx_activity_score_applications_team_id
ON public.activity_score_applications(team_id);

CREATE OR REPLACE FUNCTION public.finalize_validated_activity(
  _activity_id uuid,
  _finished_at timestamptz,
  _distance_km numeric,
  _duration_seconds integer,
  _avg_speed_kmh numeric,
  _points integer,
  _team_bonus_points integer DEFAULT 5
)
RETURNS SETOF public.activity_score_applications
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  v_activity public.activities%ROWTYPE;
  v_existing public.activity_score_applications%ROWTYPE;
  v_season_id uuid;
  v_event_team_id uuid;
  v_team_id uuid;
  v_team_points integer;
  v_wallet_id uuid;
BEGIN
  SELECT *
  INTO v_activity
  FROM public.activities
  WHERE id = _activity_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Activity not found';
  END IF;

  SELECT *
  INTO v_existing
  FROM public.activity_score_applications
  WHERE activity_id = _activity_id;

  IF FOUND THEN
    RETURN QUERY
    SELECT *
    FROM public.activity_score_applications
    WHERE activity_id = _activity_id;
    RETURN;
  END IF;

  IF v_activity.status <> 'pending' AND v_activity.status <> 'validated' THEN
    RAISE EXCEPTION 'Only pending or validated activities can be finalized';
  END IF;

  SELECT id
  INTO v_season_id
  FROM public.seasons
  WHERE is_active = true
  ORDER BY starts_at DESC
  LIMIT 1;

  IF v_season_id IS NULL THEN
    RAISE EXCEPTION 'No active season found';
  END IF;

  SELECT team_id
  INTO v_event_team_id
  FROM public.events
  WHERE id = v_activity.event_id;

  SELECT COALESCE(
    v_event_team_id,
    (
      SELECT tm.team_id
      FROM public.team_members tm
      WHERE tm.user_id = v_activity.user_id
      ORDER BY tm.joined_at ASC
      LIMIT 1
    )
  )
  INTO v_team_id;

  v_team_points := _points + CASE WHEN v_event_team_id IS NOT NULL THEN _team_bonus_points ELSE 0 END;

  UPDATE public.activities
  SET
    status = 'validated',
    distance_km = _distance_km,
    duration_seconds = _duration_seconds,
    avg_speed_kmh = _avg_speed_kmh,
    points = _points,
    finished_at = _finished_at
  WHERE id = _activity_id;

  INSERT INTO public.activity_score_applications (
    activity_id,
    season_id,
    user_id,
    team_id,
    user_points,
    team_points
  ) VALUES (
    _activity_id,
    v_season_id,
    v_activity.user_id,
    v_team_id,
    _points,
    CASE WHEN v_team_id IS NULL THEN 0 ELSE v_team_points END
  );

  INSERT INTO public.wallets (user_id, balance, updated_at)
  VALUES (v_activity.user_id, 0, now())
  ON CONFLICT (user_id) DO UPDATE
  SET updated_at = EXCLUDED.updated_at
  RETURNING id
  INTO v_wallet_id;

  INSERT INTO public.wallet_ledger (
    wallet_id,
    delta,
    reason,
    transaction_type,
    reference_key,
    metadata
  ) VALUES (
    v_wallet_id,
    _points,
    format('activity:%s:validation', _activity_id),
    'run_validation_reward',
    format('run_validation:%s', _activity_id),
    jsonb_build_object(
      'activity_id', _activity_id,
      'season_id', v_season_id,
      'team_id', v_team_id,
      'user_points', _points,
      'team_points', CASE WHEN v_team_id IS NULL THEN 0 ELSE v_team_points END
    )
  )
  ON CONFLICT (reference_key) WHERE reference_key IS NOT NULL DO NOTHING;

  UPDATE public.wallets
  SET
    balance = balance + _points,
    updated_at = now()
  WHERE id = v_wallet_id;

  INSERT INTO public.leaderboard_user_season (
    season_id,
    user_id,
    points,
    updated_at
  ) VALUES (
    v_season_id,
    v_activity.user_id,
    _points,
    now()
  )
  ON CONFLICT (season_id, user_id) DO UPDATE
  SET
    points = public.leaderboard_user_season.points + EXCLUDED.points,
    updated_at = now();

  IF v_team_id IS NOT NULL THEN
    INSERT INTO public.leaderboard_team_season (
      season_id,
      team_id,
      points,
      updated_at
    ) VALUES (
      v_season_id,
      v_team_id,
      v_team_points,
      now()
    )
    ON CONFLICT (season_id, team_id) DO UPDATE
    SET
      points = public.leaderboard_team_season.points + EXCLUDED.points,
      updated_at = now();
  END IF;

  WITH ranked_users AS (
    SELECT
      season_id,
      user_id,
      ROW_NUMBER() OVER (
        PARTITION BY season_id
        ORDER BY points DESC, updated_at ASC, user_id ASC
      ) AS next_rank
    FROM public.leaderboard_user_season
    WHERE season_id = v_season_id
  )
  UPDATE public.leaderboard_user_season lus
  SET
    rank = ranked_users.next_rank,
    updated_at = now()
  FROM ranked_users
  WHERE
    lus.season_id = ranked_users.season_id
    AND lus.user_id = ranked_users.user_id;

  WITH ranked_teams AS (
    SELECT
      season_id,
      team_id,
      ROW_NUMBER() OVER (
        PARTITION BY season_id
        ORDER BY points DESC, updated_at ASC, team_id ASC
      ) AS next_rank
    FROM public.leaderboard_team_season
    WHERE season_id = v_season_id
  )
  UPDATE public.leaderboard_team_season lts
  SET
    rank = ranked_teams.next_rank,
    updated_at = now()
  FROM ranked_teams
  WHERE
    lts.season_id = ranked_teams.season_id
    AND lts.team_id = ranked_teams.team_id;

  RETURN QUERY
  SELECT *
  FROM public.activity_score_applications
  WHERE activity_id = _activity_id;
END;
$$;
