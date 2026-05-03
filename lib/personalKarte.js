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
    organsHint: line?.organs_hint || "診断名ではなく、負担の出やすい観察ラインとして扱います。",
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
    loop: pairLoops[pair] || `今回の「${subLabel(primarySubCode).short}」「${subLabel(secondarySubCode).short}」は強さ順であり、必ずこの順番で起きるという意味ではありません。${p.role}と${s.role}が重なることで、${symptomLabel}として表に出る前の小さなサインを拾いやすくなります。`,
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
      meaning: "動物ラベルは診断名ではなく、踏みグセ（アクセル/ブレーキ）×余力（バッテリー）に、気血水・環境感受性・回復力を重ねて上位の地図にしたものです。",
    },
    subLabels: {
      primary: { ...primarySub, score: getSubScore(computed, primarySubCode), mechanism: SUB_MECHANISM[primarySubCode] || null },
      secondary: { ...secondarySub, score: getSubScore(computed, secondarySubCode), mechanism: SUB_MECHANISM[secondarySubCode] || null },
      orderedCodes: subCodes,
      importantRule: "サブラベルの順位は強さ順であり、病機の発生順ではありません。文章化するときは、気虚→痰湿、気滞→血瘀などの中医学的に自然な循環を優先します。",
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
      importantRule: "主訴から見た観察ゾーンと、M-test的な動作チェックで見えた負担ラインは別物として扱います。M-testラインは病名ではなく、負担が出やすい運動・経絡ラインです。",
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
      ? `動作チェックでは「${movementPrimary.lineTitle}」が主な観察ラインです。これは病名ではなく、負担が表れやすい運動・経絡ラインとして使います。`
      : symptomLine
        ? `主訴からは「${symptomLine.lineTitle}」を観察ゾーンとして見ておくと、日々の変化を拾いやすくなります。`
        : "出やすい場所・動き・天気との関係を分けて見ると、状態の変化を拾いやすくなります。";

  const sections = [
    {
      id: "overview",
      badge: "全体像",
      title: "あなたの未病パターン全体像",
      teaser: "動物ラベルを、踏みグセ・余力・気血水の地図として読み解きます",
      preview: `${core.title}は、${core.yinYangText} × ${core.driveText}の地図です。無料結果では見えにくい“なぜこの型なのか”まで整理します。`,
      body: [
        `今回の体質軸は「${core.title}」。これは性格診断ではなく、${core.yinYangText}と${core.driveText}を中心に、気血水の偏り・環境感受性・回復力を重ねて作った未病レーダー上の地図です。`,
        `${core.tcmHint} ここに「${primarySub.short}」と「${secondarySub.short}」が重なり、今いちばん気になっている「${symptom.label}」へサインが出やすい読みになります。`,
        `このカルテで見るのは、単なる不調名ではありません。「どの負荷に揺さぶられ、どのサインから崩れ始め、どこで止めると翌日に残りにくいか」を、あなた用の取扱説明書として整理します。`,
      ],
      bullets: [
        `体質軸：${core.title}（${core.short}）`,
        `上位レイヤー：${core.yinYangText} × ${core.driveText}`,
        `主訴：${symptom.label}`,
        `まず守るライン：${coreStrategy.boundary}`,
      ],
      steps: [],
    },
    {
      id: "route",
      badge: "崩れ方",
      title: "表に出ている不調と、奥にある体質の流れ",
      teaser: "サブラベルを“発生順”ではなく“強さと循環”として読みます",
      preview: `「${primarySub.short}」「${secondarySub.short}」は強さ順であり、必ずその順に起きるわけではありません。ここがカルテの読みどころです。`,
      body: [
        `今回強く出ている偏りは「${primarySub.short}」と「${secondarySub.short}」です。ただし、これはランキングであって病機の時系列ではありません。中医学的な流れとして自然かどうかを見ながら、${symptom.label}の背景を読み替えます。`,
        mechanism.loop,
        `表に出やすい小さなサインは、${mechanism.earlySigns.join("、")}です。${symptom.label}が強くなってから頑張るより、この段階で短く戻す方が未病ケアとしては効率的です。`,
      ],
      bullets: [
        `表に出やすい偏り：${primarySub.short}（${mechanism.primarySurface}）`,
        `背景として見たい偏り：${secondarySub.short}（${mechanism.secondarySurface}）`,
        `主訴として見えているサイン：${symptom.label}`,
      ],
      steps: [
        `見る順番：症状名 → 小さなサイン → 体質の循環`,
        `戻す方向：${resetDirection(primarySub.code, secondarySub.code)}`,
      ],
    },
    {
      id: "weather",
      badge: "天気反応",
      title: "天気に揺さぶられやすいポイント",
      teaser: "自己申告のきっかけと、体質から見た天気相性を分けて見ます",
      preview: `体質構造から見ると、上位は「${weather.ranked.map((item) => item.label).join("・")}」。本人の自覚とは別軸で確認します。`,
      body: [
        `結果ページの「影響を受けやすい天気変化」と同じロジックで見ると、今回の上位は「${weather.ranked.map((item) => item.label).join("・")}」です。特に${topWeather.day}は、${topWeather.note}`,
        `一方で、質問で選ばれた本人の自覚トリガーは「${selfWeatherText}」です。自覚があるものと、体質構造から上がってくるものを分けると、「天気のせい」ではなく「自分のどこが揺さぶられたか」が見えやすくなります。`,
        `未病レーダーの点数が高い日は、点数そのものより“主因”を見てください。${topWeather.day}${secondWeather ? `や${secondWeather.day}` : ""}が絡む日は、予定量・睡眠・食事のどれか1つを軽くする合図として使えます。`,
      ],
      bullets: [
        `体質から見た天気相性：${weather.ranked.map((item) => `${item.rank}位 ${item.label}`).join(" / ")}`,
        `本人が選んだきっかけ：${selfWeatherText}`,
        `出やすいサイン：${symptom.bodySign}`,
      ],
      steps: [],
    },
    {
      id: "body-line",
      badge: "身体ライン",
      title: "負担が出やすい身体ライン",
      teaser: "主訴とM-testの動作チェックを混ぜずに整理します",
      preview: movementPrimary
        ? `動作チェックでは「${movementPrimary.movementLabel}」から、${movementPrimary.lineTitle}が見えています。主訴とは別の観察軸です。`
        : `主訴から見た観察ゾーンと、動きで見える負担ラインを分けて整理します。`,
      body: [
        `未病レーダーでは、ユーザーが選んだ不調「${symptom.label}」と、動作チェックで見えた負担ラインを別々に扱います。${symptom.label}は今困っているテーマ、M-test的なラインは負荷が表に出やすい通り道です。`,
        lineComparison,
        movementSecondary
          ? `2番目に気になる動きとして「${movementSecondary.movementLabel}」も選ばれています。補助ラインとして「${movementSecondary.lineTitle}」を見ると、強い日と軽い日の違いを比べやすくなります。`
          : `2番目のラインが強くない場合は、まず主ラインと主訴の出方だけを観察すれば十分です。情報を増やしすぎず、“どの動きで変わるか”をシンプルに見ます。`,
      ],
      bullets: [
        symptomLine ? `主訴から見た観察ゾーン：${symptomLine.lineTitle}（${symptomLine.bodyArea}）` : `主訴：${symptom.label}`,
        movementPrimary ? `動作チェック1位：${movementPrimary.movementLabel} → ${movementPrimary.lineTitle}（${movementPrimary.bodyArea}）` : "動作チェック1位：強い偏りなし",
        movementSecondary ? `動作チェック2位：${movementSecondary.movementLabel} → ${movementSecondary.lineTitle}（${movementSecondary.bodyArea}）` : "動作チェック2位：選択なし/強い偏りなし",
        "このラインは診断名ではなく、負担が出やすい観察ルートとして使う",
      ],
      steps: [],
    },
    {
      id: "season",
      badge: "季節",
      title: "季節ごとの守り方",
      teaser: "体質・天気相性・主訴をつなげて、年間の波を先に読みます",
      preview: `${season.headline}は、${symptom.label}の波を先読みするうえで見ておきたい時期です。`,
      body: [
        season.body,
        season.secondary,
        `季節対策は、特別なことを増やすより、崩れやすい時期の1〜2週間前から睡眠・食事・予定量のどれかを軽く守る方が現実的です。毎日の未病レーダーを短期の天気図、この章を年間の地図として使ってください。`,
      ],
      bullets: [
        `春：${seasonLine(primarySub.code).spring}`,
        `梅雨〜夏：${seasonLine(primarySub.code).rainy}`,
        `秋：${seasonLine(primarySub.code).autumn}`,
        `冬：${seasonLine(primarySub.code).winter}`,
      ],
      steps: [],
    },
    {
      id: "avoid",
      badge: "控えたいこと",
      title: "合わないケア・逆効果になりやすい行動",
      teaser: "良かれと思って続けている習慣を、体質から見直します",
      preview: `疲れた日の回復法が、今の体質には強すぎる場合があります。${core.title}では、ケアの方向を間違えると${symptom.pain}が残りやすくなります。`,
      body: [
        `避けたいのは、体の状態より刺激の強さを優先することです。崩れそうな日は「一気に発散する」「強く温める」「甘いもので持ち上げる」などが、かえって負担になる場合があります。`,
        `完全に禁止する必要はありません。ただし未病レーダーのスコアが高い日や、${symptom.bodySign}が出ている日は、いつものケアを弱める・短くする・翌日に回す判断が合います。`,
        `戻す方向はシンプルです。${resetDirection(primarySub.code, secondarySub.code)}`,
      ],
      bullets: coreStrategy.ng,
      steps: [],
    },
    {
      id: "minimum-care",
      badge: "最低限ケア",
      title: "しんどい日に崩れを増やさない最低限ケア",
      teaser: "完璧なセルフケアではなく、翌日に残さない選択肢です",
      preview: `余力が少ない日は、頑張って整えるより「悪化要因を増やさない」ことが大切です。${core.title}には、${coreStrategy.rescue}`,
      body: [
        `余力が少ない日は、栄養・運動・入浴・ストレッチを全部やろうとしない方が続きます。優先順位は、温かさ、消化の軽さ、睡眠に入りやすい環境です。`,
        coreStrategy.rescue,
        `コンビニや外食で済ませる日でも、「温かい」「重すぎない」「少しだけたんぱく質」「甘いものだけで終わらせない」の4つを満たせば、翌日の反動を減らしやすくなります。`,
      ],
      bullets: ["温かい汁物を入れる", "主食は小さめにする", "たんぱく質を少量足す", "就寝前の刺激を増やさない"],
      steps: [],
    },
    {
      id: "consult",
      badge: "相談メモ",
      title: "鍼灸・整体・漢方相談で伝えるメモ",
      teaser: "相談時に、状態を短く正確に伝えるための整理です",
      preview: `${core.title} × ${symptom.label}の要点を、相談時に使える形にまとめます。特に${topWeather.day}と${symptom.bodySign}は伝える価値があります。`,
      body: [
        `相談先では、不調名だけでなく「いつ・何で・どこに出るか」を伝えると、状態の共有がしやすくなります。${symptom.consultation}を短く伝えられると、施術や養生の方向を相談しやすくなります。`,
        `体質メモとしては「${core.title}」「${primarySub.short}」「${secondarySub.short}」。ただし、${primarySub.short}が先に起きるという意味ではなく、強く出ている偏りとして伝えるのが安全です。`,
        `この章は医療機関での診断や治療指示の代わりではありません。セルフケアや施術・漢方相談の場で、自分の状態を短く伝えるためのメモとして使ってください。`,
      ],
      bullets: [
        `一番困っていること：${symptom.label}。特に「${symptom.watch}」と感じる。`,
        `体質から見た天気相性：${weather.ranked.map((item) => item.label).join("・")}`,
        movementPrimary ? `動作チェックで気になるライン：${movementPrimary.lineTitle}（${movementPrimary.bodyArea}）` : "動作チェック：強い偏りなし",
        `体質メモ：${core.title}、${primarySub.short}、${secondarySub.short}`,
        `相談したい方向：強い刺激で押し切るより、今の余力に合わせた調整を知りたい。`,
      ],
      steps: [
        `最初の30秒で伝えるなら：「${symptom.label}で困っています。${topWeather.day}や、${symptom.watch}時に出やすく、${symptom.bodySign}にサインが出ます。」`,
        `確認したいこと：「今は、補う・巡らせる・温める・潤す・余分な重さを抜く、どの方向を優先するとよさそうですか？」`,
      ],
    },
  ];

  return {
    productName: "パーソナル未病カルテ",
    subtitle: "体質・天気・生活リズムから、崩れ方と先回りケアを整理する個別カルテ",
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
    heroLead: `${core.title} × ${symptom.label}の崩れ方を、体質・天気・身体ラインの3方向から整理します。医療的な診断ではなく、日々の未病ケアに使うための個別メモです。`,
    sections,
    meta: {
      version: "deterministic-v4-contextual",
      sectionCount: sections.length,
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


