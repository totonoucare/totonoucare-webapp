begin;
-- Keep the existing validated nine-value constraints; remove the obsolete duplicates.
alter table public.constitution_events drop constraint if exists constitution_events_symptom_focus_chk;
alter table public.profiles drop constraint if exists profiles_symptom_focus_chk;
create table if not exists public.signup_funnel_events (
  event_id uuid primary key,
  visit_id uuid not null,
  event text not null check (event in ('result_view','compat_view','care_view','signup_cta_view','signup_cta_click','signup_view','signup_google_start','signup_email_start','email_code_sent','email_verify_start','auth_success','auth_error','result_save_success','result_save_error','radar_view')),
  source text not null default '' check (source in ('','overview','compat','care','google','email')),
  created_at timestamptz not null default now()
);
alter table public.signup_funnel_events enable row level security;
revoke all on public.signup_funnel_events from anon, authenticated;
create index if not exists signup_funnel_visit_idx on public.signup_funnel_events (visit_id, created_at);
create or replace function public.record_signup_funnel(p_visit uuid,p_id uuid,p_event text,p_source text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_visit::text,0));
  if (select count(*) from public.signup_funnel_events where visit_id=p_visit and created_at > now()-interval '1 day') >= 150 then return; end if;
  insert into public.signup_funnel_events(event_id,visit_id,event,source) values(p_id,p_visit,p_event,p_source) on conflict do nothing;
end; $$;
revoke all on function public.record_signup_funnel(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.record_signup_funnel(uuid,uuid,text,text) to service_role;
commit;
