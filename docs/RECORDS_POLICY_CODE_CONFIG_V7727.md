# v7.72.7 非機密の運用設定をコードへ集約

## 目的

このプロジェクトは、iPadからAIが作成した差分ZIPをGitHubへ反映して運用する。
公開期間や利用上限をNetlify / Vercelの画面で個別管理するより、コード内の一か所を更新する方が現行の開発フローに合うため、秘密ではない運用値を `lib/records/policy.js` へ集約した。

## 現在の設定

```text
記録機能: 有効
記録編集可能期間: 今日を含む直近7日
Ekken / AI分析: 有効
無料先行公開: 2026-07-15 00:00〜2026-08-31 23:59:59（日本時間）
Ekken相談: 1ユーザー月100回答
AI分析の新規生成・更新: 1ユーザー1日1回
短時間上限: 1ユーザー1分6回
分析モデル: gpt-5.6-luna
期間振り返りチャットモデル: gpt-5.6-luna
ライブ相談モデル: gpt-5.6-luna
概算原価: 入力1 USD / 100万token、出力6 USD / 100万token
有料権限product: radar_ai, radar_subscription
```

日付だけの値は、既存仕様どおり日本時間の開始日00:00、終了日23:59:59として扱う。

## 環境変数から削除できる項目

v7.72.7以降、以下の値はコードからのみ読み込み、同名環境変数は参照しない。

```text
RECORDS_ENABLED
RECORDS_EDIT_LOOKBACK_DAYS
RECORDS_AI_ENABLED
RECORDS_AI_BETA_ENABLED
RECORDS_AI_BETA_STARTS_AT
RECORDS_AI_BETA_ENDS_AT
RECORDS_AI_ENTITLEMENT_PRODUCTS
RECORDS_AI_MONTHLY_CHAT_LIMIT
RECORDS_AI_DAILY_ANALYSIS_LIMIT
RECORDS_AI_PER_MINUTE_LIMIT
OPENAI_RECORDS_ANALYSIS_MODEL
OPENAI_RECORDS_CHAT_MODEL
OPENAI_RECORDS_LIVE_CHAT_MODEL
OPENAI_RECORDS_INPUT_USD_PER_MTOK
OPENAI_RECORDS_OUTPUT_USD_PER_MTOK
```

Netlify・Vercelの両方から削除してよい。削除前後でアプリの運用値は変わらない。

## 環境変数へ残すもの

Secretや接続先はコードへ書かない。

```text
OPENAI_API_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
その他、既存の外部サービス用Secret
```

`OPENAI_SAFETY_IDENTIFIER_SECRET` は任意。設定済みなら秘密値なので残してよい。未設定時は既存の `SUPABASE_SERVICE_ROLE_KEY` をハッシュ用secretとして利用する。

## 今後の変更方法

公開期間、上限、モデル等を変更する場合は `lib/records/policy.js` だけを修正し、通常どおりGitHubへ反映して再デプロイする。

無料・有料プランごとに異なる上限を導入する段階では、プラン定義はコード、ユーザーの契約状態はDB / Stripe entitlementで管理する。

## DB

追加migrationなし。
