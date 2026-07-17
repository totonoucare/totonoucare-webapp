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

## v7.73.2で追加した生活者向け翻訳と安全案内の反復抑制

- `RECORDS_AI_PRODUCT_CONTEXT.communication_translation` は、東洋医学語を生活者の身体感覚へ翻訳する原則と感度例を持つ
- 感度例は定型句・一対一の置換辞書ではない。比喩は理解を助ける時だけ自然に使い、毎回答へ強制しない
- 専門語を使う場合も、専門語を知らなくても意味が通る説明を先にする
- live conversationへ過去assistant messageの `safety_level` を含める
- 同一会話ですでに伝えた一般的な注意、専門家確認、受診目安は、新しい危険情報・悪化・判断条件の変更がなければ繰り返さない
- サーバーの固定 `PROFESSIONAL_MESSAGE` は、同一会話ですでにprofessional案内がある場合は再付加しない。新しい個別注意は引き続き表示可能
- live support prompt version: `records_live_support_v11_living_language_2026-07-17`
- product context knowledge version: `records_product_context_v8_living_language_2026-07-17`
- DB migrationなし

詳細は `docs/EKKEN_LIVING_LANGUAGE_V7732.md`。

## v7.73.1で再設計したライブ相談プロンプト

- `LIVE_SUPPORT_INSTRUCTIONS` は、役割・情報の意味・推論の自由・狭い安全境界・JSON契約に限定
- 文字数、提案数、質問数、固定推論順、使用軸数、過去の失敗例による逐語制御を削除
- 体質と予報の詳細ロジックは `RECORDS_AI_PRODUCT_CONTEXT` と計算済み `constitution` / `forecast_reasoning` を正本とする
- ライブ相談は、今回に必要な材料だけを自由に選び、食べる・暮らす・ほぐす・漢方等へ応用してよい
- 期間振り返りチャットと期間AI分析は、事実・比較・仮説の構造が必要なため今回は維持
- live support prompt version: `records_live_support_v10_prompt_reset_2026-07-17`
- DB migrationなし

詳細は `docs/EKKEN_PROMPT_RESET_V7731.md`。

## v7.73.0で強化した体調予報の階層理解

- `forecast.forecast_reasoning` を、体質→天気親和性→気象強度→有効負担→主因・副因→点数・モード→表れ方・ケアの順で読む
- 天気親和性の土台はコアタイプ55％、代表パターン第1位28％、第2位17％
- 有効負担は気象強度×（全員共通分0.30＋体質親和分0.68×本人親和性）
- 主因は有効負担1位。副因は0.20以上かつ主因の45％以上の時だけ存在
- 当日の体調実感、生活条件、不調フォーカス、経絡、実行ケアは予報点数へ入れない
- 新規予報の`reason_trace`へ`core_weather_weights`、`affinity_sub_codes`、`battery_scalar_applied`、`score_trace`を追加
- AIは保存済み値を説明するだけで、予報点数を再計算しない
- v7.73.0時点のlive support prompt version: `records_live_support_v9_forecast_hierarchy_2026-07-16`
- period review prompt version: `records_chat_v11_forecast_hierarchy_2026-07-16`
- analysis prompt version: `records_analysis_v10_forecast_hierarchy_2026-07-16`
- DB migrationなし

詳細は `docs/EKKEN_FORECAST_HIERARCHY_V7730.md`。

## v7.72.9で強化した体質チェックの階層理解

- `constitution.core` は体質チェック最上位の統合結果として最初に読む
- アクセル／ブレーキ軸は不調時の反応方向、余力軸は気血津液の量・持ち越し・環境感受性をまとめた回復バッテリー
- `sub_tendencies` は上位2つの代表要素であり、コアタイプと横並びの別診断ではない
- `material_pattern_summary.all_ranked_patterns` には気滞・気虚・血虚・血瘀・痰湿・津液不足の全6件を順位付きで渡す
- `axes.obstruction_auxiliary` は気滞・血瘀・痰湿をまとめる内部補助軸
- `symptom_focus` と主・副経絡は、コアタイプ主計算ではなく現在の表れ方を読む材料
- 漢方相談では症状名だけで処方を並べず、コアタイプ→余力→全6要素→身体所見の順で候補を分ける
- live support prompt version: `records_live_support_v8_constitution_hierarchy_2026-07-16`
- period review prompt version: `records_chat_v10_constitution_hierarchy_2026-07-16`
- analysis prompt version: `records_analysis_v9_constitution_hierarchy_2026-07-16`
- DB migrationなし

詳細は `docs/EKKEN_CONSTITUTION_HIERARCHY_V7729.md`。

## v7.72.8で拡張したEkkenの東洋医学ケア推論

- `displayed_care` は優先する土台だが、提案可能範囲の上限ではない
- アプリ表示ケアと、会話中に作る `Ekkenの応用案` を出所で区別する
- 食べる: 食性、五味、五臓、気血水、寒熱燥湿、香り・色・食感・温度、調理法
- 暮らす: 陰陽、寒熱、燥湿、昇降・出入、季節・時刻、休息と活動
- ほぐす: 経絡、体のライン、左右差、動作反応、触れ方、動き、呼吸、温冷
- 一般用医薬品・漢方薬・サプリは、一般情報、候補比較、購入時の判断材料、相談境界まで回答してよい
- 最終的な開始・中止・用量・併用可否・処方薬の代替・治療方針変更は決めない
- 最終確認が必要でも、先に役立つ情報を出し、最後の一点だけ専門家へつなぐ
- live support prompt version: `records_live_support_v7_tcm_care_reasoning_2026-07-16`
- period review prompt version: `records_chat_v9_tcm_care_reasoning_2026-07-16`
- 両チャットのreasoning effortは `medium`
- DB migrationなし

詳細は `docs/EKKEN_TCM_CARE_REASONING_V7728.md`。

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
