# v7.69 → v7.70 完成版 差分一覧

> 履歴資料。ここに記載された旧Karte、旧calendar／insights、live予報の導線はv7.78.25で削除済み。

> v7.70.3更新: 旧 `ForecastActualMap.jsx` は削除し、`ForecastPatternCards.jsx` と `aiContext.js` を追加。詳細は `RECORDS_AI_REFLECTION_CONTEXT_V7703.md` を参照。

比較元: `totonoucare-webapp-my-care-select-v7-69-daily-care-category-tones`

途中生成されたv7.70ではなく、v7.69からこの完成版へ直接比較した一覧。削除ファイルはない。

## 修正ファイル（16）

| ファイル | 変更内容 |
|---|---|
| `.env.example` | 記録、先行期間、AI権限・上限、モデル、匿名安全ID、原価設定を追加。beta初期値をfalse化 |
| `app/HomeClient.jsx` | ホーム予報カードへ「今日を振り返る／記録済み」導線を追加 |
| `app/api/karte/[id]/route.js` | v7.69にあった存在しない関数importを実在する `buildKartePlusMtestPointCards` へ修正 |
| `app/api/radar/review/route.js` | プレミアム限定を解除し無料記録化。構造化ケア、時刻、差分要因、7日制限、予報スナップショット、旧DB互換を実装 |
| `app/api/radar/v1/forecast/route.js` | 認証ヘッダーを読むAPIを明示的にdynamic化 |
| `app/api/radar/v1/forecast/live/route.js` | 同上 |
| `app/api/radar/v1/forecast/public/route.js` | URL依存APIを明示的にdynamic化 |
| `app/calendar/page.js` | 旧カレンダー入口を新しい記録タブへ統合 |
| `app/insights/page.js` | 旧分析入口を新しいAI分析タブへ統合 |
| `app/radar/page.js` | 今日・明日切替の横へ独立した記録導線を追加。今日のみ記録済み状態を取得 |
| `app/records/page.js` | `record / analysis / expert` クエリ対応の3タブページへ刷新 |
| `components/illust/home/HeroGuideBot.jsx` | 通常・寄り添い・考える・気づき・完了の表情を追加。SVG ID衝突も回避 |
| `components/records/RecordsPageClient.jsx` | 3タブ、認証、月カレンダー、日次保存、分析遷移、利用イベントを統合 |
| `lib/openai/server.js` | Responses APIの構造化出力、`store:false`、匿名安全ID、トークン取得を追加。既存呼出し互換を維持 |
| `lib/radar_v1/reviewFeedback.js` | AI自己調整でも記録時点の予報スナップショットを優先し、後日再計算による歪みを防止 |
| `package.json` | テスト追加、lock生成、Next 14.2系修正版、Supabase v2修正版、PostCSS修正版、依存override |

## 新規ファイル（31）

### API（8）

| ファイル | 役割 |
|---|---|
| `app/api/records/analysis/route.js` | 期間集計、同意・権限・上限、キャッシュ、AI構造化分析 |
| `app/api/records/chat/route.js` | サーバー保持会話、AI応答、緊急ルール、使用量記録 |
| `app/api/records/consent/route.js` | 外部AI送信への明示同意・取消 |
| `app/api/records/events/route.js` | 記録機能の許可済み利用イベント |
| `app/api/records/expert-interest/route.js` | 専門家相談の需要確認 |
| `app/api/records/feedback/route.js` | AI回答評価。本人のrequest_idだけ評価可能 |
| `app/api/records/range/route.js` | 最大370日の予報・記録・権限取得 |
| `app/api/records/threads/route.js` | 期間別会話読込と本人による実データ削除 |

### UI（6）

| ファイル | 役割 |
|---|---|
| `components/records/AiAnalysisPanel.jsx` | 期間、要約、グラフ、同意、AI分析、会話、評価、安全表示 |
| `components/records/DailyRecordCard.jsx` | キャラ会話風の日次入力・確認・編集 |
| `components/records/ExpertConsultPreview.jsx` | Google Meet相談予告と需要確認 |
| `components/records/ForecastPatternCards.jsx` | 注意／安定予報 × 穏やか／つらさありの4パターン |
| `components/records/RecordsCalendar.jsx` | 予報色・○△×・ケア色点の月カレンダー |
| `components/records/RecordsTrendChart.jsx` | 予報・実感・ケアの時系列、長期週集計 |

### 記録・AIロジック（6）

| ファイル | 役割 |
|---|---|
| `lib/records/access.js` | 先行期間と将来entitlementの権限判定 |
| `lib/records/aiEvents.js` | AI回数制限、原価推定、利用・評価イベント、同意確認 |
| `lib/records/aiPrompts.js` | 分析・会話の安全指示、JSON Schema、緊急語、出力正規化 |
| `lib/records/aiContext.js` | 共通知識、解釈済み体質、予報根拠、表示ケアをAI向けに構造化 |
| `lib/records/analysis.js` | 4パターン集計、実感中心チャート点、基本分析、予報根拠スナップショット |
| `lib/records/server.js` | DB読込、ケア提案・予報根拠読込、旧スキーマ互換、匿名化・ハッシュ |

### SQL（4）

| ファイル | 役割 |
|---|---|
| `supabase/migrations/20260711_create_records_ai_mvp_complete.sql` | 完成版マイグレーション本体 |
| `supabase/migrations/20260711_rollback_records_ai_mvp_complete.sql` | 破壊的ロールバック |
| `supabase/checks/20260711_records_ai_mvp_preflight.sql` | 適用前の読み取り専用確認 |
| `supabase/checks/20260711_records_ai_mvp_verify.sql` | 適用後の読み取り専用確認 |

### テスト・文書・依存固定（7）

| ファイル | 役割 |
|---|---|
| `tests/records-analysis.test.mjs` | 9組合せから4パターンへの集約、予報なし、互換タグ、週内○△×、スナップショット |
| `tests/records-ai-safety.test.mjs` | 緊急・専門家誘導検知、AI出力制限、安全フィールド・禁止事項 |
| `docs/RECORDS_AI_MVP_V770_COMPLETE.md` | 完成仕様 |
| `docs/RECORDS_AI_MVP_DEPLOYMENT.md` | DB・環境変数・受け入れ・切り戻し手順 |
| `docs/RECORDS_AI_MVP_CHANGELOG.md` | この全差分一覧 |
| `docs/RECORDS_AI_REFLECTION_CONTEXT_V7703.md` | v7.70.3のUI・AIコンテキスト差分 |
| `package-lock.json` | 依存バージョンを再現可能に固定 |

## DB変更概要

### `radar_reviews` 追加列

- `care_domains text[]`
- `care_timing text`
- `context_factors text[]`
- `forecast_snapshot jsonb`
- `record_version smallint`
- `updated_at timestamptz`

旧 `action_tags` は消さず、読み書き互換を維持する。

### 新規テーブル

- `records_ai_consents`
- `records_ai_analyses`
- `records_ai_threads`
- `records_ai_messages`
- `records_ai_events`
- `records_feature_interests`
- `records_feature_events`

## 検証結果

- `npm test`: 19件成功、失敗0
- `next build`: 成功
- 起動スモーク: `/`, `/radar`, `/records?tab=analysis`, `/calendar`, `/insights` がHTTP 200
- 未認証API: `/api/records/range` がHTTP 401（期待どおり）
- PostgreSQL構文解析: マイグレーション、事前確認、適用後確認、ロールバックの4SQLすべて成功
- 実Supabase/OpenAI E2E: 認証情報を使うステージングで要確認
