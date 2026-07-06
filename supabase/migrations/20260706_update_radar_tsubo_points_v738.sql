-- v7.38 radar_tsubo_points update
-- 目的:
-- - 明日タブのツボ選定で、pressure/temp/humidity の粗いタグだけでなく
--   pressure_down / pressure_up / cold / heat / damp / dry の exact trigger を使えるようにする。
-- - digestion など、現状のマスターで薄かった symptom tag を補う。
-- - 既存タグは消さず、配列に追加するだけ。
--
-- 実行場所:
-- Supabase SQL Editor
--
-- 注意:
-- 既存の radar_care_plans に保存済みの night_tsubo_set は自動では書き換わりません。
-- 新規生成で確認するか、必要なら該当日の radar_care_plans を再生成/クリアしてください。

begin;

-- damp / 湿気・重さ・胃腸・むくみ
update public.radar_tsubo_points
set
  tags_trigger = (
    select array_agg(distinct x order by x)
    from unnest(coalesce(tags_trigger, '{}'::text[]) || array['damp']::text[]) as u(x)
  ),
  tags_keyword = (
    select array_agg(distinct x order by x)
    from unnest(coalesce(tags_keyword, '{}'::text[]) || array['damp','heavy','drain_damp','support_spleen']::text[]) as u(x)
  ),
  updated_at = now()
where code in ('CV12','ST36','SP2','SP5','SP6','GB34','LI11','ST41');

-- digestion: 明日タブの「胃腸の交通整理」を選びやすくする
update public.radar_tsubo_points
set
  tags_symptom = (
    select array_agg(distinct x order by x)
    from unnest(coalesce(tags_symptom, '{}'::text[]) || array['digestion']::text[]) as u(x)
  ),
  tags_keyword = (
    select array_agg(distinct x order by x)
    from unnest(coalesce(tags_keyword, '{}'::text[]) || array['digestion','stomach','spleen']::text[]) as u(x)
  ),
  updated_at = now()
where code in ('CV12','ST36','SP6','PC6');

-- pressure_down / 低気圧・こもり・頭耳首
update public.radar_tsubo_points
set
  tags_trigger = (
    select array_agg(distinct x order by x)
    from unnest(coalesce(tags_trigger, '{}'::text[]) || array['pressure_down']::text[]) as u(x)
  ),
  tags_keyword = (
    select array_agg(distinct x order by x)
    from unnest(coalesce(tags_keyword, '{}'::text[]) || array['pressure_down','head_heavy','ear_neck','cloudy']::text[]) as u(x)
  ),
  updated_at = now()
where code in ('GB20','GV20','PC6','LU9','KI3','LI4','LR3','LU7');

-- pressure_up / 気圧上昇・前のめり・力み
update public.radar_tsubo_points
set
  tags_trigger = (
    select array_agg(distinct x order by x)
    from unnest(coalesce(tags_trigger, '{}'::text[]) || array['pressure_up']::text[]) as u(x)
  ),
  tags_keyword = (
    select array_agg(distinct x order by x)
    from unnest(coalesce(tags_keyword, '{}'::text[]) || array['pressure_up','tension','bitter_settle','upward']::text[]) as u(x)
  ),
  updated_at = now()
where code in ('LR3','LR2','LI4','GB34','GB20','PC6','GV20','HT7');

-- cold / 冷え・こわばり・腰腹
update public.radar_tsubo_points
set
  tags_trigger = (
    select array_agg(distinct x order by x)
    from unnest(coalesce(tags_trigger, '{}'::text[]) || array['cold']::text[]) as u(x)
  ),
  tags_keyword = (
    select array_agg(distinct x order by x)
    from unnest(coalesce(tags_keyword, '{}'::text[]) || array['cold','warm','abdomen','feet']::text[]) as u(x)
  ),
  updated_at = now()
where code in ('CV6','KI3','KI7','SP6','ST36','BL65','BL67','LU7');

-- heat / 熱・上にこもる・頭/気分
update public.radar_tsubo_points
set
  tags_trigger = (
    select array_agg(distinct x order by x)
    from unnest(coalesce(tags_trigger, '{}'::text[]) || array['heat']::text[]) as u(x)
  ),
  tags_keyword = (
    select array_agg(distinct x order by x)
    from unnest(coalesce(tags_keyword, '{}'::text[]) || array['heat','clear_heat','upper_heat','settle']::text[]) as u(x)
  ),
  updated_at = now()
where code in ('LI11','LR2','GB43','GV20','LI4','PC6','GB20','ST45');

-- dry / のど・目・肌のカサつき感
update public.radar_tsubo_points
set
  tags_trigger = (
    select array_agg(distinct x order by x)
    from unnest(coalesce(tags_trigger, '{}'::text[]) || array['dry']::text[]) as u(x)
  ),
  tags_keyword = (
    select array_agg(distinct x order by x)
    from unnest(coalesce(tags_keyword, '{}'::text[]) || array['dry','moisten','fluids','eye_throat_skin']::text[]) as u(x)
  ),
  updated_at = now()
where code in ('KI3','KI7','SP6','CV6','PC6','GV20','LU9');

-- 明日タブで首肩・頭・気分系がより自然につながるよう、既存マスターの薄い橋渡しを補う。
update public.radar_tsubo_points
set
  tags_symptom = (
    select array_agg(distinct x order by x)
    from unnest(coalesce(tags_symptom, '{}'::text[]) || array['mood']::text[]) as u(x)
  ),
  updated_at = now()
where code in ('PC6','GB20','HT7','GV20','LR3');

update public.radar_tsubo_points
set
  tags_symptom = (
    select array_agg(distinct x order by x)
    from unnest(coalesce(tags_symptom, '{}'::text[]) || array['neck_shoulder']::text[]) as u(x)
  ),
  updated_at = now()
where code in ('PC6','GB20','LU7','LI4','SI3','TE3');

commit;
