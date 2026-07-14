# 未病レーダー AI引き継ぎ入口

このファイルは、ChatGPT / AI開発担当が交代したときに、プロジェクトの読み方を揃えるための入口です。

このリポジトリは、開発者がiPad上でAIにコード作成を依頼し、生成されたコードをGitHubへ反映して開発しています。

AIは自分でGitHubへのコミット、ビルド、デプロイ、Supabase SQLの実行、外部サービス設定の変更はできません。  
AIが担当するのは、コード理解、設計判断、修正案作成、ファイル内容作成、SQL作成です。

---

## 最初に読むもの

```text
README.md
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

---

## 判断の優先順位

```text
1. ユーザーの最新メッセージ
2. 現在アップロードされたGitHub ZIP内のコード
3. DB snapshot / Supabase関連資料
4. docs配下の方針資料
5. 過去会話の記憶
```

Markdown内の「日付付き情報」は、その時点のsnapshotとして扱う。  
現在の進行状況や次にやることは、Markdownに固定されているとは限らない。

---

## AIの基本ルール

```text
コードを読む前に大きな変更を決めない。
Secret値を求めない・書かない。
医療効果を断定する表現を避ける。
DB変更は、既存スキーマ・RLS・制約・index・trigger/functionを踏まえてSQL化する。
長い修正や複数ファイル変更はZIPで渡す。
短い修正は直書きでもよい。
```

---

## GitHubに入れないもの

```text
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
OPENAI_API_KEY
Google OAuth Client Secret
WEB_PUSH_VAPID_PRIVATE_KEY
CRON_SECRET
```

このリポジトリに残すのは、変数名・用途・設計意図だけです。

## v7.72.1で変更されたAI利用体験

- `components/records/LiveSupportPanel.jsx`: クイック候補は入力欄へ転記し、送信はユーザーが確定する
- `components/records/AiAnalysisPanel.jsx`: 保存済み分析だけ自動確認し、新規生成・更新は手動
- `app/api/records/analysis/route.js`: `generate: false` はキャッシュ確認のみでAI生成回数を消費しない
- `app/api/records/live-chat/route.js`: 任意の受診・相談状況を `records_ai_threads.context_summary` に保存して相談文脈へ渡す
- live supportでは明確なurgent判定だけを固定ルールで維持し、通常相談で受診確認を繰り返さない
- AI同意バージョンは `records_ai_v5_consultation_context_2026-07-14`
- DB migrationなし。v7.72.0のlive support migration適用済みが前提

詳細は `docs/CHAT_UX_MANUAL_ANALYSIS_V7721.md`。

## v7.72.0で追加されたAI導線

- `app/api/records/chat/route.js`: 選択期間の振り返り専用
- `app/api/records/live-chat/route.js`: 今の体調を相談するEkiken専用
- 同じキャラクターだが、`records_ai_threads.thread_kind` とプロンプトを分離する
- live supportの常時文脈は、トリセツ、今日明日の予報・対策ケア、直近3日詳細、14日要約、直近16メッセージ
- 詳細は `docs/EKIKEN_LIVE_SUPPORT_V7720.md`
