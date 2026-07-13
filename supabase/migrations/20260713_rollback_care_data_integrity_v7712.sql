-- v7.71.2のmanual_*列だけを戻す。
-- radar_care_actionsの具体的ケア記録は削除しない。

begin;

alter table public.radar_reviews
  drop constraint if exists radar_reviews_manual_prevent_level_check,
  drop constraint if exists radar_reviews_manual_care_domains_check,
  drop constraint if exists radar_reviews_manual_care_timing_check,
  drop column if exists manual_prevent_level,
  drop column if exists manual_care_domains,
  drop column if exists manual_care_timing;

commit;
