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
