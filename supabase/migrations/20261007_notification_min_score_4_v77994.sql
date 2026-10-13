-- Supabase SQL Editor: deploy v7.79.94 first, then run this entire SQL.
-- Changes only the old default (6) / unset threshold and the column default.
-- Notification enabled flags, delivery times and existing logs are preserved.
-- Reentrant: a second execution reports updated_settings = 0.
BEGIN;

ALTER TABLE public.notification_settings
  ALTER COLUMN min_score SET DEFAULT 4;

WITH changed AS (
  UPDATE public.notification_settings
  SET min_score = 4,
      updated_at = now()
  WHERE min_score = 6 OR min_score IS NULL
  RETURNING user_id
)
SELECT count(*) AS updated_settings FROM changed;

COMMIT;
