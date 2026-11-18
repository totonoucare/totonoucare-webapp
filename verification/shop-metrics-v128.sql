-- Supabase SQL Editor. Unique browser visits per event, not purchases.
select deployment, coalesce(detail->>'source','') as source,
       coalesce(detail->>'category','') as category,
       coalesce(detail->>'mode','') as mode,
       count(distinct visit_id) filter(where event='shop_material_click') as material_link_visits,
       count(distinct visit_id) filter(where event='shop_entry_view') as shop_entry_visits,
       count(distinct visit_id) filter(where event='shop_shelf_view') as shelf_visits,
       count(distinct visit_id) filter(where event='shop_outbound') as outbound_visits
from public.experience_funnel_v126
where event in ('shop_material_click','shop_entry_view','shop_shelf_view','shop_outbound')
  and created_at >= now()-interval '30 days'
group by 1,2,3,4 order by 1,2,3,4;
