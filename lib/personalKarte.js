import {
  CORE_LABELS,
  SUB_LABELS,
  SYMPTOM_LABELS,
  MERIDIAN_LINES,
} from "@/lib/diagnosis/v2/labels";
import { buildKartePlusLoopProfile } from "@/lib/karte_plus/loopAnalysis";
import {
  buildPersonalWeatherAffinityProfile,
  rankExactWeatherAffinity,
} from "@/lib/radar_v1/weatherAffinityProfile";

export const PERSONAL_KARTE_PRODUCT = "personal_mibyo_karte";
export const PERSONAL_KARTE_PRICE_LABEL = "¥1,980";
export const PERSONAL_KARTE_DISPLAY_NAME = "わたしのトリセツ Plus";

const DEFAULT_SYMPTOM = "mood";

const FREQ_LABELS = {
  "0": "ほとんどない",
  "1_2": "少ない",
  "3_5": "ときどきある",
  "6_9": "わりと多い",
  "10p": "かなり多い",
};

const THERMO_LABELS = {
  cold: "冷えの方がつらい",
  heat: "暑さ・ほてりの方がつらい",
  mixed: "季節や体調で変わりやすい",
  neutral: "どちらも強くはない",
};

const ENV_SENSITIVITY_LABELS = {
  0: "ほとんどない",
  1: "たまにある",
  2: "わりとある",
  3: "かなりある",
};

const SYMPTOM_COPY = {
  fatigue: {
    pain: "だるさ・疲労",
    flare: "だるさや回復の遅さとして残る",
    bodySign: "朝の動き出し・午後の電池切れ",
    watch: "予定を詰めた翌日ほど反動が出やすい",
    consultation: "疲れ方、回復にかかる時間、午後に落ちるかどうか",
  },
  sleep: {
    pain: "睡眠の乱れ",
    flare: "寝つき・眠りの浅さ・起床時の重さとして出る",
    bodySign: "寝つき・途中覚醒・起床時の重さ",
    watch: "頭のオン状態が長引く夜ほど崩れやすい",
    consultation: "寝つき、途中覚醒、起床時の重さ、日中の眠気",
  },
  neck_shoulder: {
    pain: "首肩のつらさ",
    flare: "首肩の張りや重さとして残る",
    bodySign: "首の付け根・肩甲骨まわり",
    watch: "緊張を抜く前に作業を続けるほど固まりやすい",
    consultation: "首肩の張り方、頭痛との連動、作業姿勢との関係",
  },
  low_back_pain: {
    pain: "腰のつらさ",
    flare: "腰まわりの重さや動きづらさとして残る",
    bodySign: "腰・骨盤まわり・脚の後ろ側",
    watch: "冷えや長時間同じ姿勢で出やすい",
    consultation: "腰の重さ、動き出しのこわばり、冷えや同姿勢との関係",
  },
  swelling: {
    pain: "むくみ",
    flare: "重だるさと水分停滞が強まる",
    bodySign: "脚・顔・胃腸の重さ",
    watch: "冷たいもの・甘いもの・遅い食事が重なると出やすい",
    consultation: "むくむ場所、時間帯、食事・湿度との関係",
  },
  headache: {
    pain: "頭痛",
    flare: "頭まわりの重さや圧迫感として出る",
    bodySign: "こめかみ・後頭部・目の奥",
    watch: "気圧変化と緊張が重なる日に出やすい",
    consultation: "痛む場所、首肩との連動、気圧や睡眠との関係",
  },
  dizziness: {
    pain: "めまい",
    flare: "ふわつき・不安定感として出る",
    bodySign: "頭の軽さ・視界の揺れ・足元の不安定さ",
    watch: "睡眠不足や空腹が重なると強まりやすい",
    consultation: "ふわつく時間帯、立ち上がり、睡眠・食事との関係",
  },
  mood: {
    pain: "気分の浮き沈み",
    flare: "気分の波や切り替えにくさとして出る",
    bodySign: "みぞおち・胸まわり・首の付け根",
    watch: "気圧変化と我慢が重なる日に出やすい",
    consultation: "気分の波、胸やみぞおちの詰まり、天気や予定との関係",
  },
};

const CORE_STRATEGY = {
  accel_batt_small: {
    collapse: "勢いで押し切ったあと、張り・乾き・睡眠の浅さとして反動が出やすい",
    boundary: "予定を詰めすぎる前に、短い停止ポイントを入れる",
    ng: ["気合いで最後まで走り切る", "汗をかく強いリセットに頼る", "夜に刺激を足して眠気を待つ"],
    rescue: "温かく軽い主食＋たんぱく質を少量。コンビニなら、おにぎり・具だくさんスープ・ゆで卵のように“軽く補う”組み合わせが向きます。",
  },
  accel_batt_standard: {
    collapse: "前へ進む力が強いぶん、区切りがないと巡りが詰まり、気分や張りとして出やすい",
    boundary: "集中が乗っている時ほど、終わり時を先に決める",
    ng: ["休む直前まで作業を詰める", "休日に予定を詰めて回復したつもりになる", "イライラを強い刺激で散らす"],
    rescue: "温かい汁物＋小さめ主食＋香りのあるものを少量。スープ・おにぎり・果物少しのように、詰まりをほどきながら補う組み合わせが向きます。",
  },
  accel_batt_large: {
    collapse: "頑張れてしまうため、限界サインを見逃し、あとからこわばりや気分の尖りとして出やすい",
    boundary: "まだ行ける時点で、身体側のサインを確認する",
    ng: ["疲れていないから休まない", "強い運動だけで整えようとする", "食事や睡眠を後回しにする"],
    rescue: "温かい汁物＋消化にやさしい主食。強く足すより、こもった熱と張りを逃がす方向が向きます。",
  },
  brake_batt_small: {
    collapse: "刺激を受けると守りに入りやすく、余力不足と重だるさが重なりやすい",
    boundary: "消耗を感じたら、まず予定を減らして体温と睡眠を守る",
    ng: ["無理に外へ出て気分転換する", "冷たい飲食で手早く済ませる", "寝だめだけで回復しようとする"],
    rescue: "温かい汁物＋やわらかい主食。コンビニなら、雑炊・スープ・茶碗蒸し系のように“消化に負担をかけず補う”組み合わせが向きます。",
  },
  brake_batt_standard: {
    collapse: "ペースが乱れると切り替えが重くなり、動き始めに時間がかかりやすい",
    boundary: "朝と夕方に小さなルーティンを固定する",
    ng: ["予定変更を気合いで吸収する", "動かないまま重さが抜けるのを待つ", "甘いもので一気に持ち上げる"],
    rescue: "温かい飲み物＋軽い主食＋少量のたんぱく質。重く足すより、ゆっくり動ける土台を作る組み合わせが向きます。",
  },
  brake_batt_large: {
    collapse: "余力はあるものの、溜め込む方向に寄ると重さ・むくみ・停滞感が目立ちやすい",
    boundary: "食後と入浴後に軽く巡りを動かす",
    ng: ["重い食事で元気をつける", "むくみを放置して寝る", "動くまで時間を置きすぎる"],
    rescue: "温かい汁物＋野菜＋軽め主食。余分な重さを増やさず、巡りを動かす組み合わせが向きます。",
  },
};

const SUB_MECHANISM = {
  qi_stagnation: {
    role: "巡りが止まりやすい偏り",
    surface: "胸・みぞおち・首肩の張り、ため息、気分の詰まり",
    earlySigns: "ため息、胸まわりの詰まり、首肩のこわばり",
    care: "吐く息を長くし、軽い伸び・香り・歩行で“止まった巡り”をほどく",
  },
  qi_deficiency: {
    role: "作る力・押し出す力が落ちやすい偏り",
    surface: "朝の立ち上がりにくさ、午後の電池切れ、声の弱さ",
    earlySigns: "朝の重さ、午後の電池切れ、息切れしやすさ",
    care: "発散より補給を先に置き、温かいもの・休息・予定量の調整で土台を守る",
  },
  blood_deficiency: {
    role: "滋養が不足し、回復しにくい偏り",
    surface: "目の疲れ、眠りの浅さ、集中の切れやすさ",
    earlySigns: "目の疲れ、眠りの浅さ、頭の使いすぎによる消耗",
    care: "画面刺激を減らし、夜は早めに鎮める。温かい食事と睡眠でじわっと補う",
  },
  blood_stasis: {
    role: "こわばりや滞りが固定化しやすい偏り",
    surface: "同じ場所の張り、冷え、動き出しの固さ",
    earlySigns: "同じ場所の違和感、冷えると強まる張り、動き始めの固さ",
    care: "温めながら軽く動かし、同じ姿勢を切って“固まり”を作らない",
  },
  fluid_damp: {
    role: "余分な水分・重さが残りやすい偏り",
    surface: "むくみ、眠気、頭の重さ、胃腸の停滞感",
    earlySigns: "むくみ、眠気、頭の重さ、食後の重だるさ",
    care: "冷たいもの・甘いものを控え、温かく軽い食事と少し汗ばむ動きで余分な重さを抜く",
  },
  fluid_deficiency: {
    role: "潤いが不足し、乾きや熱っぽさが出やすい偏り",
    surface: "喉・目・肌の乾き、寝つきの悪さ、ほてり感",
    earlySigns: "喉・目・肌の乾き、寝つきにくさ、夜のほてり",
    care: "汗をかきすぎず、夜更かしを避ける。潤いを保つ食事と休息に寄せる",
  },
};

const WEATHER_EXACT_CONTEXT = {
  pressure_down: {
    label: "気圧低下",
    day: "気圧が下がる日",
    note: "外圧がゆるむことで、眠気・頭重感・だるさ・下半身の重さなどが表に出やすい日です。",
    season: "春・梅雨前・台風前後・季節の変わり目",
  },
  pressure_up: {
    label: "気圧上昇",
    day: "気圧が上がる日",
    note: "外から締めつけられるような負荷がかかり、張り・緊張・こわばりが出やすい日です。",
    season: "春・秋・天気が急に回復する日",
  },
  cold: {
    label: "冷え込み",
    day: "冷え込む日",
    note: "筋肉や血管が縮こまり、冷え・こわばり・動き出しにくさが出やすい日です。",
    season: "冬・朝晩の冷え込み・寒暖差が強い時期",
  },
  heat: {
    label: "気温上昇",
    day: "気温が上がりやすい日",
    note: "熱や刺激がこもりやすく、消耗・ほてり・眠りの浅さとして出やすい日です。",
    season: "初夏〜夏・急に暑くなる日",
  },
  damp: {
    label: "湿気",
    day: "湿っぽい日",
    note: "余分な水分が抜けにくく、重だるさ・むくみ・胃腸の停滞感として出やすい日です。",
    season: "梅雨〜夏・雨前後・湿度が高い時期",
  },
  dry: {
    label: "乾燥",
    day: "乾燥しやすい日",
    note: "潤い不足が表に出やすく、喉・目・肌の乾きや眠りの浅さにつながりやすい日です。",
    season: "秋〜冬・空気が乾く時期",
  },
};


const SUB_TCM_TERMS = {
  qi_stagnation: {
    term: "気滞",
    reading: "きたい",
    plain: "巡りが止まり、張り・詰まり・気分の切り替えにくさとして出やすい偏り",
  },
  qi_deficiency: {
    term: "気虚",
    reading: "ききょ",
    plain: "体を動かす力を作りにくく、朝の重さ・午後の電池切れ・回復の遅さとして出やすい偏り",
  },
  blood_deficiency: {
    term: "血虚",
    reading: "けっきょ",
    plain: "栄養と回復の材料が不足し、目の疲れ・眠りの浅さ・消耗感として出やすい偏り",
  },
  blood_stasis: {
    term: "血瘀",
    reading: "けつお",
    plain: "巡りの滞りが残り、冷え・こわばり・同じ場所の張りとして出やすい偏り",
  },
  fluid_damp: {
    term: "痰湿",
    reading: "たんしつ",
    plain: "余分な水分や重さが残り、むくみ・眠気・頭重感・胃腸の停滞として出やすい偏り",
  },
  fluid_deficiency: {
    term: "津液不足",
    reading: "しんえきぶそく",
    plain: "潤いが不足し、喉・目・肌の乾きや寝つきにくさとして出やすい偏り",
  },
};

const SYMPTOM_RELATED_SIGNS = {
  fatigue: ["午後の電池切れ", "朝の重さ", "回復の遅さ", "食後の眠気"],
  sleep: ["寝つきにくさ", "眠りの浅さ", "朝のだるさ", "頭のオン状態"],
  neck_shoulder: ["首肩の張り", "肩甲骨まわりの重さ", "頭重感", "目の疲れ"],
  low_back_pain: ["腰の重さ", "骨盤まわりのこわばり", "脚の後ろ側の張り", "動き出しの鈍さ"],
  swelling: ["脚のむくみ", "顔のむくみ", "頭重感", "食後の重だるさ"],
  headache: ["頭重感", "こめかみの張り", "後頭部の重さ", "目の奥の疲れ"],
  dizziness: ["ふわつき", "足元の不安定さ", "頭の軽さ", "眠気"],
  mood: ["胸やみぞおちの詰まり", "ため息", "切り替えにくさ", "首の付け根のこわばり"],
};

const SELF_WEATHER_CONTEXT = {
  pressure_shift: { label: "気圧の変化", exact: ["pressure_down", "pressure_up"] },
  temp_swing: { label: "寒暖差", exact: ["cold", "heat"] },
  humidity_up: { label: "湿度が上がる", exact: ["damp"] },
  dryness_up: { label: "乾燥が強まる", exact: ["dry"] },
  wind_strong: { label: "風が強い・冷風", exact: ["pressure_up", "cold"] },
};

const WEATHER_ALIASES = {
  pressure_shift: "pressure_shift",
  temp_swing: "temp_swing",
  humidity_up: "humidity_up",
  dryness_up: "dryness_up",
  wind_strong: "wind_strong",
  pressure_down: "pressure_shift",
  pressure_up: "pressure_shift",
  temp_up: "temp_swing",
  temp_down: "temp_swing",
  heat: "temp_swing",
  cold: "temp_swing",
  dry: "dryness_up",
  damp: "humidity_up",
  rain: "humidity_up",
  humidity: "humidity_up",
  wind: "wind_strong",
};

const MOVEMENT_MAP = {
  A: { label: "前屈する", meridianCode: "kidney_bl", meaning: "背骨〜腰〜脚の後ろ側に負担が出やすい動き" },
  B: { label: "上体を反らす", meridianCode: "spleen_st", meaning: "お腹〜太もも前〜すねの前面に負担が出やすい動き" },
  C: { label: "体を左右にひねる・側屈する", meridianCode: "liver_gb", meaning: "体側・股関節・脚の側面に負担が出やすい動き" },
  D: { label: "首をうつむける", meridianCode: "heart_si", meaning: "肩甲骨まわり〜腕内側〜小指側に負担が出やすい動き" },
  E: { label: "首を後ろに倒す・横を向く", meridianCode: "lung_li", meaning: "首〜鎖骨〜腕外側に負担が出やすい動き" },
  F: { label: "腕を横から上げる", meridianCode: "pc_sj", meaning: "肩外側〜腕外側〜手の甲側に負担が出やすい動き" },
};

const MERIDIAN_TO_MOVEMENT = Object.entries(MOVEMENT_MAP).reduce((acc, [key, value]) => {
  acc[value.meridianCode] = { key, ...value };
  return acc;
}, {});

const SYMPTOM_MERIDIAN = {
  fatigue: "spleen_st",
  sleep: "heart_si",
  neck_shoulder: "pc_sj",
  low_back_pain: "kidney_bl",
  swelling: "spleen_st",
  headache: "liver_gb",
  dizziness: "liver_gb",
  mood: "liver_gb",
};

const USER_MERIDIAN_LINE_TITLES = {
  kidney_bl: "腰〜脚の後ろ側ライン",
  spleen_st: "お腹〜太もも前ライン",
  liver_gb: "体側〜脚の外側ライン",
  heart_si: "肩甲骨〜腕内側ライン",
  lung_li: "首〜腕外側ライン",
  pc_sj: "肩外側〜手の甲ライン",
};

function userLineTitle(meridianCode, fallback = "負担がかかるライン") {
  return USER_MERIDIAN_LINE_TITLES[meridianCode] || fallback || "負担がかかるライン";
}

const MERIDIAN_NAME_WITH_READING = {
  肺経: "肺経（はいけい）",
  大腸経: "大腸経（だいちょうけい）",
  心経: "心経（しんけい）",
  小腸経: "小腸経（しょうちょうけい）",
  腎経: "腎経（じんけい）",
  膀胱経: "膀胱経（ぼうこうけい）",
  肝経: "肝経（かんけい）",
  胆経: "胆経（たんけい）",
  脾経: "脾経（ひけい）",
  胃経: "胃経（いけい）",
  心包経: "心包経（しんぽうけい）",
  三焦経: "三焦経（さんしょうけい）",
};

function meridianWithReading(name) {
  return MERIDIAN_NAME_WITH_READING[name] || name;
}

function enrichMeridianLine({ meridianCode, line }) {
  const meridians = Array.isArray(line?.meridians) ? line.meridians.filter(Boolean) : [];
  const meridiansWithReadings = meridians.map(meridianWithReading);
  const organHint = line?.organs_hint || "動きや場所の変化を見るための目印です。";
  return {
    meridians,
    meridiansWithReadings,
    meridianText: meridiansWithReadings.join("・"),
    organHint,
    organsHint: organHint,
    lineTitle: userLineTitle(meridianCode, line?.title),
    bodyArea: line?.body_area || "身体ライン",
  };
}

const SEASON_LINES = {
  qi_stagnation: {
    riskySeason: "春・季節の変わり目",
    sign: "張り、ため息、気分の詰まり",
    spring: "春は予定や環境の変化で気が張りやすく、胸・みぞおち・首肩のこわばりが出やすい時期です。予定を詰めるより、切り替え時間を先に確保します。",
    rainy: "梅雨は湿気で巡りが重くなり、気分の切り替えに時間がかかりやすくなります。冷たい飲食を続けず、短い散歩や深い呼気で動きを作ります。",
    autumn: "秋は乾きと緊張が重なると、呼吸の浅さや眠りの質に出やすくなります。夜の刺激を減らし、胸まわりを緩める時間を作ります。",
    winter: "冬は寒さでこわばりが固定されやすい時期です。強い発散より、温めながら軽く動かす方が向きます。",
  },
  qi_deficiency: {
    riskySeason: "季節の変わり目・梅雨",
    sign: "午後の電池切れ、朝の立ち上がりにくさ",
    spring: "春は環境変化で消耗しやすく、気持ちだけ先に走ると反動が出やすい時期です。新しい予定は余白込みで組みます。",
    rainy: "梅雨は湿気と気温差で体が重くなりやすい時期です。発散より補給を優先し、温かい汁物や早めの就寝で土台を守ります。",
    autumn: "秋は乾燥と日照変化で疲れが表に出やすくなります。無理に攻めるより、食事と睡眠の固定が効きます。",
    winter: "冬は冷えで動き出しが遅くなりやすい時期です。朝に温かい飲み物と小さなルーティンを置くと立ち上がりやすくなります。",
  },
  blood_deficiency: {
    riskySeason: "秋〜冬・乾燥する時期",
    sign: "目の疲れ、眠りの浅さ、乾き感",
    spring: "春は気が上にのぼりやすく、目や頭の疲れが出やすい時期です。夜の画面刺激を減らし、早めに鎮める動きを作ります。",
    rainy: "梅雨は湿気で重さが出る一方、睡眠不足があると回復の遅さが目立ちます。消化に軽いものを選び、寝る前の刺激を減らします。",
    autumn: "秋は乾きが表に出やすい時期です。肌・喉・目の乾きやすさを合図に、早めに潤す食事と休息へ寄せます。",
    winter: "冬は血のめぐりと冷えが絡み、疲れやこわばりが残りやすくなります。温めながら、睡眠時間を削らないことが防衛線です。",
  },
  blood_stasis: {
    riskySeason: "冬・寒暖差が強い時期",
    sign: "同じ場所の張り、冷え、こわばり",
    spring: "春は動き出しが増えるぶん、固まっていた場所に違和感が出やすい時期です。急に強く動かず、軽い伸びから始めます。",
    rainy: "梅雨は湿気で重さが抜けにくく、同じ姿勢の影響が残りやすくなります。座りっぱなしを切り、温めながら軽く動かします。",
    autumn: "秋は朝晩の冷えでこわばりが戻りやすくなります。薄着で冷やさず、入浴後に軽くほぐす時間を作ります。",
    winter: "冬は冷えで巡りが固定されやすい季節です。冷えたまま寝ない、同じ姿勢を続けない、温めてから動く、を守ります。",
  },
  fluid_damp: {
    riskySeason: "梅雨〜夏・湿度が上がる時期",
    sign: "むくみ、眠気、頭の重さ、胃腸の停滞感",
    spring: "春は気温差で胃腸のリズムが乱れると、重さとして残りやすい時期です。甘いものと冷たい飲み物を続けすぎないようにします。",
    rainy: "梅雨は最も注意したい時期です。湿気で重だるさやむくみが出やすく、温かく軽い食事と少し汗ばむ程度の動きが合います。",
    autumn: "秋は夏の冷たい飲食の影響が残ると、胃腸の重さとして出やすくなります。温かい汁物でリズムを戻します。",
    winter: "冬は動きが少ないと水分代謝が停滞しやすくなります。重い食事で元気をつけるより、温かく軽く巡らせる方向が向きます。",
  },
  fluid_deficiency: {
    riskySeason: "秋の乾燥・暑さが続く時期",
    sign: "喉・目・肌の乾き、寝つきの悪さ",
    spring: "春は気が上がりやすく、乾きと緊張が重なると眠りの入りにくさが出やすくなります。夜は発散より鎮めるケアを選びます。",
    rainy: "梅雨は湿気があるのに内側は乾く、というズレが出ることがあります。冷たい飲み物で流し込むより、温かいものを少量ずつが向きます。",
    autumn: "秋は特に注意したい時期です。肌・喉・目の乾きが合図になりやすく、汗をかきすぎないことと夜更かしを避けることが防衛線です。",
    winter: "冬は暖房と冷えで乾きが進みやすい季節です。温めつつ、睡眠と潤いを保つ食事を崩さないようにします。",
  },
};

const SECONDARY_FALLBACKS = [
  "qi_stagnation",
  "qi_deficiency",
  "blood_deficiency",
  "fluid_damp",
  "blood_stasis",
  "fluid_deficiency",
];

function safeComputed(event) {
  return event?.computed || event?.result?.computed || event?.answers?.computed || {};
}

function safeAnswers(event) {
  return event?.answers || event?.result?.answers || {};
}

function safeKartePlusIntake(event) {
  return (
    event?.karte_plus_intake ||
    event?.kartePlusIntake ||
    event?.plus_intake ||
    event?.plusIntake ||
    event?.answers?.karte_plus_intake ||
    event?.answers?.kartePlusIntake ||
    {}
  );
}

function unique(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

function pickFirst(arr, fallback) {
  return Array.isArray(arr) && arr.length > 0 ? arr[0] : fallback;
}

function pickSecondarySub(subCodes, primaryCode) {
  const fromResult = Array.isArray(subCodes) ? subCodes.find((v) => v && v !== primaryCode) : null;
  return fromResult || SECONDARY_FALLBACKS.find((v) => v !== primaryCode) || "blood_deficiency";
}

function subLabel(code) {
  const base = SUB_LABELS[code];
  return base
    ? { code, ...base }
    : {
        code,
        title: "整えたい偏り",
        short: "偏り",
        action_hint: "その日の負担に合わせて、無理のないケアを選ぶのが合いやすいです。",
      };
}

function symptomCopy(symptom) {
  return SYMPTOM_COPY[symptom] || SYMPTOM_COPY[DEFAULT_SYMPTOM];
}

function shortSymptom(symptom) {
  return SYMPTOM_LABELS[symptom] || SYMPTOM_LABELS[DEFAULT_SYMPTOM];
}

function seasonLine(code) {
  return SEASON_LINES[code] || SEASON_LINES.qi_stagnation;
}

function normalizeSelfWeatherVector(vector) {
  if (!vector || vector === "none") return null;
  return WEATHER_ALIASES[vector] || vector;
}

function getSelfWeatherVectors(answers, computed) {
  const raw = Array.isArray(answers?.env_vectors)
    ? answers.env_vectors
    : Array.isArray(computed?.env?.vectors)
      ? computed.env.vectors
      : [];
  return unique(raw.map(normalizeSelfWeatherVector).filter((x) => x && x !== "none")).slice(0, 2);
}

function sensitivityForResultPage(answers, computed) {
  const raw = Number(answers?.env_sensitivity ?? computed?.env?.sensitivity ?? 1);
  if (raw >= 2) return "high";
  if (raw <= 0) return "low";
  return "normal";
}

function weatherItem(key, value = null, rank = null) {
  const base = WEATHER_EXACT_CONTEXT[key] || WEATHER_EXACT_CONTEXT.pressure_down;
  return { key, value, rank, ...base };
}

function buildWeatherProfile({ answers, computed, coreCode, subCodes }) {
  const envVectors = getSelfWeatherVectors(answers, computed);
  const affinityProfile = buildPersonalWeatherAffinityProfile({
    coreType: coreCode,
    subRiskWeights: subCodes,
    envVectors: envVectors.filter((key) => SELF_WEATHER_CONTEXT[key]),
    sensitivity: sensitivityForResultPage(answers, computed),
  });

  const ranked = rankExactWeatherAffinity(affinityProfile.weights)
    .slice(0, 3)
    .map((item, index) => weatherItem(item.key, item.value, index + 1));

  const selfReported = envVectors
    .map((key) => ({ key, ...(SELF_WEATHER_CONTEXT[key] || { label: key, exact: [] }) }))
    .filter((item) => item.label);

  return {
    affinityProfile,
    ranked,
    top: ranked[0] || weatherItem("pressure_down", 0.45, 1),
    second: ranked[1] || null,
    third: ranked[2] || null,
    selfReported,
    selfReportedLabels: selfReported.map((item) => item.label),
    selfReportedText: selfReported.length ? selfReported.map((item) => item.label).join("・") : "未指定",
  };
}

function getSubScore(computed, code) {
  const scores = computed?.split_scores || {};
  const map = {
    qi_deficiency: scores?.qi?.deficiency,
    qi_stagnation: scores?.qi?.stagnation,
    blood_deficiency: scores?.blood?.deficiency,
    blood_stasis: scores?.blood?.stasis,
    fluid_deficiency: scores?.fluid?.deficiency,
    fluid_damp: scores?.fluid?.damp,
  };
  const value = Number(map[code] ?? 0);
  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
}

function movementEntry({ answerValue, computedCode, order }) {
  const normalizedAnswer = answerValue && answerValue !== "none" ? answerValue : null;
  const byAnswer = normalizedAnswer ? MOVEMENT_MAP[normalizedAnswer] : null;
  const byComputed = computedCode ? MERIDIAN_TO_MOVEMENT[computedCode] : null;
  const movement = byAnswer || byComputed || null;
  const meridianCode = movement?.meridianCode || computedCode || null;
  const line = meridianCode ? MERIDIAN_LINES[meridianCode] || null : null;
  if (!movement && !line) return null;
  const enriched = enrichMeridianLine({ meridianCode, line });
  return {
    order,
    answerValue: normalizedAnswer,
    movementLabel: movement?.label || `${order}番目に選ばれた動き`,
    movementMeaning: movement?.meaning || "動作チェックで負担が出やすいと見えたラインです。",
    meridianCode,
    ...enriched,
    description: enriched.meridianText
      ? `${enriched.lineTitle}（${enriched.meridianText}）`
      : enriched.lineTitle,
  };
}

function symptomLine(symptom) {
  const meridianCode = SYMPTOM_MERIDIAN[symptom] || null;
  const line = meridianCode ? MERIDIAN_LINES[meridianCode] || null : null;
  if (!line) return null;
  const enriched = enrichMeridianLine({ meridianCode, line });
  return {
    meridianCode,
    ...enriched,
    description: enriched.meridianText
      ? `${enriched.lineTitle}（${enriched.meridianText}）`
      : enriched.lineTitle,
  };
}

function movementRelationshipCopy({ symptom, symptomLine, primary, secondary }) {
  const concernText = symptom?.label ? `「${symptom.label}」` : "今お困りの不調";
  const primaryText = primary?.meridianText ? `${primary.lineTitle}（${primary.meridianText}）` : primary?.lineTitle;
  const secondaryText = secondary?.meridianText ? `${secondary.lineTitle}（${secondary.meridianText}）` : secondary?.lineTitle;
  const symptomText = symptomLine?.meridianText ? `${symptomLine.lineTitle}（${symptomLine.meridianText}）` : symptomLine?.lineTitle;

  if (primary && secondary) {
    if (symptomLine?.meridianCode === primary.meridianCode) {
      return `${concernText}と重なりやすい${primaryText}に加えて、${secondaryText}にも負担のサインが見えています。痛い場所だけを追うのではなく、補助ライン側の張り・冷え・重さも見ると、日ごとの崩れ方をつかみやすくなります。`;
    }
    if (symptomLine?.meridianCode === secondary.meridianCode) {
      return `${concernText}として目立ちやすい${secondaryText}に対して、動作負担チェックでは${primaryText}にもサインが出ています。前側・後ろ側・側面など別のラインのこわばりが、結果として${symptom.label}を強めることがあるため、背景の通り道として合わせて見ます。`;
    }
    return `${concernText}の観察範囲は${symptomText || "今つらい場所"}ですが、動作負担チェックでは${primaryText}と${secondaryText}にサインが出ています。これは別の不調を足す話ではなく、体質・天気・姿勢の負担がどの通り道へ逃げやすいかを見るための情報です。`;
  }

  if (primary) {
    if (symptomLine?.meridianCode === primary.meridianCode) {
      return `${concernText}と動作負担チェックのラインは、${primaryText}で重なっています。このラインの張り・重さ・冷えを早めに拾うと、不調が強くなる前にケアへつなげやすくなります。`;
    }
    return `${concernText}の観察範囲は${symptomText || "今つらい場所"}ですが、動作負担チェックでは${primaryText}にサインが見えています。離れたラインに見えても、張り・縮こまり・重さが別の場所へ負担を逃がすことがあるため、背景の経絡（けいらく）ラインとして合わせて見ます。`;
  }

  if (symptomLine) {
    return `${concernText}では、${symptomText}の張り・重さ・動き出しにくさを観察すると、体調の変化を拾いやすくなります。`;
  }

  return "出やすい場所・動き・天気との関係を分けて見ると、状態の変化を拾いやすくなります。";
}

function buildMechanismInsight({ primarySubCode, secondarySubCode, symptomLabel }) {
  const p = SUB_MECHANISM[primarySubCode] || SUB_MECHANISM.qi_stagnation;
  const s = SUB_MECHANISM[secondarySubCode] || SUB_MECHANISM.qi_deficiency;
  const pair = [primarySubCode, secondarySubCode].sort().join("+");

  const pairLoops = {
    "fluid_damp+qi_deficiency": "この組み合わせでは、気虚によって水分をさばく力が落ち、痰湿として重さ・むくみ・眠気が表に出やすくなります。反対に、痰湿が残るほどさらに気の立ち上がりが鈍るため、重さと消耗が循環しやすい読みです。",
    "blood_stasis+qi_stagnation": "この組み合わせでは、まず巡りの詰まりが張りとして出て、長引くと同じ場所のこわばりとして固定化しやすくなります。気滞と血瘀は、時間差というより“詰まりが残るほど固まる”循環として見るのが自然です。",
    "blood_deficiency+qi_deficiency": "この組み合わせでは、動かす力と養う力がどちらも弱りやすく、頑張った後に回復が追いつきにくくなります。気虚が日中の電池切れとして、血虚が目や睡眠の回復しにくさとして出やすい読みです。",
    "fluid_deficiency+blood_deficiency": "この組み合わせでは、栄養と潤いの不足が重なり、乾き・目の疲れ・眠りの浅さとして出やすくなります。足すべきものを消耗しながら発散すると、さらに乾きやすいパターンです。",
    "fluid_damp+qi_stagnation": "この組み合わせでは、巡りの詰まりと余分な重さが重なり、気分の重さ・胃腸の停滞感・頭重感として出やすくなります。動かないから重くなり、重いからさらに動きにくい循環に注意します。",
    "blood_stasis+qi_deficiency": "この組み合わせでは、押し出す力の弱さによって巡りが進みにくくなり、こわばりが同じ場所に残りやすくなります。強くほぐすより、温めながら少しずつ動かす方が安全です。",
    "blood_stasis+fluid_damp": "この組み合わせでは、水分の重さと固定化したこわばりが重なり、重だるさが同じ場所に居座りやすくなります。冷え・湿気・同じ姿勢が重なる日ほど注意します。",
  };

  return {
    primaryRole: p.role,
    secondaryRole: s.role,
    primarySurface: p.surface,
    secondarySurface: s.surface,
    earlySigns: unique([p.earlySigns, s.earlySigns]),
    careDirections: unique([p.care, s.care]),
    loop: pairLoops[pair] || `今回の「${subLabel(primarySubCode).short}」「${subLabel(secondarySubCode).short}」が重なると、${symptomLabel}として表に出る前に、${p.earlySigns}や${s.earlySigns}のような小さなサインが出やすくなります。`,
  };
}

function buildSeasonFocus({ weather, primarySeason, secondarySeason, symptomLabel }) {
  const top = weather.top || weatherItem("pressure_down", 0.45, 1);
  return {
    headline: `${primarySeason.riskySeason} ＋ ${top.season}`,
    body: `体質では「${primarySeason.riskySeason}」に${primarySeason.sign}が出やすく、天気相性では「${top.label}」が上位です。${symptomLabel}は季節だけで決まるものではありませんが、この2つが重なる時期は先回りの価値が高くなります。`,
    secondary: `補助的には「${secondarySeason.riskySeason}」の影響も見ておくと、年間の波を読みやすくなります。`,
  };
}

function resetDirection(primarySubCode, secondarySubCode) {
  const primary = SUB_MECHANISM[primarySubCode] || SUB_MECHANISM.qi_stagnation;
  const secondary = SUB_MECHANISM[secondarySubCode] || SUB_MECHANISM.qi_deficiency;
  if (primary.care === secondary.care) return primary.care;
  return `まずは、${primary.care}。余力があれば、${secondary.care}。`;
}

function buildReadableAnswers(answers) {
  return {
    fatigue_easy: FREQ_LABELS[answers?.fatigue_easy] || answers?.fatigue_easy || null,
    carryover: FREQ_LABELS[answers?.carryover] || answers?.carryover || null,
    qi_stuck: FREQ_LABELS[answers?.qi_stuck] || answers?.qi_stuck || null,
    tension_residue: FREQ_LABELS[answers?.tension_residue] || answers?.tension_residue || null,
    fluid_heavy: FREQ_LABELS[answers?.fluid_heavy] || answers?.fluid_heavy || null,
    postmeal_heavy: FREQ_LABELS[answers?.postmeal_heavy] || answers?.postmeal_heavy || null,
    fixed_location: FREQ_LABELS[answers?.fixed_location] || answers?.fixed_location || null,
    vision_blur: FREQ_LABELS[answers?.vision_blur] || answers?.vision_blur || null,
    dryness_general: FREQ_LABELS[answers?.dryness_general] || answers?.dryness_general || null,
    stool_dry: FREQ_LABELS[answers?.stool_dry] || answers?.stool_dry || null,
    thermo: THERMO_LABELS[answers?.thermo] || answers?.thermo || null,
    env_sensitivity: ENV_SENSITIVITY_LABELS[answers?.env_sensitivity] || answers?.env_sensitivity || null,
    startup_heavy: FREQ_LABELS[answers?.startup_heavy] || answers?.startup_heavy || null,
    startup_response: answers?.startup_response || null,
    fixed_response: answers?.fixed_response || null,
  };
}


function subTcmTerm(code) {
  return SUB_TCM_TERMS[code] || SUB_TCM_TERMS.qi_stagnation;
}


function joinTerm(term) {
  return `${term.term}（${term.reading}）`;
}

function buildKarteTakeaways({ core, symptom, weather, primaryTerm, secondaryTerm, relatedSigns, loopProfile }) {
  const top = weather.top || weatherItem("pressure_down", 0.45, 1);
  const firstDirection = loopProfile?.rankedDirections?.[0];
  const firstSignal = loopProfile?.loopSignals?.[0];
  return [
    {
      label: "ループ入口",
      value: firstSignal || `${top.label}の日`,
      note: `${symptom.label}が強くなる前に、どの条件が重なりやすいかを見ます。`,
    },
    {
      label: "NG候補",
      value: loopProfile?.ngCombinationCards?.[0]?.title || core.strategy.ng?.[0] || "重なりやすい負担",
      note: "ケアを足す前に、崩れやすい日の組み合わせを1つ外します。",
    },
    {
      label: "戻しやすい手がかり",
      value: loopProfile?.recoverySignals?.[0] || core.strategy.boundary,
      note: firstDirection?.hint || `${joinTerm(primaryTerm)}・${joinTerm(secondaryTerm)}を生活のサインに翻訳します。`,
    },
  ];
}

function buildKarteMapFlow({ core, primaryTerm, secondaryTerm, weather, symptom, relatedSigns, loopProfile }) {
  const top = weather.top || weatherItem("pressure_down", 0.45, 1);
  const ngText = loopProfile?.ngCombinationCards?.[0]?.title || "避けたい組み合わせ";
  return [
    {
      label: "体質軸",
      title: core.title,
      description: `${core.yinYangText} × ${core.driveText}。反応の出方と回復余力の目印です。`,
    },
    {
      label: "内側の偏り",
      title: `${joinTerm(primaryTerm)}・${joinTerm(secondaryTerm)}`,
      description: "気血津液の偏りとして、体に出やすいサインを読みます。",
    },
    {
      label: "重なる条件",
      title: `${top.label}の日`,
      description: "湿気・冷え・気圧など、揺れやすい天気と生活負荷を重ねて見ます。",
    },
    {
      label: "外す負担",
      title: ngText,
      description: "崩れやすい日に重なりやすい習慣・飲食の組み合わせを先に弱めます。",
    },
  ];
}

function buildForecastUsage({ weather, symptom, movementPrimary }) {
  const top = weather.top || weatherItem("pressure_down", 0.45, 1);
  return {
    title: "今日・明日のケアは予報ページで確認",
    body: `トリセツでは、${top.day}に${symptom.bodySign}が出やすい理由を整理します。実際に使うツボ・食養生・過ごし方は、その日の気象データで変わるため、予報ページで確認してください。`,
    bullets: [
      `予報点数が高い日は「主因」が${top.label}かを見る`,
      `ツボ提案の一部には、動作負担チェックで見えた経絡ラインも反映されます`,
      "食養生は、その日の湿気・冷え・乾燥・暑さに合わせて選ぶ",
    ],
    href: "/radar",
  };
}

export function buildPersonalKarteContext(event = {}) {
  const computed = safeComputed(event);
  const answers = safeAnswers(event);

  const coreCode = computed.core_code || "accel_batt_standard";
  const core = CORE_LABELS[coreCode] || CORE_LABELS.accel_batt_standard;
  const coreStrategy = CORE_STRATEGY[coreCode] || CORE_STRATEGY.accel_batt_standard;

  const subCodes = Array.isArray(computed.sub_labels) ? computed.sub_labels : [];
  const primarySubCode = pickFirst(subCodes, "qi_stagnation");
  const secondarySubCode = pickSecondarySub(subCodes, primarySubCode);
  const primarySub = subLabel(primarySubCode);
  const secondarySub = subLabel(secondarySubCode);
  const primarySeason = seasonLine(primarySubCode);
  const secondarySeason = seasonLine(secondarySubCode);

  const symptom = computed.symptom_focus || event?.symptom_focus || answers?.symptom_focus || DEFAULT_SYMPTOM;
  const symptomText = symptomCopy(symptom);
  const symptomLabel = shortSymptom(symptom);

  const weather = buildWeatherProfile({ answers, computed, coreCode, subCodes });
  const mechanism = buildMechanismInsight({ primarySubCode, secondarySubCode, symptomLabel });
  const season = buildSeasonFocus({ weather, primarySeason, secondarySeason, symptomLabel });

  const primaryMovement = movementEntry({
    answerValue: answers?.meridian_primary,
    computedCode: computed?.primary_meridian,
    order: 1,
  });
  const secondaryMovement = movementEntry({
    answerValue: answers?.meridian_secondary,
    computedCode: computed?.secondary_meridian,
    order: 2,
  });
  const symptomMeridian = symptomLine(symptom);

  const axes = computed?.axes || {};
  const yinYangLabel = axes.yin_yang_label || (coreCode.startsWith("brake") ? "brake" : "accel");
  const driveLabel = axes.drive_label || (coreCode.includes("batt_small") ? "batt_small" : coreCode.includes("batt_large") ? "batt_large" : "batt_standard");
  const yinYangText = yinYangLabel === "brake" ? "ブレーキ優位" : "アクセル優位";
  const driveText = driveLabel === "batt_small" ? "余力小" : driveLabel === "batt_large" ? "余力大" : "余力標準";

  return {
    event: {
      id: event?.id || null,
      createdAt: event?.created_at || null,
    },
    answers: {
      raw: answers,
      readable: buildReadableAnswers(answers),
    },
    computed,
    core: {
      code: coreCode,
      title: core.title,
      short: core.short,
      tcmHint: core.tcm_hint,
      yinYangLabel,
      driveLabel,
      yinYangText,
      driveText,
      strategy: coreStrategy,
      meaning: "動物ラベルは、体調が崩れるときに出やすい方向と、回復に使える余力をまとめた目印です。",
    },
    subLabels: {
      primary: { ...primarySub, score: getSubScore(computed, primarySubCode), mechanism: SUB_MECHANISM[primarySubCode] || null },
      secondary: { ...secondarySub, score: getSubScore(computed, secondarySubCode), mechanism: SUB_MECHANISM[secondarySubCode] || null },
      orderedCodes: subCodes,
      importantRule: "サブラベルは、いま目立ちやすい偏りを整理するための内部データです。ユーザー向けには、専門語を並べるよりも、生活で気づけるサインと整え方に翻訳します。",
    },
    symptom: {
      code: symptom,
      label: symptomLabel,
      ...symptomText,
      meridian: symptomMeridian,
    },
    weather,
    movement: {
      primary: primaryMovement,
      secondary: secondaryMovement,
      symptomLine: symptomMeridian,
      importantRule: "今お困りの不調から見た場所と、動作チェックで見えた負担ラインは別物として扱います。ユーザー向けには、身体で観察しやすい場所・動きとして説明します。",
    },
    mechanism,
    season,
  };
}


function buildPreview(section) {
  return section.preview || `${section.body?.[0] || "あなたの体質の崩れ方には、いくつかの決まったパターンがあります。"} 続きでは、具体的な見分け方と戻し方まで整理します。`;
}

export function buildPersonalKarte(event = {}) {
  const ctx = buildPersonalKarteContext(event);
  const { core, symptom, weather, movement, subLabels, mechanism, season } = ctx;
  const primarySub = subLabels.primary;
  const secondarySub = subLabels.secondary;
  const coreStrategy = core.strategy;
  const topWeather = weather.top;
  const secondWeather = weather.second;
  const selfWeatherText = weather.selfReportedText;
  const movementPrimary = movement.primary;
  const movementSecondary = movement.secondary;

  const primaryTerm = subTcmTerm(primarySub.code);
  const secondaryTerm = subTcmTerm(secondarySub.code);
  const relatedSigns = unique([
    ...(SYMPTOM_RELATED_SIGNS[symptom.code] || []),
    ...(mechanism.earlySigns || []),
    symptom.bodySign,
  ]).slice(0, 6);
  const plusIntake = safeKartePlusIntake(event);
  const loopProfile = buildKartePlusLoopProfile({
    diagnosis: {
      sub_labels: [primarySub.code, secondarySub.code].filter(Boolean),
      env_vectors: weather.selfReported.map((item) => item.key),
    },
    intake: plusIntake,
  });
  const quickTakeaways = buildKarteTakeaways({ core, symptom, weather, primaryTerm, secondaryTerm, relatedSigns, loopProfile });
  const mapFlow = buildKarteMapFlow({ core, primaryTerm, secondaryTerm, weather, symptom, relatedSigns, loopProfile });
  const forecastUsage = buildForecastUsage({ weather, symptom, movementPrimary });
  const primarySeasonLine = seasonLine(primarySub.code);
  const secondarySeasonLine = seasonLine(secondarySub.code);
  const directionText = loopProfile.rankedDirections.slice(0, 3).map((item) => `「${item.label}」`).join("・") || resetDirection(primarySub.code, secondarySub.code);
  const loopSignalText = loopProfile.loopSignals.slice(0, 3).join("・") || `${topWeather.label}・${symptom.bodySign}`;
  const recoveryText = loopProfile.recoverySignals.slice(0, 3).join("・") || coreStrategy.boundary;

  const ngCards = Array.isArray(loopProfile.ngCombinationCards) ? loopProfile.ngCombinationCards : [];
  const mainNgTitle = ngCards[0]?.title || loopProfile.avoidancePriorityLabel || coreStrategy.ng?.[0] || "まず減らしたい負担";
  const movementPrimaryText = movementPrimary?.description || movementPrimary?.lineTitle || "動作チェックで見えたライン";
  const movementSecondaryText = movementSecondary?.description || movementSecondary?.lineTitle || null;
  const bodyLineSummary = movementSecondaryText && movementSecondaryText !== movementPrimaryText
    ? `${movementPrimaryText}と${movementSecondaryText}`
    : movementPrimaryText;
  const torisetsuCards = [
    {
      type: "torisetsu",
      title: "体質タイプ",
      risk: core.title,
      reason: `${core.yinYangText} × ${core.driveText}。天気や疲労を受けたときの反応の出方を読む目印です。`,
      swap: core.short,
    },
    {
      type: "torisetsu",
      title: "表に出やすい不調",
      risk: symptom.label,
      reason: `${symptom.bodySign}として出やすく、${relatedSigns.slice(0, 3).join("・")}も前触れとして見ます。`,
      swap: symptom.watch,
    },
    {
      type: "torisetsu",
      title: "揺れやすい条件",
      risk: `${topWeather.label}の日`,
      reason: topWeather.note,
      swap: `自覚しやすい天気：${selfWeatherText}`,
    },
  ];

  const sections = [
    {
      id: "my-torisetsu-card",
      badge: "1｜トリセツ",
      title: "私の未病トリセツカード",
      teaser: `${core.title}・${symptom.label}・${topWeather.label}を、あとで見返せる1枚にまとめます。`,
      preview: `${core.title}の反応パターンを、体質・不調・天気・前触れの4点で整理します。`,
      body: [
        `${core.title}は、${core.yinYangText}と${core.driveText}を軸にした体質タイプです。これはキャラ診断ではなく、疲れ・予定量・天気変化を受けたときに、体がどの方向へ傾きやすいかを見るための目印です。`,
        `今お困りの不調は「${symptom.label}」。ただし、急に強く出るというより、${relatedSigns.slice(0, 4).join("、")}のような小さな前触れをはさんで表に出ることがあります。Plusでは、この前触れを早めに拾える形にします。`,
      ],
      bullets: [
        `体質：${core.title}`,
        `注意天気：${topWeather.label}`,
      ],
      steps: [],
      cards: torisetsuCards,
    },
    {
      id: "loop-core",
      badge: "2｜ループ",
      title: "不調ループの核",
      teaser: `${loopSignalText}が重なったときに、${symptom.label}へ進みやすい流れを読みます。`,
      preview: `Plus深掘りチェックから、崩れやすい条件の重なりと、戻りにくくなる分岐点を整理します。`,
      body: [
        `今回のループ入口は、${loopSignalText}です。ここに${joinTerm(primaryTerm)}・${joinTerm(secondaryTerm)}の偏りが重なると、体はまず${relatedSigns.slice(0, 3).join("・")}のような小さなサインを出しやすくなります。`,
        `大事なのは「何を足すか」より先に、「何が重なると戻りにくくなるか」を見つけることです。Plusでは、無料トリセツの体質結果に、時間帯・睡眠・食事・作業負荷・楽になる条件を重ねて、あなたの不調ループを1本の流れとして整理します。`,
      ],
      bullets: [
        `入口：${loopSignalText}`,
        `戻しやすい手がかり：${recoveryText}`,
      ],
      steps: [],
    },
    {
      id: "early-signs",
      badge: "3｜前触れ",
      title: "強くなる前のサイン",
      teaser: `不調そのものではなく、${symptom.label}の手前に出やすい小さな変化を見ます。`,
      preview: `${relatedSigns.slice(0, 4).join("・")}を、天気や生活負荷が重なる日の観察ポイントにします。`,
      body: [
        `未病の段階で使いやすいのは、「つらくなってから何をするか」より、「強くなる前にどんなサインが出るか」です。${symptom.label}の場合、${relatedSigns.slice(0, 5).join("、")}がヒントになります。`,
        `前触れは日によって顔を変えます。${topWeather.label}の日、睡眠不足の日、食後、画面作業が続いたあとなど、Plus深掘りチェックで選んだ条件と合わせて見ると、予報ページを見るべきタイミングがわかりやすくなります。`,
      ],
      bullets: [
        `見るサイン：${relatedSigns.slice(0, 4).join(" / ")}`,
        `見やすい条件：${loopSignalText}`,
      ],
      steps: [],
    },
    {
      id: "ng-combo-checker",
      badge: "4｜重ねすぎ",
      title: "重ねすぎ注意カード",
      teaser: "避けたい習慣・飲食の組み合わせを、あなたの回答に合わせて表示します。",
      preview: `${mainNgTitle}のような組み合わせは、ケアを足す前に外したい負担です。`,
      body: [
        `この章は、Plus深掘りチェックの回答から作る、重ねすぎ注意のカードです。目的は、悪い生活を責めることではなく、${symptom.label}が出やすい日に、負担が重なりすぎる組み合わせを先に見つけることです。`,
        `特に${mainNgTitle}は、今のループではケアを足すより先に軽くしたい候補です。ゼロにする必要はありません。まずは天気が揺れそうな前日だけ、量・時間帯・温度・姿勢のどれか1つを変えるくらいで十分です。`,
      ],
      bullets: [
        `まず外す候補：${mainNgTitle}`,
        loopProfile.mealLoadLabels?.length ? `飲食の負担：${loopProfile.mealLoadLabels.slice(0, 3).join(" / ")}` : "飲食の負担：Plus深掘りチェックで反映",
      ],
      steps: [
        "天気が揺れそうな前日は、NG候補を1つだけ弱める",
        "うまくいった組み合わせは、次回の警戒日前にも使う",
      ],
      cards: ngCards,
    },
    {
      id: "body-lines",
      badge: "5｜負担ライン",
      title: "からだの負担ラインとツボ候補",
      teaser: `${bodyLineSummary}を、姿勢・動き・ツボ提案につながる身体ラインとして見ます。`,
      preview: `予報ページでは毎日1つずつ出るM-test系のラインケアを、Plusではあなた用の候補カードとしてまとめます。`,
      body: [
        `動作負担チェックでは、痛い場所だけでなく、動きにくさ・張り・重さが出やすい通り道を見ます。今回の主なラインは、${bodyLineSummary}です。`,
        `この章のツボ候補は、日々の予報ページの代わりではありません。予報ページはその日の天気で1つに絞る場所、Plusはあなたに関係しやすいラインと候補を保存しておく場所です。実際に使う日は、今日・明日の予報と合わせて確認します。`,
      ],
      bullets: [
        `主なライン：${bodyLineSummary}`,
        movementSecondaryText ? `補助ライン：${movementSecondaryText}` : "補助ライン：日々の予報で変化を確認",
      ],
      steps: [],
      cards: [],
    },
    {
      id: "season-guard",
      badge: "6｜季節",
      title: "季節と天気を先回りする守り方",
      teaser: "季節ごとの弱点を、記事・季節パック・予報ページへつながる形で整理します。",
      preview: `${season.headline}は、${symptom.label}や前触れが重なりやすい注意時期です。`,
      body: [
        `${season.body} ${season.secondary}`,
        `季節対策は、毎日やることを増やすより、崩れやすい時期の1〜2週間前から、睡眠・食事・予定量・冷え/湿気/乾燥のどれかを少し守る方が続きます。`,
      ],
      bullets: [
        `特に注意：${season.headline}`,
        `季節サイン：${primarySeasonLine.sign}${secondarySeasonLine.sign !== primarySeasonLine.sign ? ` / ${secondarySeasonLine.sign}` : ""}`,
      ],
      steps: [],
    },
    {
      id: "forecast-bridge",
      badge: "7｜予報活用",
      title: "今日・明日の予報ページの使いどころ",
      teaser: "Plusは保存版、予報ページは当日の作戦表。役割を分けて使います。",
      preview: `Plusでループを理解し、予報ページではその日の点数・主因・ツボ・食養生を確認します。`,
      body: [
        `Plusでは、${symptom.label}がくり返されやすい背景を整理します。一方で、今日・明日のケアは、実際の気圧・湿度・気温の動きで変わります。だから、具体的なツボや食養生は予報ページで見るのが自然です。`,
        `使い方はシンプルです。前触れがある日、${topWeather.label}の日、NG組み合わせが重なりそうな日は、予報ページで点数・主因・ラインケアのツボ・食養生を確認します。Plusは、その提案がなぜ自分に出やすいのかを理解するための地図です。`,
      ],
      bullets: [
        "Plus：不調ループの地図",
        "予報ページ：今日・明日の作戦表",
      ],
      steps: [
        "前触れがある日は予報ページの点数と主因を見る",
        "NG組み合わせが重なる日は、ケアを足す前に負担を1つ外す",
      ],
    },
    {
      id: "consultation-sheet",
      badge: "8｜相談メモ",
      title: "専門家に相談するときの共有メモ",
      teaser: "Plus深掘りチェックを踏まえて、相談時に伝えやすい短いメモにします。",
      preview: `${core.title}、${joinTerm(primaryTerm)}・${joinTerm(secondaryTerm)}、${topWeather.label}、${symptom.label}を相談時に使いやすい形でまとめます。`,
      body: [
        `相談先では、不調名だけでなく「いつ・何で・どこに出るか」を伝えると共有しやすくなります。今回なら、${symptom.label}、${loopSignalText}、${topWeather.label}の日、${bodyLineSummary}を中心に話すと整理しやすいです。`,
        `体質メモは、${core.title}、${joinTerm(primaryTerm)}、${joinTerm(secondaryTerm)}。楽になりやすい手がかりは${recoveryText}です。強い痛み、しびれ、力が入りにくい、発熱、転倒後から続く、排尿・排便の異常がある場合は、セルフケアだけで判断せず医療機関に相談してください。`,
      ],
      bullets: [
        `伝えること：${symptom.label} / ${loopSignalText} / ${topWeather.label}`,
        `身体ライン：${bodyLineSummary}`,
      ],
      steps: [
        "つらい時間帯・天気・直前の食事や姿勢を1行でメモする",
        "楽になる条件と悪化する組み合わせをセットで伝える",
      ],
    },
  ];
  const cleanSections = sections.map((section) => ({
    ...section,
    bullets: (section.bullets || []).filter(Boolean),
    steps: (section.steps || []).filter(Boolean),
    cards: Array.isArray(section.cards) ? section.cards.filter(Boolean) : [],
  }));

  return {
    productName: PERSONAL_KARTE_DISPLAY_NAME,
    subtitle: `${core.title}｜${symptom.label}の不調ループ見える化レポート`,
    coreCode: core.code,
    coreTitle: core.title,
    coreShort: core.short,
    symptom: symptom.code,
    symptomLabel: symptom.label,
    primarySub,
    secondarySub,
    mainWeather: topWeather.day,
    mainWeatherLabel: topWeather.label,
    meridianPreview: {
      primary: movementPrimary
        ? {
            movementLabel: movementPrimary.movementLabel,
            lineTitle: movementPrimary.lineTitle,
            bodyArea: movementPrimary.bodyArea,
            meridianText: movementPrimary.meridianText,
            meridians: movementPrimary.meridians,
            meridiansWithReadings: movementPrimary.meridiansWithReadings,
            organsHint: movementPrimary.organHint,
            description: movementPrimary.description,
          }
        : null,
      secondary: movementSecondary
        ? {
            movementLabel: movementSecondary.movementLabel,
            lineTitle: movementSecondary.lineTitle,
            bodyArea: movementSecondary.bodyArea,
            meridianText: movementSecondary.meridianText,
            meridians: movementSecondary.meridians,
            meridiansWithReadings: movementSecondary.meridiansWithReadings,
            organsHint: movementSecondary.organHint,
            description: movementSecondary.description,
          }
        : null,
    },
    weatherRankings: weather.ranked,
    envVectors: weather.selfReported.map((item) => item.key),
    heroLead: `${core.title}の体質軸をもとに、${joinTerm(primaryTerm)}・${joinTerm(secondaryTerm)}、${topWeather.label}の日、動作負担チェックで見えた身体ライン、Plus深掘りチェックで見えたNG組み合わせを合わせて、${symptom.label}がくり返されやすい流れを整理します。`,
    quickTakeaways,
    mapFlow,
    forecastUsage,
    kartePlusLoop: loopProfile,
    plusIntakeProvided: Boolean(plusIntake && Object.keys(plusIntake).length > 0),
    beautyColumn: {
      badge: "まとめ",
      title: "同梱ツール・相談メモの使い方",
      teaser: "重ねすぎ注意カードと相談メモを、日々の予報ページにつなげて使います。",
      preview: `${symptom.label}、${topWeather.label}の日、${mainNgTitle}、${bodyLineSummary}を、見返しやすい形でまとめます。`,
      body: [
        `Plusの中心は、読むことだけではありません。${mainNgTitle}のようなNG組み合わせを見つけ、警戒日前に1つ外すことで、予報ページの提案を実行しやすくします。`,
        `相談時は、不調名だけでなく「いつ出るか」「何で強くなるか」「何で楽になるか」「どの身体ラインに出やすいか」を伝えると共有しやすくなります。まずは、${symptom.label}、${loopSignalText}、${bodyLineSummary}をメモします。`,
        `医療的な不安がある場合や、強い痛み・しびれ・発熱・転倒後から続く症状などがある場合は、セルフケアだけで判断せず医療機関に相談してください。`,
      ],
      points: [
        `不調：${symptom.label}`,
        `NG候補：${mainNgTitle}`,
        `身体ライン：${bodyLineSummary}`,
      ],
    },
    sections: cleanSections,
    meta: {
      version: "deterministic-v12-karte-plus-loop-report",
      sectionCount: cleanSections.length,
      generatedBy: "rules",
    },
  };
}

export function getKartePreviewSections(karte) {
  return (karte?.sections || []).map((section) => ({
    id: section.id,
    badge: section.badge,
    title: section.title,
    teaser: section.teaser,
    preview: buildPreview(section),
  }));
}


