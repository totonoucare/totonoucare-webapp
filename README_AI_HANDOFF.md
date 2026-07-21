## v7.78.1 パーソナルケアショップUI/UX整理

- `/care-navi` の主表示は `今のケア方針`。体質型・不調・季節・明日の予報を方針と同列のピルで並べない
- ヒーローへ出す方針は `policyKeys[0]` を主、残り最大2件を補助として扱う。7方針の導出ロジック自体は変更しない
- 体質・不調・選択した生活状況・用途は `今回の条件` にまとめ、季節名と明日予報の固定ピルは出さない
- `lifeKeys` は任意・最大3件。`mergePolicyKeysWithLife`、楽天検索、提携商品採点、セット構成、trackingへ必ず渡す
- 生活状況の4件目を選んだ時に古い選択を黙って外さず、未選択ピルを無効化する
- 商品カテゴリの切替は商品エリアの `セットで見る／1つずつ見る` と単品カテゴリタブに任せ、条件パネルでは重複表示しない
- ボトムナビ順は `home / check / radar / records / care`
- DB migrationなし。v7.78.0の `user_care_shop_items` をそのまま使う

詳細: `docs/PERSONAL_CARE_SHOP_UX_V7781.md`

## v7.78.0 パーソナルケアショップ

- `/care-navi` はケア方法を保存するページではなく、体質・不調・使いどきに合う商品を探すショップ
- 自動選定の土台は体質と気になる不調。`shopPurpose` に応じて季節・明日の予報の加点だけを変更する
- ユーザー入力は `selectedSymptom`、`shopPurpose`、カテゴリ、`priceBand`
- `セットで見る` は `completeThreeCategorySet` で暮らす・食べる・ほぐすを1商品ずつ揃える
- `気になる／購入済み` の正本は `user_care_shop_items`。書き込みは `/api/care-shop/items` のservice-role経由
- 旧 `mibyo-care-navi-shelf-v1` はログイン時に新テーブルへ移行し、購入済みを上書きしない
- 購入済みだけを `/radar` の手持ちアイテムへ表示する。実行時は `kind = owned_care_item` として既存 `/api/radar/care-actions` へ保存
- 食品の実行ラベルは `今日取り入れた`、暮らす・ほぐすは `今日使った`
- migration: `supabase/migrations/20260719_create_user_care_shop_items_v7780.sql`
- `public/illust/policy/` の7 SVGはユーザー更新版が正であり、戻さない

詳細: `docs/PERSONAL_CARE_SHOP_V7780.md`

## v7.77.1 MYケアセレクトの条件UI整理

- `app/care-navi/page.js` のヒーローは `CoreTypeAvatar` を使い、`coreIconPath` の動物画像を `object-contain` で表示する
- MYケアセレクト内にはEkken相談導線を置かない。相談は独立した `記録・相談` 側の役割とする
- セット組み立ての内部モードは `CARE_SET_MODE = "steady"` に固定する
- ユーザーが選ぶ表示単位は `セットで見る／1つずつ見る` のみ
- 条件調整として表示するのは `selectedSymptom`、`lifeKeys`、`priceBand`。体質・季節・明日の予報は自動入力であり、条件パネルに説明カードを置かない
- 旧 `mode` / `set` / `depth` クエリによるセットスコープ変更は受け付けない
- `trackingContext.kitMode` は既存イベントとの互換用に固定値 `steady` を保持する
- 新規SQL・環境変数なし。`public/illust/policy/` の7 SVGは変更しない

詳細: `docs/MY_CARE_SELECT_UI_V7771.md`

## v7.77.0 MYケアの役割整理と記録ループ

- `app/care-navi/page.js` の基準は `basis = "shelf"`
- ケア方針は体質スコア `0.82`、季節ヒント `0.58`、明日ヒント `0.34`。固定比率をユーザー向けには表示しない
- 提携候補の `shelf` モードは明日主因／副因 `0.45 / 0.2`、季節一致 `0.55`
- `Ekken` は自動商品ランキングの実行主体ではない。自動結果は `未病レーダーセレクト`、Ekkenは `/records?tab=consult` への相談導線
- `kitMode` は見る範囲、`priceBand` は予算。相互に自動変換しない
- `気になる` は `localStorage`、`今日使った` は既存 `/api/radar/care-actions` を通じて `radar_care_actions` へ保存
- MYケア由来の実行記録は `kind = my_care_item`、`entry_origin = record_page`、`source_mode = today`
- 新規SQL・環境変数なし。予報ロジックとAI分析入力の既存整合性を利用する
- `public/illust/policy/` の7 SVGはユーザー更新版が正であり、戻さない

詳細: `docs/MY_CARE_LOOP_V7770.md`

## v7.76.1 MYケアセレクト visual polish

- ヒーローから、到着時制や内部重み付け、売り込み回避などの開発事情を削除
- Ekkenは初見向けに役割を一言で示し、全身キャラではなく顔中心の小さなアクセントへ縮小
- 体質トリセツ結果ヒーローと同一形状の緑＋金ツートンオービックを使用
- ページ下地をアプリ共通の薄いグリーンへ戻し、生成り専用テーマを撤廃
- コーラル・赤系と黒ピルを撤廃し、購入CTA・本命表示・もっと見るをアンバーへ統一
- 条件調整パネルを「条件を調整」ボタンの直後へ移動
- 条件説明も70/30等の内部事情ではなく、ユーザーが理解できる選定の手がかりへ変更
- 商品選定ロジック、明日／季節の内部重み、単品8→16件、予報計算、DBは変更なし

詳細: `docs/MY_CARE_VISUAL_V7761.md`

## v7.76.0 MYケアセレクト「今の自分のケア棚」

- `app/care-navi/page.js` は `basis = "now"` を使い、表の体質／明日／季節切替を廃止
- 体質は恒常的な土台。変化する環境条件は明日の予報70％、季節30％で方針・商品適合へ反映
- 方針スコアは明日 `1.4`、季節 `0.6`。提携商品は主因・副因 `1.68 / 0.8`、季節一致 `0.66`
- Ekkenヒーローは既存 `GuideBotAvatar` と、体質チェック系の緑＋金ツートンオービックを使う
- 商品棚は暖色・中立色を基調にし、購入CTAは `--shop` のコーラルへ分離
- 単品候補は楽天・提携・セット採用品・ルール候補を統合し、8件→最大16件。商品ロール単位で分散
- ホームと予報の今日／明日タブは、時制パラメータを付けず同じ棚へ接続
- 体調予報ロジック、DB、MY棚の保存範囲は変更なし

詳細: `docs/MY_CARE_NOW_V7760.md`

## v7.75.1 MYケアセレクトの時制整理

- 通販候補に「今日の本命」と表示せず、到着・利用時制を誤認させない
- 体質中心、明日の予報、季節の天候に応じて本命見出しを切り替える
- 購入候補の説明に残っていた「今日の方針」も中立表現へ変更
- 商品選定ロジック、予報、MY棚、SQL、環境変数は変更なし

## v7.75.0 MYケアセレクト「自分のケア棚」UI

- Ekkenを販売員ではなく、体質・予報・目的から候補を整理するナビ役としてヒーローへ配置
- 詳細条件を初期状態で閉じ、商品結果までの距離を短縮
- 最初のセットを「今日の本命セット」として表示し、「まず1つなら」を先に案内
- 残りの商品と別セットは開閉式へ整理
- セット表示と、暮らす・食べる・ほぐすの単品表示を切り替え可能
- 「気になる」「試した」を端末内へ保存する簡易MY棚を追加
- 体質・予報・商品選定ロジック、SQL、環境変数は変更なし

# 未病レーダー AI引き継ぎ入口

## v7.78.14 予報・天気相性コピーの整理

- 予報ヒーローのタイトル下には`対策ケア`を置かない。対策ケアの正式な見出しはページ下部に1つだけ残す
- `天気との相性`の導入文は、上位2ラベルだけで説明せず、寒熱回答・環境感受性・気血水6傾向を使うV2の計算構造を伝える
- 東洋医学の状態を体感へ翻訳する、意味がすぐ伝わる比喩は削除しない
- 具体的な感覚へ結びつかない比喩や、器官が停止するような誤解を招く表現だけを平易にする
- v7.78.14は表示文言のみ。予報V2と体質親和性の係数はv7.78.13から変更なし

詳細: `docs/RADAR_FORECAST_V2_20260721.md`

## v7.78.13 天気負荷UIと体質トリセツのV2統一

- `/radar`の3列見出しは`気温／湿度／気圧`
- 負荷値は湿度等の実測値ではないため、`負荷 高／中／低`で表示する。内部の連続値は削除しない
- 区分境界は`高 >= 0.67`、`中 >= 0.34`、それ未満を`低`
- 注意時間は`11–14時`の短縮表記
- 体質チェック結果と体質トリセツの`天気との相性`は、`buildConstitutionWeatherAffinityV2`で予報V2の親和性を共通利用する
- 相性ランキングでは気圧を1枠にまとめ、`temp_shift`（寒暖差）を独立候補にする
- 保存値と日次予報の計算ロジックはv7.78.12から変更なし

詳細: `docs/RADAR_FORECAST_V2_20260721.md`

## v7.78.12 体質階層対応の体調予報V2

- 予報V2の親和性は`lib/radar_v1/personalizeForecastV2.js`が正本
- 親和性は本人回答→全6スコア→アクセル／ブレーキの小さな基本傾向、の階層で作る。コアタイプ固定表へ戻さない
- 気圧は変化量を1回だけ計上し、向きは表示と最大6%の一致補正に限定する
- 余力込みの画面値は`weather_load_groups.*.personal_load`。`effective_load`は余力適用前として意味を分ける
- `/radar`は主因／副因カードではなく、気温・湿度・気圧の3負荷を横並び表示する
- 主因／副因は文章、通知、ケア、AI相談の内部優先順位として削除しない
- 未ログインAPIも`weather_load_groups`を返す
- 通常は`RADAR_FORECAST_MODEL_VERSION=v2`、緊急ロールバックは`v1`

詳細: `docs/RADAR_FORECAST_V2_20260721.md`

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

## v7.74.1で追加した食養生の引き算ロジック

- `dailyCareV2.js` は、具体的な一食とは別に `subtraction_action` を生成する
- 引き算候補は主因・副因、共通ケア方針、コアタイプの余力、sub labels、不調フォーカス、signalから採点する
- 一般的な禁止リストを毎日固定表示せず、食性・味・温度・油・飲酒・カフェイン・食べる時間や速度の「負担の重なり」を選ぶ
- 食べるタブの主表示は `choice` と `caution` の2カード。どちらも `prominent: true`
- 詳細欄は `alternative`、`drink`、理由、必要な食後ケアだけを表示し、主表示のcautionを重複させない
- 同じ対象日・同じ条件では安定し、日付が変わると上位適合候補内でローテーションする
- care logic version: `daily_care_v2_1_2026-07-17`
- 既存の `buildDisplayedCareItems` とcare action identityは変更せず、記録互換性を維持
- DB migrationなし

詳細: `docs/DAILY_CARE_FOOD_SUBTRACTION_V7741.md`

## v7.74.0で追加したDaily Care v2

- `lib/radar_v1/careRules/dailyCareV2.js` が、暮らす・食べる・ほぐす共通のケアテーマと刺激量を決める
- 予報計算は変更せず、計算済みの主因・副因・signalと、体質・不調フォーカスをケア選定へ使う
- 同じ対象日・同じ条件では候補が固定され、日付が変わると適合候補内でローテーションする。再読み込みごとのランダム表示は禁止
- 食べるの主表示は具体的な一食1件。別案・飲み物・注意・理由は詳細表示へ置く
- 暮らすの主表示は具体行動1件。候補は天気、共通方針、不調フォーカスから選ぶ
- ほぐすは経絡ラインケアを第一級のDaily Care項目として扱い、ツボ選定にも主・副経絡、全身傾向、余力を反映する
- `buildDisplayedCareItems` は `tsubo_line_care` を記録可能な項目として生成する
- care logic version: `daily_care_v2_2026-07-17`
- DB migrationなし

詳細: `docs/DAILY_CARE_V2_V7740.md`

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
