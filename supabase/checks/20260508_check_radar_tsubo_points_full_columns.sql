-- radar_tsubo_points 全カラム確認SQL
-- データ変更はしません。
--
-- 目的:
-- どのツボが入っているか、またseed化に必要な全カラムを確認する。

select
  code,
  name_ja,
  name_en,
  reading_ja,
  body_region,
  point_region,
  illustration_key,
  side_default,
  meridian_code,
  line_group,
  tags_trigger,
  tags_symptom,
  tags_sub,
  tags_keyword,
  base_press_level,
  base_duration_sec,
  base_reps,
  base_breath_cue,
  cautions,
  tcm_actions,
  organ_focus,
  mtest_block,
  mtest_meridian_side,
  mtest_role,
  image_path,
  is_active,
  created_at,
  updated_at
from public.radar_tsubo_points
order by code;
