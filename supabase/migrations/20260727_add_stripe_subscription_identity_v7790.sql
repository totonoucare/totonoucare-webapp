-- v7.79.0
-- Stripe契約とentitlementsを安全に1対1で対応させる。

begin;

do $$
begin
  if to_regclass('public.entitlements') is null then
    raise exception 'public.entitlements does not exist';
  end if;
end $$;

alter table public.entitlements
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists stripe_livemode boolean,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from public.entitlements
    where stripe_subscription_id is not null
    group by stripe_subscription_id
    having count(*) > 1
  ) then
    raise exception 'duplicate stripe_subscription_id exists in public.entitlements';
  end if;
end $$;

create unique index if not exists entitlements_stripe_subscription_id_uidx
  on public.entitlements (stripe_subscription_id);

create index if not exists entitlements_stripe_customer_id_idx
  on public.entitlements (stripe_customer_id)
  where stripe_customer_id is not null;

comment on column public.entitlements.stripe_customer_id is
  'Stripe Customer ID used to create Customer Portal sessions.';
comment on column public.entitlements.stripe_subscription_id is
  'Stripe Subscription ID and webhook idempotency key.';
comment on column public.entitlements.stripe_price_id is
  'Stripe recurring Price ID observed on the subscription.';
comment on column public.entitlements.stripe_livemode is
  'True for live-mode Stripe objects and false for test-mode objects.';

commit;
