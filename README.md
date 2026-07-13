# 未病レーダー

未病レーダーは、東洋医学の体質分類と天気変化を組み合わせて、体調が崩れやすいタイミングとセルフケアを提案するWebアプリです。

コアメッセージ:

> 明日の崩れやすさを、今夜の整え方に変える。

このリポジトリは、開発者がiPad上でAIにコード作成を依頼し、生成されたコードをGitHubへ反映して開発しています。

---


## v7.71.4 UI最終調整

- 記録済み具体的ケアの一覧を項目名中心に簡潔化
- AI分析更新上限の案内位置を分析カード内へ修正
- いたわり・守りのケアナビ表情を自然に調整
- 予報ページの記録・分析ボタンの鉛筆を拡大
- DB変更なし

詳細: `docs/V7714_UI_FINAL_POLISH.md`

## プロダクトの軸

未病レーダーは、単なる「今日の不調を当てるアプリ」ではなく、明日の崩れやすさを先回りし、今夜から整えるための未病予報アプリとして設計しています。

詳しいプロダクト方針は以下を参照してください。

```text
docs/PRODUCT_DIRECTION.md
```

---

## 主な機能

```text
体質診断
  体質・気血水・経絡傾向・天気感受性を算出する。

レーダー予報
  天気変化、体質プロフィール、過去レビューを組み合わせて未病予報を出す。

ケア提案
  ほぐす / 食べる / 暮らす の3方向で、今夜からできる整え方を提案する。

パーソナル体質トリセツ
  診断結果から、体質傾向とセルフケア方針をまとめる。

通知
  PWA / Web Push とcronで、夜・朝の予報通知を送る。
```

---

## 現在のAI生成ルートについて

```text
2026-05時点では、予報ページ内のGPT補完生成は一時停止中。
対象: /api/radar/v1/forecast/enrich、予報スナップショットcronの enrich 処理、通知cron内のGPT補完処理。

理由:
  予報カードとケアカードを「体質 × 天気」の主因に沿ったルールベースUIへ寄せているため。
  旧来のAI生成文が混ざると、ケア方針・出やすいサイン・山場前ケアとの一貫性が崩れやすい。

運用:
  ファイル自体は将来の再利用に備えて残す。
  再有効化する場合は、ケア方針7分類と表示ルールの設計を固めてから行う。
```

---

## 技術スタック

```text
Next.js App Router
Supabase
Supabase Auth / Google OAuth
Stripe
OpenAI API
MET Norway API
PWA / Web Push
GitHub Actions
Vercel Preview
Netlify Production
```

画像はSupabase Storageではなく、リポジトリの `public/` 配下で管理しています。

---

## 主要ディレクトリ

```text
app/              Next.js App Router。画面とAPI Routes
components/       UIコンポーネント
lib/              診断・予報・トリセツ・通知などの主要ロジック
public/           画像・PWA・service worker
.github/          GitHub Actions
docs/             AI引き継ぎ、プロダクト方針、DB/環境設定メモ
supabase/         DBスキーマ管理、確認SQL、migration、seed関連
```

---

## AI引き継ぎ

新しいAI担当は、まず以下を確認してください。

```text
README_AI_HANDOFF.md
docs/AI_HANDOFF.md
docs/PRODUCT_DIRECTION.md
docs/PRODUCT_PLAN_V0_2.md
docs/DB_SCHEMA_MANAGEMENT.md
docs/DB_CURRENT_STATUS_20260508.md
docs/RADAR_TSUBO_POINTS_MASTER_20260508.md
docs/ENVIRONMENT_AND_EXTERNAL_SERVICES.md
docs/AUTH_AND_DEPLOY_URLS_20260508.md
.env.example
```

重要:

- 最新の進行状況はMarkdownではなく、ユーザーの最新メッセージと現行コードを優先する。
- 日付付きのDB資料は、その時点のsnapshotとして読む。
- 古い進捗メモや「次にやること」メモを根拠にしない。
- 長い修正や複数ファイル変更は、原則ZIPで渡す。
- Secret値はGitHubへ保存しない。


---

## v7.71 Daily Care実行記録

予報ページの具体的なDaily Careへ「やってみた」を追加し、前夜・当日のケアを対象日へひも付けて記録する。記録ページでは実感と当日ケアの前後関係を確認し、AI分析では固定された予報条件と具体的ケアの関係を振り返る。

DB migrationが必要。詳細:

```text
docs/DAILY_CARE_ACTIONS_V771.md
supabase/migrations/20260713_create_radar_care_actions_v771.sql
```

## v7.71.1 表情・文言の調整

- いたわり予報のケアナビ表情を、怒りではなく少し疲れた表情へ変更
- 予報ページ右上の記録・分析アイコンを拡大
- 記録分析グラフの絞り込み文言を明確化
- 専門家相談ページの開発都合語をユーザー向け表現へ整理
- DB migration 追加なし

## v7.71.2 ケア記録データ整合性

- 具体的ケアIDを表示順に依存しないv2キーへ変更
- v7.71の旧キーを保存済みsnapshotから互換正規化
- Daily Careの具体的ケアと、従来のまとめ入力をDB上で分離
- 全ケア解除時に日次記録の「ケアあり」も同期
- 直近7日の記録ページから具体的ケアを追加・削除可能
- 同じケアを前夜と当日に行った場合、実施日は1日・タイミングは両方保持
- AI送信からボタン押下時刻を除外
- 「控えたいこと」の詳細文を記録一覧へ表示

DB migrationが必要。詳細:

```text
docs/CARE_ACTION_DATA_INTEGRITY_V7712.md
supabase/migrations/20260713_add_care_data_integrity_v7712.sql
```

## v7.71.3 ケア記録の出自・識別・表示調整

- 記録ページの自由入力による具体的ケア追加は、先行公開では見送る
- Daily Careで提案・実行したケアと、本人が別途追加したケアをAI入力上で分離
- 具体的ケアの再現性集計はDaily Care由来だけを対象にする
- 暮らすケアのIDを説明文ではなくケア本文中心のv3キーへ変更
- 旧キーの重複行は、1回の削除で同一意味の行をまとめて削除
- ケア追加・削除直後にカレンダー表示も同期
- いたわりは😓、守りは😣に近い眉なし表情へ変更
- AI分析画面の英語見出し・開発都合語をユーザー向け表現へ変更
- AI分析・チャットのprompt versionを更新

DB migrationの追加はない。v7.71.1から適用する場合は、v7.71.2の次のmigrationだけをコードより先に実行する。

```text
supabase/migrations/20260713_add_care_data_integrity_v7712.sql
```
