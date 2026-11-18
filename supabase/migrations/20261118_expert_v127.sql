begin;
create table if not exists public.expert_threads_v127 (
  id uuid primary key default gen_random_uuid(),
  space text not null check (space in ('test','live')),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  turns smallint not null default 1 check (turns between 1 and 4)
);
create index if not exists expert_month_v127 on public.expert_threads_v127(space,user_id,created_at);
create index if not exists expert_queue_v127 on public.expert_threads_v127(space,updated_at desc);
create table if not exists public.expert_messages_v127 (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.expert_threads_v127(id) on delete cascade,
  sender uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  turn smallint not null check(turn between 1 and 4),
  body text not null check(char_length(trim(body)) between 1 and 1600),
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  unique(sender,request_id), unique(thread_id,turn)
);
create index if not exists expert_notice_v127 on public.expert_messages_v127(created_at) where notified_at is null and turn in (1,3);
alter table public.expert_threads_v127 enable row level security;
alter table public.expert_messages_v127 enable row level security;
revoke all on public.expert_threads_v127, public.expert_messages_v127 from public,anon,authenticated;
grant select,insert,update,delete on public.expert_threads_v127, public.expert_messages_v127 to service_role;

-- Only the authenticated server endpoint supplies actor, entitlement and operator role.
create or replace function public.expert_send_v127(p_space text,p_actor uuid,p_staff boolean,p_paid boolean,p_thread uuid,p_request uuid,p_body text,p_expected integer)
returns uuid language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  t public.expert_threads_v127;
  prior public.expert_messages_v127;
  month_start timestamptz := date_trunc('month',now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo';
  n smallint;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_actor::text,127));
  select * into prior from public.expert_messages_v127 where sender=p_actor and request_id=p_request;
  if found then
    select * into t from public.expert_threads_v127 where id=prior.thread_id;
    if t.space=p_space and prior.body=p_body and ((p_thread is null and prior.turn=1) or t.id=p_thread) then return t.id; end if;
    raise exception 'duplicate_request';
  end if;
  if p_thread is null then
    if not p_paid or p_staff then raise exception 'paid_required'; end if;
    if (select count(*) from public.expert_threads_v127 where space=p_space and user_id=p_actor and created_at>=month_start) >= 2 then raise exception 'month_limit'; end if;
    insert into public.expert_threads_v127(space,user_id) values(p_space,p_actor) returning * into t;
    n:=1;
  else
    select * into t from public.expert_threads_v127 where id=p_thread and space=p_space for update;
    if not found or (not p_staff and t.user_id<>p_actor) then raise exception 'thread_missing'; end if;
    n:=t.turns+1;
    if p_expected is distinct from t.turns or n>4 or p_staff<>(n in (2,4)) then raise exception 'turn_conflict'; end if;
    update public.expert_threads_v127 set turns=n,updated_at=now() where id=t.id;
  end if;
  insert into public.expert_messages_v127(thread_id,sender,request_id,turn,body) values(t.id,p_actor,p_request,n,p_body);
  return t.id;
end $$;
revoke all on function public.expert_send_v127(text,uuid,boolean,boolean,uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.expert_send_v127(text,uuid,boolean,boolean,uuid,uuid,text,integer) to service_role;
commit;
