-- 主要テーブルの重複チェック
-- データ変更はしません。
-- 結果が0行なら、その項目は重複なしです。

select
  'daily_checkins_user_date' as check_name,
  user_id,
  date,
  count(*) as duplicate_count
from public.daily_checkins
group by user_id, date
having count(*) > 1;

select
  'radar_forecasts_user_date' as check_name,
  user_id,
  target_date,
  count(*) as duplicate_count
from public.radar_forecasts
group by user_id, target_date
having count(*) > 1;

select
  'radar_reviews_user_date' as check_name,
  user_id,
  target_date,
  count(*) as duplicate_count
from public.radar_reviews
group by user_id, target_date
having count(*) > 1;

select
  'personal_karte_unlocks_user_diagnosis' as check_name,
  user_id,
  diagnosis_event_id,
  count(*) as duplicate_count
from public.personal_karte_unlocks
group by user_id, diagnosis_event_id
having count(*) > 1;

select
  'personal_karte_reports_diagnosis_source_hash' as check_name,
  diagnosis_event_id,
  source_hash,
  count(*) as duplicate_count
from public.personal_karte_reports
group by diagnosis_event_id, source_hash
having count(*) > 1;

select
  'weekly_ai_reports_user_week_type' as check_name,
  user_id,
  week_start,
  report_type,
  count(*) as duplicate_count
from public.weekly_ai_reports
group by user_id, week_start, report_type
having count(*) > 1;

select
  'notification_logs_user_date_type' as check_name,
  user_id,
  target_date,
  notification_type,
  count(*) as duplicate_count
from public.notification_logs
group by user_id, target_date, notification_type
having count(*) > 1;
