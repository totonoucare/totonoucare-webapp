# Supabase 管理ディレクトリ

このディレクトリは、Supabase DBをGitHub上で管理するためのものです。

## ディレクトリ

```text
schema/      現状スキーマのsnapshot。原則そのまま実行しない。
migrations/  実際にSupabase SQL Editorで実行する変更SQL。
checks/      状態確認用SELECT。
seeds/       マスターデータ投入用SQL。
```

## 注意

秘密情報は絶対に入れない。

入れてはいけないもの:

```text
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
STRIPE_SECRET_KEY
OPENAI_API_KEY
Webhook secret
```

`NEXT_PUBLIC_SUPABASE_URL` は公開URLだが、基本ここには不要。
