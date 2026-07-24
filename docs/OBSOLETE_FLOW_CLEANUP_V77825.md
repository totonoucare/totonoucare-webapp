# v7.78.25 旧導線・旧生成経路の整理

## 残すもの

- 現行の体質チェックと体質トリセツ
- 体調予報V2、定時スナップショット、通知
- `/records`の記録、Ekken分析・相談
- Stripeの`radar_subscription`用Checkout／Webhook
- `entitlements`とpremium status

## 削除したもの

- 旧Karte Plus画面、API、レポート生成、単品購入
- 予報ページ用GPT補完、live予報、生成待ち・旧生成文維持処理
- 旧カレンダー、旧インサイト、旧チェックイン、旧ケアログ
- 参照されていなかった旧ガイドカードAPI
- 旧機能専用の環境変数と文書

## DB整理

`supabase/migrations/20260724_remove_obsolete_routes_data_v77825.sql`で以下を削除する。

- `personal_karte_reports`
- `personal_karte_unlocks`
- `weekly_ai_reports`
- `daily_care_logs`
- `daily_checkins`
- `care_cards`
- `radar_tsubo_cards`
- `radar_forecasts.gpt_summary / gpt_model / gpt_generated_at`

現行データの正本である`diagnosis_events`、`constitution_events`、`radar_forecasts`、
`radar_reviews`、`radar_care_actions`、records AI各テーブル、`entitlements`は保持する。
