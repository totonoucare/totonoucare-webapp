import {
  CORE_LABELS,
  SUB_LABELS,
  SYMPTOM_LABELS,
  MERIDIAN_LINES,
} from "@/lib/diagnosis/v2/labels";
import {
  buildPersonalWeatherAffinityProfile,
  rankExactWeatherAffinity,
} from "@/lib/radar_v1/weatherAffinityProfile";

export const PERSONAL_KARTE_PRODUCT = "personal_mibyo_karte";
export const PERSONAL_KARTE_PRICE_LABEL = "¥1,980";

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
    care: "吐く息を長くし、軽い伸び・香り・歩行で“止まった流れ”をほどく",
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

const WEATHER_ROKUIN_CONTEXT = {
  pressure_down: {
    term: "風邪",
    reading: "ふうじゃ",
    plain: "急な揺れ・変化に体がついていきにくい負担",
    note: "気圧低下は現代の気象変化ですが、未病レーダーでは“揺さぶり”として風邪の性質に寄せて読みます。",
  },
  pressure_up: {
    term: "風邪",
    reading: "ふうじゃ",
    plain: "急な締まり・変化で張りやこわばりが出やすい負担",
    note: "天気が急に動く日は、巡りや緊張の反応が表に出やすい日として見ます。",
  },
  cold: {
    term: "寒邪",
    reading: "かんじゃ",
    plain: "冷えで縮こまり、こわばり・痛み・動き出しにくさを作りやすい負担",
    note: "寒さで体が守りに入り、関節や筋肉の動きが重くなりやすい日です。",
  },
  heat: {
    term: "暑邪",
    reading: "しょじゃ",
    plain: "暑さで消耗し、ほてり・だるさ・眠りの浅さを作りやすい負担",
    note: "急な暑さや蒸し暑さで、余力を削られやすい日として見ます。",
  },
  damp: {
    term: "湿邪",
    reading: "しつじゃ",
    plain: "湿気で重だるさ・むくみ・胃腸の停滞を作りやすい負担",
    note: "湿度や雨前後で、体の重さや水分停滞が表に出やすい日です。",
  },
  dry: {
    term: "燥邪",
    reading: "そうじゃ",
    plain: "乾燥で潤いを奪い、喉・目・肌・睡眠に出やすい負担",
    note: "空気の乾きで、潤い不足や緊張が表に出やすい日として見ます。",
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

const SEASON_LINES = {
  qi_stagnation: {
    riskySeason: "春・季節の変わり目",
    sign: "張り、ため息、気分の詰まり",
    spring: "春は予定や環境の変化で気が張りやすく、胸・みぞおち・首肩のこわばりが出やすい時期です。予定を詰めるより、切り替え時間を先に確保します。",
    rainy: "梅雨は湿気で巡りが重くなり、気分の切り替えに時間がかかりやすくなります。冷たい飲食を続けず、短い散歩や深い呼気で流れを作ります。",
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
    spring: "春は気が上にのぼりやすく、目や頭の疲れが出やすい時期です。夜の画面刺激を減らし、早めに鎮める流れを作ります。",
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
  return {
    order,
    answerValue: normalizedAnswer,
    movementLabel: movement?.label || `${order}番目に選ばれた動き`,
    movementMeaning: movement?.meaning || "動作チェックで負担が出やすいと見えたラインです。",
    meridianCode,
    lineTitle: line?.title || "負担ライン",
    bodyArea: line?.body_area || "身体ライン",
    meridians: line?.meridians || [],
    organsHint: line?.organs_hint || "動きや場所の変化を見るための目印です。",
  };
}

function symptomLine(symptom) {
  const meridianCode = SYMPTOM_MERIDIAN[symptom] || null;
  const line = meridianCode ? MERIDIAN_LINES[meridianCode] || null : null;
  return line
    ? {
        meridianCode,
        lineTitle: line.title,
        bodyArea: line.body_area,
        meridians: line.meridians || [],
        organsHint: line.organs_hint,
      }
    : null;
}

function buildMechanismInsight({ primarySubCode, secondarySubCode, symptomLabel }) {
  const p = SUB_MECHANISM[primarySubCode] || SUB_MECHANISM.qi_stagnation;
  const s = SUB_MECHANISM[secondarySubCode] || SUB_MECHANISM.qi_deficiency;
  const pair = [primarySubCode, secondarySubCode].sort().join("+");

  const pairLoops = {
    "fluid_damp+qi_deficiency": "この組み合わせでは、気虚によって水分をさばく力が落ち、痰湿として重さ・むくみ・眠気が表に出やすくなります。反対に、痰湿が残るほどさらに気の立ち上がりが鈍るため、重さと消耗が循環しやすい読みです。",
    "blood_stasis+qi_stagnation": "この組み合わせでは、まず巡りの詰まりが張りとして出て、長引くと同じ場所のこわばりとして固定化しやすくなります。気滞と血瘀は、時間差というより“詰まりが残るほど固まる”循環として見るのが自然です。",
    "blood_deficiency+qi_deficiency": "この組み合わせでは、動かす力と養う力がどちらも弱りやすく、頑張った後に回復が追いつきにくくなります。気虚が日中の電池切れとして、血虚が目や睡眠の回復しにくさとして出やすい読みです。",
    "fluid_deficiency+blood_deficiency": "この組み合わせでは、栄養と潤いの不足が重なり、乾き・目の疲れ・眠りの浅さとして出やすくなります。足すべきものを消耗しながら発散すると、さらに乾きやすい流れです。",
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

function weatherRokuin(itemOrKey) {
  const key = typeof itemOrKey === "string" ? itemOrKey : itemOrKey?.key;
  return WEATHER_ROKUIN_CONTEXT[key] || WEATHER_ROKUIN_CONTEXT.pressure_down;
}

function joinTerm(term) {
  return `${term.term}（${term.reading}）`;
}

function buildKarteTakeaways({ core, symptom, weather, primaryTerm, secondaryTerm, relatedSigns }) {
  const top = weather.top || weatherItem("pressure_down", 0.45, 1);
  const topRokuin = weatherRokuin(top);
  return [
    {
      label: "まず見る天気",
      value: `${top.label}の日`,
      note: `${joinTerm(topRokuin)}の負担として、${topRokuin.plain}を見ます。`,
    },
    {
      label: "先に出るサイン",
      value: relatedSigns[0] || symptom.bodySign,
      note: `${symptom.label}だけでなく、手前の軽いサインも拾います。`,
    },
    {
      label: "守るライン",
      value: core.strategy.boundary,
      note: `${core.title}は、早めに弱めるほど翌日に残しにくいタイプです。`,
    },
  ];
}

function buildKarteMapFlow({ core, primaryTerm, secondaryTerm, weather, symptom, relatedSigns }) {
  const top = weather.top || weatherItem("pressure_down", 0.45, 1);
  const topRokuin = weatherRokuin(top);
  return [
    {
      label: "体質軸",
      title: core.title,
      description: `${core.yinYangText} × ${core.driveText}。反応の出方と回復余力の入口です。`,
    },
    {
      label: "内側の受け皿",
      title: `${joinTerm(primaryTerm)}・${joinTerm(secondaryTerm)}`,
      description: "気血津液の偏りとして、体に出やすいサインを読みます。",
    },
    {
      label: "外からの負担",
      title: `${top.label} / ${joinTerm(topRokuin)}`,
      description: "天気変化を六淫の性質として読み替え、揺れやすい日を先に見ます。",
    },
    {
      label: "表に出るサイン",
      title: `${symptom.label}・${relatedSigns.slice(0, 2).join("・")}`,
      description: "今の不調を入口に、次に出やすい軽いサインまで見返せる地図にします。",
    },
  ];
}

function buildForecastUsage({ weather, symptom, movementPrimary }) {
  const top = weather.top || weatherItem("pressure_down", 0.45, 1);
  return {
    title: "このカルテは地図。今日のケアは予報ページで確認",
    body: `カルテでは、${top.day}に${symptom.bodySign}が揺れやすい理由を整理します。実際に今日使うツボ・食養生・過ごし方は、その日の気象データで変わるため、予報ページで確認してください。`,
    bullets: [
      `予報点数が高い日は「主因」が${top.label}かを見る`,
      `ツボは体質・天気・${movementPrimary ? "動作チェックの経絡ライン" : "経絡ライン"}を合わせて確認する`,
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
      importantRule: "主訴から見た観察ゾーンと、動作チェックで見えた負担ラインは別物として扱います。ユーザー向けには、身体で観察しやすい場所・動きとして説明します。",
    },
    mechanism,
    season,
  };
}

function buildPreview(section) {
  return section.preview || `${section.body?.[0] || "あなたの体質の崩れ方には、いくつかの決まった流れがあります。"} 続きでは、具体的な見分け方と戻し方まで整理します。`;
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
  const symptomLine = movement.symptomLine;
  const lineComparison = movementPrimary && symptomLine && movementPrimary.lineTitle !== symptomLine.lineTitle
    ? `主訴から見る観察ゾーンは「${symptomLine.lineTitle}」、動作チェックで見えた負担ラインは「${movementPrimary.lineTitle}」です。この2つを混ぜずに見ると、${symptom.label}の出方が立体的に捉えやすくなります。`
    : movementPrimary
      ? `動作チェックでは「${movementPrimary.lineTitle}」が主な観察ラインです。強い日と軽い日の違いを、この動きや場所で比べてみてください。`
      : symptomLine
        ? `主訴からは「${symptomLine.lineTitle}」を観察ゾーンとして見ておくと、日々の変化を拾いやすくなります。`
        : "出やすい場所・動き・天気との関係を分けて見ると、状態の変化を拾いやすくなります。";

  const primaryTerm = subTcmTerm(primarySub.code);
  const secondaryTerm = subTcmTerm(secondarySub.code);
  const rankedRokuin = (weather.ranked || []).map((item) => ({ ...item, rokuin: weatherRokuin(item) }));
  const topRokuin = weatherRokuin(topWeather);
  const weatherRankWithRokuin = rankedRokuin
    .map((item) => `${item.rank}位 ${item.label}＝${joinTerm(item.rokuin)}`)
    .join(" / ");
  const relatedSigns = unique([
    ...(SYMPTOM_RELATED_SIGNS[symptom.code] || []),
    ...(mechanism.earlySigns || []),
    symptom.bodySign,
  ]).slice(0, 6);
  const quickTakeaways = buildKarteTakeaways({ core, symptom, weather, primaryTerm, secondaryTerm, relatedSigns });
  const mapFlow = buildKarteMapFlow({ core, primaryTerm, secondaryTerm, weather, symptom, relatedSigns });
  const forecastUsage = buildForecastUsage({ weather, symptom, movementPrimary });

  const sections = [
    {
      id: "weather-map",
      badge: "全体像",
      title: "あなたの天気病パターン全体像",
      teaser: "今の不調を入口に、これからも使える体調の地図として整理します",
      preview: `${core.title}は、${core.yinYangText}と${core.driveText}を軸にした体質マップです。天気で揺れやすい日の見方まで整理します。`,
      body: [
        `今回の入口は「${symptom.label}」ですが、このカルテの主役は不調名そのものではありません。${core.title}という体質軸をもとに、内側の偏り、天気の負担、体に出るサインを一つの地図として見ます。`,
        `${core.tcmHint} この特徴があると、${topWeather.day}のような外からの変化を受けたときに、${relatedSigns.slice(0, 3).join("、")}などの小さなサインが先に出やすくなります。`,
        `今の不調が落ち着いたあとも、同じ体質から別の軽いサインとして出ることがあります。だからこそ「腰だけ」「頭だけ」「むくみだけ」と切り分けず、自分の崩れ方の順番として見返せるようにしておきます。`,
      ],
      bullets: [
        `体質軸：${core.title}（${core.short}）`,
        `入口の不調：${symptom.label}`,
        `注意したい天気：${weather.ranked.map((item) => item.label).join("・")}`,
        `まず守るライン：${coreStrategy.boundary}`,
      ],
      steps: [],
    },
    {
      id: "inner-pattern",
      badge: "内側",
      title: "気血津液（きけつしんえき）で見る、内側の受け皿",
      teaser: "東洋医学の言葉で、自分の重さ・消耗・張りに名前をつけます",
      preview: `今回目立つ偏りは、${joinTerm(primaryTerm)}と${joinTerm(secondaryTerm)}。専門語を生活の体感に翻訳して見ていきます。`,
      body: [
        `東洋医学では、体を動かす力や巡り、潤いをまとめて気血津液（きけつしんえき）として見ます。今回目立つのは、${joinTerm(primaryTerm)}と${joinTerm(secondaryTerm)}です。`,
        `${joinTerm(primaryTerm)}は、${primaryTerm.plain}です。${joinTerm(secondaryTerm)}は、${secondaryTerm.plain}です。この2つが重なると、${symptom.label}として強く出る前に、${mechanism.earlySigns.join("、")}のような前触れが出やすくなります。`,
        `${mechanism.loop} ここを知っておくと、不調が強くなってから整えるのではなく、名前のついた前触れとして早めに拾えるようになります。`,
      ],
      bullets: [
        `${joinTerm(primaryTerm)}：${primaryTerm.plain}`,
        `${joinTerm(secondaryTerm)}：${secondaryTerm.plain}`,
        `前触れ：${mechanism.earlySigns.join("、")}`,
        `戻す方向：${resetDirection(primarySub.code, secondarySub.code)}`,
      ],
      steps: [],
    },
    {
      id: "weather-rokuin",
      badge: "六淫",
      title: "六淫（ろくいん）で見る、注意したい天気",
      teaser: "天気変化を、体に負担として入る“邪気”の性質で読み替えます",
      preview: `今回の注意天気は、${weather.ranked.map((item) => item.label).join("・")}。六淫の言葉で見ると、${rankedRokuin.map((item) => joinTerm(item.rokuin)).join("・")}がポイントです。`,
      body: [
        `六淫（ろくいん）とは、風・寒・暑・湿・燥・火のような外からの負担を、体がどう受けるかを見る考え方です。今回の上位は、${weatherRankWithRokuin}です。`,
        `特に${topWeather.day}は、${joinTerm(topRokuin)}として見ると理解しやすい日です。これは${topRokuin.plain}です。そのため、${topWeather.note}`,
        selfWeatherText === "未指定"
          ? `本人の自覚としては、まだ天気のきっかけが絞り込まれていません。まずは${topWeather.day}${secondWeather ? `や${secondWeather.day}` : ""}に、${relatedSigns.slice(0, 3).join("・")}が強まるかを観察していきます。`
          : `質問では「${selfWeatherText}」も選ばれています。体質から見た注意天気と、自分の実感が重なる日ほど、先回りの価値が高い日として扱います。`,
      ],
      bullets: [
        `注意天気：${weather.ranked.map((item) => `${item.rank}位 ${item.label}`).join(" / ")}`,
        `六淫の見方：${rankedRokuin.map((item) => `${item.label}＝${joinTerm(item.rokuin)}`).join(" / ")}`,
        selfWeatherText === "未指定" ? "自覚トリガー：これから観察" : `自覚トリガー：${selfWeatherText}`,
      ],
      steps: [],
    },
    {
      id: "symptom-signs",
      badge: "サイン",
      title: "今の不調と、次に出やすいサイン",
      teaser: "今困っている不調を代表例にして、これから注意したい軽いサインまで見ます",
      preview: `${symptom.label}だけでなく、${relatedSigns.slice(0, 3).join("・")}も同じ地図の上で見ていきます。`,
      body: [
        `今いちばん困っているのは「${symptom.label}」です。ただし、これは今いちばん表に出ている代表例です。体質と天気の負担が同じでも、日によっては${relatedSigns.slice(0, 4).join("、")}のような軽いサインとして現れることがあります。`,
        `大切なのは、不調名を固定しすぎないことです。${topWeather.day}に${symptom.label}が出ない日でも、眠気・重さ・張り・乾きなど別の形で出ているなら、同じ流れの手前にいる可能性があります。`,
        `この章は、症状が強くなる前に止めるための観察リストです。痛みやつらさの強さだけでなく、朝・食後・午後・夜のどこで変化するかを見ると、未病の段階で拾いやすくなります。`,
      ],
      bullets: [
        `入口の不調：${symptom.label}`,
        `次に見たいサイン：${relatedSigns.join(" / ")}`,
        `出やすい条件：${symptom.watch}`,
        `見る時間帯：朝の動き出し・食後・午後・寝る前`,
      ],
      steps: [
        `朝：${relatedSigns[0] || symptom.bodySign}がないか見る`,
        `日中：${topWeather.day}と予定量・食事の重さが重なっていないか見る`,
        `夜：翌日に残りそうなら、ケアを足すより刺激を減らす`,
      ],
    },
    {
      id: "meridian-line",
      badge: "経絡",
      title: "動きで見えた、負担がかかる経絡（けいらく）ライン",
      teaser: "痛い場所だけでなく、動きで表れた負担ラインも見ます",
      preview: movementPrimary
        ? `動作チェックでは「${movementPrimary.movementLabel}」が手がかりです。${movementPrimary.lineTitle}を観察すると、日々の変化を拾いやすくなります。`
        : `動作チェックから、負担が表れやすい経絡ラインを整理します。`,
      body: [
        `未病レーダーの動作チェックは、M-testの考え方を参考に、体を動かしたときの張り・重さ・動きにくさから、負担がかかりやすい経絡（けいらく）ラインを見ています。`,
        lineComparison,
        movementSecondary
          ? `2番目に気になる動きは「${movementSecondary.movementLabel}」です。主訴の場所と動作チェックのラインが違う場合でも、内側の偏りがどの通り道に出ているかを見る手がかりになります。`
          : `痛い場所だけを追うより、「どの動きで重くなるか」を見ると、予報ページで出るツボや日々のセルフケアの意味もつながりやすくなります。`,
      ],
      bullets: [
        symptomLine ? `主訴から見る場所：${symptomLine.lineTitle}（${symptomLine.bodyArea}）` : `主訴：${symptom.label}`,
        movementPrimary ? `動作チェック1位：${movementPrimary.movementLabel} → ${movementPrimary.lineTitle}（${movementPrimary.bodyArea}）` : "動作チェック1位：強い偏りなし",
        movementSecondary ? `動作チェック2位：${movementSecondary.movementLabel} → ${movementSecondary.lineTitle}（${movementSecondary.bodyArea}）` : "動作チェック2位：選択なし/強い偏りなし",
        "予報ページのツボ選定では、この経絡ラインも手がかりになります",
      ],
      steps: [],
    },
    {
      id: "forecast-guide",
      badge: "予報",
      title: "未病レーダー予報の読み方",
      teaser: "このカルテを、毎日の予報・ツボ・食養生につなげます",
      preview: `カルテは地図、予報ページは今日の天気でどこが揺れそうかを見る場所です。`,
      body: [
        `このカルテは、あなたの体調の地図です。一方で、毎日の予報ページは、その日の気圧・気温・湿度によって、地図のどこが揺れそうかを見る場所です。`,
        `予報点数が高い日は、点数だけでなく「主因」を見てください。${topWeather.day}が主因なら${joinTerm(topRokuin)}、冷え込みが主因なら寒邪（かんじゃ）、湿気が主因なら湿邪（しつじゃ）というように、今日の負担の種類が変わります。`,
        `ツボや食養生は、このカルテに固定で書くより、その日の主因に合わせて予報ページで見る方が実用的です。カルテで自分の地図を知り、予報で今日の一手を選ぶ、という使い方がおすすめです。`,
      ],
      bullets: forecastUsage.bullets,
      steps: ["予報点数を見る", "主因が湿気・冷え・気圧・乾燥・暑さのどれかを見る", "その日のツボ・食養生を確認する"],
    },
    {
      id: "advance-care",
      badge: "先回り",
      title: "天気が荒れる日の先回り",
      teaser: "完璧なセルフケアではなく、崩れを増やさない最小セットです",
      preview: `${topWeather.day}は、予定・食事・冷え対策のどれか1つを軽くするだけでも反動を減らしやすくなります。`,
      body: [
        `しんどい日の目標は、完璧に整えることではなく、これ以上崩れを増やさないことです。${core.title}の場合、${coreStrategy.boundary}だけでも翌日に残る反動を小さくしやすくなります。`,
        `食事と動きは、体質の偏りに合わせて弱めます。${resetDirection(primarySub.code, secondarySub.code)} 強い運動や長いケアより、短く戻して早めに休む方が合う日があります。`,
        `${coreStrategy.rescue} 予報で注意日が出たら、いつもの生活を全部変えるのではなく、予定量・食事の重さ・冷え対策のどれか1つだけ先に調整してみてください。`,
      ],
      bullets: [
        `守ること：${coreStrategy.boundary}`,
        `食事：${coreStrategy.rescue}`,
        `控えたいこと：${coreStrategy.ng.join(" / ")}`,
      ],
      steps: ["予定を1つ軽くする", "食事を温かく軽めにする", "寝る前の刺激を減らす"],
    },
    {
      id: "consult",
      badge: "相談メモ",
      title: "鍼灸・整体・漢方相談で伝えるメモ",
      teaser: "相談時に、体質・天気・経絡ラインを短く伝えるための整理です",
      preview: `${core.title} × ${joinTerm(primaryTerm)} × ${topWeather.label} × ${symptom.label}の要点を、相談で使いやすい形にまとめます。`,
      body: [
        `相談先では、「${symptom.label}」という不調名だけでなく、いつ・何で・どこに出るかを伝えると共有しやすくなります。${symptom.consultation}に加えて、${topWeather.day}との関係もメモしておくと役立ちます。`,
        `体質メモとしては、${core.title}、${joinTerm(primaryTerm)}、${joinTerm(secondaryTerm)}。天気側では${weather.ranked.map((item) => item.label).join("・")}に注意。動作チェックでは${movementPrimary ? `${movementPrimary.movementLabel}で${movementPrimary.lineTitle}` : "大きな偏りなし"}を見ています。`,
        `この章は医療機関での診断や治療指示の代わりではありません。強い痛み、しびれ、力が入りにくい、発熱、転倒後から続く、排尿・排便の異常などがある場合は、セルフケアだけで様子を見ず医療機関に相談してください。`,
      ],
      bullets: [
        `一番困っていること：${symptom.label}`,
        `前触れ：${relatedSigns.slice(0, 4).join(" / ")}`,
        `注意天気：${weather.ranked.map((item) => item.label).join(" / ")}`,
        movementPrimary ? `動作チェック：${movementPrimary.movementLabel} → ${movementPrimary.lineTitle}` : "動作チェック：強い偏りなし",
      ],
      steps: [
        `最初の30秒で伝えるなら：「${symptom.label}で困っています。${topWeather.day}や${symptom.watch}時に出やすく、${relatedSigns.slice(0, 3).join("、")}もあります。」`,
        `確認したいこと：「今は${joinTerm(primaryTerm)}・${joinTerm(secondaryTerm)}のどちらを優先して整えるとよさそうですか？」`,
      ],
    },
  ];

  const cleanSections = sections.map((section) => ({
    ...section,
    bullets: (section.bullets || []).filter(Boolean),
    steps: (section.steps || []).filter(Boolean),
  }));

  return {
    productName: "パーソナル未病カルテ",
    subtitle: `${core.title}｜${symptom.label}を入口に、天気で揺れやすい体調サインを読み解く`,
    coreCode: core.code,
    coreTitle: core.title,
    coreShort: core.short,
    symptom: symptom.code,
    symptomLabel: symptom.label,
    primarySub,
    secondarySub,
    mainWeather: topWeather.day,
    mainWeatherLabel: topWeather.label,
    weatherRankings: weather.ranked,
    envVectors: weather.selfReported.map((item) => item.key),
    heroLead: `${core.title}の体質軸をもとに、${joinTerm(primaryTerm)}・${joinTerm(secondaryTerm)}という内側の偏り、${topWeather.label}を中心とした六淫（ろくいん）の負担、動作チェックで見えた経絡ラインをつなげて、天気で体調が揺れるパターンを整理します。`,
    quickTakeaways,
    mapFlow,
    forecastUsage,
    sections: cleanSections,
    meta: {
      version: "deterministic-v5-weather-map-ui",
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

