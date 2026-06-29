# 未病レーダー

未病レーダーは、東洋医学の体質分類と天気変化を組み合わせて、体調が崩れやすいタイミングとセルフケアを提案するWebアプリです。

コアメッセージ:

> 明日の崩れやすさを、今夜の整え方に変える。

このリポジトリは、開発者がiPad上でAIにコード作成を依頼し、生成されたコードをGitHubへ反映して開発しています。

---

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

