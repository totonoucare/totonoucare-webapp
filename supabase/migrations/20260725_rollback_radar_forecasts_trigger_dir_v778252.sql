-- v7.78.25.2 / v7.78.26.2 rollback
-- change/noneを保存した行がある場合は意味を失わないよう停止する。

begin;

do $$
declare
  incompatible_rows bigint;
begin
  select count(*)
    into incompatible_rows
  from public.radar_forecasts
  where trigger_dir is not null
    and trigger_dir not in ('up', 'down');

  if incompatible_rows > 0 then
    raise exception
      'rollback stopped: % radar_forecasts rows use change/none; roll back application code and resolve those rows first',
      incompatible_rows;
  end if;
end
$$;

alter table public.radar_forecasts
  drop constraint if exists radar_forecasts_trigger_dir_check;

alter table public.radar_forecasts
  add constraint radar_forecasts_trigger_dir_check
  check (trigger_dir is null or trigger_dir in ('up', 'down'))
  not valid;

alter table public.radar_forecasts
  validate constraint radar_forecasts_trigger_dir_check;

comment on column public.radar_forecasts.trigger_dir is null;

commit;
