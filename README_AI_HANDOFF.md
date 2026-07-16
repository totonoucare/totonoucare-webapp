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

## v7.72.7でコード管理へ移した非機密運用設定

- `lib/records/policy.js` が記録・Ekkenの運用設定の唯一の参照元
- 先行公開期間: 2026-07-15〜2026-08-31（日本時間）
- 記録編集: 今日を含む直近7日
- Ekken相談: 月100回答
- AI分析新規生成・更新: 1日1回
- 短時間上限: 1分6回
- 分析・期間チャット・ライブ相談モデル: `gpt-5.6-luna`
- 概算原価: 入力1 USD / MTok、出力6 USD / MTok
- `RECORDS_*` と `OPENAI_RECORDS_*` の同名環境変数は参照しない
- `OPENAI_API_KEY`、Supabaseキー等のSecretは引き続き環境変数
- DB migrationなし

詳細は `docs/RECORDS_POLICY_CODE_CONFIG_V7727.md`。

## v7.72.5で追加した確認質問・回答の対応保持

- `follow_up.question`はチャット本文と独立したカードだが、回答後も質問と回答を一組として扱う
- クライアントは`assistant_message_id`、質問文、選択候補を`reply_to_follow_up`として送る
- サーバーは保存済みassistant messageの`follow_up`と照合し、検証済みの対応だけをmessage metadataへ保存する
- 履歴UIではユーザー回答の上に元の質問を表示する
- AI入力の`conversation`と`latest_user_request`にも対応関係を渡し、短い回答を推測させない
- 対象はlive supportとperiod reviewの両チャット
- live support prompt version: `records_live_support_v6_reply_context_2026-07-15`
- period review prompt version: `records_chat_v8_reply_context_2026-07-15`
- DB migrationなし

詳細は `docs/EKIKEN_REPLY_CONTEXT_V7725.md`。

## v7.72.4で調整したリアルタイム相談の会話姿勢

- 体調予報・予報モード・表示ケアはアプリの計算／提示事実として自然に使い、毎回免責文で矮小化しない
- 予報と現在の体感を結びつける部分だけをAIの仮説として表現する
- 改善報告にはまず喜びを返し、直後に統計的な注意書きで否定しない
- 「原因ではない」「1回では断定できない」は、ユーザーが確実性を尋ねた場合か安全上必要な場合だけ使う
- 再現性の評価は期間分析、今の相談は目の前の体感・安心・小さな行動を優先する
- 確認候補は選択文だけを入力欄へ入れ、会話履歴を機械的な接頭辞で汚さない
- live support prompt version: `records_live_support_v5_warm_dialogue_2026-07-15`
- DB migrationなし

詳細は `docs/EKIKEN_WARM_DIALOGUE_V7724.md`。

## v7.72.3で調整した固定安全ガード

- 本人の現在の直接的な緊急表現だけを、アプリ側の固定安全ルートへ入れる
- 否定、明確な過去、引用、第三者相談は固定停止せず、`potential_safety_signal` としてモデルへ渡す
- この注意情報だけを根拠に、本人の現在の緊急状態と断定しない
- Ekkenの通常回答は300〜500文字程度を目安にする
- AI利用前カードとガイドは、アカウント登録情報と自由入力内容を区別して説明する
- DB migrationなし。v7.72.2までのmigration適用状況は変更しない

詳細は `docs/EKIKEN_CONTEXT_SAFETY_COPY_V7723.md`。

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
- `app/api/records/live-chat/route.js`: 今の体調を相談するEkken専用
- 同じキャラクターだが、`records_ai_threads.thread_kind` とプロンプトを分離する
- live supportの常時文脈は、トリセツ、今日明日の予報・対策ケア、直近3日詳細、14日要約、直近16メッセージ
- 詳細は `docs/EKIKEN_LIVE_SUPPORT_V7720.md`
