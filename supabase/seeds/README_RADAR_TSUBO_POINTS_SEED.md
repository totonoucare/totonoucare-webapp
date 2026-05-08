# radar_tsubo_points seed化メモ

2026-05-08時点で、`docs/RADAR_TSUBO_POINTS_MASTER_20260508.md` に36ツボの一覧を保存した。

ただし、これは引き継ぎ用の一覧であり、完全なseed SQLではない。

理由:

- ユーザーが貼った確認結果には、`illustration_key` などseedに必要な全カラムが含まれていない。
- `public.radar_tsubo_points` は `illustration_key` が NOT NULL のため、不完全なINSERT文を作ると危険。
- 推測で `illustration_key = code` などにするのは避ける。

完全なseedを作る場合は以下をSupabase SQL Editorで実行して、全カラムを確認する。

```text
supabase/checks/20260508_check_radar_tsubo_points_full_columns.sql
```

または、既存の以下を実行して `insert_sql` 列をコピーする。

```text
supabase/seeds/radar_tsubo_points_seed_export_query.sql
```

その結果を以下へ貼る。

```text
supabase/seeds/radar_tsubo_points_seed.sql
```
