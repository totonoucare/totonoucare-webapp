-- MYケアセレクト：楽天商品クリック計測
-- Supabase SQL Editor でこのSQLを実行してください。
-- アプリ側は /api/care-navi/click から service role 経由で insert します。

create extension if not exists pgcrypto;

create table if not exists public.care_item_click_events (
  id uuid primary key default gen_random_uuid(),

  clicked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  -- ログイン済みなら Supabase Auth の user.id。未ログインなら anon_id を使う。
  user_id uuid null,
  anon_id text null,

  page text not null default 'care_navi',

  -- その時のMYケアセレクト条件
  basis text null, -- karte / tomorrow / season / life
  category text null, -- live / eat / point
  price_band text null, -- all / light / standard / deep
  symptom_key text null,

  core_code text null,
  sub_codes text[] null,

  policy_keys text[] null,
  clicked_policy_key text null,

  source_type text null, -- symptom / policy
  source_key text null, -- symptom / shizumeru / yurumeru ...

  item_position integer null,

  -- 楽天商品情報
  item_code text null,
  item_title text null,
  item_price integer null,
  shop_name text null,
  review_average numeric null,
  review_count integer null,

  query text null,
  tags text[] null,

  item_url text null,
  affiliate_url text null,
  source text not null default 'rakuten',

  -- 予報・生活条件
  weather_date date null,
  weather_risk_level text null,
  weather_summary jsonb null,
  life_keys text[] null,

  -- 技術メタ情報
  user_agent text null,
  referrer text null,
  client_ip text null
);

alter table public.care_item_click_events enable row level security;

-- クライアントから直接insertしない前提。
-- /api/care-navi/click が SUPABASE_SERVICE_ROLE_KEY で insert します。
-- service_role はRLSをバイパスできます。

create index if not exists care_item_click_events_clicked_at_idx
  on public.care_item_click_events (clicked_at desc);

create index if not exists care_item_click_events_user_id_idx
  on public.care_item_click_events (user_id);

create index if not exists care_item_click_events_anon_id_idx
  on public.care_item_click_events (anon_id);

create index if not exists care_item_click_events_symptom_category_idx
  on public.care_item_click_events (symptom_key, category);

create index if not exists care_item_click_events_policy_keys_gin_idx
  on public.care_item_click_events using gin (policy_keys);

create index if not exists care_item_click_events_life_keys_gin_idx
  on public.care_item_click_events using gin (life_keys);

create index if not exists care_item_click_events_item_code_idx
  on public.care_item_click_events (item_code);

comment on table public.care_item_click_events is
  'MYケアセレクトの商品リンククリックログ。不調・方針・カテゴリ・価格帯・商品情報を保存する。';
