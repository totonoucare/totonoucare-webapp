-- v7.78.25.2 / v7.78.26.2
-- V2の寒暖差(temp_shift)をtrigger_dir='change'として正しく保存できるようにする。

begin;

do $$
declare
  invalid_rows bigint;
begin
  if to_regclass('public.radar_forecasts') is null then
    raise exception 'public.radar_forecasts does not exist';
  end if;

  select count(*)
    into invalid_rows
  from public.radar_forecasts
  where trigger_dir is not null
    and trigger_dir not in ('up', 'down', 'change', 'none');

  if invalid_rows > 0 then
    raise exception
      'radar_forecasts has % rows with unsupported trigger_dir values',
      invalid_rows;
  end if;
end
$$;

alter table public.radar_forecasts
  drop constraint if exists radar_forecasts_trigger_dir_check;

alter table public.radar_forecasts
  add constraint radar_forecasts_trigger_dir_check
  check (
    trigger_dir is null
    or trigger_dir in ('up', 'down', 'change', 'none')
  )
  not valid;

alter table public.radar_forecasts
  validate constraint radar_forecasts_trigger_dir_check;

comment on column public.radar_forecasts.trigger_dir is
  'Compatibility direction: up/down, temp_shift=change, no dominant event=none. Mixed/steady physical directions remain in computed.forecast_snapshot.';

commit;
