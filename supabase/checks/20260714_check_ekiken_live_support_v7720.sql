select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'records_ai_threads'
  and column_name in ('thread_kind', 'context_summary', 'last_context_date')
order by column_name;

select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'records_ai_threads'
  and indexname in (
    'records_ai_threads_user_kind_updated_idx',
    'records_ai_threads_one_active_live_support_idx'
  )
order by indexname;

select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.records_ai_threads'::regclass
  and conname = 'records_ai_threads_thread_kind_check';
