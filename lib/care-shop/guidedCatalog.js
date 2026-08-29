/**
 * 悩みから探すための比較候補マスター。
 *
 * ここにあるのは診断や購入指示ではなく、表示条件を満たしたときに
 * 「何を比較するか」を整理するための候補。医薬品は商品名ではなく、
 * 漢方は処方名、一般用医薬品は有効成分・薬効群を正本にする。
 */

export const GUIDED_SCOPE_OPTIONS = [
  { key: "all", label: "まとめて見る", oral: true },
  { key: "selfcare", label: "ケア用品", oral: false },
  { key: "food", label: "食品・飲み物", oral: false },
  { key: "supplement", label: "サプリ・成分", oral: true },
  { key: "kampo", label: "漢方薬", oral: true },
  { key: "otc", label: "市販薬", oral: true },
];

export const GUIDED_SCOPE_META = {
  selfcare: { label: "ケア用品", eyebrow: "使い方から選ぶ", tone: "mint" },
  food: { label: "食品・飲み物", eyebrow: "日々の土台", tone: "gold" },
  supplement: { label: "サプリ・成分", eyebrow: "成分から比較", tone: "blue" },
  kampo: { label: "漢方薬", eyebrow: "処方名から比較", tone: "violet" },
  otc: { label: "市販薬", eyebrow: "有効成分から比較", tone: "rose" },
};

const C = (candidate) => ({
  avoidStates: [],
  caution: "",
  ingredientIds: [],
  minStateMatches: 0,
  trust: "要ラベル確認",
  ...candidate,
});

export const GUIDED_CANDIDATES = [
  // ケア用品
  C({ id: "care-warm-pack", type: "selfcare", title: "繰り返し使える温熱パック", query: "温熱パック 電子レンジ 繰り返し", symptoms: ["fatigue", "digestion", "neck_shoulder", "low_back_pain"], states: ["cold", "tension", "stagnation"], direction: "冷えやこわばりを増やさず、短く温める", reason: "温めると楽になる感覚がある時に、使う場所と時間を調整しやすいケア用品です。", caution: "熱感・腫れ・急な痛みがある場所には使わず、低温やけどに注意してください。", trust: "用途確認済み" }),
  C({ id: "care-neck-pillow", type: "selfcare", title: "首肩用の温冷ケアパッド", query: "首肩 温冷 ケア パッド", symptoms: ["neck_shoulder", "headache"], states: ["tension", "stagnation", "heat"], direction: "首肩へ負担を足さず、温冷を選べるようにする", reason: "張りや熱感に合わせて温冷を使い分けたい時の比較候補です。", caution: "突然の激しい頭痛、しびれ、麻痺がある場合はセルフケアを優先しません。", trust: "用途確認済み" }),
  C({ id: "care-leg-release", type: "selfcare", title: "脚用のやさしいリリース用品", query: "ふくらはぎ マッサージ ローラー やわらか", symptoms: ["swelling", "fatigue"], states: ["damp", "stagnation"], direction: "脚の重さをためない", reason: "強く押さず、短時間で脚を動かすきっかけを作りやすい用品です。", caution: "片脚だけの急な腫れ・熱・痛みがある時は使用せず、受診を優先してください。", trust: "用途確認済み" }),
  C({ id: "care-sleep-light", type: "selfcare", title: "光を減らす睡眠環境用品", query: "遮光 アイマスク 睡眠", symptoms: ["sleep", "headache", "fatigue"], states: ["tension", "recovery_low", "heat"], direction: "夜の刺激を減らす", reason: "眠る直前の光刺激を減らし、休む環境を作るための候補です。", trust: "用途確認済み" }),
  C({ id: "care-humid-meter", type: "selfcare", title: "温湿度計", query: "温湿度計 デジタル 室内", symptoms: ["sleep", "fatigue", "headache", "dizziness"], states: ["damp", "dry", "heat", "cold"], direction: "体感だけでなく室内環境を見える化する", reason: "湿気・乾燥・暑さ・冷えの重なりを確認して、空調を調整する土台になります。", trust: "用途確認済み" }),
  C({ id: "care-lumbar-support", type: "selfcare", title: "姿勢を変えやすい腰サポート", query: "腰 クッション 姿勢 サポート", symptoms: ["low_back_pain", "fatigue"], states: ["tension", "stagnation"], direction: "同じ姿勢を続けない", reason: "腰を固定し続けるより、座り方を切り替えやすくする用品を比較します。", caution: "強い痛みや脚のしびれ、排尿・排便の異常がある場合は受診を優先してください。", trust: "用途確認済み" }),

  // 食品・飲み物
  C({ id: "food-warm-soup", type: "food", title: "温かい汁物・スープの常備", query: "無添加 スープ 常温 保存", symptoms: ["fatigue", "digestion", "dizziness"], states: ["cold", "energy_low", "digestive_weak"], direction: "食べられる形で水分と食事を戻す", reason: "食欲や余力が落ちた日に、冷たい物だけで済ませないための候補です。", caution: "塩分・アレルギー表示は商品ごとに確認してください。", trust: "食品表示を確認" }),
  C({ id: "food-barley", type: "food", title: "はとむぎ・大麦を使った食品", query: "はとむぎ 国産 食品", symptoms: ["swelling", "fatigue", "digestion"], states: ["damp", "digestive_weak"], direction: "重さが気になる日の主食・間食を見直す", reason: "健康食品の効能ではなく、普段の穀類の選択肢として比較します。", caution: "妊娠中や食物アレルギーがある場合は原材料を確認してください。", ingredientIds: ["coix_seed"], trust: "食品表示を確認" }),
  C({ id: "food-ginger", type: "food", title: "しょうがを使った飲み物・食品", query: "しょうが 飲み物 無糖", symptoms: ["fatigue", "digestion", "neck_shoulder"], states: ["cold", "digestive_weak"], avoidStates: ["heat"], direction: "冷たい飲食の連続を切る", reason: "冷えを感じる時に、温かい一杯へ切り替えるための食品候補です。", caution: "辛味で胃がつらくなる人や、抗凝固薬など服薬中の人は取り方を確認してください。", ingredientIds: ["ginger"], trust: "食品表示を確認" }),
  C({ id: "food-caffeine-free", type: "food", title: "カフェインを含まない飲み物", query: "ノンカフェイン お茶 無糖", symptoms: ["sleep", "mood", "headache"], states: ["tension", "recovery_low", "dry"], direction: "夕方以降の刺激を減らす", reason: "夜までカフェインを重ねないための、置き換え候補です。", caution: "ハーブや生薬を含む商品は、妊娠・授乳中や服薬中なら原材料も確認してください。", trust: "食品表示を確認" }),
  C({ id: "food-protein", type: "food", title: "たんぱく質を補いやすい常備食品", query: "たんぱく質 常温 保存 食品", symptoms: ["fatigue", "dizziness"], states: ["energy_low", "recovery_low"], direction: "食事を抜いた日の不足を重ねない", reason: "サプリの前に、普段の食事でたんぱく質を続けられる形を比較します。", caution: "腎疾患などで食事制限がある場合は、自己判断で増やさないでください。", trust: "食品表示を確認" }),
  C({ id: "food-yam", type: "food", title: "山芋を使った食品", query: "山芋 国産 食品", symptoms: ["fatigue", "digestion"], states: ["energy_low", "digestive_weak"], direction: "食べやすい主食・副菜で土台を補う", reason: "食品としての山芋と、生薬の山薬（サンヤク）を同一視せずに比較します。", caution: "食物アレルギー、腎疾患等の食事制限がある場合は原材料と量を確認してください。", ingredientIds: ["yam_rhizome"], trust: "食品表示を確認" }),

  // サプリ・単一成分
  C({ id: "supp-iron", type: "supplement", title: "鉄（単一成分を中心に比較）", query: "鉄 サプリ 成分量 ヘム鉄 非ヘム鉄", symptoms: ["fatigue", "dizziness"], states: ["energy_low", "recovery_low"], direction: "不足の有無を確認してから補う", reason: "だるさやめまいだけで鉄不足とは決めず、食事・月経・検査歴も含めて比較する成分です。", caution: "過剰摂取や胃腸症状があります。強い症状、妊娠中、治療中は医師・薬剤師へ確認してください。", ingredientIds: ["iron"], trust: "成分量・由来を確認" }),
  C({ id: "supp-b-vitamins", type: "supplement", title: "ビタミンB群", query: "ビタミンB群 サプリ 成分量", symptoms: ["fatigue", "digestion"], states: ["energy_low", "recovery_low"], direction: "食事の偏りと含有量を確認する", reason: "食事状況を確認したうえで、複数成分の重複を避けながら比較します。", caution: "他のマルチビタミンや栄養ドリンクとの成分重複を確認してください。", ingredientIds: ["vitamin_b_group"], trust: "成分量を確認" }),
  C({ id: "supp-magnesium", type: "supplement", title: "マグネシウム", query: "マグネシウム サプリ 成分量", symptoms: ["sleep", "neck_shoulder", "mood", "headache"], states: ["tension", "recovery_low"], direction: "食事量と他製品の重複を確認する", reason: "緊張感だけで選ばず、食事・便通・腎機能・併用成分も見て比較します。", caution: "下痢を起こすことがあります。腎機能低下や服薬中は事前に確認してください。", ingredientIds: ["magnesium"], trust: "成分量を確認" }),
  C({ id: "supp-ginseng", type: "supplement", title: "高麗人参（オタネニンジン）", query: "高麗人参 サプリ 原材料 含有量", symptoms: ["fatigue"], states: ["energy_low", "cold"], avoidStates: ["heat", "tension"], direction: "刺激感と併用薬を確認する", reason: "生薬由来の健康食品として、部位・抽出物・含有量を分けて確認します。", caution: "不眠、動悸、血圧や血糖への影響、抗凝固薬などとの相互作用に注意が必要です。", ingredientIds: ["ginseng_root"], trust: "使用部位・抽出量を確認" }),
  C({ id: "supp-ginkgo", type: "supplement", title: "イチョウ葉エキス", query: "イチョウ葉 エキス サプリ 規格", symptoms: ["dizziness", "mood"], states: ["stagnation"], direction: "症状の原因確認を先にする", reason: "めまいの治療代わりにはせず、使用目的と規格を確認して比較します。", caution: "出血リスクがある薬との相互作用があります。めまいが続く場合は受診を優先してください。", ingredientIds: ["ginkgo_leaf"], trust: "規格・抽出量を確認" }),
  C({ id: "supp-turmeric", type: "supplement", title: "ウコン（根茎由来）", query: "ウコン サプリ クルクミン 含有量", symptoms: ["digestion", "fatigue"], states: ["stagnation"], avoidStates: ["digestive_weak"], direction: "飲酒対策と混同せず成分量を見る", reason: "食品・健康食品として、原料部位とクルクミン量を分けて比較します。", caution: "胆道疾患、肝疾患、抗凝固薬などがある場合は自己判断で使わないでください。", ingredientIds: ["turmeric_rhizome"], trust: "使用部位・成分量を確認" }),
  C({ id: "supp-maca", type: "supplement", title: "マカ", query: "マカ サプリ 原材料 含有量", symptoms: ["fatigue", "mood"], states: ["energy_low"], direction: "複合製品の中身を分けて見る", reason: "商品名の印象ではなく、マカ量と同時配合成分を確認して比較します。", caution: "妊娠・授乳中、ホルモン感受性疾患、治療中は専門家へ確認してください。", ingredientIds: ["maca_root"], trust: "原料量・併用成分を確認" }),
  C({ id: "supp-coix", type: "supplement", title: "ヨクイニン・ハトムギ由来成分", query: "ヨクイニン ハトムギ サプリ 含有量", symptoms: ["swelling", "digestion"], states: ["damp"], direction: "食品と医薬品の区分を確認する", reason: "同じハトムギ由来でも、食品・健康食品・医薬品では目的と表示が異なるため、区分から比較します。", caution: "妊娠中は避ける判断が必要な場合があります。製品区分と添付文書を確認してください。", ingredientIds: ["coix_seed"], trust: "製品区分を確認" }),
  C({ id: "supp-eucommia", type: "supplement", title: "杜仲葉を使ったお茶・健康食品", query: "杜仲葉 茶 健康食品 原材料", symptoms: ["fatigue", "swelling"], states: ["damp", "energy_low"], direction: "使用部位と同時配合成分を確認する", reason: "杜仲の樹皮を生薬として使う場合と、杜仲葉の茶・健康食品を区別して比較します。", caution: "血圧や血糖の治療中、妊娠・授乳中は使用前に専門家へ確認してください。", ingredientIds: ["eucommia_leaf"], trust: "使用部位・原材料を確認" }),

  // 漢方薬（OTCの処方名候補。最終選択は適応・添付文書確認が前提）
  C({ id: "kampo-hochuekkito", type: "kampo", title: "補中益気湯", query: "補中益気湯 第2類医薬品", symptoms: ["fatigue"], states: ["energy_low", "digestive_weak", "recovery_low"], avoidStates: ["heat"], minStateMatches: 2, direction: "疲れやすさと胃腸の弱りを一緒に確認する", reason: "体力が落ち、食欲低下や疲労が続く方向で添付文書の適応を照合する処方候補です。", caution: "甘草を含みます。高血圧、むくみ、心腎疾患、併用薬がある場合は薬剤師等へ確認してください。", ingredientIds: ["formula_hochuekkito", "licorice_root", "ginseng_root", "astragalus_root"], trust: "添付文書確認" }),
  C({ id: "kampo-rikkunshito", type: "kampo", title: "六君子湯", query: "六君子湯 第2類医薬品", symptoms: ["digestion", "fatigue"], states: ["digestive_weak", "energy_low", "damp"], minStateMatches: 2, direction: "胃腸の弱りと食欲を確認する", reason: "胃腸が弱く、食欲不振や胃もたれがある方向で適応を照合する処方候補です。", caution: "甘草を含みます。服薬中や持病がある場合は薬剤師等へ確認してください。", ingredientIds: ["formula_rikkunshito", "licorice_root", "ginseng_root"], trust: "添付文書確認" }),
  C({ id: "kampo-goreisan", type: "kampo", title: "五苓散", query: "五苓散 第2類医薬品", symptoms: ["swelling", "headache", "dizziness"], states: ["damp"], avoidStates: ["dry"], direction: "水分の偏りと尿量・口渇を確認する", reason: "むくみや天候時の不調だけで決めず、口渇や尿量など添付文書上の条件を照合する処方候補です。", caution: "長引くめまい・頭痛・嘔吐は原因確認を優先してください。", ingredientIds: ["formula_goreisan"], trust: "添付文書確認" }),
  C({ id: "kampo-boiogito", type: "kampo", title: "防已黄耆湯", query: "防已黄耆湯 第2類医薬品", symptoms: ["swelling", "fatigue"], states: ["damp", "energy_low"], minStateMatches: 2, direction: "むくみと体力傾向を一緒に確認する", reason: "疲れやすく汗をかきやすい等の体力傾向を含めて適応を照合する処方候補です。", caution: "甘草を含みます。高血圧、むくみ、心腎疾患、服薬中は薬剤師等へ確認してください。", ingredientIds: ["formula_boiogito", "licorice_root", "astragalus_root"], trust: "添付文書確認" }),
  C({ id: "kampo-kamikihito", type: "kampo", title: "加味帰脾湯", query: "加味帰脾湯 第2類医薬品", symptoms: ["sleep", "mood", "fatigue"], states: ["energy_low", "recovery_low", "tension"], minStateMatches: 2, direction: "疲労・不安感・睡眠をまとめて確認する", reason: "心身の疲れや不安感を伴う睡眠の乱れで、体力傾向と適応を照合する処方候補です。", caution: "甘草を含みます。治療中、妊娠中、併用薬がある場合は薬剤師等へ確認してください。", ingredientIds: ["formula_kamikihito", "licorice_root", "ginseng_root", "astragalus_root"], trust: "添付文書確認" }),
  C({ id: "kampo-sansoninto", type: "kampo", title: "酸棗仁湯", query: "酸棗仁湯 第2類医薬品", symptoms: ["sleep"], states: ["recovery_low", "energy_low", "tension"], minStateMatches: 2, direction: "疲れているのに眠れない状態を確認する", reason: "心身の疲れを伴う不眠方向で、添付文書の体力・症状条件を照合する処方候補です。", caution: "甘草を含む製品があります。長引く不眠や日中機能低下は受診も検討してください。", ingredientIds: ["formula_sansoninto", "licorice_root"], trust: "添付文書確認" }),
  C({ id: "kampo-hangekobokuto", type: "kampo", title: "半夏厚朴湯", query: "半夏厚朴湯 第2類医薬品", symptoms: ["mood", "digestion", "sleep"], states: ["tension", "stagnation"], minStateMatches: 2, direction: "喉・胸のつかえと気分の緊張を確認する", reason: "気分がふさぎ、喉や食道部につかえ感がある方向で適応を照合する処方候補です。", caution: "飲み込みづらさが続く、体重減少、胸痛がある場合は自己判断を避けてください。", ingredientIds: ["formula_hangekobokuto", "ginger"], trust: "添付文書確認" }),
  C({ id: "kampo-anchusan", type: "kampo", title: "安中散", query: "安中散 第2類医薬品", symptoms: ["digestion"], states: ["cold", "digestive_weak"], avoidStates: ["heat"], minStateMatches: 2, direction: "冷えを伴う胃痛・胸やけ方向を確認する", reason: "胃が冷えやすく、胃痛や胸やけなどがある方向で適応を照合する処方候補です。", caution: "甘草を含みます。黒い便、吐血、強い腹痛がある場合は受診を優先してください。", ingredientIds: ["formula_anchusan", "licorice_root"], trust: "添付文書確認" }),
  C({ id: "kampo-kakkonto", type: "kampo", title: "葛根湯", query: "葛根湯 第2類医薬品", symptoms: ["neck_shoulder", "headache"], states: ["cold", "tension"], avoidStates: ["heat", "energy_low"], minStateMatches: 2, direction: "急な寒気・首肩のこわばりとの組み合わせを確認する", reason: "慢性的な肩こり全般ではなく、感冒初期など添付文書の条件に合うかを確認する処方候補です。", caution: "麻黄・甘草を含みます。高血圧、心疾患、甲状腺疾患、排尿困難、服薬中は薬剤師等へ確認してください。", ingredientIds: ["formula_kakkonto", "ephedra_herb", "licorice_root", "ginger", "kudzu_root"], trust: "添付文書確認" }),
  C({ id: "kampo-tokishakuyakusan", type: "kampo", title: "当帰芍薬散", query: "当帰芍薬散 第2類医薬品", symptoms: ["dizziness", "swelling", "fatigue"], states: ["cold", "energy_low", "damp"], minStateMatches: 2, direction: "冷え・貧血傾向・めまい等の組み合わせを確認する", reason: "冷えや体力傾向を含む複数条件で、添付文書の適応を照合する処方候補です。", caution: "めまいの原因確認が先です。妊娠中、治療中、服薬中は専門家へ確認してください。", ingredientIds: ["formula_tokishakuyakusan", "peony_root"], trust: "添付文書確認" }),
  C({ id: "kampo-shakuyakukanzoto", type: "kampo", title: "芍薬甘草湯", query: "芍薬甘草湯 第2類医薬品", symptoms: ["low_back_pain", "neck_shoulder"], states: ["tension", "stagnation"], direction: "急な筋肉のけいれん・痛みかを確認する", reason: "慢性痛全般ではなく、急激な筋肉のけいれんを伴う痛み等の適応を照合する処方候補です。", caution: "甘草量が多い処方です。連用を避け、他の甘草含有製品との重複に特に注意してください。", ingredientIds: ["formula_shakuyakukanzoto", "peony_root", "licorice_root"], trust: "添付文書確認" }),

  // 一般用医薬品（有効成分・薬効群）
  C({ id: "otc-acetaminophen", type: "otc", title: "アセトアミノフェン配合の解熱鎮痛薬", query: "アセトアミノフェン 市販薬", symptoms: ["headache", "neck_shoulder", "low_back_pain"], states: [], direction: "痛み止めの有効成分と重複を確認する", reason: "商品名ではなく、有効成分量・服用間隔・他のかぜ薬との重複から比較します。", caution: "肝疾患、飲酒量が多い、他の解熱鎮痛薬・かぜ薬を使用中の場合は薬剤師等へ確認してください。", ingredientIds: ["acetaminophen"], trust: "添付文書確認" }),
  C({ id: "otc-nsaid", type: "otc", title: "NSAIDs配合の解熱鎮痛薬", query: "イブプロフェン ロキソプロフェン 市販薬 成分", symptoms: ["headache", "neck_shoulder", "low_back_pain"], states: [], direction: "効き方より先に禁忌・併用を確認する", reason: "イブプロフェンやロキソプロフェン等を、有効成分と服用条件で比較します。", caution: "胃潰瘍、腎疾患、喘息、妊娠後期、他の鎮痛薬使用中などは自己判断を避けてください。", ingredientIds: ["nsaid"], trust: "添付文書確認" }),
  C({ id: "otc-antacid", type: "otc", title: "制酸・胃粘膜保護成分を含む胃腸薬", query: "胃腸薬 制酸剤 胃粘膜保護 成分", symptoms: ["digestion"], states: ["digestive_weak"], direction: "胃痛・胸やけ・もたれの違いを確認する", reason: "総合胃腸薬の商品名ではなく、今の症状に対応する有効成分群を比較します。", caution: "黒い便、吐血、体重減少、強い腹痛、長引く症状がある場合は受診を優先してください。", ingredientIds: ["antacid_group"], trust: "添付文書確認" }),
  C({ id: "otc-sleep-antihistamine", type: "otc", title: "一時的な不眠向け睡眠改善薬", query: "睡眠改善薬 ジフェンヒドラミン 市販薬", symptoms: ["sleep"], states: [], direction: "一時的な不眠か、翌日の運転予定がないか確認する", reason: "睡眠薬とは異なる一般用医薬品で、短期使用と翌日の眠気を前提に比較します。", caution: "連用不可。緑内障、前立腺肥大、妊娠・授乳中、他の抗ヒスタミン薬使用中、運転予定がある場合は使えません。", ingredientIds: ["diphenhydramine"], trust: "添付文書確認" }),
  C({ id: "otc-vitamin-b", type: "otc", title: "ビタミンB1・B6・B12主薬製剤", query: "ビタミンB1 B6 B12 主薬製剤 第3類医薬品", symptoms: ["fatigue", "neck_shoulder", "low_back_pain"], states: ["energy_low"], direction: "医薬品とサプリの区分・重複を確認する", reason: "肉体疲労時の補給等の効能を持つ医薬品を、含有量とサプリ重複から比較します。", caution: "長期のビタミンB6過量などに注意し、他のサプリ・栄養ドリンクとの重複を確認してください。", ingredientIds: ["vitamin_b_group"], trust: "添付文書確認" }),
  C({ id: "otc-tonic", type: "otc", title: "滋養強壮保健薬・生薬配合ドリンク", query: "滋養強壮保健薬 生薬 配合 ドリンク 第3類医薬品", symptoms: ["fatigue"], states: ["energy_low", "recovery_low"], direction: "生薬名・ビタミン・カフェインの重複を確認する", reason: "栄養ドリンクという商品名のまとまりではなく、医薬品区分と有効成分、糖・カフェインの有無から比較します。", caution: "高血圧、糖尿病、心疾患、服薬中、他の漢方・サプリ使用中は成分重複を薬剤師等へ確認してください。", ingredientIds: ["tonic_herb_group", "vitamin_b_group"], trust: "添付文書確認" }),
  C({ id: "otc-motion-sickness", type: "otc", title: "乗り物酔い薬の有効成分群", query: "乗り物酔い薬 成分 市販薬", symptoms: ["dizziness"], states: [], direction: "乗り物酔いか、原因不明のめまいかを分ける", reason: "原因不明のめまいへ流用せず、乗り物酔いの予防・緩和として成分を比較します。", caution: "原因不明・反復するめまい、聴力低下、麻痺やろれつの異常がある場合は受診を優先してください。眠気にも注意が必要です。", ingredientIds: ["motion_sickness_group"], trust: "添付文書確認" }),
];

export const INGREDIENT_LINKS = {
  coix_seed: { label: "ヨクイニン／ハトムギ", note: "食品・健康食品・医薬品で表示と目的が異なります。" },
  ginger: { label: "生姜", note: "食品のしょうがと、生薬としてのショウキョウは区分して確認します。" },
  ginseng_root: { label: "人参／高麗人参", note: "処方中の生薬と健康食品では量・組み合わせ・目的が異なります。" },
  licorice_root: { label: "甘草", note: "複数の漢方薬・生薬製品で重複しやすい成分です。" },
  peony_root: { label: "芍薬", note: "処方全体の組み合わせで使われるため、単独成分と同一視しません。" },
  ephedra_herb: { label: "麻黄", note: "心疾患・高血圧・甲状腺疾患などで特に確認が必要です。" },
  astragalus_root: { label: "黄耆", note: "健康食品と漢方処方中の生薬では位置付けが異なります。" },
  turmeric_rhizome: { label: "ウコン", note: "根茎・抽出物・クルクミン量を分けて確認します。" },
  ginkgo_leaf: { label: "イチョウ葉", note: "抽出規格と抗凝固・抗血小板薬との併用確認が重要です。" },
  maca_root: { label: "マカ", note: "原料量と同時配合成分を確認します。" },
  kudzu_root: { label: "葛根", note: "食品素材と、葛根湯など処方中の生薬では目的・組み合わせが異なります。" },
  yam_rhizome: { label: "山薬／山芋", note: "食品として食べる山芋と、生薬のサンヤクを区分して確認します。" },
  eucommia_leaf: { label: "杜仲葉", note: "杜仲葉の茶・健康食品と、生薬としての樹皮を区分します。" },
};
