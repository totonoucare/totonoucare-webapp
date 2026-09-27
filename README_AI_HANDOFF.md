# 未病レーダー AI開発引き継ぎ

**対象ソース: v7.79.83**

このファイルは、新しいAI開発担当が最初に読むための入口です。過去のバージョン履歴はここへ積み上げません。

---

## 判断の優先順位

```text
1. ユーザーの最新メッセージ
2. 現在アップロードされているソースコード
3. 現在のDB状態・Supabase確認結果
4. 現行方針資料と設定ファイル
5. RELEASE / CHANGELOGなどの過去資料
6. 過去会話の記憶
```

日付付きMarkdownや旧リリース文書は、その時点のsnapshotです。古い「次にやること」を現在の作業指示として扱わないでください。

---

## 最初に読むもの

```text
README.md
docs/PRODUCT_DIRECTION.md
lib/records/policy.js
docs/DB_SCHEMA_MANAGEMENT.md
docs/ENVIRONMENT_AND_EXTERNAL_SERVICES.md
.env.example
```

DB変更を伴う場合:

```text
docs/DB_CURRENT_STATUS_20260508.md
supabase/
```

現在の登録導線・Email OTPを触る場合:

```text
RELEASE-v7.79.81.md
deploy/email-otp.html
lib/funnelClient.js
lib/funnelEvents.js
```

---

## 開発体制

AIが担当するもの:

- コード理解
- 設計判断
- 修正案・修正ファイル作成
- SQL作成
- テストやビルドを実行できる環境では、その確認

ユーザー側の実環境操作が必要なもの:

- Supabase SQL Editorへの本番SQL適用
- 本番のOAuth / Stripe / Supabase / Netlify等の設定変更
- 実機でのメール・通知・Instagram内ブラウザ等の確認

複数ファイルを変更する場合は、原則としてフルソースZIPを返す運用です。

---

## 壊さない現行契約

### 1. 体質チェック

主な実装:

```text
lib/diagnosis/v2/engine.js
lib/diagnosis/v2/scoring.js
lib/diagnosis/v2/carePreferences.js
lib/diagnosis/v2/questions.js
```

`constitution.core` を最上位の統合結果として扱います。下位傾向や経絡、不調フォーカスをコアタイプと同列の別診断として扱わないでください。

### 2. 体調予報

主な実装:

```text
lib/radar_v1/personalizeForecastV2.js
lib/radar_v1/weatherStressV2.js
lib/radar_v1/buildRadarPlan.js
lib/radar_v1/careRules/dailyCareV2.js
lib/radar_v1/displayedCareSnapshot.js
```

現行の予報V2では、体質と天気からルールベースで予報構造を決めます。

重要:

- AIに予報点数を再計算させない
- AIに主因・副因を自由に決めさせない
- 当日の本人入力を過去に生成済みの予報点数へ逆流させない
- 同じ対象日・同じ条件でケア候補を無意味にランダム化しない
- 保存済みケアの出自・snapshotを壊さない

### 3. Daily Care

基本カテゴリ:

```text
暮らす
食べる
ほぐす
```

Daily Careは予報の計算済み要因、体質、不調フォーカスなどを使って選定します。ケアIDや保存形式を変更する場合は、既存記録との互換性を必ず確認してください。

### 4. AIミモル

主な実装:

```text
lib/records/aiContext.js
lib/records/aiPrompts.js
lib/records/analysis.js
lib/records/liveSupport.js
app/api/records/
```

AIミモルは、記録分析・期間振り返り・今の体調相談に使います。

ユーザー向け表示名は「AIミモル」が基本です。コードや旧資料に `Ekken / Ekiken` が残っていても、内部識別として意図的に残っている場合があります。名称だけを理由に一括置換しないでください。

### 5. 利用条件・モデル・上限

正本:

```text
lib/records/policy.js
lib/records/accessPolicy.js
```

v7.79.83時点:

- AI先行公開: 2026-09-30まで
- 登録14日体験: 2026-10-01開始
- AIモデル: `gpt-5.6-luna`
- AI相談: 月100回答
- AI分析: 1日1回
- 短時間上限: 1分6回

これらをREADMEや環境変数だけで変更しないでください。まず正本コードを確認します。

### 6. 登録・Email OTP・内部計測

v7.79.81で大きく変更されています。

主な実装:

```text
app/signup/SignupClient.js
app/auth/callback/AuthCallbackClient.js
app/api/funnel/route.js
lib/funnelClient.js
lib/funnelEvents.js
deploy/email-otp.html
supabase/migrations/20260927_signup_funnel_v77981.sql
```

Email OTPの本番設定はコードだけでは完結しません。変更時は `RELEASE-v7.79.81.md` の適用手順を確認してください。

### 7. DB

```text
supabase/schema/      snapshot。原則そのまま実行しない
supabase/migrations/  実変更SQL
supabase/checks/      確認用SELECT
supabase/seeds/       seed / master data
```

DB変更前に、既存スキーマ、RLS、制約、index、trigger/function、既存データを確認します。

現在のDB状態が必要な作業では、古いsnapshotだけで決めず、ユーザーにSupabase確認SQLを実行してもらう前提で設計します。

---

## Secret管理

GitHubへ実値を入れないものの例:

```text
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
OPENAI_API_KEY
Google OAuth Client Secret
WEB_PUSH_VAPID_PRIVATE_KEY
CRON_SECRET
```

変数名は `.env.example` を正本として確認してください。

---

## 表現上の方針

未病レーダーでは、生活者が意味を想像できる明確な日本語を優先します。

- 詩的で意味が取りにくい抽象語を増やさない
- 東洋医学語を使う場合は、身体感覚や具体的行動へつなげる
- 医療効果の断定を避ける
- 開発都合の説明をユーザー画面へ持ち込まない
- 安全案内を必要以上に反復しない

詳細なコピー方針は、対象機能の現行コードと関連 `docs/` を確認してください。

---

## 作業時のチェック

変更前:

- 現行コードを読む
- 関連するテストを探す
- DB・認証・保存形式への影響を確認する

変更後:

- 対象テストを実行
- 可能なら `npm test`
- 可能なら `npm run build`
- migrationや本番設定が必要なら、適用順を明記
- 変更ファイル一覧を残す

実環境で確認できていないものは「未確認」と明記してください。

---

## 履歴の探し方

```text
CHANGELOG.md                         更新履歴の入口
RELEASE-v*.md                       各リリースの変更点
SETUP-v*.txt / SETUP-v*.md          過去の適用手順
CHANGED-* / UPDATED-*               変更ファイル一覧
docs/archive/                       旧README・旧引き継ぎ全文
```

旧READMEの長い履歴は以下に保存しています。

```text
docs/archive/README_FULL_HISTORY_PRE_V77983.md
docs/archive/README_AI_HANDOFF_FULL_HISTORY_PRE_V77983.md
```
