# 環境変数・外部サービス設定

この資料は、未病レーダーで使う外部サービスと環境変数名をまとめたものです。  
実際のSecret値はGitHubに保存しません。

---

## 外部サービス

```text
Vercel
  テスト / Preview環境。

Netlify
  本番環境。

Supabase
  Database、Auth、Google OAuth Provider、RLS。

Stripe
  決済、Price ID、Webhook。

OpenAI
  Ekkenの記録分析・相談。

MET Norway
  天気予報API。APIキーなし。

Google Cloud
  Googleログイン用OAuth Client。

GitHub Actions
  通知cron。

Web Push / VAPID
  PWA通知。
```

---

## 環境変数

```text
NEXT_PUBLIC_APP_URL

NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL

OPENAI_API_KEY

STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PREMIUM_PRICE_ID

CRON_SECRET
PROD_BASE_URL

NEXT_PUBLIC_VAPID_PUBLIC_KEY
WEB_PUSH_VAPID_PRIVATE_KEY
WEB_PUSH_SUBJECT
```

`SUPABASE_URL` は旧名の可能性があります。  
新規コードは `NEXT_PUBLIC_SUPABASE_URL` に寄せますが、旧参照が残っている間は削除しません。

---

## GitHubに入れないもの

```text
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
OPENAI_API_KEY
Google OAuth Client Secret
WEB_PUSH_VAPID_PRIVATE_KEY
CRON_SECRET
```

---

## Supabase Auth URL

Supabase AuthのSite URLは、運用環境に合わせて切り替える前提です。

```text
テスト時:
  Vercel URL

本番時:
  Netlify本番URL / app.totonoucare.com
```

詳細は以下を参照してください。

```text
docs/AUTH_AND_DEPLOY_URLS_20260508.md
```

Redirect URLsには、テスト用・本番用を同時に残せます。

---

## MET Norway

MET NorwayはAPIキー不要です。  
ただしUser-Agent/contact表記が重要なので、正式サービス名や連絡先を変更した場合は、MET Norwayクライアント実装も確認します。
