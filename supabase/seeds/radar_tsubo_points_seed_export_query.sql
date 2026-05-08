-- radar_tsubo_points を seed SQL として保存するための INSERT 文生成SQL
-- データ変更はしません。
--
-- 使い方:
-- 1. Supabase SQL EditorでこのSQLを実行
-- 2. 結果の insert_sql 列をコピー
-- 3. `supabase/seeds/radar_tsubo_points_seed.sql` に保存

select
  'insert into public.radar_tsubo_points (' ||
  'code, name_ja, name_en, body_region, illustration_key, side_default, meridian_code, line_group, ' ||
  'tags_trigger, tags_symptom, tags_sub, tags_keyword, base_press_level, base_duration_sec, base_reps, ' ||
  'base_breath_cue, cautions, is_active, image_path, tcm_actions, organ_focus, point_region, ' ||
  'mtest_block, mtest_meridian_side, mtest_role, reading_ja' ||
  ') values (' ||
  quote_literal(code) || ', ' ||
  quote_literal(name_ja) || ', ' ||
  coalesce(quote_literal(name_en), 'null') || ', ' ||
  quote_literal(body_region) || ', ' ||
  quote_literal(illustration_key) || ', ' ||
  quote_literal(side_default) || ', ' ||
  coalesce(quote_literal(meridian_code), 'null') || ', ' ||
  quote_literal(line_group::text) || '::text[], ' ||
  quote_literal(tags_trigger::text) || '::text[], ' ||
  quote_literal(tags_symptom::text) || '::text[], ' ||
  quote_literal(tags_sub::text) || '::text[], ' ||
  quote_literal(tags_keyword::text) || '::text[], ' ||
  quote_literal(base_press_level) || ', ' ||
  base_duration_sec || ', ' ||
  base_reps || ', ' ||
  quote_literal(base_breath_cue) || ', ' ||
  quote_literal(cautions::text) || '::jsonb, ' ||
  is_active || ', ' ||
  coalesce(quote_literal(image_path), 'null') || ', ' ||
  quote_literal(tcm_actions::text) || '::text[], ' ||
  quote_literal(organ_focus::text) || '::text[], ' ||
  quote_literal(point_region) || ', ' ||
  coalesce(quote_literal(mtest_block), 'null') || ', ' ||
  coalesce(mtest_meridian_side::text, 'null') || ', ' ||
  coalesce(quote_literal(mtest_role), 'null') || ', ' ||
  coalesce(quote_literal(reading_ja), 'null') ||
  ') on conflict (code) do update set ' ||
  'name_ja = excluded.name_ja, ' ||
  'name_en = excluded.name_en, ' ||
  'body_region = excluded.body_region, ' ||
  'illustration_key = excluded.illustration_key, ' ||
  'side_default = excluded.side_default, ' ||
  'meridian_code = excluded.meridian_code, ' ||
  'line_group = excluded.line_group, ' ||
  'tags_trigger = excluded.tags_trigger, ' ||
  'tags_symptom = excluded.tags_symptom, ' ||
  'tags_sub = excluded.tags_sub, ' ||
  'tags_keyword = excluded.tags_keyword, ' ||
  'base_press_level = excluded.base_press_level, ' ||
  'base_duration_sec = excluded.base_duration_sec, ' ||
  'base_reps = excluded.base_reps, ' ||
  'base_breath_cue = excluded.base_breath_cue, ' ||
  'cautions = excluded.cautions, ' ||
  'is_active = excluded.is_active, ' ||
  'image_path = excluded.image_path, ' ||
  'tcm_actions = excluded.tcm_actions, ' ||
  'organ_focus = excluded.organ_focus, ' ||
  'point_region = excluded.point_region, ' ||
  'mtest_block = excluded.mtest_block, ' ||
  'mtest_meridian_side = excluded.mtest_meridian_side, ' ||
  'mtest_role = excluded.mtest_role, ' ||
  'reading_ja = excluded.reading_ja, ' ||
  'updated_at = now();'
  as insert_sql
from public.radar_tsubo_points
order by code;
