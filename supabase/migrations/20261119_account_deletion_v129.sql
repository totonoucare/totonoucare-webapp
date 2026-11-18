begin;

-- The marker survives a failed attempt so a retry can continue after Stripe cancellation.
create table if not exists public.account_deletions_v129 (
  user_id uuid primary key references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now()
);
alter table public.account_deletions_v129 enable row level security;
revoke all on public.account_deletions_v129 from public, anon, authenticated;
grant select, insert, update on public.account_deletions_v129 to service_role;

-- Keep the contents of other users' conversations when a former operator leaves.
alter table public.expert_messages_v127 alter column sender drop not null;
alter table public.expert_messages_v127 drop constraint if exists expert_messages_v127_sender_fkey;
alter table public.expert_messages_v127 add constraint expert_messages_v127_sender_fkey
  foreign key(sender) references auth.users(id) on delete set null;

create or replace function public.cleanup_account_v129() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  tbl text;
begin
  if not exists (select 1 from public.account_deletions_v129 where user_id=old.id) then return old; end if;

  -- Older installations have different optional record/notification tables.
  foreach tbl in array array[
    'expert_threads_v127','records_ai_messages','records_ai_analyses','records_ai_threads',
    'records_ai_events','records_ai_consents','records_feature_events','records_feature_interests',
    'app_experience_events','experience_funnel_v126','care_item_click_events','app_feedback',
    'mimoru_insights','user_care_shop_items','notification_logs','push_subscriptions',
    'notification_settings','radar_care_actions','radar_reviews','entitlements'
  ] loop
    if pg_catalog.to_regclass('public.' || tbl) is not null then
      execute pg_catalog.format('delete from public.%I where user_id = $1', tbl) using old.id;
    end if;
  end loop;

  delete from public.radar_care_plans where forecast_id in (select id from public.radar_forecasts where user_id=old.id);
  delete from public.radar_forecasts where user_id=old.id;
  delete from public.radar_locations where user_id=old.id;
  delete from public.constitution_profiles where user_id=old.id;
  delete from public.constitution_events where user_id=old.id;
  delete from public.diagnosis_guest_access where event_id in
    (select id from public.diagnosis_events where user_id=old.id);
  delete from public.guest_experiences_v126 where claimed_by=old.id;
  delete from public.diagnosis_events where user_id=old.id;
  if pg_catalog.to_regclass('public.profiles') is not null then
    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='user_id') then
      delete from public.profiles where user_id=old.id;
    else
      delete from public.profiles where id=old.id;
    end if;
  end if;
  return old;
end $$;
revoke all on function public.cleanup_account_v129() from public, anon, authenticated;
drop trigger if exists cleanup_account_v129 on auth.users;
create trigger cleanup_account_v129 before delete on auth.users
  for each row execute function public.cleanup_account_v129();
commit;
