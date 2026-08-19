# v7.79.29 広告開始前の安定性・安全性修正

この版は、既存のSupabaseを作り直すものではありません。現在のDBへ2本の差分SQLを追加し、その後にアプリをデプロイします。

## 修正内容

1. 体質チェックの「胃腸の調子」を保存できないDB制約の不一致を解消。
2. 診断回答をサーバーで検証し、未回答・改ざん値・過大データを拒否。
3. 予報生成とPush通知を `user_id` 順のカーソルページングに変更し、上限人数より後ろの利用者も処理。
4. 認証・決済後の戻り先を同一サイト内の安全なパスだけに制限。
5. 公開診断・公開予報・楽天検索・クリック記録へ、Supabase共有型レート制限を追加。
6. v7.79.28正本テストに含まれる、Supabase一時障害の短時間再試行と安全な503応答をGitHub実態版へ復元。
7. `tests/` をv7.79.28フルソースZIPの正本47ファイルへ同期し、v7.79.29専用テストを追加。

## 本番反映手順

次の順番を守ります。

1. Supabase DashboardのSQL Editorで `supabase/migrations/20260818_align_symptom_focus_constraints_v77929.sql` を実行。
2. 続けて `supabase/migrations/20260818_add_public_api_rate_limits_v77929.sql` を実行。
3. `supabase/checks/20260818_check_ad_readiness_v77929.sql` を実行し、4項目がすべて `true` か確認。
4. 任意ですが推奨として、Vercelへランダムな32文字以上の `RATE_LIMIT_HASH_SECRET` を追加。未設定時はサーバー内の既存秘密鍵をハッシュ用ソルトに使います。
5. このソースをデプロイ。
6. GitHub Actionsの「Radar forecast snapshots」と「Radar notifications」を手動実行し、全ページが最後まで完了することを確認。

SQLを先に適用する理由は、アプリだけ先に出すとレート制限が一時的にフェイルオープンになるためです。サービス停止はしませんが、保護が効くのはSQL適用後です。

## 動作確認

```bash
npm ci
node --test tests/ad-readiness-v77929.test.mjs
npm test
npm run build
```

元のGitHub ZIPに残っていた旧テストを除き、v7.79.28フルソースZIPのテスト集合を正本として同期しました。GitHub ZIPに不足していたv7.79.25〜27の3テストも復元しています。この修正版は、v7.79.28正本テスト285件とv7.79.29専用テスト5件の合計290件がすべて成功しています。

本番ビルドは、Supabaseの値をダミー環境変数として与えたコード検証で成功しています。本番ではVercelに登録済みの実値が使われます。
