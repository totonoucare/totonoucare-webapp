begin;

alter table public.records_ai_threads
  add column if not exists thread_kind text not null default 'period_review';

alter table public.records_ai_threads
  add column if not exists context_summary jsonb not null default '{}'::jsonb;

alter table public.records_ai_threads
  add column if not exists last_context_date date;

update public.records_ai_threads
set thread_kind = 'period_review'
where thread_kind is null or thread_kind = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.records_ai_threads'::regclass
      and conname = 'records_ai_threads_thread_kind_check'
  ) then
    alter table public.records_ai_threads
      add constraint records_ai_threads_thread_kind_check
      check (thread_kind in ('period_review', 'live_support'));
  end if;
end $$;

create index if not exists records_ai_threads_user_kind_updated_idx
  on public.records_ai_threads (user_id, thread_kind, updated_at desc);

create unique index if not exists records_ai_threads_one_active_live_support_idx
  on public.records_ai_threads (user_id, thread_kind)
  where status = 'active' and thread_kind = 'live_support';

comment on column public.records_ai_threads.thread_kind is
  'period_review: 選択期間の振り返り会話 / live_support: 今の体調を相談するEKIKEN会話';
comment on column public.records_ai_threads.context_summary is
  '長い会話を将来要約するための構造化領域。AIの仮説とユーザー事実を混同しない。';
comment on column public.records_ai_threads.last_context_date is
  'live_supportで最後に今日のアプリ文脈を読み込んだJST対象日。';

commit;
