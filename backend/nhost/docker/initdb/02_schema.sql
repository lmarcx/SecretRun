-- Apply project SQL migrations during first Postgres initialization.
-- This creates the full schema before Hasura metadata is applied.
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

\i /migrations/202603050001_init.sql
\i /migrations/202603050002_event_routes_metrics.sql
\i /migrations/202603050003_activity_trackpoints_seq_speed.sql
\i /migrations/202603050004_activities_suspected_vehicle.sql
\i /migrations/202603050005_wallet_transaction_types.sql
\i /migrations/202603050006_events_team_id.sql
\i /migrations/202603050007_activity_feed.sql
\i /migrations/202603050008_push_notifications.sql
\i /migrations/202603050009_events_access_rules.sql
\i /migrations/202603050010_friend_block_system.sql
\i /migrations/202603190001_activity_scoring_transaction.sql
