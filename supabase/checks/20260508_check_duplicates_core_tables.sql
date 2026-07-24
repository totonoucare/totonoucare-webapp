-- 主要テーブルの重複チェック
-- データ変更はしません。
-- 結果が0行なら、その項目は重複なしです。

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
  'notification_logs_user_date_type' as check_name,
  user_id,
  target_date,
  notification_type,
  count(*) as duplicate_count
from public.notification_logs
group by user_id, target_date, notification_type
having count(*) > 1;
