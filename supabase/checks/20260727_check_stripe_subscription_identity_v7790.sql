-- v7.79.0 Stripe subscription readiness check

select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'entitlements'
  and column_name in (
    'stripe_customer_id',
    'stripe_subscription_id',
    'stripe_price_id',
    'stripe_livemode',
    'updated_at'
  )
order by column_name;

select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'entitlements'
  and indexname in (
    'entitlements_stripe_subscription_id_uidx',
    'entitlements_stripe_customer_id_idx'
  )
order by indexname;

select
  product,
  source,
  status,
  count(*) as rows,
  count(stripe_customer_id) as with_customer,
  count(stripe_subscription_id) as with_subscription,
  stripe_livemode
from public.entitlements
group by product, source, status, stripe_livemode
order by product, source, status, stripe_livemode;

select
  stripe_subscription_id,
  count(*) as duplicate_count
from public.entitlements
where stripe_subscription_id is not null
group by stripe_subscription_id
having count(*) > 1;
