import {
  CORE_LABELS,
  SUB_LABELS,
  SYMPTOM_LABELS,
  MERIDIAN_LINES,
} from "@/lib/diagnosis/v2/labels";

export const PERSONAL_KARTE_PRODUCT = "personal_mibyo_karte";
export const PERSONAL_KARTE_PRICE_LABEL = "¥1,980";

const DEFAULT_SYMPTOM = "mood";

const SYMPTOM_COPY = {
  fatigue: {
    pain: "だるさ・疲労",
    flare: "だるさや回復の遅さとして残る",
    bodySign: "朝の動き出し・午後の電池切れ",
    watch: "予定を詰めた翌日ほど反動が出やすい",
  },
  sleep: {
    pain: "睡眠の乱れ",
    flare: "寝つき・眠りの浅さ・起床時の重さとして出る",
    bodySign: "寝つき・途中覚醒・起床時の重さ",
    watch: "頭のオン状態が長引く夜ほど崩れやすい",
  },
  neck_shoulder: {
    pain: "首肩のつらさ",
    flare: "首肩の張りや重さとして残る",
    bodySign: "首の付け根・肩甲骨まわり",
    watch: "緊張を抜く前に作業を続けるほど固まりやすい",
  },
  low_back_pain: {
    pain: "腰のつらさ",
    flare: "腰まわりの重さや動きづらさとして残る",
    bodySign: "腰・骨盤まわり・脚の後ろ側",
    watch: "冷えや長時間同じ姿勢で出やすい",
  },
  swelling: {
    pain: "むくみ",
    flare: "重だるさと水分停滞が強まる",
    bodySign: "脚・顔・胃腸の重さ",
    watch: "冷たいもの・甘いもの・遅い食事が重なると出やすい",
  },
  headache: {
    pain: "頭痛",
    flare: "頭まわりの重さや圧迫感として出る",
    bodySign: "こめかみ・後頭部・目の奥",
    watch: "気圧変化と緊張が重なる日に出やすい",
  },
  dizziness: {
    pain: "めまい",
    flare: "ふわつき・不安定感として出る",
    bodySign: "頭の軽さ・視界の揺れ・足元の不安定さ",
    watch: "睡眠不足や空腹が重なると強まりやすい",
  },
  mood: {
    pain: "気分の浮き沈み",
    flare: "気分の波や切り替えにくさとして出る",
    bodySign: "みぞおち・胸まわり・首の付け根",
    watch: "気圧変化と我慢が重なる日に出やすい",
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

const SUB_TRIGGERS = {
  qi_stagnation: {
    domino: "緊張や我慢が溜まり、胸・みぞおち・首肩の張りとして表に出る",
    earlySigns: "ため息、胸まわりの詰まり、首肩のこわばり",
    weather: "気圧の変化や曇天で、切り替えの悪さ・ため息・気分の詰まりが出やすい",
    reset: "息を吐く時間を長めにして、胸まわりを開く。香り・散歩・軽い伸びで“止まった巡り”を動かす。",
  },
  qi_deficiency: {
    domino: "先にエネルギーの目減りが起き、午後の電池切れや声の弱さとして表に出る",
    earlySigns: "朝の立ち上がりにくさ、午後の電池切れ、声の弱さ",
    weather: "気温差や湿気で、体が立ち上がるまでに時間がかかりやすい",
    reset: "発散より補給を優先する。横になる、温かいものを少量入れる、予定を減らす。",
  },
  blood_deficiency: {
    domino: "滋養の不足が先に出て、目の疲れ・眠りの浅さ・回復しにくさにつながる",
    earlySigns: "目の疲れ、眠りの浅さ、集中の切れやすさ",
    weather: "乾燥や睡眠不足が重なると、頭や目の消耗が目立ちやすい",
    reset: "画面刺激を減らし、早めに暗くする。温かい食事でじわっと補う。",
  },
  blood_stasis: {
    domino: "一部のこわばりが残り、同じ場所の張りや冷えとして固定化しやすい",
    earlySigns: "同じ場所の張り、冷え、動き出しの固さ",
    weather: "冷えや低気圧で、局所の重さ・こわばりが残りやすい",
    reset: "温めながら軽く動かす。同じ姿勢を切り、固まりを作らない。",
  },
  fluid_damp: {
    domino: "水分代謝の重さが先に出て、むくみ・眠気・頭の重さにつながる",
    earlySigns: "むくみ、眠気、頭の重さ、胃腸の停滞感",
    weather: "湿気や雨前に、重だるさ・胃腸の停滞感が出やすい",
    reset: "冷たいもの・甘いものを控え、温かく軽い食事に寄せる。少し汗ばむ程度に動く。",
  },
  fluid_deficiency: {
    domino: "潤い不足が先に出て、乾燥・熱っぽさ・寝つきの悪さにつながる",
    earlySigns: "喉・目・肌の乾き、寝つきの悪さ、ほてり感",
    weather: "乾燥や暑さで、喉・肌・目の乾きが目立ちやすい",
    reset: "汗をかきすぎず、夜更かしを避ける。水分を“保つ”食事に寄せる。",
  },
};

const WEATHER_CONTEXT = {
  pressure_shift: {
    label: "気圧の変化",
    day: "気圧が大きく動く日",
    note: "頭重感・眠気・気分の波・首肩のこわばりなど、切り替えにくさとして出やすい日です。",
  },
  temp_swing: {
    label: "寒暖差",
    day: "寒暖差が大きい日",
    note: "体温調整に負担がかかり、冷え・だるさ・こわばりとして出やすい日です。",
  },
  humidity_up: {
    label: "湿度の上昇",
    day: "湿度が上がる日",
    note: "重だるさ・むくみ・胃腸の停滞感として出やすい日です。",
  },
  dryness_up: {
    label: "乾燥",
    day: "乾燥が強まる日",
    note: "喉・目・肌の乾きや、眠りの浅さとして出やすい日です。",
  },
  wind_strong: {
    label: "強い風・冷風",
    day: "風が強い日・冷風に当たる日",
    note: "首肩のこわばり、冷え、気分のざわつきとして出やすい日です。",
  },
  pressure_down: {
    label: "気圧低下",
    day: "気圧が下がる日",
    note: "眠気・頭重感・だるさとして出やすい日です。",
  },
  pressure_up: {
    label: "気圧上昇",
    day: "気圧が上がる日",
    note: "張り・緊張・こわばりとして出やすい日です。",
  },
  heat: {
    label: "暑さ",
    day: "気温が上がりやすい日",
    note: "消耗・ほてり・だるさとして出やすい日です。",
  },
  cold: {
    label: "冷え込み",
    day: "冷え込む日",
    note: "冷え・こわばり・動き出しにくさとして出やすい日です。",
  },
};

const WEATHER_ALIASES = {
  temp_up: "heat",
  temp_down: "cold",
  dry: "dryness_up",
  rain: "humidity_up",
  damp: "humidity_up",
  humidity: "humidity_up",
  wind: "wind_strong",
};

const DEFAULT_WEATHER = {
  label: "天気変化",
  day: "天気が大きく動く日",
  note: "気圧・気温・湿度のどれかが大きく動くと、いつもより切り替えにくさが出やすい日です。",
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

function seasonLine(code) {
  return SEASON_LINES[code] || SEASON_LINES.qi_stagnation;
}

function safeComputed(event) {
  return event?.computed || event?.result?.computed || event?.answers?.computed || {};
}

function safeAnswers(event) {
  return event?.answers || event?.result?.answers || {};
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

function normalizeWeatherVector(vector) {
  if (!vector || vector === "none") return null;
  return WEATHER_ALIASES[vector] || vector;
}

function getEnvVectors(event, computed) {
  const answers = safeAnswers(event);
  const candidates = [
    computed?.env?.vectors,
    event?.computed?.env?.vectors,
    event?.env?.vectors,
    event?.env_vectors,
    answers?.env_vectors,
  ];

  const raw = candidates.find((value) => Array.isArray(value) && value.length > 0) || [];
  return Array.from(
    new Set(raw.map(normalizeWeatherVector).filter(Boolean))
  ).slice(0, 2);
}

function weatherContextFromVectors(vectors) {
  const normalized = Array.isArray(vectors) ? vectors : [];
  const primaryKey = normalized[0] || null;
  const secondaryKey = normalized.find((v) => v !== primaryKey) || null;

  return {
    hasExplicit: Boolean(primaryKey),
    primaryKey,
    secondaryKey,
    primary: primaryKey ? WEATHER_CONTEXT[primaryKey] || DEFAULT_WEATHER : DEFAULT_WEATHER,
    secondary: secondaryKey ? WEATHER_CONTEXT[secondaryKey] || null : null,
    selectedLabels: normalized.map((key) => WEATHER_CONTEXT[key]?.label || key),
  };
}

function buildPreview(section) {
  return section.preview || `${section.body?.[0] || "あなたの体質の崩れ方には、いくつかの決まった流れがあります。"} 続きでは、具体的な見分け方と戻し方まで整理します。`;
}

function meridianConsultLine({ symptom, primaryMeridian }) {
  const symptomLine = MERIDIAN_LINES[SYMPTOM_MERIDIAN[symptom]] || null;

  if (symptomLine && primaryMeridian && symptomLine.title !== primaryMeridian.title) {
    return `主訴から見るなら「${symptomLine.title}」、体質傾向から見るなら「${primaryMeridian.title}」も観察したいラインです。`;
  }
  if (symptomLine) return `主訴から見るなら「${symptomLine.title}」を観察したいです。`;
  if (primaryMeridian) return `体質傾向から見るなら「${primaryMeridian.title}」を観察したいです。`;
  return "出やすい場所・時間帯・天気との関係を一緒に伝えると、状態の共有がしやすくなります。";
}

function resetDirection(primaryTrigger, secondaryTrigger) {
  if (primaryTrigger === secondaryTrigger) return primaryTrigger.reset;
  return `まずは、${primaryTrigger.reset} 余力があれば、${secondaryTrigger.reset}`;
}

export function buildPersonalKarte(event = {}) {
  const computed = safeComputed(event);
  const coreCode = computed.core_code || "accel_batt_standard";
  const core = CORE_LABELS[coreCode] || CORE_LABELS.accel_batt_standard;
  const coreStrategy = CORE_STRATEGY[coreCode] || CORE_STRATEGY.accel_batt_standard;

  const subCodes = Array.isArray(computed.sub_labels) ? computed.sub_labels : [];
  const primarySubCode = pickFirst(subCodes, "qi_stagnation");
  const secondarySubCode = pickSecondarySub(subCodes, primarySubCode);
  const primarySub = subLabel(primarySubCode);
  const secondarySub = subLabel(secondarySubCode);
  const primaryTrigger = SUB_TRIGGERS[primarySubCode] || SUB_TRIGGERS.qi_stagnation;
  const secondaryTrigger = SUB_TRIGGERS[secondarySubCode] || SUB_TRIGGERS.blood_deficiency;
  const primarySeason = seasonLine(primarySubCode);
  const secondarySeason = seasonLine(secondarySubCode);

  const symptom = computed.symptom_focus || event?.symptom_focus || safeAnswers(event)?.symptom_focus || DEFAULT_SYMPTOM;
  const symptomText = symptomCopy(symptom);
  const symptomLabel = shortSymptom(symptom);

  const envVectors = getEnvVectors(event, computed);
  const weather = weatherContextFromVectors(envVectors);
  const mainWeather = weather.primary.day;
  const mainWeatherLabel = weather.primary.label;
  const mainWeatherNote = weather.primary.note;
  const secondaryWeather = weather.secondary?.day || null;

  const primaryMeridian = MERIDIAN_LINES[computed.primary_meridian] || null;
  const lineMemo = meridianConsultLine({ symptom, primaryMeridian });
  const selectedWeatherText = weather.hasExplicit
    ? weather.selectedLabels.join("・")
    : "明確な気象トリガーはまだ絞り込み前";

  const sections = [
    {
      id: "overview",
      badge: "全体像",
      title: "あなたの未病パターン全体像",
      teaser: "体質・主訴・天気反応を、一枚の地図として整理します",
      preview: `${core.title}のあなたは、${coreStrategy.collapse}傾向があります。無料結果では見えにくい「崩れ始めの合図」まで整理します。`,
      body: [
        `未病レーダーで見た今回の体質軸は「${core.title}」。${core.tcm_hint} ここに「${primarySub.short}」と「${secondarySub.short}」の偏りが重なり、${symptomText.bodySign}へサインが出やすい流れです。`,
        `このカルテでは、不調名だけを追うのではなく「どの順番で崩れやすいか」を扱います。${symptomLabel}は表に見えているサインで、その手前にある張り・重さ・消耗・乾きなどを早めに拾うことがポイントです。`,
        `大切なのは、頑張り方そのものを否定することではありません。${coreStrategy.boundary}だけでも、同じ生活の中で反動を小さくしやすくなります。`,
      ],
      bullets: [
        `体質軸：${core.title}（${core.short}）`,
        `見ておきたいサイン：${symptomText.bodySign}`,
        `まず守るライン：${coreStrategy.boundary}`,
      ],
      steps: [],
    },
    {
      id: "route",
      badge: "崩れ方",
      title: "不調が出るまでの流れ",
      teaser: "どこで止めれば、症状化しにくいかを見ます",
      preview: `あなたの場合、崩れ始めは「${primarySub.short}」として出やすく、放置すると${symptomText.flare}流れに進みやすい読みです。`,
      body: [
        `第一段階では、${primaryTrigger.domino}ことがあります。この時点では大きな不調と感じにくい一方、${primaryTrigger.earlySigns}のような小さなサインが先に出ます。`,
        `第二段階で「${secondarySub.short}」が重なると、回復の遅さや局所のこわばりとして残りやすくなります。ここで無理に押し切ると、${symptomLabel}として自覚しやすくなります。`,
        `対策は、症状が強くなってから頑張るよりも、第一段階のサインが出た時点で短く戻すことです。未病ケアとしては、ここが一番費用対効果の高いポイントです。`,
      ],
      bullets: [],
      steps: [
        `1. ${primarySub.short}：${primaryTrigger.earlySigns}`,
        `2. ${secondarySub.short}：${secondaryTrigger.earlySigns}`,
        `3. ${symptomLabel}：${symptomText.flare}`,
      ],
    },
    {
      id: "weather",
      badge: "天気反応",
      title: "天気で崩れやすい日の見分け方",
      teaser: "気圧・気温・湿度の変化を、体質側から読み替えます",
      preview: `${mainWeather}は、あなたの体質では${symptomText.pain}につながる入口になりやすい日です。`,
      body: [
        weather.hasExplicit
          ? `今回のチェックで拾えている天気トリガーは「${selectedWeatherText}」です。特に${mainWeather}は、${mainWeatherNote}`
          : `今回のチェックでは、天気トリガーはまだ明確には絞り込まれていません。まずは${mainWeather}に、${symptomText.bodySign}が強まるかを観察していきます。`,
        `体質側から見ると、「${primarySub.short}」では${primaryTrigger.weather}傾向があります。さらに「${secondarySub.short}」が重なると、${secondaryTrigger.weather}ことも見ておくと実用的です。`,
        `未病レーダーでは、点数だけでなく「何が主因で上がっているか」を見てください。${secondaryWeather ? `${mainWeather}や${secondaryWeather}` : mainWeather}は、予定量・睡眠・食事のどれか1つを軽くする合図として使えます。`,
      ],
      bullets: [
        `回答で拾えた天気軸：${selectedWeatherText}`,
        `出やすいサイン：${symptomText.bodySign}`,
        `先回り：予定量・睡眠・食事のどれか1つを軽くする`,
      ],
      steps: [],
    },
    {
      id: "avoid",
      badge: "控えたいこと",
      title: "合わないケア・逆効果になりやすい行動",
      teaser: "良かれと思って続けている習慣を、体質から見直します",
      preview: `疲れた日の回復法が、今の体質には強すぎる場合があります。${core.title}では、ケアの方向を間違えると${symptomText.pain}が残りやすくなります。`,
      body: [
        `避けたいのは、体の状態より刺激の強さを優先することです。崩れそうな日は「一気に発散する」「強く温める」「甘いもので持ち上げる」などが、かえって負担になる場合があります。`,
        `完全に禁止する必要はありません。ただし未病レーダーのスコアが高い日や、${symptomText.bodySign}が出ている日は、いつものケアを弱める・短くする・翌日に回す判断が合います。`,
        `戻す方向はシンプルです。${resetDirection(primaryTrigger, secondaryTrigger)}`,
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
      id: "season",
      badge: "季節",
      title: "季節ごとの守り方",
      teaser: "一年の中で、先に守る時期を決めます",
      preview: `あなたは「${primarySeason.riskySeason}」に${primarySeason.sign}が出やすい読みです。季節単位で備えると、日々の予報も使いやすくなります。`,
      body: [
        `特に注意したいのは「${primarySeason.riskySeason}」。ここに「${secondarySeason.riskySeason}」の要素も重なると、${symptomLabel}が出やすくなります。`,
        `季節対策は、特別なことを増やすより、崩れやすい時期の1〜2週間前から睡眠・食事・予定量のどれかを軽く守る方が現実的です。`,
        `毎日の未病レーダーは短期の天気図、この章は年間の地図です。両方をつなげると「この時期だけは無理をしない」という判断がしやすくなります。`,
      ],
      bullets: [
        `春：${primarySeason.spring}`,
        `梅雨〜夏：${primarySeason.rainy}`,
        `秋：${primarySeason.autumn}`,
        `冬：${primarySeason.winter}`,
      ],
      steps: [],
    },
    {
      id: "consult",
      badge: "相談メモ",
      title: "鍼灸・整体・漢方相談で伝えるメモ",
      teaser: "相談時に、状態を短く正確に伝えるための整理です",
      preview: `${core.title} × ${symptomLabel}の要点を、相談時に使える形にまとめます。特に${mainWeather}と${symptomText.bodySign}は伝える価値があります。`,
      body: [
        `相談先では、不調名だけでなく「いつ・何で・どこに出るか」を伝えると、状態の共有がしやすくなります。`,
        `あなたの場合、主訴は「${symptomLabel}」。背景には「${primarySub.short}」と「${secondarySub.short}」が重なりやすく、${symptomText.bodySign}をサインとして拾うと説明しやすいです。`,
        `この章は医療機関での診断や治療指示の代わりではありません。セルフケアや施術・漢方相談の場で、自分の状態を短く伝えるためのメモとして使ってください。`,
      ],
      bullets: [
        `一番困っていること：${symptomLabel}。特に「${symptomText.watch}」と感じる。`,
        `出やすい場所・サイン：${symptomText.bodySign}。${lineMemo}`,
        `天気との関係：${mainWeather}に崩れやすい感覚がある。`,
        `体質メモ：${core.title}、${primarySub.short}、${secondarySub.short}の要素が重なりやすい。`,
        `相談したい方向：強い刺激で押し切るより、今の余力に合わせた調整を知りたい。`,
      ],
      steps: [
        `最初の30秒で伝えるなら：「${symptomLabel}で困っています。${mainWeather}や、${symptomText.watch}時に出やすく、${symptomText.bodySign}にサインが出ます。」`,
        `確認したいこと：「今は、補う・巡らせる・温める・潤す・余分な重さを抜く、どの方向を優先するとよさそうですか？」`,
      ],
    },
  ];

  return {
    productName: "パーソナル未病カルテ",
    subtitle: "体質・天気・生活リズムから、崩れ方と先回りケアを整理する個別カルテ",
    coreCode,
    coreTitle: core.title,
    coreShort: core.short,
    symptom,
    symptomLabel,
    primarySub,
    secondarySub,
    mainWeather,
    mainWeatherLabel,
    envVectors,
    heroLead: `${core.title} × ${symptomLabel}の崩れ方を、体質・天気・生活行動の3方向から整理します。医療的な診断ではなく、日々の未病ケアに使うための個別メモです。`,
    sections,
    meta: {
      version: "deterministic-v3",
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

