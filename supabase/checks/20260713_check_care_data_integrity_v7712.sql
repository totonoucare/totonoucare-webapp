-- v7.71.2 ケア記録データ整合性 migration確認

select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'radar_reviews'
  and column_name in (
    'manual_prevent_level',
    'manual_care_domains',
    'manual_care_timing'
  )
order by ordinal_position;

select
  conname,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.radar_reviews'::regclass
  and conname in (
    'radar_reviews_manual_prevent_level_check',
    'radar_reviews_manual_care_domains_check',
    'radar_reviews_manual_care_timing_check'
  )
order by conname;

-- 集約値と明示入力の確認。具体的ケアがある日はprevent_levelが1以上でも、
-- manual_prevent_levelは0になり得るのが正しい。
select
  r.target_date,
  r.prevent_level as aggregate_prevent_level,
  r.manual_prevent_level,
  r.care_domains as aggregate_care_domains,
  r.manual_care_domains,
  count(a.id) as concrete_care_count
from public.radar_reviews r
left join public.radar_care_actions a
  on a.user_id = r.user_id
 and a.target_date = r.target_date
group by r.id
order by r.target_date desc
limit 30;
