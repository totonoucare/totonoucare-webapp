-- v7.72.2 verification
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.records_feature_events'::regclass
  and contype = 'c'
order by conname;

select event_type, count(*) as event_count
from public.records_feature_events
where event_type = 'live_support_opened'
group by event_type;
