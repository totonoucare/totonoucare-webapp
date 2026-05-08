# 未病レーダー AI引き継ぎ資料

最終更新: 2026-05-08

## 0. この資料の目的

ChatGPT / AI開発担当がトークン切れで交代しても、毎回ゼロから説明し直さずに開発を続けるための資料。

次回AIは、まずこのファイルと `docs/DB_CURRENT_STATUS_20260508.md` を読むこと。

---

## 1. 開発・運用前提

開発者はローカル開発環境を持っていない。  
iPadで、AIにコードを書いてもらい、GitHub上でファイルをコピペ・差し替えして開発している。

AIは以下を守ること。

- 長い修正コードや新規ファイル群は、できるだけZIPで渡す。
- ZIPがダウンロードできない場合は、重要ファイルを直書きする。
- 変更対象ファイルのパスを必ず明記する。
- 既存ファイルの全体差し替えが必要な場合は「どのファイルを丸ごと置き換えるか」を明記する。
- 秘密情報、APIキー、Supabase Service Role Key、Stripe Secret Keyなどは絶対に要求しない。
- DBの大きな変更は、確認SQL → 結果確認 → migration SQL の順で進める。
- ユーザーはDBやGitの専門家ではない前提で、手順を具体的に説明する。

---

## 2. アプリ概要

未病レーダーは、東洋医学の体質分類と天気変化を組み合わせ、今日・明日の崩れやすさとセルフケアを提案するWebアプリ。

現方針では、単なる「今日の不調を当てるアプリ」ではなく、

> 明日の崩れやすさを、今夜の整え方に変える。

をコアメッセージにする。

競合的には、当日の頭痛・気圧不調のリアルタイム確認は頭痛ーる等に任せる。  
未病レーダーは「明日の自分のために、今夜何を仕込むか」に寄せる。

---

## 3. 技術スタック

主な構成:

- Next.js App Router
- Supabase
- Stripe
- OpenAI API
- MET Norway 天気API
- PWA / Web Push
- GitHub Actions cron

画像は Supabase Storage ではなく、GitHubリポジトリの `public/` 配下で管理している。

---

## 4. 主要機能

### 4.1 体質診断 v2

主な場所:

```text
lib/diagnosis/v2/questions.js
lib/diagnosis/v2/scoring.js
lib/diagnosis/v2/labels.js
lib/diagnosis/v2/engine.js
app/check/*
app/api/diagnosis/v2/*
```

流れ:

1. `/check/run` で回答
2. `POST /api/diagnosis/v2/submit`
3. `scoreDiagnosis()` で体質分類
4. `diagnosis_events` に保存
5. 匿名の場合は `diagnosis_guest_access` にゲストトークン保存
6. `/result/[id]` で結果表示
7. ログイン/登録後、診断結果をユーザーへ紐づけ
8. `constitution_profiles` に最新体質プロフィールを upsert

体質タイプ:

```text
accel_batt_small    = チーター型
accel_batt_standard = オオカミ型
accel_batt_large    = シャチ型
brake_batt_small    = ハリネズミ型
brake_batt_standard = ペンギン型
brake_batt_large    = ゾウ型
```

---

### 4.2 レーダー予報

主な場所:

```text
app/radar/page.js
app/api/radar/v1/*
lib/radar_v1/*
```

流れ:

```text
/radar
  ↓
GET /api/radar/v1/forecast
  ↓
位置情報があれば radar_locations に保存/更新
  ↓
ensureForecastBundle()
  ↓
キャッシュがあれば radar_forecasts / radar_care_plans から取得
  ↓
なければ buildFastRadarBundle() で生成
```

内部処理イメージ:

```text
MET Norway天気API
  ↓
normalizeMetnoForTargetDate()
  ↓
buildWeatherStress()
  ↓
getRadarConstitutionProfile()
  ↓
getReviewFeedback()
  ↓
buildRiskContext()
  ↓
pickTcmPoints()
selectMtestPoint()
  ↓
buildRadarPlan()
  ↓
saveForecast()
saveCarePlan()
```

重要方針:

- スコアや主因はルールベースで決める。
- GPTは最終的な自然文・読み解き・表現補助に寄せる。
- GPTに診断や主因を再推論させない。
- まず高速なルールベース結果を返し、あとから `/api/radar/v1/forecast/enrich` でAI要約や食養生などを補完する二段階設計。

---

### 4.3 パーソナル未病カルテ

主な場所:

```text
lib/personalKarte.js
lib/personalKarteAi.js
app/karte/[id]/*
app/api/karte/[id]/route.js
app/api/stripe/*
```

流れ:

1. `/karte/[id]`
2. `GET /api/karte/[id]`
3. 診断イベント取得
4. `scoreDiagnosis()` を再計算
5. `buildPersonalKarte()` で deterministic なカルテ生成
6. 未購入ならpreview sectionsのみ返却
7. 購入済みならAI生成結果を `personal_karte_reports` にキャッシュ

Stripe webhookで `personal_karte_unlocks` に購入権限が入る。

---

### 4.4 通知

主な場所:

```text
public/sw.js
lib/push/*
app/api/cron/radar-notifications/night
app/api/cron/radar-notifications/morning
```

GitHub Actions cronで夜/朝通知APIを叩く。  
通知設定は `notification_settings`。  
送信ログは `notification_logs`。

---

## 5. 2026-05-08時点で実施済みの重要修正

以下2ファイルは置き換え済み。

```text
lib/supabaseServer.js
lib/requireUser.js
```

目的:

- `supabaseServer.js` のURL環境変数を `NEXT_PUBLIC_SUPABASE_URL` に統一。
- サーバー側Supabase接続を service role key で統一。
- `requireUser.js` に `getBearerToken`, `getOptionalUser`, `requireUser` を整理。

---

## 6. 現在の開発方針 v0.2

詳細は `docs/PRODUCT_PLAN_V0_2.md` を参照。

直近の主戦場:

```text
優先度A
- ダッシュボードの響きやすい要素2チップ表示を最終確認
- 暮らすタブのチップ文言を自然な表現に変更
- 予報ページ上部の文言をさらに磨く
- ダッシュボードの今日ここからカードを自然に整える

優先度B
- 食べるタブのAI生成プロンプト強化
- 食養生を「当たり前の健康アドバイス」から「身体の読み解き」に進化
- 暮らすタブのライフハックパターン増加
- 天気要素別の暮らし方ロジック強化

優先度C
- PR導線の器を各タブ内に作る
- feature flagでON/OFF可能にする
- 商品カテゴリカタログの土台を作る
- 商品タグ重みスコアリング設計
- クリック計測API
- 体質×天気×カテゴリ別の反応分析
```

---

## 7. DBについて

DBの現状は `docs/DB_CURRENT_STATUS_20260508.md` を読むこと。  
スキーマ管理方針は `docs/DB_SCHEMA_MANAGEMENT.md` を読むこと。

2026-05-08時点では、DB制約は概ね健全。  
重複チェックも0件。

今すぐDB修正で開発を止める必要はない。
