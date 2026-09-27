# AI開発引き継ぎメモ

この資料は、AIが未病レーダーのコードを読むときの前提をまとめたものです。  
現在の進行状況や作業予定ではなく、変わりにくい設計・運用ルールだけを扱います。

---

## 開発体制

```text
開発者:
  iPad上でGitHubを編集する。

AI:
  コード理解、設計判断、修正ファイル作成、SQL作成を行う。

AIができないこと:
  GitHubコミット
  ビルド実行
  デプロイ実行
  Supabase SQL Editorの実行
  Vercel / Netlify / Stripe / Google Cloud の設定変更
```

長い修正や複数ファイル変更は、原則ZIPで渡します。

---

## プロダクトの基本方針

未病レーダーの軸は以下です。

```text
明日の未病予報を見て、
今夜の整え方を
ほぐす・食べる・暮らす
の3方向から先回りするアプリ
```

詳細は以下を参照してください。

```text
docs/PRODUCT_DIRECTION.md
```

---

## 実装の大枠

```text
app/
  画面とAPI Routes。

components/
  UIコンポーネント。

lib/
  診断、レーダー予報、AI生成、通知、Stripe、Supabase補助などの主要ロジック。

public/
  画像、PWA、service worker。

.github/workflows/
  GitHub Actions cron。

supabase/
  DB関連のsnapshot、確認SQL、migration、seed関連。
```

---

## レーダー予報の考え方

```text
ルールベース:
  スコア
  signal
  main_trigger
  peak
  響きやすい要素
  ツボ候補の選定

AI生成:
  読み解き文
  食養生文
  表現の自然化
```

GPTに、スコアや主因を自由に再診断させない。  
AIは「決定済みの構造を、ユーザーに伝わる文章へ整える」役割に寄せます。

---

## ケア提案の軸

```text
ほぐす:
  ツボ・身体ケア。

食べる:
  食養生。
  一般的な健康アドバイスではなく、身体の読み解きと具体的な食べ方の作戦に寄せる。

暮らす:
  寝室、照明、音、湿気、冷え、乾燥、入浴、衣類など、身の回りでできる工夫。
```

---

## DB管理

Supabase関連の資料は以下にあります。

```text
docs/DB_SCHEMA_MANAGEMENT.md
docs/DB_CURRENT_STATUS_20260508.md
docs/RADAR_TSUBO_POINTS_MASTER_20260508.md
supabase/
```

注意:

```text
supabase/schema/
  snapshot。原則そのまま実行しない。

supabase/checks/
  確認用SELECT。

supabase/migrations/
  実際にSupabase SQL Editorで実行する変更SQL。

supabase/seeds/
  マスターデータのseed / export関連。
```

DB関連の変更を作る場合は、RLS、制約、index、trigger/function、既存データを確認してから作る。

---

## 環境変数・外部サービス

```text
docs/ENVIRONMENT_AND_EXTERNAL_SERVICES.md
docs/AUTH_AND_DEPLOY_URLS_20260508.md
.env.example
```

Supabase AuthのSite URLは固定ではありません。

```text
テスト時:
  Vercelへ向ける。

本番時:
  Netlify / app.totonoucare.com へ向ける。
```

Redirect URLsにはテスト用・本番用を同時に残せます。

---

## 注意する表現

未病レーダーは医療行為や治療効果を断定しません。

避ける表現:

```text
治る
改善する
効く
痛みを和らげる
病気を防ぐ
```

使いやすい表現:

```text
整えやすい
備える
支度する
重さが出やすい
巡りが滞りやすい
今夜の一手
この日の備え
```

