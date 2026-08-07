## v7.79.19 食性中心・食材優先表示の現行契約

- 現行ロジック版は`daily_care_v2_17_2026-08-07_food_nature_first_reasons`
- 食べるケアの理由順は`食養生 → 栄養面`。飲み物の理由順は`食養生 → 成分・飲み方`。栄養学・カフェイン・時間帯を先頭理由へ戻さない
- 飲み物は`DRINK_ITEMS`の`nature / flavors / tags / goodFor / cautionFor / caffeine`を採点と理由表示の両方に使う
- `reaction_direction`を飲み物選定へ渡す。アクセル寄りは`calm`を加点しカフェインを小さく減点、ブレーキ寄りは`support_spleen / wake`を小さく加点する
- 食事カードの元の`items`は記録互換のため完成料理を保持する。画面の主表示は`item_details.focus_ingredients`、完成料理は`item_details.meal_example`を`料理案`として表示する
- 食材抽出は自由な形態素推定ではなく`MEAL_FOCUS_INGREDIENTS`の監修済みパターンだけを使う。部分文字列の偶然一致を許さない
- 食事の`item_details.reasons`は、料理案に実際に含まれる食材を使った食養生理由を優先し、調理法の理由は補完にだけ使う
- `enhanceFoodContext`は、`foodIngredientRules`から渡された飲み物の構造化`item_details`を落とさない。旧文字列しかない保存データだけ`parseDrinkChoice`で互換変換する
- 今日と明日の料理は引き続き別カタログ。主・副天気、方針、不調、体質、対象日を安定キーに持ち、同じ食性方針でも料理案を固定しない
- ショップには当日の食材や料理案を渡さず、v7.79.17のマクロな`7方針 / 食養生機能 / 栄養課題 / 商品役割`だけを渡す
- 予報点数、天気ストレス、出やすいサイン、暮らすケア、ほぐすケア、DBは変更しない

詳細: `docs/RADAR_FOOD_NATURE_FIRST_REASONS_V77919.md`

> v7.79.18の`栄養面 → 食養生`、飲み物の単一`選んだ理由`、料理名を第一表示にする契約は廃止済み。

## v7.79.18 日常食・飲み物・理由表示の旧契約

- 現行ロジック版は`daily_care_v2_16_2026-08-07_everyday_food_visible_reasons`
- 食べるケアの導入文を`AよりB / AではなくB`の否定比較で始めない。`buildFoodForecastInsight`で天気・反応方向・不調を先に示し、食べ方を直接書く
- `context_chips`の先頭へ`theme.trigger_labels`を入れる。食べるケアから天気根拠を隠さない
- `selectFoodIdeas`の安定キーは主・副天気トリガーを含む。方針・不調・体質が同じでも、天気が違えば同じ巡回位置へ固定しない
- 通常表示は`SPECIALTY_CUISINES`を除いた候補を優先する。専門店前提の外国料理名を日常的な多様性として数えない
- 主表示の`prominent`は`choice / drink`。`caution / no_cook / alternative / night / prep`は詳細側を正本にする
- `buy / eat_out`の独立カードは廃止。`no_cook`カード内の`コンビニ・スーパー｜... / 外食｜...`で入手場面だけを区別する
- 各料理の`item_details.reasons`は`栄養面 / 食養生`の二件を持つ。飲み物は`選んだ理由`を持つ
- 飲み物の画面`items`へ`◎ / ○ / △`を含めない。内部評価記号は選定に使えても、ユーザー表示の理由を置き換えない
- 今日と明日の第一方針を、異なる表示を作る目的だけで変更しない。同じ方針の場合も、各日の天気ラベルとtoday/tomorrowの時間帯文で根拠を判別可能にする
- v7.79.17の料理カタログとマクロ商品軸は維持する。ショップへ当日の料理IDや材料を渡さない

詳細: `docs/RADAR_EVERYDAY_FOOD_VISIBLE_REASONS_V77918.md`

> v7.79.17の`買う / 外食 / 別の気分`を別カードで並べる表示、飲み物を詳細末尾へ置く表示、第一方針だけから導入文を作る契約は廃止済み。

## v7.79.17 食べるケアと継続商品軸の現行契約

- 現行ロジック版は`daily_care_v2_15_2026-08-06_response_meals_macro_shop`
- 食べるケアの入力は、天気だけではなく共通反応プロファイルの`policies / reaction_direction / reserve_level / material_keys / symptom_focus`を使う
- 天気は温度・汁気・軽さなどの小さな調理適合度にだけ使い、献立母集団を天気別に固定しない
- ユーザー表示用の料理は、文字列部品から自由合成せず、次の独立した完成候補を正本にする
  - `RESPONSE_MEAL_CATALOG`: 今日の完成料理
  - `BUY_MEAL_CATALOG`: コンビニ・惣菜等の具体的な買い合わせ
  - `EAT_OUT_MEAL_CATALOG`: 外食で注文できる具体案
  - `TOMORROW_BREAKFAST_CATALOG`: 明日の朝食と今夜の準備
  - `NIGHT_SNACK_CATALOG`: 本当に空腹の時だけの任意の夜食
- todayとtomorrowで同じ辞書を共用しない。todayは一食の選択支援、tomorrowは今夜から明朝への準備として書き分ける
- `おにぎり / パン / スープ / サラダ`の一般名一語を購入案に戻さず、具・味・組み合わせまで表示する
- 同じ日・同じ入力では同じ候補を返す。日付ハッシュは適合候補内の巡回だけに使い、隣接日とtoday/tomorrowの重複を抑える
- `buildFoodCommerceContext`は、体質サブラベル・不調・反応方向・余力から継続軸を作る。単日の`trigger_key`と選択された料理IDを商品軸へ含めない
- `/radar`から`/care-navi`へ渡す食のパラメータは`eatPolicies / eatFunctions / eatNeeds / eatRoles / eatSummary`だけ。レシピや料理材料を直接検索しない
- ショップは`daily_tea / pantry_food / prepared_meal / meal_subscription / nutrition_support`を、食養生機能と栄養上の継続課題で検索・順位付けする
- `nutrition_support`は、余力小・気虚・血虚・疲れ・めまいなど継続理由がある時だけ残す
- 予報点数、天気ストレス、共通反応プロファイル、出やすいサイン、暮らすケアの商品境界、DBは変更しない

詳細: `docs/RADAR_RESPONSE_MEALS_MACRO_COMMERCE_V77917.md`

> v7.79.16の天気別`FOOD_IDEAS`を主献立の正本とする契約、およびtoday/tomorrowが同じ献立辞書を一日差で巡回する契約は廃止済み。現行仕様は直上を正本とする。

## v7.79.16 身体操作・食事文・献立ローテーションの現行契約

- 現行ロジック版は`daily_care_v2_14_2026-08-06_natural_food_rotation_body_restore`
- 次の身体操作5件は、生活内で試せる旧実用動作を正本とする
  - `tension-screen-head-up`: 後頭部を1cm上へ運ぶ
  - `tension-head-sky-line`: 見たい方向へ椅子か足を動かし、胸も向ける
  - `tension-wall-axis`: 手元へ近づき、前腕のひじ寄りを台へ預ける
  - `tension-supported-one-leg`: 片足を半歩前へ出し、前後を入れ替える
  - `tension-seated-foot-head`: お尻を左右へ小さく揺らし、左右差の少ない座る場所を探す
- 上記を`頭全体を上へ10秒 / 壁押し / 支え付き片足立ち / 足は下・頭は上`などの抽象トレーニングへ置換しない
- 一般向けコピーは、行動・対象・目的が一読で分かる生活語にする。`刺激で押す / 燃料 / 荷物 / 火を足す / 交通整理 / 起動`など、目的語や身体反応が曖昧な比喩を新規追加しない
- ただし実物の荷物、壁を押す動作、ツボを押す行為など、対象が明確な通常語は禁止しない
- 食べるケアの主献立は、天気ごとの監修済み`FOOD_IDEAS`から選ぶ。`mode`を適合度へ加点せず、対象日の一日差で回す
- 適合度が近い候補と上位候補を合わせて最低3件のローテーション母集団を確保し、同条件の隣接日で主献立を重複させない
- 同じ入力と対象日は同じ献立を返す。ランダム選択へ変更しない
- 気圧は物理的な上下より、明示された`reaction_direction`を優先して食事・ケアの反応側を決める
- 予報点数、天気ストレス、共通反応プロファイル、7方針、出やすいサイン、暮らすの商品境界、DBは変更しない

詳細: `docs/RADAR_NATURAL_FOOD_ROTATION_BODY_RESTORE_V77916.md`

> v7.79.15以前に記載された身体操作5件の文面と、today/tomorrow別の献立加点は現行仕様ではない。直上を正本とする。

## v7.79.15 暮らすケア・商品境界の現行契約

- 現行ロジック版は`daily_care_v2_13_2026-08-05_product_boundary_copy_audit`
- 身体操作22候補はすべて`shop_eligible=false / item_role=null`。`tension-*`を楽天検索ルールへ再接続しない
- `lifestyle_plan.shop_context`は、表示中の環境調整を優先し、なければ同じ不調・反応プロファイルに適合する環境調整から作る
- `/radar`は`primary_action`や`alternatives`の商品属性ではなく、`shop_context.action_id / item_role / scene_family`だけをショップへ渡す
- 個別ケア候補へ`tool-heat-shield / tool-airflow-redirect / tool-bed-moisture-layer`を戻さない。気候の一般対策は安全注意または一般ショップ方針で扱う
- 身体操作の持ち方は、指先を接触位置へ残し、手首に近い手のひらの付け根を物へ近づけ、手のひら中央に浅いくぼみを残すのが正本
- 物の形、持ち手、個数、実際に行っている家事を根拠なく限定しない。条件が必要なら`〜なら / 〜できる時は`と書く
- `tool-work-height`の胃腸専用文は`item_role=screen_height`。一般の作業高用`reach_support`検索へ落とさない
- `screen_height`商品は、画面・本の用途語とスタンド形状語の両方がある時だけ通す。収納トレーやマイクスタンドを混ぜない
- 医療用品除外で裸の`固定`を使わない。`クランプ固定`のスタンドを落とさず、除外は`固定帯 / 固定具`へ限定する
- 商品適性を暮らす候補の選定スコアへ加えない
- 予報点数、天気ストレス、共通反応プロファイル、7方針、DBは変更しない

詳細: `docs/RADAR_LIFESTYLE_PRODUCT_BOUNDARY_V77915.md`

> v7.79.14以前の身体操作action idから商品へ接続する記述、および天気へ直結する個別環境候補の記述は廃止済み。現行仕様は直上を正本とする。

## v7.79.13 暮らすケアの根拠付き選定契約

- 現行ロジック版は`daily_care_v2_11_2026-08-04_grounded_lifestyle_needs`
- 暮らすの候補は`body / tool_layout`のみ。`environment / foundation`を現行選定へ戻さない
- 主提案は、選択中の`symptom_focus`を`candidate.symptoms`に持つ候補だけから選ぶ
- 候補点は`不調40 / 天気25 / 体質20 / 時間10 / 実行しやすさ5`を上限とし、商品・アフィリエイト適性を加点しない
- 体質点はコア型だけでなく、`yin_yang_score / drive_score / obstruction_score / material six scores / sub_labels`を使う
- 各候補は`care_needs`を持ち、別案は主提案と異なる場面・負担の減らし方を優先する
- `selected_because`は`symptom / weather / constitution`の根拠を保持し、`score_breakdown`と`why_today`を画面・監査へ渡す
- 高温、直風、寝床の湿気のような気象前提候補は`requires_weather_match`を必須にする
- `tool-bed-moisture-layer`はtomorrow専用。todayへ出さない
- tomorrowの暮らす表示は種別にかかわらず`今夜〜明朝の一手`へ統一する
- 主レーンの強制交代はしない。最高点差4以内だけ日付ローテーションする
- 身体操作は`shop_eligible=false`。許可済み`tool-*`が主提案の時だけショップ導線を表示する
- 旧`humidity_control`分類は既存商品互換用に残すが、天気・体質・不調の現行ブーストへ使わない
- 予報点数、天気ストレス、体質親和性、余力補正、DBは変更しない

詳細: `docs/RADAR_GROUNDED_LIFESTYLE_CARE_V77913.md`

> v7.79.12以前の`environment / body`レーン、種別別tomorrow表示、点差0.75の契約は廃止済み。現行仕様は直上を正本とする。

## v7.79.12 暮らすケアの広い場面・実行タイミング契約

- 暮らすケアの現行ロジック版は`daily_care_v2_10_2026-08-02_broad_scene_timing_care`
- 身体操作の画面`scene`は`LIFESTYLE_SCENE_DEFINITIONS`の9基本動作だけを正本にする
- `PUBLIC_ACTION_COPY_BY_ID`へ個別の`scene`を追加して、まな板・モップ・スマホなどの家事名で上書きしない
- 個別候補は基本動作の中の具体策。特定家事専用にせず、同じ動作を含む生活場面へ転用できる文章にする
- tomorrowの身体操作は`明日の一手`、tomorrowの環境調整は`今夜の準備`。bodyを`今夜の一手`と表示しない
- today/tomorrowをローテーションhashへ混ぜない。日付で隣接候補を回し、同じscene内のvariantだけtomorrow offsetを使う
- 適合度差が`0.75`を超える場合は、今日と明日が同じ候補でも無理に替えない
- `enhanceDailyCarePlan`は旧versionの`lifestyle_plan`をbaseとして再利用せず、現行候補から再構築する
- `trap`は常に空。予定、段取り、休憩、止め時、先送りなどの旧コピーを復活させない
- 予報点数、天気ストレス、体質親和性、余力補正、DBは変更しない

詳細: `docs/RADAR_BROAD_SCENE_TIMING_LIFESTYLE_CARE_V77912.md`

## v7.79.11 暮らすケアの環境・身体二系統契約

> 場面表示とtoday/tomorrowの契約はv7.79.12で更新済み。現行仕様は直上を正本とする。

- v7.79.10の適合度優先と近似候補ローテーションは維持する
- 現行レーンは`environment / body`だけ。`foundation`、予定、休憩、止め時、ペース配分を新規選定しない
- 環境候補は`damp / dry / heat / cold`へ直接触れられるものだけ。気圧と寒暖差だけの日に環境案を作らない
- `env-heat-humidity-mode`は`requires_all_triggers = [heat, damp]`を満たす時だけ有効
- 身体操作は選択中の不調へ直接対応する候補がある時だけ有効
- 候補点`2.5`未満は表示せず、主提案1件＋別案1件を超えて補充しない
- 両レーンとも無効なら`primary_action=null / steps=[] / no_suggestion=true`を返す
- 環境の体感欄は`合っている目安`、身体操作は`ラクになった目安`と表示する
- 商品名は対策ケアへ出さず、現行action idからショップ検索だけを解決する
- 予報点数、天気ストレス、体質親和性、余力補正、DBは変更しない

詳細: `docs/RADAR_ENVIRONMENT_BODY_LIFESTYLE_CARE_V77911.md`

## v7.79.10 暮らすケアの文脈優先選定契約

> `foundation`と三件補充の契約はv7.79.11で廃止済み。現行仕様は直上を正本とする。

- `/radar`の暮らすカードは`今日の一手 / 今夜の一手`から始める
- `まずはこれ`、`lifestylePlan.title`、`lifestylePlan.lead`を主提案の前へ重複表示しない
- 主レーンは`body_score`と`environment_score`の高い方
- 最高点差が`LIFESTYLE_LANE_NEAR_TIE_DELTA = 0.75`以内の時だけ日付ローテーション
- 各レーン内も`LIFESTYLE_CANDIDATE_NEAR_TIE_DELTA = 0.75`以内の場面・具体策だけを日付ローテーション
- 適合候補を四場面まで強制拡張しない
- 身体操作は選択中の不調に直接対応する候補がある時だけレーンを有効化する
- この版で採用した`PUBLIC_ACTION_COPY_BY_ID.scene`の個別場面表示はv7.79.12で廃止済み
- `selection_basis`は`lane_score_gap / near_tie_delta / lane_rotation_applied / primary_candidate_score`を返す
- `foundation`は従来どおり強い日または余力が小さい日の補助案だけ
- 予報点数、天気ストレス、体質親和性、余力補正、DBは変更しない

詳細: `docs/RADAR_CONTEXT_FIRST_LIFESTYLE_CARE_V77910.md`

## v7.79.9 暮らすケアの三レーン選定契約

- この版の強制交代契約はv7.79.10で廃止済み。主レーンは適合度優先とする
- `enhanceLifestylePlan`は身体操作だけを候補にせず、`body / environment / foundation`の三レーンを扱う
- 主提案へ選べるのは`body`または`environment`だけ。`foundation`を主提案へ昇格させない
- 身体操作候補はv7.79.8の9基本動作・22具体策を維持する
- 環境実験は`ENVIRONMENT_EXPERIMENT_CANDIDATES`を正本とし、`scene / text / reason / felt_sense / reset`を必須にする
- 環境候補は主・副の天気ストレスに一致する候補へ絞り、選択中の不調に一致する候補があればそれを優先する
- 身体操作と環境実験の適合度差は各レーン内の順位に使い、両レーンが存在する日は日付で主役を交代する
- 主提案と別案には`body`と`environment`を一つずつ含める
- `foundation`は`signal=2`または`reserve_small=true`の時だけ補助案へ追加する
- `care_kind / kind_label / selection_basis`を表示・検証用に返す
- ショップへ渡すaction idは`BODY_MECHANICS_LIVE_QUERY_RULES`と`ENVIRONMENT_LIVE_QUERY_RULES`の許可済み辞書で解決する
- 対策ケア本文へ商品名・楽天検索語を出さない
- 予報点数、天気ストレス、体質親和性、余力補正、DBは変更しない

詳細: `docs/RADAR_LIFESTYLE_CARE_LANES_V7799.md`

## v7.79.8 暮らすケアの二段階選定契約

- v7.79.7の`BODY_MECHANICS_INTERNAL_CANDIDATES`と`PUBLIC_ACTION_COPY_BY_ID`は維持する
- 選定単位は22件の個別候補ではなく、`LIFESTYLE_SCENE_DEFINITIONS`の9基本動作
- 基本動作は`hold_carry / push_pull_turn / reach_take / bend_height / sit_rise / walk_step / screen_handwork / hold_posture / lie_turn`
- 第一段階で、不調に合う場面を優先し、天気ストレス、体質、余力、ケア方針を候補スコアへ反映する
- 第二段階で、選ばれた場面に属する具体操作を日付で決定的に選ぶ
- 個別家事名を`scene`へ戻さない。具体的な道具や生活例は`label`側のバリエーションとして扱う
- `primary_action`と`alternatives`は互いに異なる`scene_family`から返す
- 関連場面が4件以上あれば、同条件の7日間で4種類以上を回し、隣接日に同じ場面を出さない
- 同一日・同一条件は固定。複数案がある場面は、次の巡回時に具体操作も切り替える
- `scene_label`を追加し、`scene / scene_label / scene_family`の対応を固定する
- v7.79.7の画面構造を維持し、A/B比較用のUIや追加入力を導入しない
- 既存`tension-*` action idを維持し、ショップ検索との対応を壊さない
- 予報点数、天気ストレス、体質親和性、余力補正、DBは変更しない

詳細: `docs/RADAR_BROAD_SCENE_LIFESTYLE_CARE_V7798.md`

## v7.79.7 正中張力OSと暮らすケアの接続契約

- `暮らす`の思想的な正本は`docs/BODY_USE_TENSION_CONTINUITY_OS.md`
- これは一般的な姿勢矯正、筋力トレーニング、局所の脱力、単純な負担分散ではない
- 内部モデルは、足の内側から体幹深部・頭頂・母指橈骨側へ伸張を保ち、局所で止めない荷重通過として扱う
- 内部候補の身体OSと、`PUBLIC_ACTION_COPY_BY_ID`のユーザー表示文を混ぜない
- ユーザー文へ`橈骨・母指・正中・張力・起始側・伸張・荷重・重心線・拮抗`を出さない
- 場面は9つの基本動作へまとめ、操作は身体や道具の位置、実際の動き、目で確認できる成功条件、戻し方へ翻訳する
- `lifestyle_plan.primary_action`は`scene / label / reason / felt_sense / reset / scene_family / item_role`を返す
- 候補選定には主・副天気ストレス、不調、ケア方針、`core_code`、`reserve_small`を使う
- 同日・同条件では固定。同じ条件が続く日は、上位候補内で`scene_family`を決定的に回す
- `excluded_symptoms`へ該当する候補は選ばない。めまい時の歩行・階段・深い拾い動作は除外する
- 開発者のトレーニング例を、生活上の一般場面より優先して候補化しない
- 対策ケアへ商品名や検索語を持たせない。ショップへ渡すのは`liveAction / liveRole / liveScene`
- 検索語の正本は`app/api/care-navi/rakuten/route.js`の`BODY_MECHANICS_LIVE_QUERY_RULES`
- URLの自由入力を検索語へ使わず、登録済み`tension-*` action idだけを変換する
- 予報オブジェクト、予報点数、天気ストレス、体質親和性、DBは変更しない

詳細:

- `docs/RADAR_TENSION_CONTINUITY_LIFESTYLE_CARE_V7797.md`
- `docs/BODY_USE_TENSION_CONTINUITY_OS.md`

## v7.79.6 根拠別サイン生成契約

- `/radar`の出やすいサインは必ず次の3件
  1. 主な天気現象から想定する広い身体反応
  2. 主な天気ストレスと選択中の不調を結ぶ短い観察サイン
  3. 体質の反応様式と選択中の不調を結ぶ個別サイン
- 2・3件目の正本は`lib/radar_v1/bodySignInsights.js`
- `app/radar/page.js`は`riskContext`を`getForecastBodySigns`へ渡す
- 体質側で使う情報は`core_code`、`sub_labels`、`manifestation.reaction_direction`
- `reaction_direction`が明示されている場合は`accel / brake / balanced`を優先。未保存の旧データだけ`core_code`の軸で補完する
- 天気×不調は完成文の辞書から選び、天気説明と症状断片を自由結合しない
- 日付ローテーションは同一根拠内の候補選択だけに使う。同じ日・同じ入力では同じ結果を返す
- 未選択の身体領域、根拠のない部位比較、症状の発生順、行動時の細かな条件を推測して補わない
- 気圧の物理方向は表示用、身体反応方向はサイン用として再結合しない
- v7.79.5の`RADAR_NARRATIVE_WEATHER_INSIGHT_CONTEXTS`と`RADAR_NARRATIVE_SYMPTOM_OBSERVATIONS`は削除済み
- 表示文だけの変更で、体調ゆらぎ度、天気ストレス、体質親和性、余力、対策ケア、DBへ影響させない

詳細: `docs/RADAR_GROUNDED_BODY_SIGNS_V7796.md`

## v7.79.5 天気ストレス×不調の観察サイン契約

> この契約はv7.79.6で廃止済み。実装時は直上の根拠別サイン生成契約を正本とする。

- 出やすいサインの役割は次の3件
  1. 主な天気現象から想定する身体反応
  2. 主な天気ストレスと選択中の不調を接続した観察サイン
  3. 同じ交差条件から見た別の観察サイン
- 2・3件目は`RADAR_NARRATIVE_WEATHER_INSIGHT_CONTEXTS`と`RADAR_NARRATIVE_SYMPTOM_OBSERVATIONS`から構成する
- 天気名を機械的に付けるだけでなく、環境への調整と本人が気づける兆候を一文でつなぐ
- 日付による選択は決定的。同じ日・同じ入力で文言を変えない
- 不調を横断しない。`mood`へ胃腸、`sleep`へ食後など、未選択領域を条件として補わない
- 気圧の物理方向と身体反応方向を再結合しない。気圧本文は既存のpressure response rewriteを通す
- 表示候補のみの変更で、体調ゆらぎ度、天気ストレス、体質親和性、余力、対策ケアへ影響させない

詳細: `docs/RADAR_WEATHER_SYMPTOM_INSIGHTS_V7795.md`

## v7.79.4 参考体質デモとサイン選択契約

- 未ログイン公開予報は文字どおりの`天気だけ`ではなく、`reference_profile.kind = neutral_reference`を前提にする
- 参考体質は`reaction_balance = balanced`、`reserve_level = standard`、`affinity_policy = flat_midpoint`
- 公開APIの`forecast.reference_profile`を、UI上の`参考体質で見る体調予報デモ`という説明と対応させる
- `getForecastBodySigns`の第5引数`targetDate`は任意。未指定時も後方互換を保つ
- 出やすいサインの1件目は天気現象から固定し、2・3件目だけを日付と不調キーで決定的に選ぶ
- 同じ日・同じ入力では同じ結果を返す。`Math.random()`などの非決定的な選択を入れない
- 日付による選択は表示候補だけに作用し、予報点数、体質親和性、余力補正、ケア選定を変更しない

詳細: `docs/RADAR_REFERENCE_DEMO_SIGN_ROTATION_V7794.md`

## v7.79.3 水分環境の状態・方向契約

- `moisture_state`は対象日の絶対湿度帯を表す
  - `damp`: 14g/m³超を含み、8g/m³未満を含まない
  - `dry`: 8g/m³未満を含み、14g/m³超を含まない
  - `neutral`: 全点が8〜14g/m³
  - `mixed`: 8g/m³未満と14g/m³超の両方を含む
- `moisture_direction`は絶対湿度の変化方向であり、`up / down / mixed / steady`
- `damp / dry`が明確な日は、状態側で親和性を決める。方向は現象説明とピーク選択に使う
- `neutral / mixed`または旧データでは、従来のcomfort departure / reliefから`damp / dry`へ投影する
- 予報、リスク文脈、公開デモへ`moisture_state`を明示的に引き継ぐ

詳細: `docs/RADAR_MOISTURE_STATE_DIRECTION_V7793.md`

## v7.79.2 予報文の条件整合と比喩表現

- `app/radar/utils.js`の出やすいサインは、1件目が主な天気現象、2・3件目が選択中の不調から感じ取れるサイン
- `mood`を選んだだけで`胃腸が重い`、`気分に湿気がたまる`などの別条件を補わない
- 胃腸・湿気などを気分の文へ接続する場合は、実際の天気イベント、体質傾向、不調条件のいずれかに根拠が必要
- 東洋医学の感覚を伝える比喩は使用可。ただし、身体領域を飛び越える因果、意味の定まらない空間比喩、複数の機械比喩を重ねた表現は避ける
- 予報スコア、体質補正、天気ストレス、対策ケア選定は変更していない

詳細: `docs/RADAR_COPY_CLARITY_V7792.md`

## v7.78.26.2 trigger_dir DB契約

- `radar_forecasts.trigger_dir`は`up / down / change / none`
- `temp_shift`は`main_trigger=temp / trigger_dir=change`で保存する
- `mixed / steady`は詳細な物理方向として`computed.forecast_snapshot`へ保持
- コード側で`change`を`up/down`へ変換しない
- migration適用後にアプリをデプロイする
- 予報計算、体質補正、ケア選定の変更なし

## v7.78.26 対策ケアと表示語の統一

- ユーザー向けの正式名称は`対策ケア`。記録、ガイド、ショップ、体質チェック結果、設定、Ekkenでも同じ語を使う
- 予報段階の表示は`安定 / いたわり / 守り`。旧`注意 / 要警戒 / 注意予報`へ戻さない
- 通常の絶対温度は`低温 / 高温`、水分環境は`湿気 / 乾燥`
- `dailyCare`、`displayed_care`、`performed_care_items`、`dailyCareV2.js`は内部互換名なので変更しない
- DB、予報計算、体質補正、ケア選定は変更なし
- records prompt versions:
  - analysis: `records_analysis_v14_care_terminology_2026-07-25`
  - chat: `records_chat_v15_care_terminology_2026-07-25`
  - live support: `records_live_support_v15_care_terminology_2026-07-25`

## v7.78.25 旧導線・予報GPTの削除

- 旧`/karte/[id]`、Karte Plus、単品Stripe購入は削除済み
- Stripeは`radar_subscription`のCheckout／Webhook／entitlementsを、将来のサブスク実装用に保持
- 旧`/calendar`、`/insights`、`daily_checkins`、`daily_care_logs`、`weekly_ai_reports`は削除済み
- 予報GPTのenrich/live route、prompt、生成待ち、旧生成文温存処理は削除済み
- 予報の正本は`buildFastRadarBundle`→`buildRadarPlan`→`saveForecast`の構造化ルール出力
- Ekkenの記録分析・相談は現行機能なので削除しない
- DB整理SQL: `supabase/migrations/20260724_remove_obsolete_routes_data_v77825.sql`

## v7.78.24 天気ストレスへの表示語統一

- ユーザー表示は`天気負荷`ではなく`天気ストレス`を正本とする
- `/radar`の天気ストレス枠内では、重複を避けてピークピルを`ピーク時間帯`と表示する
- 時間の意味は`天気ストレスが強まる時間帯`、ケア時刻は`天気ストレスのピーク前`
- `/radar`の各カードは`負荷`の小見出しを表示せず、`高／中／低`だけを表示する
- `effective_load`、weather load系の内部キー、DB列、`before_peak`は互換性のため変更しない
- 予報計算・DB・環境変数の変更なし

## v7.78.23 天気負荷ピークの意味統合

- `peak_start / peak_end`は`天気負荷が強まる時間帯`。症状発現・悪化時刻として扱わない
- ユーザー表示は`天気負荷のピーク`、ケア・記録の前後関係は`天気負荷のピーク前`
- DB列と内部enum `before_peak`は変更しない
- records AI共通知識と3プロンプトへ症状時刻ではない境界を追加
- records prompt versions:
  - analysis: `records_analysis_v13_weather_peak_semantics_2026-07-24`
  - chat: `records_chat_v14_weather_peak_semantics_2026-07-24`
  - live support: `records_live_support_v14_weather_peak_semantics_2026-07-24`
- 深夜またぎは`開始時–翌終了時`、ピークピルは12px
- 予報計算・DB・環境変数の変更なし

## v7.78.22 天気負荷ピークの記号

- `/radar`の`天気負荷のピーク`は`IconBolt`を使う
- ピークピルでは`attentionDirection`を矢印表示しない
- `attention_direction`と方向別ピークは計算・保存・互換性のため維持する
- `IconAttention`は猛暑・厳寒の独自注意に使用する
- 計算エンジン、DB、環境変数の変更はない

## v7.78.21 天気負荷UIの簡素化

- `/radar`の3カードはカテゴリ名を上、現象アイコン＋現象名を中央、負荷段階を下に表示する
- 個別カードではピーク時刻を表示しない
- `weatherLoadPeak`は、`load >= 0.34`かつ`peakStart / peakEnd`を持つ3群から、最大負荷の1件だけを選ぶ
- 表示名は`天気負荷のピーク`。身体症状が出る時刻とは説明しない
- `environmentalCautions`は天気負荷枠の下に置き、native `details`で初期状態を閉じる
- 予報ヒーロー内の`注意時間の前に／先回りケア`は削除。対策ケアの生成・表示は維持
- 計算エンジン、保存データ、DB、環境変数の変更はない

## v7.78.20 注意時間と水分環境の表示契約

- `channel_peaks`は各方向の`strength`を持ち、気圧は`pressure_up / pressure_down`、気温は`temp_up / temp_down`、水分環境は`moisture_up / moisture_down`を保存する
- `attention_direction`は、カード全体の`direction=mixed`とは別に、表示中の注意時間が上昇側か低下側かを示す
- 寒暖差・気圧変動のアイコンはmixedのまま維持し、時間欄だけを最大ピーク方向の矢印にする
- 水分環境は`moisture_shift`を独立した第3表示にせず、負荷の向きと中間帯からの離れ方に応じて`damp / dry`へ投影する
- 湿った側から中間帯へ戻る低下は`dry`にせず`damp`、乾いた側から戻る上昇は`damp`にせず`dry`として扱う
- 湿度カードは、絶対環境負荷と変化負荷の強い方を表示する。体調ゆらぎ度では従来どおり両者を単純加算せず、急性変化と絶対環境の大きい方を土台にする
- 保存形式は追加フィールドのみで、旧スナップショットは`direction`から補完可能
- 外部設定は引き続き`RADAR_FORECAST_MODEL_VERSION=v2`。`v1`ロールバックも維持

## v7.78.19 天気アイコンの表示契約

- 天気ストレスの計算イベント数は6のまま。今回の変更は表示意味とSVGの接続だけ
- `temperature_shift + up`は既存の気温上昇アイコン、`temperature_shift + down`は新しい気温低下アイコン、`mixed / change`は新しい寒暖差アイコン
- `heat`は新しい高温アイコン、`cold`は既存の氷結・低温アイコン
- 気圧の物理方向が`mixed`なら、保存上の`pressure_down / pressure_up`より方向データを優先して新しい気圧変動アイコンを表示
- `WeatherIcon`には`triggerKey`と必要に応じて`direction`を渡す。状態と方向を呼び出し側で再び混同しない
- ユーザー表示名は`寒暖差`へ統一。旧`気温差が大きい日`は通知の互換入力としてだけ残す
- 予報スコア、親和性、余力、ケア、保存データ形式、DBは変更なし

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

## v7.79.1 Stripe決済後の同期契約

- 契約表示の正本は`getBillingStatus(userId)`。`getPremiumStatus`と
  `getRecordsAccess`を別々に読んで画面判断を分岐させない
- 有効なentitlementと無料先行体験が同時に存在する場合、`mode = paid`を優先する
- Checkout成功URLには`session_id={CHECKOUT_SESSION_ID}`を付け、
  `/api/stripe/checkout/confirm`でログインユーザー、商品、Price、test/liveモードを
  検証してから同期する
- Checkout確認とWebhookは`lib/stripeSubscription.js`を共用する
- `already_subscribed`は契約状態を含む正常な競合応答として扱い、赤いエラーへ戻さない
- 契約状態APIは`private, no-store`。設定・記録画面はfocus/visibility復帰時にも再確認する
- Checkout queryは契約確認後に削除し、失敗時は再読込で再試行できるよう保持する
- DB migrationと環境変数の追加はない

詳細: `docs/STRIPE_CHECKOUT_CONFIRMATION_V7791.md`

## v7.79.0 Stripeサブスク境界

- 無料: 体質チェック、体質トリセツ、体調予報、対策ケア、記録カレンダー
- プレミアム: AI分析タブ全体、Ekken相談
- 2026年8月31日までは先行体験。9月1日0:00 JSTから有効なentitlementで判定
- test/liveのStripe権限を`stripe_livemode`で分離する

詳細: `docs/STRIPE_SUBSCRIPTION_LAUNCH_V7790.md`

## v7.78.18 互換性とEkkenの気圧反応契約

- `readExplicitPressureResponseDirection`は、反応方向が保存されていない旧データでは`null`を返す。欠損を`balanced`へ変換しない
- 旧データは物理キー`pressure_down / pressure_up`の既存ケアを維持し、新データの明示的な`balanced`だけ`default`へ投影する
- Ekken入力では物理方向と身体反応を推測させず、上位と各factorの両方に`pressure_direction`、`response_direction`、`body_response_key`を渡す
- `environmental_cautions`は体質別ゆらぎ度とは別の独自注意であり、公的アラートやWBGTとして説明しない
- 体質トリセツも`yin_yang_score`から同じ反応方向を読み、気圧の向きだけで張り／重さを固定しない
- 4組の結合テストは`tests/radar-pressure-response-integration-v77818.test.mjs`が正本
- v7.78.18は接続と互換性の仕上げであり、V2の予報スコア式と係数は変更しない

詳細: `docs/RADAR_PRESSURE_RESPONSE_FINAL_INTEGRATION_V77818.md`

## v7.78.17 気圧の物理方向と体質反応の統合契約

- `pressure_direction = up / down / mixed`は物理方向。天気カード、気圧アイコン、観測説明にだけ使う
- `pressure_response_direction = accel / brake / balanced`は体質由来の表れ方。不調サイン、ケア、食事、ツボ、Ekken、商品選定に使う
- `personal_main_trigger_exact = pressure_up / pressure_down`は物理イベントを保持する互換フィールドであり、体の表れ方を決めるキーとして直接使わない
- 旧ケア辞書へ渡す場合は必ず`getLegacyCareTriggerKey`で反応方向から投影し、本文は`rewritePressureBodyCopyDeep`で物理方向の断定を中立化する
- 4組すべてで同じ契約を守る: 低下×アクセル=張り、低下×ブレーキ=重だるさ、上昇×アクセル=張り、上昇×ブレーキ=重だるさ
- `environmental_cautions`は絶対気温による別枠注意。体質別スコア、公的警戒アラート、WBGTの代用にしない
- v7.78.17では体調ゆらぎ度の式と係数を変更していない

詳細: `docs/RADAR_PRESSURE_RESPONSE_INTEGRATION_V77817.md`

## v7.78.16 体調予報V2の快適域方向・季節校正

- `lib/radar_v1/weatherStressV2.js`で、気温18〜27℃と絶対湿度8〜14g/m³を変化方向判定用の中間帯として使う
- 中間帯から遠ざかる変化を主にし、中間帯へ戻る変化は気温22%・水分環境20%だけ残す
- 湿気の絶対負担は気温と組み合わせる。UIの気温・湿度負荷は分けたまま、総合点では一つの温熱環境へまとめる
- `lib/radar_v1/personalizeForecastV2.js`の有効負担は`気象×(0.38+0.62×本人親和性)`
- 体調ゆらぎ度は`max(変化スコア, 絶対環境スコア)+小さな重なり`。通常の季節負担は体質差を残し、極端環境だけ共通下限を立てる
- 公開予報は`personalizePublicForecastV2`を使い、専用の強い加算式へ戻さない
- `RADAR_FORECAST_MODEL_VERSION=v2`の外部契約は維持。内部識別子は`radar_forecast_v2_2026-07-22_comfort_calibrated`

詳細: `docs/RADAR_FORECAST_V2_COMFORT_CALIBRATION_V77816.md`

## v7.78.15 体質トリセツ「整え方」コピー

- `lib/diagnosis/v2/carePreferences.js`のスコアと上位3方針は変更していない
- 7方針の表示文は、比喩的な内部設計語より、何を整えるかが初見で分かる語彙を優先する
- 体質トリセツはふだん合いやすい方針、体調予報は天気と今の不調を重ねた当日の優先方針として役割を分ける
- 7方針は日々の対策ケア、パーソナルケアショップ、Ekken相談をつなぐ共通語彙として扱う

詳細: `docs/CONSTITUTION_CARE_COPY_V77815.md`

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
