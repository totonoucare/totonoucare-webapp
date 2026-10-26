# 未病レーダー AI開発引き継ぎ

**対象ソース: v7.79.103**

現行メモは `README-v779102-to-v779103.md`。チェック前の入口は「ログイン」に統一し、無料体験や料金の訴求を表示しません。6タイプの既存画像を使った専用ウェルカム `CheckLoginWelcome` を表示します。

`TrialWelcomeTrigger` は本人向け予報の正常表示ブランチにだけ配置。読み込み・地域設定・エラー・体験終了の画面では要求しません。既存 `ExperienceProvider` が他のガイドとの同時表示を避け、`guide:trial_intro` を `app_experience_events` にアカウント単位で保存します。端末内のアカウント別フラグを通信障害時の補助に使用します。既存v73テーブルがある環境に新SQLは不要です。課金・14日体験の起点は維持。以下は引き継いだv102の仕組みです。

現行変更は `README-v779101-to-v779102.md`。今回の単独施策は「体質チェック前に無料登録・ログイン」。`/check` は紹介画面として公開し、未ログインの開始ボタンは `/signup?next=%2Fcheck%2Frun` へ進みます。`/check/run` とチェック送信APIはログイン必須です。

Google・Email OTP・既存ログインのすべてで認証後に質問へ進みます。新規チェックでは送信と既存attach APIを同じBearer・guest cookieで順に呼び、保存完了後に体質結果を表示します。保存失敗時の同一画面内の再試行は作成済み結果IDを再使用します。古い未保存結果からの登録・保存は維持します。

`lib/checkRegistration.js` がチェック開始の戻り先を共通管理します。明示的なチェック開始URLは古いpending結果を引き継ぎません。`pendingDiagnosisAttach` は結果IDなしのチェック開始先も12時間保持します。古いpending結果と新しいチェック開始を混同しないこと。課金・体験開始日の計算は変更していません。

追加SQL・環境変数・メール設定変更はありません。既存イベントを使用し、未ログインのチェック開始CTAは `signup_cta_click`（source/cta_location空）で記録します。結果表示より前に登録・認証・結果保存が起こるため、旧「結果表示以降の認証」集計を新導線へそのまま適用しないでください。LP遷移先・トップ画面・予報プレビューは変更しません。

以下のv101の表示仕様とv100のロジックは継続しています。

v101の表示仕様は `README-v779100-to-v779101.md`。メインタイプ直下のケアタブ誘導カードを撤去し、固定の保存CTAは約100pxスクロール後に一度だけ表示。閉じる状態はタブをまたいで保持し、結果IDが変わるとリセットします。初期表示時には表示・露出計測をしません。

結果からの登録画面は「体質を保存」。既存のアクセス制御付き結果取得APIで動物とタイプ名を確認し、取得できない場合は「今回の体質結果」で登録を継続します。診断・予報の新規生成、保存API、認証関数の変更はありません。予報プレビューは表示しません。

v100の食べるケアは短い理由・料理/飲み方・開閉式の東洋医学解説へ分離済み。解説本文は `foodExplanations.js` と `drinkExplanations.js`、全数一覧は `docs/FOOD_DRINK_EXPLANATIONS_V779100.md`。原料・参照先は `docs/FOOD_DRINK_REFERENCES_V779100.md`。

食材81種類の採用作用・係数は維持。追加食材を明示した12料理は追加分の寒熱も選定時に確認します。飲料は既存14のIDを維持して8追加。香りだけの気滞加点、コーヒーの疲れへの覚醒加点を外し、原料に応じた作用を選定と説明へ通しています。既存の寒熱・カフェイン・記録タイミングの制約を維持。

通知の保存閾値は0〜10点の4。ユーザー向けの説明には `notificationThresholdLabel()` を使い、40点以上（いたわり以上）と表示します。保存列へ40を書き込まないこと。

今回の更新にSQL・バックフィルはありません。診断のmovement_responseの係数・固定分母・reaction寄与は維持する判断で固定。動物タイプと予報点数の計算も変更していません。負担ライン保存のv90修正と、プロフィールなしユーザーを予報生成の対象外にするv93修正も維持。

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
RELEASE-v7.79.89.md
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

v7.79.89時点:

- AI先行公開: 2026-09-30まで
- 登録14日体験: 2026-10-01開始
- AIモデル: `gpt-6-luna`
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

登録画面の予報プレビューは撤去済みです。関連コンポーネントやAPIは互換用に残っていますが、登録画面へ再び組み込まないでください。結果IDがある場合は、小さな動物・タイプ名→2行の保存見出し→短い便益→安心情報3バッジ→Google→「または」→メールの順です。登録済みの利用者も同じ認証方法を使います。

CTA位置・閉じる・戻る・登録再訪の既存イベントを維持してください。`signup_cta_view` は固定CTAが実際に現れた後に記録します。結果への戻りリンクはヘッダーへ集約。既存の計測SQLは `supabase/migrations/20260928_signup_preview_v77985.sql`（v84の変更を包含）で、v101の追加SQLはありません。

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
