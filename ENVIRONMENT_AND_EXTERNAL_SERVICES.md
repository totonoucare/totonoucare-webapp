# 環境変数・外部サービス設定メモ

最終更新: 2026-05-08

## 目的

未病レーダーで使っている外部サービス・環境変数・管理画面設定を、AI引き継ぎ時に毎回説明しなくて済むようにするための資料。

重要:

- 実際の値は絶対にGitHubへ保存しない。
- このファイルには「変数名」「何に使うか」「どこで管理するか」だけを書く。
- Secret Key / Service Role Key / Webhook Secret / OAuth Secret は貼らない。

---

## 1. コードを見れば分かること・分からないこと

### コードを見れば分かること

```text
process.env で参照している環境変数名
どのAPI RouteでStripe/OpenAI/Supabaseを使っているか
MET Norway APIをどのURLへ取りに行っているか
GitHub Actions cronがどのAPIを叩くか
Web Pushで使うVAPID変数名
```

### コードだけでは分からないこと

```text
Vercel / Netlify に実際どの値が設定されているか
Production / Preview で値が同じか違うか
Supabase Auth の Site URL / Redirect URLs
Google Cloud OAuth の Client ID / Client Secret / Authorized redirect URIs
Stripeの本番/テストのPrice ID
Stripe Webhook endpoint と Webhook Secret
GitHub Secrets の実値
本番ドメインの最終URL
```

結論:

> 変数名はコードからかなり拾える。  
> ただし、外部サービスの管理画面設定はコードだけでは完全には分からない。

---

## 2. 2026-05-08時点で画面確認できた設定

ユーザー提供スクリーンショットから確認できたもの。

### Supabase Auth URL Configuration

現在のSite URL:

```text
https://totonoucare-webapp.vercel.app/
```

これはテスト用としてVercel側に向けている状態。

現在のRedirect URLs:

```text
https://totonoucare-webapp.vercel.app/auth/callback
https://totonoucare-webapp.vercel.app/
https://remarkable-otter-8e686b.netlify.app/auth/callback
https://app.totonoucare.com/auth/callback
```

解釈:

```text
Vercel URL:
  テスト/Preview用

remarkable-otter-8e686b.netlify.app:
  Netlifyの一時URL/デプロイURL

app.totonoucare.com:
  本番カスタムドメイン想定
```

### Supabase Auth Site URLの運用

Supabase Auth の `Site URL` は、現在の運用では環境に合わせて切り替えている。

```text
テストで使う時:
  Site URL = https://totonoucare-webapp.vercel.app/

本番で使う時:
  Site URL = Netlify本番URL
  候補 = https://app.totonoucare.com/
```

Redirect URLsには、Vercelテスト用・Netlify一時URL・本番カスタムドメインを同時に残してよい。

詳細は以下を参照。

```text
docs/AUTH_AND_DEPLOY_URLS_20260508.md
```

---

### Vercel Environment Variables

Project側で確認できた変数:

```text
PERSONAL_KARTE_AI_ENABLED
OPENAI_PERSONAL_KARTE_REASONING_EFFORT
STRIPE_WEBHOOK_SECRET
STRIPE_SECRET_KEY
STRIPE_PERSONAL_KARTE_PRICE_ID
STRIPE_PREMIUM_PRICE_ID
CRON_SECRET
NEXT_PUBLIC_VAPID_PUBLIC_KEY
WEB_PUSH_SUBJECT
WEB_PUSH_VAPID_PRIVATE_KEY
```

Shared側で確認できた変数:

```text
OPENAI_API_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL
```

補足:

- VercelではProject variablesとShared variablesに分かれている。
- `SUPABASE_URL` は旧名の可能性あり。
- 今後は `NEXT_PUBLIC_SUPABASE_URL` に寄せるが、コードに旧参照が残っている間は削除しない。
- Shared側の一部に `Needs Attention` 表示がある。Vercel側の共有変数の確認・再承認・スコープ確認が必要な可能性あり。

---

### Netlify Environment Variables

確認できた変数:

```text
CRON_SECRET
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_VAPID_PUBLIC_KEY
OPENAI_API_KEY
STRIPE_PERSONAL_KARTE_PRICE_ID
STRIPE_PREMIUM_PRICE_ID
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL
WEB_PUSH_SUBJECT
WEB_PUSH_VAPID_PRIVATE_KEY
```

補足:

- Netlifyにも必要な変数は概ね揃っている。
- `SUPABASE_URL` は旧名の可能性あり。
- 本番運用時は、Netlify側の `NEXT_PUBLIC_APP_URL` が必要かコード確認する。
- コード上で `NEXT_PUBLIC_APP_URL` を参照している場合、Netlifyにも追加する。

---

## 3. 管理場所の全体像

```text
Vercel
  Preview / テスト環境
  Environment Variables
  Deployments

Netlify
  本番環境
  Environment Variables
  Production deploy
  本番ドメイン

Supabase
  Database
  Auth
  Google OAuth Provider設定
  API keys
  Site URL / Redirect URLs
  RLS policy

Stripe
  商品
  Price ID
  Checkout
  Webhook
  テスト/本番キー

OpenAI
  AI生成
  モデル設定

MET Norway
  天気予報API
  APIキーなし
  User-Agent/contact表記が必要

Google Cloud
  Googleログイン用 OAuth Client
  Client ID / Client Secret
  Authorized redirect URI
  OAuth consent screen

GitHub Actions
  通知cron
  CRON_SECRET
  PROD_BASE_URL

Web Push / VAPID
  Push通知用公開鍵/秘密鍵
```

---

## 4. Supabase

コードで使う環境変数:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

旧名:

```text
SUPABASE_URL
```

方針:

- 新規コードは `NEXT_PUBLIC_SUPABASE_URL` に統一。
- `SUPABASE_URL` は旧コード参照がゼロと確認できるまで消さない。
- Service Role Keyはサーバー側API専用。絶対にブラウザへ出さない。

---

## 5. Supabase Auth / Googleログイン

Googleログインは、コード内の環境変数だけでは完結しない。  
Supabase Dashboard と Google Cloud Console の設定が必要。

### Supabase側

確認場所:

```text
Supabase Dashboard
→ Authentication
→ URL Configuration
```

見るもの:

```text
Site URL
Redirect URLs
```

重要運用:

```text
テスト時はSite URLをVercelへ向ける。
本番時はSite URLをNetlify / app.totonoucare.com へ向ける。
Redirect URLsにはテスト・本番の両方を残せる。
```

### Supabase Google Provider側

確認場所:

```text
Supabase Dashboard
→ Authentication
→ Providers
→ Google
```

見るもの:

```text
Google Provider がONになっているか
Client ID
Client Secret
Callback URL
```

### Google Cloud側

確認場所:

```text
Google Cloud Console
→ APIs & Services
→ Credentials
→ OAuth 2.0 Client IDs
```

見るもの:

```text
Authorized JavaScript origins
Authorized redirect URIs
OAuth consent screen
Publishing status
Test users
```

重要:

Supabase AuthでGoogleログインする場合、Google Cloud側のAuthorized redirect URIは通常、Supabaseが表示するCallback URLを登録する。

形式例:

```text
https://<supabase-project-ref>.supabase.co/auth/v1/callback
```

アプリ側の `/auth/callback` は、Supabaseログイン後に戻ってくる先としてSupabaseのRedirect URLsに登録する。

---

## 6. Vercel Preview

このプロジェクトでは、ローカル開発ではなく、VercelのPreview環境をテスト環境として使う想定。

Vercel側で確認済みの変数は「2. 2026-05-08時点で画面確認できた設定」を参照。

### Vercelに必要な可能性がある変数

```text
NEXT_PUBLIC_APP_URL

NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL

OPENAI_API_KEY
OPENAI_RADAR_MODEL
OPENAI_WEEKLY_REPORT_MODEL
OPENAI_PERSONAL_KARTE_MODEL
OPENAI_PERSONAL_KARTE_REASONING_EFFORT
PERSONAL_KARTE_AI_ENABLED

STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PERSONAL_KARTE_PRICE_ID
STRIPE_PREMIUM_PRICE_ID

CRON_SECRET

NEXT_PUBLIC_VAPID_PUBLIC_KEY
WEB_PUSH_VAPID_PRIVATE_KEY
WEB_PUSH_SUBJECT
```

### 注意

- Previewはテスト用なので、Stripeは原則テストモードのキー・Price IDにする。
- `NEXT_PUBLIC_APP_URL` はCheckout成功/キャンセルURLなどで使う可能性がある。
- Vercel Shared variablesの `Needs Attention` は、一度Vercel画面で詳細確認する。

---

## 7. Netlify Production

本番環境でNetlifyを使う想定。

Netlify側で確認済みの変数は「2. 2026-05-08時点で画面確認できた設定」を参照。

### Netlifyに必要な可能性がある変数

```text
NEXT_PUBLIC_APP_URL

NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL

OPENAI_API_KEY
OPENAI_RADAR_MODEL
OPENAI_WEEKLY_REPORT_MODEL
OPENAI_PERSONAL_KARTE_MODEL
OPENAI_PERSONAL_KARTE_REASONING_EFFORT
PERSONAL_KARTE_AI_ENABLED

STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PERSONAL_KARTE_PRICE_ID
STRIPE_PREMIUM_PRICE_ID

CRON_SECRET

NEXT_PUBLIC_VAPID_PUBLIC_KEY
WEB_PUSH_VAPID_PRIVATE_KEY
WEB_PUSH_SUBJECT
```

### 本番化時に確認するもの

```text
本番ドメイン
NEXT_PUBLIC_APP_URL
Stripe Webhook endpoint
Supabase Auth Site URL
Supabase Additional Redirect URLs
Google OAuth Authorized redirect URIs
GitHub Actions PROD_BASE_URL
PWA / Push通知の動作
```

---

## 8. Stripe

コードで使う環境変数:

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PERSONAL_KARTE_PRICE_ID
STRIPE_PREMIUM_PRICE_ID
```

現在の扱い:

```text
STRIPE_PERSONAL_KARTE_PRICE_ID
  パーソナル未病カルテ購入用

STRIPE_PREMIUM_PRICE_ID
  premium / subscription用。
  calendar / insights は一旦開発中UIで保留中。

STRIPE_WEBHOOK_SECRET
  Stripe webhook検証用

STRIPE_SECRET_KEY
  サーバー側Stripe API用
```

本番Webhook endpoint候補:

```text
https://app.totonoucare.com/api/stripe/webhook
```

Stripeはテストモードと本番モードで以下が変わる。

```text
Secret Key
Price ID
Webhook Secret
Webhook endpoint
```

---

## 9. OpenAI

コードで使う環境変数:

```text
OPENAI_API_KEY
OPENAI_RADAR_MODEL
OPENAI_WEEKLY_REPORT_MODEL
OPENAI_PERSONAL_KARTE_MODEL
OPENAI_PERSONAL_KARTE_REASONING_EFFORT
PERSONAL_KARTE_AI_ENABLED
```

用途:

```text
OPENAI_RADAR_MODEL
  レーダー予報の読み解き文・食養生など

OPENAI_WEEKLY_REPORT_MODEL
  週次レポート用

OPENAI_PERSONAL_KARTE_MODEL
  パーソナル未病カルテAI生成用

OPENAI_PERSONAL_KARTE_REASONING_EFFORT
  カルテ生成時の推論強度

PERSONAL_KARTE_AI_ENABLED
  パーソナルカルテAI生成のON/OFF
```

---

## 10. MET Norway

天気予報API。  
未病レーダーの気圧・湿度・気温変化の元データ。

コード上の場所:

```text
lib/radar_v1/metnoClient.js
lib/radar_v1/metnoNormalize.js
```

APIキー:

```text
不要
```

注意:

MET NorwayはUser-Agent/contactを明示する設計。  
将来的に正式サービス名や連絡先を変える場合は、`lib/radar_v1/metnoClient.js` のUser-Agentも見直す。

---

## 11. GitHub Actions

通知cronで使う。

コード上の場所:

```text
.github/workflows/radar-notifications.yml
```

GitHub Secrets:

```text
CRON_SECRET
PROD_BASE_URL
```

用途:

```text
CRON_SECRET
  cron APIを叩くときのBearer認証

PROD_BASE_URL
  cronが叩く本番URL
```

本番をNetlifyにする場合は、GitHub Secretの `PROD_BASE_URL` をNetlify本番URLに合わせる。

---

## 12. Web Push / VAPID

PWA通知で使う。

コード上の場所:

```text
public/sw.js
lib/push/webPush.js
app/api/cron/radar-notifications/
```

環境変数:

```text
NEXT_PUBLIC_VAPID_PUBLIC_KEY
WEB_PUSH_VAPID_PRIVATE_KEY
WEB_PUSH_SUBJECT
```

用途:

```text
NEXT_PUBLIC_VAPID_PUBLIC_KEY
  ブラウザ側で購読に使う公開鍵

WEB_PUSH_VAPID_PRIVATE_KEY
  サーバー側でpush送信に使う秘密鍵

WEB_PUSH_SUBJECT
  VAPID subject。通常 mailto:xxx またはURL
```

---

## 13. 現在コードから検出された環境変数

2026-05-08時点のコードから検出された `process.env` は以下。

```text
CRON_SECRET
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_VAPID_PUBLIC_KEY
NODE_ENV
OPENAI_API_KEY
OPENAI_PERSONAL_KARTE_MODEL
OPENAI_PERSONAL_KARTE_REASONING_EFFORT
OPENAI_RADAR_MODEL
OPENAI_WEEKLY_REPORT_MODEL
PERSONAL_KARTE_AI_ENABLED
STRIPE_PERSONAL_KARTE_PRICE_ID
STRIPE_PREMIUM_PRICE_ID
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL
WEB_PUSH_SUBJECT
WEB_PUSH_VAPID_PRIVATE_KEY
```

補足:

- `SUPABASE_URL` は旧名の可能性がある。
- 今後は `NEXT_PUBLIC_SUPABASE_URL` に寄せる。
- `NODE_ENV` はVercel/Netlify/Next.js側が自動管理するため、通常手動設定しない。

---

## 14. GitHubに入れてはいけないもの

```text
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
OPENAI_API_KEY
Google OAuth Client Secret
WEB_PUSH_VAPID_PRIVATE_KEY
CRON_SECRET
```

GitHubに入れてよいのは、値ではなく「変数名」と「用途」だけ。
