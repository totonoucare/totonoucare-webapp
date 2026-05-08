# DBスキーマ管理ルール

最終更新: 2026-05-08

## 目的

SupabaseのDB設計をGitHub上でも管理し、AI引き継ぎ時に毎回DB構造を説明しなくて済むようにする。

---

## 基本方針

このリポジトリでは、DB関連ファイルを `supabase/` 配下に置く。

```text
supabase/
  schema/
    public_schema_snapshot_20260508.sql
  migrations/
    20260508_0001_example.sql
  checks/
    20260508_check_db_metadata.sql
  seeds/
    radar_tsubo_points_seed.sql
```

## 重要

- `schema/` は現状把握用。原則そのまま実行しない。
- `migrations/` は実際にSupabase SQL Editorで実行する変更SQL。
- `checks/` は確認用SELECT。
- `seeds/` はマスターデータ投入用。
- 秘密情報は絶対に入れない。

---

## iPad運用でのDB変更手順

1. AIに「確認SQL」を作らせる
2. Supabase SQL Editorで確認SQLを実行
3. 結果をAIに貼る
4. AIにmigration SQLを作らせる
5. migration SQLをGitHubの `supabase/migrations/` に保存
6. 同じSQLをSupabase SQL Editorにコピペして実行
7. 実行後、必要なら `supabase/schema/` のsnapshotを更新

---

## schema snapshot の更新方法

Supabaseの画面で:

```text
Database
→ Tables
→ public schema
→ Copy as SQL
```

または同等の操作で取得したSQLを、以下のような名前で保存する。

```text
supabase/schema/public_schema_snapshot_YYYYMMDD.sql
```

Supabaseの `Copy as SQL` には以下のWARNINGが付くことがあるが、正常。

```sql
-- WARNING: This schema is for context only and is not meant to be run.
```

これは「現状把握用で、そのまま実行するな」という意味。  
GitHubに保存してOK。

---

## RLS / index / trigger の管理

Supabaseの `Copy as SQL` だけでは、RLS policy / index / trigger / function の全体が十分に見えないことがある。

そのため、以下もメモとして残す。

```text
docs/DB_CURRENT_STATUS_20260508.md
supabase/checks/20260508_check_db_metadata.sql
```

---

## マスターデータ

少なくとも `radar_tsubo_points` は現役の重要マスター。

今後、以下はseed化すると安心。

```text
supabase/seeds/radar_tsubo_points_seed.sql
```

`care_cards` と `radar_tsubo_cards` は旧設計の名残の可能性が高い。  
現時点では削除しないが、本線では `radar_tsubo_points` が重要。
