# migrations

Supabase SQL Editorで実際に実行するDB変更SQLを置く場所。

命名例:

```text
20260508_0001_add_affiliate_catalog.sql
20260508_0002_add_affiliate_click_events.sql
```

## ルール

- 変更前に `supabase/checks/` の確認SQLを実行する。
- 実行済みのSQLだけをここに残す。
- 失敗した実験SQLは入れない。
- 秘密情報は絶対に入れない。

## v7.71 Daily Care実行記録

```text
20260713_create_radar_care_actions_v771.sql
20260713_rollback_radar_care_actions_v771.sql
```

適用前後の仕様は `docs/DAILY_CARE_ACTIONS_V771.md`、確認SQLは `supabase/checks/20260713_check_radar_care_actions_v771.sql` を参照する。

## v7.71.2 ケア記録データ整合性

```text
20260713_add_care_data_integrity_v7712.sql
20260713_rollback_care_data_integrity_v7712.sql
```

v7.71 migration適用後に実行する。確認SQLは `supabase/checks/20260713_check_care_data_integrity_v7712.sql`、仕様は `docs/CARE_ACTION_DATA_INTEGRITY_V7712.md` を参照する。

## v7.72.0 Ekiken・今の体調相談

```text
20260714_add_ekiken_live_support_v7720.sql
20260714_rollback_ekiken_live_support_v7720.sql
```

期間振り返りチャットと今の体調相談の会話を `thread_kind` で分離する。確認SQLは `supabase/checks/20260714_check_ekiken_live_support_v7720.sql`、仕様は `docs/EKIKEN_LIVE_SUPPORT_V7720.md` を参照する。

## v7.72.2 Ekiken会話品質・利用イベント

```text
20260714_add_live_support_quality_v7722.sql
20260714_rollback_live_support_quality_v7722.sql
```

`records_feature_events` で `live_support_opened` を許可する。v7.72.0 migration適用後に実行する。確認SQLは `supabase/checks/20260714_check_live_support_quality_v7722.sql`、仕様は `docs/EKIKEN_SAFETY_QUALITY_V7722.md` を参照する。
