ALTER TABLE public.event_routes
ADD COLUMN IF NOT EXISTS distance_m numeric(10,2),
ADD COLUMN IF NOT EXISTS duration_sec integer;
