-- Run after the two v7.79.29 migrations. Expected result: all rows are true.

select
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.constitution_events'::regclass
      and conname = 'constitution_events_symptom_focus_check'
      and pg_get_constraintdef(oid) like '%digestion%'
  ) as constitution_events_accepts_digestion,
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_symptom_focus_default_check'
      and pg_get_constraintdef(oid) like '%digestion%'
  ) as profiles_accepts_digestion,
  to_regclass('public.api_rate_limits') is not null as rate_limit_table_exists,
  to_regprocedure(
    'public.consume_api_rate_limit(text,text,integer,integer)'
  ) is not null as rate_limit_function_exists;
