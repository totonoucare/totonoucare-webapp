-- v7.78.25: remove data models that no longer have an application route.
-- This migration is intentionally destructive. The project owner confirmed that
-- only a test account exists and that legacy data does not need to be retained.

drop table if exists public.personal_karte_reports cascade;
drop table if exists public.personal_karte_unlocks cascade;
drop table if exists public.weekly_ai_reports cascade;
drop table if exists public.daily_care_logs cascade;
drop table if exists public.daily_checkins cascade;
drop table if exists public.care_cards cascade;
drop table if exists public.radar_tsubo_cards cascade;

alter table if exists public.radar_forecasts
  drop column if exists gpt_summary,
  drop column if exists gpt_model,
  drop column if exists gpt_generated_at;
