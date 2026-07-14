-- Roll back only the v7.72.2 feature-event allowance.
delete from public.records_feature_events where event_type = 'live_support_opened';

do $$
declare constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.records_feature_events'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%event_type%'
  loop
    execute format('alter table public.records_feature_events drop constraint %I', constraint_name);
  end loop;

  alter table public.records_feature_events
    add constraint records_feature_events_event_type_check
    check (event_type in (
      'records_page_view',
      'record_saved',
      'analysis_opened',
      'analysis_period_selected',
      'chat_started',
      'expert_interest'
    ));
end $$;
