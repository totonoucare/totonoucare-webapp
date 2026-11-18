# 未病レーダー v7.79.127・128 適用手順

v126適用済みのテスト環境に、専門家への質問とパーソナルケアショップを一括で追加します。v127が専門家質問、v128がショップです。

## 1. Supabase

v126用SQLを適用済みのデータベースで、同梱の `supabase/migrations/20261118_expert_v127.sql` をSQL Editorで実行します。別配布の `mibyo-v127.sql` は同じ内容です。この変更は相談用の2テーブル、インデックス、サーバー専用の送信関数を作ります。v126の登録・予報・記録テーブルへのデータ更新はありません。v126のSQLが未適用なら先に `20261117_freemium_v126.sql` を適用してください。

## 2. デプロイ環境の設定

Vercelのテスト用サイト、Netlifyの本番サイトそれぞれのサーバー環境変数に設定し、該当サイトを再デプロイします。Supabaseを共用する場合も環境名を分けます。Vercelの固定テストドメインがVercel上のProductionに割り当ててあるときは、そのスコープにもテスト値を設定します。

| 変数 | 設定する値 |
|---|---|
| EXPERT_SPACE | Vercelは `test`、Netlifyは `live` |
| EXPERT_ADMIN_USER_ID | 返信担当者がログインに使うアカウントのUUID。SupabaseのAuthentication → Usersで確認 |
| EXPERT_APP_URL | 管理者が実際に開くサイトのURL。Vercelの固定テストでは `https://totonoucare-webapp.vercel.app`。ブランチPreviewで検証するときはそのPreviewのURL。本番では本番ドメイン |
| EXPERT_MAIL_FROM | Resendで送信できる確認済みドメインのメールアドレス |
| RESEND_API_KEY | サーバー専用のResend APIキー |

通知先は `totonoucare@gmail.com`。初回質問・追加質問で通知されます。メールには管理画面へのリンクが入り、相談本文はアプリで読みます。管理権限はUUIDで指定します。未送信の通知はDBに残ります。自動再試行を使うには、GitHub Actionsのrepository variable `EXPERT_MAIL_RETRY_ENABLED=true` とsecrets `APP_BASE_URL`、`CRON_SECRET` を設定します。対象サイト側の `CRON_SECRET` は同じ値にしてください。スケジュールは毎時17分と47分で、デフォルトブランチ上で動作します。共有中のAPP_BASE_URLを変更すると、同じsecretを使う他の処理にも影響するため、既存の設定先をご確認ください。ブランチテスト中も質問時の即時通知は動作します。

既存のSupabase・Stripe・楽天のサーバー設定を引き継ぎます。Stripeは既存の月額580円のPriceを使用します。契約者向けの商品説明を変更する場合は「記録のAI分析・鍼灸師への質問（月2件、各2往復）」が目安です。

## 3. iPadのCodespacesで差分を適用

作業用ブランチ `update-v126-v128` を開き、リポジトリ直下に `mibyo-v126-to-v128.zip` をアップロードします。NumbersなどによるZIPの展開は必要ありません。ターミナルの `git status -sb` でブランチと既存の編集を確認してから、この1行を実行します。

```sh
python3 -c "from zipfile import ZipFile; import subprocess; z=ZipFile('mibyo-v126-to-v128.zip'); z.extractall(); subprocess.run(['git','--literal-pathspecs','add','--',*z.namelist()],check=True)"
```

アーカイブにあるパスへ上書きし、そのパスをステージします。ZIPそのものは対象外です。今回はドキュメント・SQL・通知再試行用workflowも含みます。

```sh
git --no-pager diff --cached --stat
git commit -m "Apply v127 expert questions and v128 care shop"
git push -u origin update-v126-v128
```

ブランチに接続したVercel Previewで確認できます。いつものVercel固定ドメインがmainを追う構成では、そちらにはmainへ取り込んだデプロイが表示されます。Netlify本番の公開タイミングは従来の運用どおりです。

## 4. テスト環境での確認

1. 無料ユーザーで「記録・分析 → 専門家に質問」を開き、利用条件を確認します。
2. テスト用の有料アカウントで質問を送信します。テスト中はStripeのテスト設定、または既に有料権限のあるテストユーザーをご使用ください。
3. 運営メールのリンクを開き、運営用アカウントでログインし返信します。「設定 → 相談管理」からも開けます。利用者側の「更新」で返信を確認し、追加質問と2回目の返信を試せます。枠は日本時間の暦月で月2件、各質問につき最大2往復です。開いた相談の履歴と残りの追加質問は解約後も利用できます。
4. 予報の「食べる」から、材料リンクがあるお茶を開きます。「明日」タブからは明日の材料が表示されます。商品候補があるときは価格・購入先と保存ボタン、見つからない材料には楽天で探すリンクが出ます。ショップトップからツボ・暮らし・悩み別の入口も確認できます。
5. 販売先遷移は `verification/shop-metrics-v128.sql` で集計できます。注文の発生・売上は販売先の実績で確認します。結果は既存のv126計測環境区分ごとに集計します。

## 収録した検証

`npm test` が通常の回帰テストです。`verification/expert-db-v127.mjs` は検証用PostgreSQL互換環境PGliteでSQLを直接実行します。`verification/browser-v128.mjs` はローカルの本番ビルドに対し、合成アカウントと模擬APIでスマホ・iPad幅を検証します。追加の検証ツールと設定例は各スクリプトを参照してください。
