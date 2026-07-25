# v7.78.25.2 / v7.78.26.2 寒暖差のDB保存契約

## 原因

V2は寒暖差を`main_trigger = temp / trigger_dir = change`として表す。
本番DBの旧`radar_forecasts_trigger_dir_check`が`change`を許可しておらず、明日予報の保存が失敗していた。

## 修正方針

意味を欠落させるコード側の`up/down`変換は行わず、DB制約を現在の保存契約へ更新する。

- `up`: 上昇側、暑熱側、湿気側
- `down`: 低下側、低温側、乾燥側
- `change`: 寒暖差
- `none`: 支配的な方向なし

`mixed / steady`は気圧・気温などの詳細な物理方向であり、引き続き`computed.forecast_snapshot`内へ保存する。

## 適用順

1. `supabase/migrations/20260725_expand_radar_forecasts_trigger_dir_v778252.sql`
2. アプリコードをデプロイ
3. 明日タブを再読込
4. `supabase/checks/20260725_check_radar_forecasts_trigger_dir_v778252.sql`

制約migrationを先に適用すれば、旧アプリが保存する`up/down`もそのまま受け付けるため停止時間は不要。

## 影響なし

- 体調ゆらぎ度
- 天気ストレス計算
- 体質親和性・余力
- 予報本文・対策ケア
- 環境変数
