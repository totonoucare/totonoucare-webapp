-- v7.79.73: Supabase SQL Editorで一度実行。既存データを変更しません。
create table if not exists public.app_experience_events (
 user_id uuid not null references auth.users(id) on delete cascade,
 event_key text not null check (char_length(event_key) <= 100),
 payload jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 primary key(user_id,event_key)
);
alter table public.app_experience_events enable row level security;
revoke all on public.app_experience_events from anon, authenticated;
grant select, insert on public.app_experience_events to service_role;
