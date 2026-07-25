-- 制約定義
select
  c.conname,
  pg_get_constraintdef(c.oid) as definition,
  c.convalidated
from pg_constraint c
where c.conrelid = 'public.radar_forecasts'::regclass
  and c.conname = 'radar_forecasts_trigger_dir_check';

-- 保存済み値の分布
select trigger_dir, count(*) as rows
from public.radar_forecasts
group by trigger_dir
order by trigger_dir nulls first;

-- 新しい制約外の値は0件であること
select count(*) as unsupported_rows
from public.radar_forecasts
where trigger_dir is not null
  and trigger_dir not in ('up', 'down', 'change', 'none');

-- 寒暖差行はV2スナップショットにもtemp_shiftが残ること
select
  id,
  target_date,
  main_trigger,
  trigger_dir,
  computed #>> '{forecast_snapshot,personal_main_trigger_exact}' as exact_trigger
from public.radar_forecasts
where main_trigger = 'temp'
  and trigger_dir = 'change'
order by target_date desc
limit 20;
