INSERT INTO public.seasons (id, name, starts_at, ends_at, is_active)
VALUES (
  gen_random_uuid(),
  'Season 1',
  now() - interval '7 days',
  now() + interval '90 days',
  true
)
ON CONFLICT (name) DO NOTHING;
