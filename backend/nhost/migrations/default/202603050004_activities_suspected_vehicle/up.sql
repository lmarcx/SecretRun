ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS suspected_vehicle boolean NOT NULL DEFAULT false;
