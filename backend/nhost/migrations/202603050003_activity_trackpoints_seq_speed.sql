ALTER TABLE public.activity_trackpoints
ADD COLUMN IF NOT EXISTS seq integer,
ADD COLUMN IF NOT EXISTS speed_mps numeric(10,3);

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY activity_id ORDER BY recorded_at, id) AS rn
  FROM public.activity_trackpoints
)
UPDATE public.activity_trackpoints t
SET seq = r.rn
FROM ranked r
WHERE t.id = r.id
AND t.seq IS NULL;

ALTER TABLE public.activity_trackpoints
ALTER COLUMN seq SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_trackpoints_activity_seq
ON public.activity_trackpoints(activity_id, seq);
