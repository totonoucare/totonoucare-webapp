# DB現状メモ 2026-05-08

> 履歴資料。v7.78.25で旧Karte Plus、旧記録・分析、旧カード用テーブルは削除した。  
> 現在の削除対象と実行SQLは`docs/OBSOLETE_FLOW_CLEANUP_V77825.md`を参照。

## 結論

2026-05-08時点で、DB制約は概ね健全。  
開発を止めてDB制約を直す必要はほぼない。

重複チェックは全部0件。

---

## 確認済みの重要unique/index

以下は確認済み。

```text
daily_checkins: user_id + date unique あり
daily_care_logs: user_id + date + kind + card_id unique あり
radar_forecasts: user_id + target_date unique あり
radar_reviews: user_id + target_date unique あり
personal_karte_unlocks: user_id + diagnosis_event_id unique あり
personal_karte_reports: diagnosis_event_id + source_hash unique あり
notification_logs: user_id + target_date + notification_type unique あり
weekly_ai_reports: user_id + week_start + report_type unique あり
radar_locations: primary location は user_id 単位で unique あり
```

---

## RLS状況

主要テーブルはRLS有効。  
基本は `auth.uid() = user_id` で本人のみSELECT/INSERT/UPDATE/DELETEする設計。

注意:

- `diagnosis_guest_access` は RLS ON だが policyなし。
- これはブラウザから直接触れない状態なので、ゲスト診断トークン保護としては妥当。
- API側の service role 経由で扱う想定ならOK。

---

## 重複しているindex

以下は同じようなunique indexが二重にある。

```text
constitution_events_source_event_id_uidx
constitution_events_source_event_id_unique

radar_locations_primary_unique
radar_locations_user_primary_unique

radar_reviews_unique
radar_reviews_user_date_unique
```

動作上の大きな問題はない。  
今すぐ削除しなくてよい。下手に消すより放置が安全。

---

## radar_tsubo_points

確認結果:

```text
total_points: 36
active_points: 36
inactive_points: 0
```

現役で使っている重要テーブル。

主な使用箇所:

```text
lib/radar_v1/pickTcmPoints.js
lib/radar_v1/mtestPointRepo.js
lib/radar_v1/selectMtestPoint.js
```

`mtest_block` がnullのツボが12件あるが、これは問題なしと判断。

理解:

```text
M-test用ツボ: A〜F blockあり
汎用・東洋医学的ケア用ツボ: mtest_block null
```

タグ件数:

```text
trigger_tag:
- temp: 35
- pressure: 23
- humidity: 14

symptom_tag:
- headache: 19
- neck_shoulder: 15
- mood: 11
- fatigue: 9
- dizziness: 8
- sleep: 8
- low_back_pain: 6
- swelling: 4
```

将来の改善余地:

- humidity / swelling / fatigue 寄りのツボや暮らしケアロジックを増やす余地あり。
- ただしMVPとしては36ツボで十分。

---

## care_cards / radar_tsubo_cards

### care_cards

旧guide機能で使っていた可能性が高い。  
現在の未病レーダー本線では重要度低め。

### radar_tsubo_cards

旧ツボカード設計の名残っぽい。  
`radar_care_plans` の外部キーとして残っている。

すぐ削除しない。legacy候補として保留。

### radar_tsubo_points

現役。削除禁止。
