begin;

-- live_support会話だけを削除します。期間振り返り会話は残します。
delete from public.records_ai_threads
where thread_kind = 'live_support';

drop index if exists public.records_ai_threads_one_active_live_support_idx;
drop index if exists public.records_ai_threads_user_kind_updated_idx;

alter table public.records_ai_threads
  drop constraint if exists records_ai_threads_thread_kind_check;

alter table public.records_ai_threads
  drop column if exists last_context_date,
  drop column if exists context_summary,
  drop column if exists thread_kind;

commit;
