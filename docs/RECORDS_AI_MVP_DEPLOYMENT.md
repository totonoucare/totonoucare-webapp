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

## 4. 環境変数と運用設定

v7.72.7以降、公開期間・利用上限・利用モデル・概算単価などの非機密値は、次のコードで管理する。

```text
lib/records/policy.js
```

Netlify / Vercelへ追加する必要があるのは、既存のSupabase/OpenAI接続情報などのSecretだけ。

```dotenv
OPENAI_API_KEY=<Secret>
NEXT_PUBLIC_SUPABASE_URL=<接続先>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<公開anon key>
SUPABASE_SERVICE_ROLE_KEY=<Secret>
```

`OPENAI_SAFETY_IDENTIFIER_SECRET` は任意。未設定時は `SUPABASE_SERVICE_ROLE_KEY` を匿名識別子のハッシュ用secretとして利用する。

現在の公開期間・回数制限等は `docs/RECORDS_POLICY_CODE_CONFIG_V7727.md` を参照する。

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
- 短期グラフは背景＝予報、○△×＝実感、下段＝ケアとして表示される
- 3ヶ月以上は週平均の折れ線ではなく、週内の○△×件数が表示される
- 4つの振り返りカードの日数・ケア有無・日付詳細が一致する
- カレンダーの○△×、予報色、ケア色点が一致する

### AI

- 同意前は外部AIを呼ばず基本分析のみ
- 同意後は分析と会話が利用できる
- 氏名・メール・住所が送信JSONに入らない
- 体質チェックの生回答が送信JSONに入らない
- 解釈済み体質、計算済み予報根拠、表示ケアが送信される
- 安定・いたわり・守りを的中率や症状の断定として扱わない
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

安全上の懸念が出た場合は、`lib/records/policy.js` の `ai.enabled` を `false` にして緊急デプロイする。記録・カレンダーは継続できる。

## 7. ロールバック

`20260711_rollback_records_ai_mvp_complete.sql` はAI・会話・同意・需要確認データと記録拡張列を削除する破壊的SQL。通常は使わず、バックアップからの復元を優先する。実行する場合はコードもv7.69へ戻す。

## 既知の運用上の注意

- 実Supabase/OpenAIを使うE2E確認は、認証情報があるステージングで必要。
- AI利用数チェックはMVPのサーバー側制限。極端な同時リクエストへの厳密な課金カウンタは有料化前にDB原子的予約方式へ強化する。
- Next.js 14系最新へ更新済みだが、依存監査ではNext.js現行世代へのメジャー更新を要求する警告が残る。MVPと分離し、Next.js 16・React 19移行を本番長期運用前の別作業として計画する。
