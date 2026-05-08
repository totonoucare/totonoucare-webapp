-- radar_tsubo_points 確認SQL
-- データ変更はしません。

-- 1. 全体件数・有効件数
select
  count(*) as total_points,
  count(*) filter (where is_active = true) as active_points,
  count(*) filter (where is_active = false) as inactive_points
from public.radar_tsubo_points;

-- 2. code / 名前 / 主要タグの一覧
select
  code,
  name_ja,
  reading_ja,
  body_region,
  point_region,
  meridian_code,
  mtest_block,
  mtest_role,
  is_active,
  tags_trigger,
  tags_symptom,
  tags_sub,
  tcm_actions,
  organ_focus,
  image_path,
  updated_at
from public.radar_tsubo_points
order by
  is_active desc,
  meridian_code nulls last,
  code;

-- 3. タグやM-test情報の抜け確認
select
  code,
  name_ja,
  case when coalesce(array_length(tags_trigger, 1), 0) = 0 then true else false end as empty_tags_trigger,
  case when coalesce(array_length(tags_symptom, 1), 0) = 0 then true else false end as empty_tags_symptom,
  case when coalesce(array_length(tcm_actions, 1), 0) = 0 then true else false end as empty_tcm_actions,
  case when coalesce(array_length(organ_focus, 1), 0) = 0 then true else false end as empty_organ_focus,
  case when mtest_block is null or mtest_block = '' then true else false end as empty_mtest_block
from public.radar_tsubo_points
where
  coalesce(array_length(tags_trigger, 1), 0) = 0
  or coalesce(array_length(tags_symptom, 1), 0) = 0
  or coalesce(array_length(tcm_actions, 1), 0) = 0
  or coalesce(array_length(organ_focus, 1), 0) = 0
  or mtest_block is null
  or mtest_block = ''
order by code;

-- 4. トリガー別件数
select
  trigger_tag,
  count(*) as point_count
from public.radar_tsubo_points p
cross join unnest(p.tags_trigger) as trigger_tag
group by trigger_tag
order by point_count desc, trigger_tag;

-- 5. 症状タグ別件数
select
  symptom_tag,
  count(*) as point_count
from public.radar_tsubo_points p
cross join unnest(p.tags_symptom) as symptom_tag
group by symptom_tag
order by point_count desc, symptom_tag;

-- 6. M-test block別件数
select
  mtest_block,
  count(*) as point_count
from public.radar_tsubo_points
group by mtest_block
order by point_count desc, mtest_block;
