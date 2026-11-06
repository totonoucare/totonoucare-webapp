-- AI explanations are private per user, separate from chat quotas.
begin;
create table if not exists public.mimoru_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cache_key text not null check (length(cache_key) = 64),
  kind text not null check (kind in ('constitution', 'forecast')),
  source_event_id uuid references public.diagnosis_events(id) on delete cascade,
  forecast_id uuid references public.radar_forecasts(id) on delete cascade,
  target_date date,
  symptom_focus text not null,
  prompt_version text not null,
  model text not null,
  state text not null default 'pending' check (state in ('pending','ready','failed')),
  generation_token uuid not null,
  lease_until timestamptz not null,
  payload jsonb,
  generation_attempts integer not null default 1 check (generation_attempts between 1 and 3),
  attempts_window_started_at timestamptz not null default now(),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id,cache_key),
  check (state <> 'ready' or (payload is not null and generated_at is not null))
);
create index if not exists mimoru_insights_user_updated_idx on public.mimoru_insights(user_id,updated_at desc);
alter table public.mimoru_insights enable row level security;
revoke all on public.mimoru_insights from anon, authenticated;
grant select on public.mimoru_insights to authenticated;
grant all on public.mimoru_insights to service_role;
drop policy if exists mimoru_insights_read_own on public.mimoru_insights;
create policy mimoru_insights_read_own on public.mimoru_insights for select to authenticated using (auth.uid() = user_id);
commit;

