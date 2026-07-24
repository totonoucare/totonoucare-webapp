# Auth / Deploy URL 設定メモ 2026-05-08

このファイルは、Supabase Auth、Vercel、Netlify、Google OAuthまわりのURL設定メモ。

## 重要な運用ルール

Supabase Auth の `Site URL` は、現在の運用では環境に合わせて切り替えている。

```text
テストで使う時:
  Site URL = https://totonoucare-webapp.vercel.app/

本番で使う時:
  Site URL = Netlify本番URL
  候補 = https://app.totonoucare.com/
```

つまり、Supabase Auth のURL設定は「一度設定したら固定」ではなく、  
テスト運用時はVercel、本番運用時はNetlifyへ切り替える前提。

---

## 2026-05-08時点で確認できたURL

### Supabase Site URL

```text
https://totonoucare-webapp.vercel.app/
```

これは、テスト用としてVercel側に向けている状態。

### Supabase Redirect URLs

```text
https://totonoucare-webapp.vercel.app/auth/callback
https://totonoucare-webapp.vercel.app/
https://remarkable-otter-8e686b.netlify.app/auth/callback
https://app.totonoucare.com/auth/callback
```

## URLの役割

```text
totonoucare-webapp.vercel.app:
  Vercelテスト/Preview環境

remarkable-otter-8e686b.netlify.app:
  Netlifyの一時URL/デプロイURL

app.totonoucare.com:
  本番カスタムドメイン想定
```

---

## Site URL と Redirect URLs の考え方

### Site URL

Supabase Auth のデフォルト戻り先。

ログイン処理で `redirectTo` が指定されていない場合や、指定URLが許可リストに合わない場合などに影響する。

そのため、実際にメインで使う環境へ合わせる。

```text
テスト中:
  https://totonoucare-webapp.vercel.app/

本番運用中:
  https://app.totonoucare.com/
```

### Redirect URLs

Supabase Auth が戻り先として許可するURLリスト。

こちらは、テスト用・本番用を同時に残してよい。

```text
Vercel用:
  https://totonoucare-webapp.vercel.app/auth/callback
  https://totonoucare-webapp.vercel.app/

Netlify一時URL用:
  https://remarkable-otter-8e686b.netlify.app/auth/callback

本番カスタムドメイン用:
  https://app.totonoucare.com/auth/callback
```

---

## 本番へ切り替える時のチェックリスト

本番を `https://app.totonoucare.com` で使う場合:

### 1. Supabase Auth

```text
Authentication
→ URL Configuration
→ Site URL
```

を以下へ変更する。

```text
https://app.totonoucare.com/
```

Redirect URLsには以下が入っていることを確認する。

```text
https://app.totonoucare.com/auth/callback
```

Vercelでも引き続きテストログインするなら、以下は残してよい。

```text
https://totonoucare-webapp.vercel.app/auth/callback
https://totonoucare-webapp.vercel.app/
```

### 2. Netlify

本番環境変数で、必要なら以下を設定する。

```text
NEXT_PUBLIC_APP_URL=https://app.totonoucare.com
```

### 3. Stripe

本番Webhook endpointを本番URLへ向ける。

```text
https://app.totonoucare.com/api/stripe/webhook
```

Stripeはテストモードと本番モードで以下が別。

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PREMIUM_PRICE_ID
```

### 4. GitHub Actions

通知cronを本番へ向ける。

```text
PROD_BASE_URL=https://app.totonoucare.com
```

### 5. Google Cloud / Supabase Google Provider

SupabaseのGoogle Provider画面に表示されるCallback URLをGoogle CloudのAuthorized redirect URIに登録する。

通常の形式:

```text
https://<supabase-project-ref>.supabase.co/auth/v1/callback
```

注意:

- Google Cloud側に登録するのは、基本的にSupabaseのCallback URL。
- アプリ側の `/auth/callback` は、Supabase Auth後に戻ってくるアプリ内URLとしてSupabase Redirect URLsに入れる。

---

## テストへ戻す時のチェックリスト

Vercelでテストしたい場合:

### 1. Supabase Auth

Site URLを以下へ戻す。

```text
https://totonoucare-webapp.vercel.app/
```

Redirect URLsに以下が入っていることを確認する。

```text
https://totonoucare-webapp.vercel.app/auth/callback
https://totonoucare-webapp.vercel.app/
```

### 2. Vercel

Vercel側の環境変数が有効か確認する。

特に以下。

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
CRON_SECRET
NEXT_PUBLIC_VAPID_PUBLIC_KEY
WEB_PUSH_VAPID_PRIVATE_KEY
WEB_PUSH_SUBJECT
```

### 3. Stripe

Vercelテストでは、原則Stripeテストモードのキー・Price ID・Webhook Secretを使う。

---

## AI引き継ぎ時の注意

次回AIは、Supabase AuthのSite URLについて以下を前提にする。

```text
テスト時はVercelへ切り替える。
本番時はNetlify / app.totonoucare.com へ切り替える。
Redirect URLsにはテスト・本番の両方を残せる。
```

Site URLが現在どちらを向いているかは、Supabase Dashboardの画面確認が必要。
コードだけでは判断しない。
