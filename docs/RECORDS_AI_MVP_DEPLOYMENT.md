# v7.70 記録・AI分析 MVP 導入手順

## 重要

- ZIP内のSQLはまだSupabaseへ適用されていない。
- 本番へ直接当てず、DBバックアップとステージング確認を先に行う。
- 途中生成版v7.70のSQLと、この完成版SQLを重ねて適用しない。

## 1. コード確認

```bash
npm ci
npm test
npm run build
```

ローカルでGoogle Fontsへの通信を遮断している環境では、`next/font` の取得だけでビルドが止まる場合がある。本番ビルド環境で通常通信できる場合はコード変更不要。

## 2. DBバックアップと適用前確認

1. Supabaseで本番バックアップを取得する。
2. `supabase/checks/20260711_records_ai_mvp_preflight.sql` を実行する。
3. `radar_reviews` の同一ユーザー・同一日重複、condition/preventの異常値がないことを確認する。
4. 異常があれば移行前に解消する。

## 3. マイグレーション

Supabase SQL Editorまたは通常のマイグレーション手順で、次だけを適用する。

```text
supabase/migrations/20260711_create_records_ai_mvp_complete.sql
```

適用後に次を実行する。

```text
supabase/checks/20260711_records_ai_mvp_verify.sql
```

確認項目:

- 新規7テーブルが存在する
- `radar_reviews` に6列が追加されている
- AI関連テーブルでRLSが有効
- 自分のデータだけ読めるSELECT policyが存在する
- 不正なcare/factor値が0件
- `radar_reviews_records_metadata_trigger` が存在する

## 4. 環境変数

既存のSupabase/OpenAI設定に加え、次を設定する。

```dotenv
RECORDS_ENABLED=true
RECORDS_EDIT_LOOKBACK_DAYS=7

RECORDS_AI_ENABLED=true
RECORDS_AI_BETA_ENABLED=true
RECORDS_AI_BETA_STARTS_AT=<公開日時またはYYYY-MM-DD>
RECORDS_AI_BETA_ENDS_AT=<終了日時またはYYYY-MM-DD>
RECORDS_AI_ENTITLEMENT_PRODUCTS=radar_ai,radar_subscription

RECORDS_AI_MONTHLY_CHAT_LIMIT=100
RECORDS_AI_DAILY_ANALYSIS_LIMIT=3
RECORDS_AI_PER_MINUTE_LIMIT=6

OPENAI_RECORDS_ANALYSIS_MODEL=gpt-5.6-luna
OPENAI_RECORDS_CHAT_MODEL=gpt-5.6-luna
OPENAI_SAFETY_IDENTIFIER_SECRET=<十分に長いランダム値>
OPENAI_RECORDS_INPUT_USD_PER_MTOK=1
OPENAI_RECORDS_OUTPUT_USD_PER_MTOK=6
```

`RECORDS_AI_BETA_ENABLED` の初期値はfalse。終了日の未設定で無期限開放しないよう、公開前に必ず期間を決める。

OpenAI APIキー、Supabase service role key、safety identifier secretはブラウザ公開変数にしない。

## 5. ステージング受け入れ確認

### 記録

- 未ログインでは記録画面がログイン案内になる
- 今日と過去6日は保存・編集できる
- 8日以上前と未来日は保存できない
- ケアありの場合、種類と時刻なしでは保存できない
- 予報と実感がずれた日だけ生活条件質問が出る
- 同じ日の再保存で新規行が増えず更新される
- 保存済み予報スナップショットが編集後も変わらない
- v7.69の既存action_tagsを読み替えられる

### グラフ・カレンダー

- 予報のない日が安定色にならない
- 1ヶ月以下は日表示、3ヶ月以上は週表示
- 週集計点から誤った1日へ遷移しない
- 予報と実感マップの上下左右と説明が一致する
- カレンダーの○△×、予報色、ケア色点が一致する

### AI

- 同意前は外部AIを呼ばず基本分析のみ
- 同意後は分析と会話が利用できる
- 氏名・メール・住所が送信JSONに入らない
- 同じデータ・期間では保存済み分析を返す
- 新しい記録後に分析が更新される
- 利用上限超過時に429と日本語案内が出る
- 緊急語では外部AIを呼ばず安全案内を返す
- 薬・漢方・サプリの個別判断を避け、専門家確認へ誘導する
- 会話削除でthread/messagesが削除される
- 同意取消後は新しいAI送信ができない

### 専門家予告

- 「利用してみたい」が保存・取消できる
- 予約や決済が発生しない旨が表示される

## 6. 先行公開中の監視

- `records_ai_events` の回数、トークン、概算原価
- エラー率とrate limit発生率
- 👎理由、とくに `felt_unsafe` と `not_grounded`
- 記録3日・7日継続率
- AI会話開始率
- 専門家相談希望率

安全上の懸念が出た場合は、まず `RECORDS_AI_ENABLED=false` でAIだけ停止する。記録・カレンダーは継続できる。

## 7. ロールバック

`20260711_rollback_records_ai_mvp_complete.sql` はAI・会話・同意・需要確認データと記録拡張列を削除する破壊的SQL。通常は使わず、バックアップからの復元を優先する。実行する場合はコードもv7.69へ戻す。

## 既知の運用上の注意

- 実Supabase/OpenAIを使うE2E確認は、認証情報があるステージングで必要。
- AI利用数チェックはMVPのサーバー側制限。極端な同時リクエストへの厳密な課金カウンタは有料化前にDB原子的予約方式へ強化する。
- Next.js 14系最新へ更新済みだが、依存監査ではNext.js現行世代へのメジャー更新を要求する警告が残る。MVPと分離し、Next.js 16・React 19移行を本番長期運用前の別作業として計画する。

