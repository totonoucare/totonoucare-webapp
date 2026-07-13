-- 未病レーダー v7.71.2
-- Daily Careの具体的ケアと、従来のまとめ入力（した／少しした）を分離する。
--
-- prevent_level / care_domains / care_timing は既存画面との互換用の「集約値」として残し、
-- manual_* はユーザーがまとめ入力で明示したケアだけを保持する。

begin;

alter table public.radar_reviews
  add column if not exists manual_prevent_level smallint,
  add column if not exists manual_care_domains text[],
  add column if not exists manual_care_timing text;

-- v7.71では具体的ケアが1件以上あるだけでprevent_level=1へ自動補正された。
-- record_version=3・prevent_level=1・具体的ケアありは、自動補正分としてmanual=0へ移す。
-- prevent_level=2は、既存の明示入力を失わないようmanual側へ残す。
update public.radar_reviews r
set
  manual_prevent_level = case
    when coalesce(r.record_version, 1) = 3
      and r.prevent_level = 1
      and exists (
        select 1
        from public.radar_care_actions a
        where a.user_id = r.user_id
          and a.target_date = r.target_date
      )
      then 0
    else coalesce(r.prevent_level, 0)
  end,
  manual_care_domains = case
    when coalesce(r.record_version, 1) = 3
      and r.prevent_level = 1
      and exists (
        select 1
        from public.radar_care_actions a
        where a.user_id = r.user_id
          and a.target_date = r.target_date
      )
      then '{}'::text[]
    else coalesce(r.care_domains, '{}'::text[])
  end,
  manual_care_timing = case
    when coalesce(r.record_version, 1) = 3
      and r.prevent_level = 1
      and exists (
        select 1
        from public.radar_care_actions a
        where a.user_id = r.user_id
          and a.target_date = r.target_date
      )
      then null
    else r.care_timing
  end
where r.manual_prevent_level is null
   or r.manual_care_domains is null;

alter table public.radar_reviews
  alter column manual_prevent_level set default 0,
  alter column manual_prevent_level set not null,
  alter column manual_care_domains set default '{}'::text[],
  alter column manual_care_domains set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'radar_reviews_manual_prevent_level_check'
      and conrelid = 'public.radar_reviews'::regclass
  ) then
    alter table public.radar_reviews
      add constraint radar_reviews_manual_prevent_level_check
      check (manual_prevent_level in (0, 1, 2));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'radar_reviews_manual_care_domains_check'
      and conrelid = 'public.radar_reviews'::regclass
  ) then
    alter table public.radar_reviews
      add constraint radar_reviews_manual_care_domains_check
      check (manual_care_domains <@ array['live','eat','loosen']::text[]);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'radar_reviews_manual_care_timing_check'
      and conrelid = 'public.radar_reviews'::regclass
  ) then
    alter table public.radar_reviews
      add constraint radar_reviews_manual_care_timing_check
      check (
        manual_care_timing is null
        or manual_care_timing in ('before_peak','after_symptom','mixed','unknown')
      );
  end if;
end $$;

comment on column public.radar_reviews.manual_prevent_level is
  'Daily Care具体項目とは別に、ユーザーがまとめ入力で明示したケア量。';
comment on column public.radar_reviews.manual_care_domains is
  'まとめ入力で明示した暮らす／食べる／ほぐす。具体的ケアのdomainはradar_care_actions側。';
comment on column public.radar_reviews.manual_care_timing is
  'まとめ入力で明示したケアのタイミング。具体的ケアのタイミングはradar_care_actions側。';

commit;
