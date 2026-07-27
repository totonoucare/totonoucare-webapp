-- v7.79.0 rollback
-- Stripe識別子が保存済みなら、契約管理情報を失わないよう停止する。

begin;

do $$
begin
  if to_regclass('public.entitlements') is null then
    raise exception 'public.entitlements does not exist';
  end if;

  if exists (
    select 1
    from public.entitlements
    where stripe_customer_id is not null
       or stripe_subscription_id is not null
       or stripe_price_id is not null
       or stripe_livemode is not null
  ) then
    raise exception 'Stripe identity data exists. Export or clear it intentionally before rollback.';
  end if;
end $$;

drop index if exists public.entitlements_stripe_customer_id_idx;
drop index if exists public.entitlements_stripe_subscription_id_uidx;

alter table public.entitlements
  drop column if exists stripe_livemode,
  drop column if exists stripe_price_id,
  drop column if exists stripe_subscription_id,
  drop column if exists stripe_customer_id;

commit;
