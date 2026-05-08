# 未病レーダー

未病レーダーは、東洋医学の体質分類と天気変化を組み合わせて、今日・明日の崩れやすさとセルフケアを提案するWebアプリです。

コアメッセージ:

> 明日の崩れやすさを、今夜の整え方に変える。

単なる「今日の不調を当てるアプリ」ではなく、明日の体調変化を先回りし、今夜から整えるための未病予報アプリとして開発しています。

---

## 現在の開発方針

現在は、以下の体験を主軸にしています。

```text
明日の未病予報
↓
崩れやすさスコア
↓
響きやすい要素
↓
明日の山場
↓
今夜の先回りケア
  ほぐす / 食べる / 暮らす
```

詳しい開発方針は以下を参照してください。

```text
docs/PRODUCT_PLAN_V0_2.md
docs/AI_HANDOFF.md
```

---

## 主な機能

### 体質診断 v2

回答から、体質タイプ・気血水・経絡傾向・天気感受性などを算出します。

主な場所:

```text
lib/diagnosis/v2/
app/check/
app/api/diagnosis/v2/
```

### レーダー予報

MET Norwayの天気データ、体質プロフィール、過去レビューを組み合わせて、今日/明日の崩れやすさとケア提案を生成します。

主な場所:

```text
lib/radar_v1/
app/radar/
app/api/radar/v1/
```

重要方針:

- スコアや主因はルールベースで決める
- GPTは読み解き文・食養生・表現補助に寄せる
- GPTに診断や主因を再推論させない

### パーソナル未病カルテ

診断結果から、体質・天気感受性・前触れ・経絡・季節ケアなどを含むパーソナルレポートを生成します。

主な場所:

```text
lib/personalKarte.js
lib/personalKarteAi.js
app/karte/
app/api/karte/
app/api/stripe/
```

### 通知

PWA / Web Push を使い、夜・朝の未病予報通知を送ります。

主な場所:

```text
public/sw.js
lib/push/
app/api/cron/radar-notifications/
.github/workflows/
```

---

## 技術スタック

```text
Next.js App Router
Supabase
Stripe
OpenAI API
MET Norway API
PWA / Web Push
GitHub Actions
Vercel
```

画像はSupabase Storageではなく、リポジトリの `public/` 配下で管理しています。

---

## 主要ディレクトリ

```text
app/              Next.js App Router。画面とAPI Routes
components/       UIコンポーネント
lib/              診断・予報・カルテ・通知などの主要ロジック
public/           画像・PWA・service worker
.github/          GitHub Actions
docs/             AI引き継ぎ資料・開発計画・DB現状メモ
supabase/         DBスキーマ管理・確認SQL・migration・seed
```

---

## DB管理

SupabaseのDB設計は `supabase/` 配下で管理します。

```text
supabase/schema/      現状スキーマのsnapshot。原則そのまま実行しない
supabase/checks/      確認用SQL
supabase/migrations/  実際にSupabase SQL Editorで実行する変更SQL
supabase/seeds/       マスターデータ投入用SQL
```

詳しくは以下を参照してください。

```text
docs/DB_SCHEMA_MANAGEMENT.md
docs/DB_CURRENT_STATUS_20260508.md
```

---

## AI開発引き継ぎ

このプロジェクトは、AIにコード作成を依頼し、GitHub上でファイルを差し替えて開発しています。

新しいAI担当は、最初に以下を読むこと。

```text
README.md
README_AI_HANDOFF.md
docs/AI_HANDOFF.md
docs/DB_CURRENT_STATUS_20260508.md
docs/PRODUCT_PLAN_V0_2.md
```

長い修正コードや新規ファイル群は、原則ZIPで渡す運用です。

---

## 環境変数

実際の値はGitHubに保存しないでください。  
Vercel / Supabase / Stripe / OpenAI 側で管理します。

主な環境変数の例:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

OPENAI_API_KEY

STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

NEXT_PUBLIC_APP_URL
CRON_SECRET

NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
```

秘密鍵やAPIキーは絶対にコミットしないでください。

---

## 注意

このREADMEは、開発者・AI引き継ぎ・GitHub上での概要把握を目的にしています。  
最新の事業方針や細かい実装状況は `docs/` 配下を確認してください。
