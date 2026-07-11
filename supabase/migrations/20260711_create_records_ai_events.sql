-- Records / AI MVP telemetry, usage limits, and answer feedback.
-- Apply before enabling production AI usage controls.

create table if not exists public.records_ai_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('analysis_response', 'chat_response', 'feedback')),
  request_id text,
  period_key text,
  source text,
  model text,
  feedback smallint check (feedback in (-1, 1)),
  feedback_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists records_ai_events_user_created_idx
  on public.records_ai_events (user_id, created_at desc);

create index if not exists records_ai_events_user_type_created_idx
  on public.records_ai_events (user_id, event_type, created_at desc);

create unique index if not exists records_ai_events_feedback_request_unique
  on public.records_ai_events (user_id, event_type, request_id)
  where event_type = 'feedback' and request_id is not null;

alter table public.records_ai_events enable row level security;

-- The app writes through server-side service role routes. Users may read their own
-- events later for a usage dashboard, but cannot insert/update events directly.
drop policy if exists records_ai_events_select_own on public.records_ai_events;
create policy records_ai_events_select_own
  on public.records_ai_events
  for select
  to authenticated
  using (auth.uid() = user_id);
