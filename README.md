# 未病レーダー

**現行ソース: v7.79.83**

未病レーダーは、体質と天気から「体調が崩れやすいタイミング」と影響要因を示し、その日にできるセルフケアへつなげるWebアプリです。

コアメッセージは以下です。

> 明日の崩れやすさを、今夜の整え方に変える。

詳細なプロダクト方針は `docs/PRODUCT_DIRECTION.md` を参照してください。

---

## 主な機能

- 体質チェック
  - コアタイプ、気血水などの傾向、経絡傾向、天気との相性を扱う
- 今日・明日の体調予報
  - 体質 × 天気のルールベース計算で予報を構成
- 対策ケア
  - `暮らす / 食べる / ほぐす` の3方向から提案
- 記録・振り返り
  - 体調、実行したケア、予報との関係を保存して振り返る
- AIミモル
  - 記録分析、期間振り返り、今の体調相談を支援
- PWA / Web Push通知
- ケアショップ / ケアナビ

---

## 現行実装の重要ルール

### 体調予報

予報の点数、主因・副因、天気ストレス、表示ケアなどの中核はコード側で決定します。

OpenAI APIに予報点数を再計算させたり、保存済み予報を自由に上書きさせたりしません。

体調予報V2が標準です。

```text
RADAR_FORECAST_MODEL_VERSION=v2
```

緊急ロールバック用途を除き、V1へ戻さない前提です。

### AIミモル

OpenAI APIは主に以下へ使用します。

- AI分析
- 期間振り返りチャット
- 今の体調相談

モデルや利用上限など、秘密ではない運用値は `lib/records/policy.js` が正本です。

### アクセス制御

v7.79.83時点のコードでは、以下を `lib/records/policy.js` で管理します。

- AI先行公開: 2026-09-30まで
- 登録者向け14日間体験: 2026-10-01開始
- 体験・契約対象: 個別予報、ケア、記録書き込み、通知、分析、相談

画面表示とアクセス判定を変更する場合は、`lib/records/policy.js` と `lib/records/accessPolicy.js` の両方を確認してください。

---

## 技術スタック

```text
Next.js 14 / App Router
React 18
Tailwind CSS
Supabase Database / Auth
Stripe
OpenAI API
MET Norway API
PWA / Web Push
GitHub Actions
Vercel Preview
Netlify Production
```

画像は主に `public/` 配下で管理します。

---

## セットアップ

### 1. 依存関係

```bash
npm install
npm run dev
```

本番相当の確認:

```bash
npm test
npm run build
```

### 2. 環境変数

`.env.example` を参照してください。

Secret値はGitHubへ保存しません。

主な外部サービス設定は以下です。

```text
docs/ENVIRONMENT_AND_EXTERNAL_SERVICES.md
docs/AUTH_AND_DEPLOY_URLS_20260508.md
```

### 3. Supabase

DB変更は `supabase/migrations/` のmigrationを基準に管理します。

```text
supabase/schema/      現状把握用snapshot。原則そのまま実行しない
supabase/migrations/  実際の変更SQL
supabase/checks/      確認用SQL
supabase/seeds/       マスターデータ関連
```

運用ルールは `docs/DB_SCHEMA_MANAGEMENT.md` を参照してください。

**重要:** v7.79.81で登録導線・Email OTP・内部計測の初期設定が追加されています。既存環境から更新する場合は `RELEASE-v7.79.81.md` を確認してください。v7.79.83自体には追加SQL・メール設定はありません。

---

## 主要ディレクトリ

```text
app/              画面・API Routes
components/       UIコンポーネント
lib/diagnosis/    体質チェック
lib/radar_v1/     体調予報・天気・Daily Care
lib/records/      記録・AIミモル・アクセス制御
lib/care-navi/    ケアナビ・商品検索補助
lib/care-shop/    ケアショップ
lib/push/         Web Push通知
public/           画像・PWA・service worker
docs/             設計・運用資料
supabase/         DB関連
.github/          GitHub Actions
```

---

## AI開発担当が最初に読むもの

```text
README_AI_HANDOFF.md
docs/PRODUCT_DIRECTION.md
lib/records/policy.js
docs/DB_SCHEMA_MANAGEMENT.md
docs/ENVIRONMENT_AND_EXTERNAL_SERVICES.md
.env.example
```

必要な領域だけ、その後に個別の `docs/` と `RELEASE-*.md` を参照してください。

---

## 現行リリース

### v7.79.83

- 「整え方」7方針の説明文と見出しを調整
- カード群の下に、日々の具体的ケアにつながる説明を追加
- 低余力の理由文を調整
- 点数・選定・認証処理の変更なし
- v7.79.82の保存案内変更も包含
- 追加SQL・メール設定なし

詳細: `RELEASE-v7.79.83.md`

変更ファイル: `CHANGED-v7.79.83.txt`

---

## 更新履歴

更新履歴の入口は `CHANGELOG.md` です。

旧READMEに蓄積されていた詳細履歴は削除せず、以下へ退避しています。

```text
docs/archive/README_FULL_HISTORY_PRE_V77983.md
docs/archive/README_AI_HANDOFF_FULL_HISTORY_PRE_V77983.md
```

日付付き資料や古いリリース文書は、その時点のsnapshotとして扱ってください。現在の仕様判断では、ユーザーの最新指示と現行コードを優先します。
