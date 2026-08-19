-- v7.79.29
-- Shared rate limits for unauthenticated endpoints. Raw IP addresses are not
-- stored: the application supplies a one-way SHA-256 identity hash.

begin;

create table if not exists public.api_rate_limits (
  route text not null check (char_length(route) between 1 and 120),
  key_hash text not null check (char_length(key_hash) = 64),
  window_start timestamptz not null,
  request_count integer not null default 1 check (request_count >= 1),
  expires_at timestamptz not null,
  primary key (route, key_hash, window_start)
);

create index if not exists api_rate_limits_expires_at_idx
  on public.api_rate_limits (expires_at);

alter table public.api_rate_limits enable row level security;
revoke all on table public.api_rate_limits from public, anon, authenticated;

create or replace function public.consume_api_rate_limit(
  p_route text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_limit integer := greatest(1, least(coalesce(p_limit, 1), 10000));
  v_window integer := greatest(1, least(coalesce(p_window_seconds, 60), 86400));
  v_window_start timestamptz;
  v_count integer;
begin
  if p_route is null or char_length(p_route) < 1 or char_length(p_route) > 120 then
    raise exception 'invalid rate-limit route';
  end if;
  if p_key_hash is null or char_length(p_key_hash) <> 64 then
    raise exception 'invalid rate-limit key hash';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from v_now) / v_window) * v_window
  );

  insert into public.api_rate_limits (
    route,
    key_hash,
    window_start,
    request_count,
    expires_at
  ) values (
    p_route,
    p_key_hash,
    v_window_start,
    1,
    v_window_start + make_interval(secs => v_window * 2)
  )
  on conflict (route, key_hash, window_start)
  do update set
    request_count = public.api_rate_limits.request_count + 1,
    expires_at = excluded.expires_at
  returning request_count into v_count;

  -- Opportunistic bounded cleanup keeps the table small without a separate job.
  if random() < 0.02 then
    delete from public.api_rate_limits
    where ctid in (
      select ctid
      from public.api_rate_limits
      where expires_at < v_now
      limit 500
    );
  end if;

  allowed := v_count <= v_limit;
  remaining := greatest(0, v_limit - v_count);
  retry_after_seconds := greatest(
    1,
    ceil(extract(epoch from (v_window_start + make_interval(secs => v_window) - v_now)))::integer
  );
  return next;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, text, integer, integer)
  to service_role;

commit;
