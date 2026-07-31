// lib/radar_v1/careRules/dailyCareV2.js
// Daily Care v2: forecast logic chooses the care direction; this layer turns it
// into a stable, varied and concise daily action without changing the forecast.

export const DAILY_CARE_LOGIC_VERSION = "daily_care_v2_8_2026-07-31_context_first_lifestyle_care";

// This file is also loaded as a standalone data module by the rule regression
// tests, so keep this small compatibility projection dependency-free here.
function hasExplicitPressureResponseDirection(source = null) {
  return readExplicitPressureResponseDirection(source) !== null;
}

function readExplicitPressureResponseDirection(source = null) {
  const values = typeof source === "string" ? [source] : [
    source?.pressure_response_direction, source?.response_direction, source?.reaction_direction,
    source?.summary?.pressure_response_direction, source?.summary?.reaction_direction,
    source?.forecast?.pressure_response_direction, source?.forecast?.reaction_direction,
    source?.meta?.manifestation?.reaction_direction,
    source?.meta?.personalized_meta?.manifestation?.reaction_direction,
  ];
  return values
    .map((value) => String(value || "").trim().toLowerCase())
    .find((value) => ["accel", "brake", "balanced"].includes(value)) || null;
}

function getLegacyCareTriggerKey(exact, source = null) {
  const key = String(exact || "");
  if (!["pressure_down", "pressure_up", "pressure_shift"].includes(key)) {
    return key || "default";
  }
  const direction = readExplicitPressureResponseDirection(source);
  if (!direction) {
    if (key === "pressure_down" || key === "pressure_up") return key;
    const physical = String(source?.physical_direction || source?.pressure_direction || source?.direction || "");
    if (physical === "down") return "pressure_down";
    if (physical === "up") return "pressure_up";
    return "default";
  }
  return direction === "accel" ? "pressure_up" : direction === "brake" ? "pressure_down" : "default";
}

function rewritePressureBodyCopyDeep(value, source = null) {
  if (!hasExplicitPressureResponseDirection(source)) return value;
  if (typeof value === "string") {
    return value
      .replace(/気圧が急(?:に)?(?:下がる|上がる)/g, "気圧が急に変わる")
      .replace(/気圧が(?:下がる|上がる)/g, "気圧が変わる")
      .replace(/低気圧|高気圧|気圧低下|気圧上昇/g, "気圧変化");
  }
  if (Array.isArray(value)) return value.map((item) => rewritePressureBodyCopyDeep(item, source));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    rewritePressureBodyCopyDeep(item, source),
  ]));
}

const POLICY_DEFINITIONS = {
  shizumeru: { key: "shizumeru", label: "しずめる", short: "高ぶりを落ち着ける", guide: "熱や高ぶりを落ち着ける" },
  yurumeru: { key: "yurumeru", label: "ゆるめる", short: "力みをやわらげる", guide: "力みやこわばりをやわらげる" },
  meguraseru: { key: "meguraseru", label: "めぐらせる", short: "巡りを保つ", guide: "巡りを保つ" },
  nagasu: { key: "nagasu", label: "ながす", short: "重だるさをためない", guide: "重だるさやむくみをためない" },
  uruosu: { key: "uruosu", label: "うるおす", short: "乾きを補う", guide: "乾きと消耗を補う" },
  nukumeru: { key: "nukumeru", label: "ぬくめる", short: "冷えを防ぐ", guide: "冷えを防ぐ" },
  sasaeru: { key: "sasaeru", label: "ささえる", short: "疲れを増やさない", guide: "疲れや消耗を増やさない" },
};

const TRIGGER_LABELS = {
  damp: "湿気",
  humidity: "湿気",
  pressure_down: "気圧低下",
  pressure_up: "気圧上昇",
  cold: "低温",
  heat: "高温",
  dry: "乾燥",
  temp: "寒暖差",
  temp_shift: "寒暖差",
  default: "天気変化",
};

const TRIGGER_POLICY_SCORES = {
  damp: { nagasu: 4.2, meguraseru: 2.1, sasaeru: 0.9 },
  pressure_down: { yurumeru: 1.5, meguraseru: 1.5, sasaeru: 0.8, nagasu: 0.3 },
  pressure_up: { yurumeru: 1.5, meguraseru: 1.5, sasaeru: 0.8, shizumeru: 0.3 },
  temp_shift: { yurumeru: 2.3, sasaeru: 1.4, meguraseru: 1 },
  cold: { nukumeru: 4.2, sasaeru: 2.1, meguraseru: 0.8 },
  heat: { shizumeru: 4.1, uruosu: 1.8, sasaeru: 0.7 },
  dry: { uruosu: 4.2, sasaeru: 1.5, yurumeru: 0.7 },
  default: { sasaeru: 2.4, yurumeru: 1.1 },
};

const SUB_LABEL_POLICY_SCORES = {
  qi_stagnation: { meguraseru: 2.1, yurumeru: 1.3 },
  qi_deficiency: { sasaeru: 2.3, nukumeru: 0.7 },
  blood_deficiency: { sasaeru: 1.6, uruosu: 1.2 },
  blood_stasis: { meguraseru: 1.8, yurumeru: 0.8 },
  dampness: { nagasu: 2.2, meguraseru: 0.8 },
  fluid_damp: { nagasu: 2.2, meguraseru: 0.8 },
  fluid_deficiency: { uruosu: 2.3, sasaeru: 0.8 },
};

const SYMPTOM_POLICY_SCORES = {
  fatigue: { sasaeru: 1.9, nukumeru: 0.6 },
  sleep: { shizumeru: 1.4, yurumeru: 1.1 },
  digestion: { sasaeru: 1.6, nagasu: 0.8 },
  neck_shoulder: { yurumeru: 1.7, meguraseru: 0.6 },
  low_back_pain: { nukumeru: 1.3, sasaeru: 1 },
  swelling: { nagasu: 1.8, meguraseru: 0.6 },
  headache: { yurumeru: 1.2, shizumeru: 1 },
  dizziness: { sasaeru: 1.2, yurumeru: 0.8 },
  mood: { yurumeru: 1.4, meguraseru: 1.2 },
};

const POLICY_PAIR_SUMMARIES = {
  "nagasu+sasaeru": "重だるさをためず、疲れを増やさないように整えます。",
  "nagasu+meguraseru": "重だるさをためず、巡りを保つように整えます。",
  "yurumeru+sasaeru": "力みやこわばりをやわらげ、疲れを増やさないように整えます。",
  "yurumeru+meguraseru": "力みやこわばりをやわらげ、巡りを保つように整えます。",
  "shizumeru+yurumeru": "熱や高ぶりを落ち着け、力みやこわばりをやわらげるように整えます。",
  "nukumeru+sasaeru": "冷えを防ぎ、疲れを増やさないように整えます。",
  "uruosu+sasaeru": "乾きと消耗を補うように整えます。",
};

const ALLOWED_POLICY_PAIRS = new Set(Object.keys(POLICY_PAIR_SUMMARIES));

const MATERIAL_POLICY_SCORES = {
  qi_deficiency: { sasaeru: 1.7, nukumeru: 0.45 },
  qi_stagnation: { yurumeru: 1.35, meguraseru: 1.15 },
  blood_deficiency: { uruosu: 1.25, sasaeru: 0.85 },
  blood_stasis: { meguraseru: 1.35, yurumeru: 0.65 },
  fluid_deficiency: { uruosu: 1.55, sasaeru: 0.55 },
  fluid_damp: { nagasu: 1.55, meguraseru: 0.65 },
};

// 暮らすケアは、身体操作だけでなく「環境を一か所変えて体感差を見る」
// 小さな実験も持つ。単なる健康標語にせず、場面・一手・確認点・戻し方を一組にする。
const ENVIRONMENT_EXPERIMENT_CANDIDATES = [
  {
    id: "env-damp-source-route",
    care_kind: "environment",
    kind_label: "環境を変える",
    scene_family: "air_moisture",
    scene_label: "湿気の通り道",
    scene: "入浴・部屋干し・調理のあとに",
    headline: "湿気の発生源を一つ区切る",
    text: "窓を全部開けるのではなく、浴室の扉を閉める・換気扇を回す・洗濯物を別室へ寄せる、のどれか一つを10分だけ試す",
    reason: "外の湿気まで入れず、室内で増えた水分だけを広げにくくするためです。",
    felt_sense: "同じ室温でも、肌のべたつきや頭の重さが増えなければ合っています。",
    reset: "雨が吹き込む、外気の方が重く感じる時は窓を閉め、換気扇か空気の循環だけに切り替える",
    symptoms: ["digestion", "swelling", "fatigue", "headache", "dizziness"],
    triggers: ["damp"],
    policies: ["nagasu", "sasaeru"],
    item_role: "humidity_control",
    effort: "low",
  },
  {
    id: "env-damp-work-zone",
    care_kind: "environment",
    kind_label: "環境を変える",
    scene_family: "air_moisture",
    scene_label: "過ごす場所",
    scene: "部屋干しや濡れた物が近くにある時は",
    headline: "体ではなく、過ごす位置を先に動かす",
    text: "濡れた物を無理に片づけず、自分の椅子や作業場所をそこから一〜二歩だけ離して10分過ごす",
    reason: "湿気の発生源の近くで、体温調節を続ける時間を短くするためです。",
    felt_sense: "服のまとわりや息苦しさが少し減れば、その距離で十分です。",
    reset: "移動先でも変わらない時は、発生源側へ風を送るか扉を一枚隔てる",
    symptoms: ["fatigue", "mood", "headache", "digestion", "neck_shoulder"],
    triggers: ["damp", "heat"],
    policies: ["nagasu", "shizumeru"],
    item_role: "humidity_control",
    effort: "low",
  },
  {
    id: "env-dry-airflow-line",
    care_kind: "environment",
    kind_label: "環境を変える",
    scene_family: "air_moisture",
    scene_label: "乾いた風",
    scene: "暖房や送風のある部屋では",
    headline: "加湿する前に、風の直線から外れる",
    text: "室温は変えず、顔や首へ風が通る線から椅子を半歩ずらして10分過ごす",
    reason: "部屋全体を変える前に、目・鼻・のどへ直接当たる乾いた風を減らすためです。",
    felt_sense: "まばたきや飲み込む回数が増えず、のどの乾きが進まなければ合っています。",
    reset: "空気が動かず暑く感じる時は、風向きを壁側へ変えて循環だけ残す",
    symptoms: ["headache", "neck_shoulder", "sleep", "fatigue"],
    triggers: ["dry", "cold"],
    policies: ["uruosu", "yurumeru"],
    item_role: "moisture_air",
    effort: "low",
  },
  {
    id: "env-cold-airflow-line",
    care_kind: "environment",
    kind_label: "環境を変える",
    scene_family: "thermal_position",
    scene_label: "風と冷え",
    scene: "冷房や外気で首肩が縮こまる時は",
    headline: "温度ではなく、風の通り道を変える",
    text: "設定温度はそのままにして、椅子を半歩横へずらすか、風向きを壁側へ変えて5分比べる",
    reason: "部屋を暑くせず、同じ場所へ冷気が当たり続ける条件だけを外すためです。",
    felt_sense: "肩を下げようとしなくても、首元の力みが増えなければ合っています。",
    reset: "暑くなる場合は元の位置へ戻し、首元だけ風の線から外す",
    symptoms: ["neck_shoulder", "headache", "low_back_pain", "fatigue"],
    triggers: ["cold", "temp_shift"],
    policies: ["nukumeru", "yurumeru"],
    item_role: "warm_body",
    effort: "low",
  },
  {
    id: "env-cold-floor-contact",
    care_kind: "environment",
    kind_label: "環境を変える",
    scene_family: "thermal_position",
    scene_label: "足元の冷え",
    scene: "座っているのに上半身まで力む時は",
    headline: "室温より先に、足裏の接触を変える",
    text: "足元へ畳んだタオルか薄い敷物を一枚置き、両足を載せた状態と床へ直接置いた状態を3分ずつ比べる",
    reason: "全身を温めすぎず、床から足裏へ続く冷たさだけを切り分けるためです。",
    felt_sense: "足指の踏ん張りや肩のすくみが少ない方を今日の位置にします。",
    reset: "足が蒸れる、姿勢が不安定になる時は敷物を外し、足元の風だけを避ける",
    symptoms: ["fatigue", "low_back_pain", "neck_shoulder", "sleep"],
    triggers: ["cold", "temp_shift"],
    policies: ["nukumeru", "sasaeru"],
    item_role: "warm_body",
    effort: "low",
  },
  {
    id: "env-heat-task-zone",
    care_kind: "environment",
    kind_label: "環境を変える",
    scene_family: "activity_timing",
    scene_label: "熱を足す作業",
    scene: "調理・入浴・外出などでさらに暑くなる前に",
    headline: "作業の前後に、涼しい退避先を一つ作る",
    text: "作業を始める前に、冷房のある部屋・日陰・風の通る場所のどれか一つを決め、終わったら3分そこへ移る",
    reason: "暑い作業を我慢で続けず、体へ入った熱をその場から持ち越さないためです。",
    felt_sense: "作業後の顔のほてりや息の速さが、移動前より落ち着けば十分です。",
    reset: "涼しい場所へ移ってもつらさが続く時は、作業を再開せず安全情報を優先する",
    symptoms: ["fatigue", "headache", "dizziness", "mood", "sleep", "neck_shoulder"],
    triggers: ["heat", "damp"],
    policies: ["shizumeru", "sasaeru"],
    item_role: "cooling_support",
    effort: "low",
  },
  {
    id: "env-heat-input-load",
    care_kind: "environment",
    kind_label: "環境を変える",
    scene_family: "sensory_input",
    scene_label: "熱と情報",
    scene: "暑い場所で画面や音が重なる時は",
    headline: "涼しくする前に、刺激を一つだけ外す",
    text: "照明・通知・音声のうち一つだけを5分止め、室温は変えずに作業を続けてみる",
    reason: "暑さと情報処理を同時に抱えず、落ち着かなさの原因を一つずつ分けるためです。",
    felt_sense: "奥歯を噛む、画面を急いで送る、呼吸が浅くなる動きが減れば合っています。",
    reset: "眠気や作業ミスが増える時は元へ戻し、代わりに作業時間を短く区切る",
    symptoms: ["mood", "headache", "neck_shoulder", "sleep"],
    triggers: ["heat", "pressure_up", "dry"],
    policies: ["shizumeru", "yurumeru"],
    item_role: "reduce_light",
    effort: "low",
  },
  {
    id: "env-pressure-single-input",
    care_kind: "environment",
    kind_label: "環境を変える",
    scene_family: "sensory_input",
    scene_label: "情報の切り替え",
    scene: "気圧が動く日に作業を始めるなら",
    headline: "五分だけ、一画面・一作業にする",
    text: "開いている画面を一つだけ残し、通知を5分止め、その作業が終わるまで別の画面を開かない",
    reason: "気象変化への適応中に、注意の切り替えまで重ねすぎないためです。",
    felt_sense: "次に何をするか探す回数や、肩・あごへ入る力が減れば合っています。",
    reset: "必要な連絡を逃しそうなら通知を戻し、作業時間だけ3分へ短くする",
    symptoms: ["mood", "headache", "neck_shoulder", "fatigue", "dizziness"],
    triggers: ["pressure_down", "pressure_up", "temp_shift"],
    policies: ["yurumeru", "shizumeru", "sasaeru"],
    item_role: "reduce_light",
    effort: "low",
  },
  {
    id: "env-pressure-task-offload",
    care_kind: "environment",
    kind_label: "環境を変える",
    scene_family: "task_transition",
    scene_label: "次の予定",
    scene: "やることが頭の中で重なる時は",
    headline: "次の一件だけを外へ置く",
    text: "次にやることを一件だけ紙へ書き、終わるまでは残りの予定を見ない",
    reason: "予定を減らせない日でも、頭の中で同時に持つ件数を一つへ絞るためです。",
    felt_sense: "作業の途中で別の用事を確認したくなる回数が減れば合っています。",
    reset: "忘れる不安が強い時は予定を全部書き出し、今日見る一件だけに印を付ける",
    symptoms: ["mood", "sleep", "headache", "fatigue"],
    triggers: ["pressure_down", "pressure_up", "temp_shift", "heat"],
    policies: ["shizumeru", "sasaeru"],
    item_role: "task_support",
    effort: "low",
  },
  {
    id: "env-digestion-transition",
    care_kind: "environment",
    kind_label: "環境を変える",
    scene_family: "meal_transition",
    scene_label: "食後の切り替え",
    scene: "食後すぐ座り続けやすい時は",
    headline: "運動を足さず、片づけの間だけ立つ",
    text: "食後に運動を始めるのではなく、食器を戻す・飲み物を用意する間だけ立ち、終わったら座る",
    reason: "新しい運動課題を増やさず、食後の座りっぱなしだけを短く切るためです。",
    felt_sense: "席へ戻った時、胃の圧迫感や眠気が増えなければ今日の量として十分です。",
    reset: "立つと気分が悪い、ふらつく時はすぐ座り、上体を丸めない位置だけ探す",
    symptoms: ["digestion", "fatigue", "swelling"],
    excluded_symptoms: ["dizziness"],
    triggers: ["damp", "pressure_down", "cold"],
    policies: ["nagasu", "meguraseru", "sasaeru"],
    item_role: "meal_transition",
    effort: "low",
  },
  {
    id: "env-sleep-screen-exit",
    care_kind: "environment",
    kind_label: "環境を変える",
    scene_family: "sleep_transition",
    scene_label: "眠る前の境目",
    scene: "寝る前まで画面や予定が続く時は",
    headline: "寝床へ入る前に、画面の終点を作る",
    text: "明日の用事を一件だけ紙へ移し、充電場所へ端末を置いてから寝床へ移る",
    reason: "眠ろうとしてから情報を切るのではなく、部屋の移動を作業終了の合図にするためです。",
    felt_sense: "寝床で端末を取り直す回数や、予定を思い返す回数が減れば合っています。",
    reset: "端末が必要な時は手の届く場所に置き、画面を伏せて通知だけ止める",
    symptoms: ["sleep", "mood", "headache", "fatigue"],
    triggers: ["pressure_up", "heat", "dry", "temp_shift"],
    policies: ["shizumeru", "sasaeru"],
    item_role: "sleep_environment",
    effort: "low",
    modes: ["tomorrow"],
  },
];

// 水分・休憩・着替えなどの基礎ケアは重要だが、毎日の主役にはしない。
// 強い天気ストレスまたは余力が小さい日に、三つ目の補助案としてだけ使う。
const FOUNDATION_LIFESTYLE_CANDIDATES = [
  {
    id: "foundation-heat-break",
    care_kind: "foundation",
    kind_label: "土台を守る",
    scene_family: "safety_heat",
    scene_label: "暑さの安全",
    scene: "暑さが強い時間をまたぐなら",
    headline: "予定より先に、休む場所を決める",
    text: "外出や家事を始める前に、途中で座れる涼しい場所を一つ決めておく",
    reason: "つらくなってから探さず、早めに中断できる場所を先に確保するためです。",
    felt_sense: "休憩を後回しにせず、決めた場所へ移れれば十分です。",
    reset: "涼しい場所でも体調が戻らない時は、予定を続けず安全情報を優先する",
    triggers: ["heat"],
    policies: ["shizumeru", "sasaeru"],
    item_role: "cooling_support",
    effort: "low",
  },
  {
    id: "foundation-dry-sip",
    care_kind: "foundation",
    kind_label: "土台を守る",
    scene_family: "safety_moisture",
    scene_label: "乾きの補給",
    scene: "乾きや暑さが強い日は",
    headline: "渇き切る前の一回を決める",
    text: "次の作業を始める前に飲み物を数口取り、飲んだことを確認してから動く",
    reason: "一度に多く飲む課題を増やさず、補給を忘れる時間だけを短くするためです。",
    felt_sense: "作業の途中で強い渇きに気づく回数が減れば十分です。",
    reset: "飲水量に制限がある場合は、普段の指示を優先する",
    triggers: ["dry", "heat"],
    policies: ["uruosu", "sasaeru"],
    item_role: "moisture_air",
    effort: "low",
  },
  {
    id: "foundation-damp-change",
    care_kind: "foundation",
    kind_label: "土台を守る",
    scene_family: "safety_moisture",
    scene_label: "湿った衣服",
    scene: "汗や雨で服が湿った時は",
    headline: "全身ではなく、首元か背中を乾いた状態へ戻す",
    text: "着替えられない時も、首元か背中の濡れた部分を一か所だけ拭くか乾いた布へ替える",
    reason: "体温調節を続ける面積を、できる範囲から小さくするためです。",
    felt_sense: "服が肌へ貼りつく場所が一か所減れば十分です。",
    reset: "寒気が強い時は濡れた服のままにせず、安全に着替えられる場所を優先する",
    triggers: ["damp", "heat", "cold"],
    policies: ["nagasu", "nukumeru", "sasaeru"],
    item_role: "humidity_control",
    effort: "low",
  },
  {
    id: "foundation-cold-guard",
    care_kind: "foundation",
    kind_label: "土台を守る",
    scene_family: "safety_temperature",
    scene_label: "冷えの保護",
    scene: "冷えが強く、動き始めにくい時は",
    headline: "首元・お腹・足首から一か所だけ守る",
    text: "三か所すべてを厚着せず、最も冷たく感じる一か所へ薄い一枚を足す",
    reason: "汗ばむほど温めず、冷えが入り続ける場所だけを先に減らすためです。",
    felt_sense: "五分後に寒さを我慢する力が少し減れば、その一枚で十分です。",
    reset: "汗ばむ、のぼせる時はすぐ外し、室温や風向きを先に調整する",
    triggers: ["cold", "temp_shift"],
    policies: ["nukumeru", "sasaeru"],
    item_role: "warm_body",
    effort: "low",
  },
  {
    id: "foundation-reserve-pause",
    care_kind: "foundation",
    kind_label: "土台を守る",
    scene_family: "safety_reserve",
    scene_label: "余力の確保",
    scene: "今日は余力を使い切りやすい時は",
    headline: "休憩ではなく、中断地点を先に決める",
    text: "家事や作業を始める前に、一区切りにする場所を一つ決め、そこまで来たら一度手を止める",
    reason: "疲れてから休むのではなく、続けすぎる流れそのものを短くするためです。",
    felt_sense: "まだ動ける段階で、一度手を止められればできています。",
    reset: "区切れない作業は、始める量を半分へ減らす",
    triggers: ["pressure_down", "pressure_up", "temp_shift", "damp", "heat", "cold", "dry"],
    policies: ["sasaeru"],
    styles: ["reserve_small"],
    item_role: "rest_support",
    effort: "low",
  },
];

// 身体OSは候補選定の内部根拠として保持する。この配列に含まれる説明は
// 画面へ直接出さず、下の PUBLIC_ACTION_COPY_BY_ID で日常語へ翻訳する。
const BODY_MECHANICS_INTERNAL_CANDIDATES = [
  {
    id: "tension-open-palm-carry",
    scene_family: "holding",
    scene: "コップや小さな物を持つ時は",
    headline: "手の中をつぶさず包む",
    text: "指で握り込まず、手のひらに小さな空間を残して、親指の付け根から前腕の親指側までを長く保つ",
    reason: "物の重さを前腕だけで止めず、体の中心へ受け渡しやすくするためです。",
    felt_sense: "前腕より足裏へ重さが伝わる感じがあれば十分です。",
    reset: "肩や手首が重くなるなら、いったん置いて手の空間を作り直す",
    symptoms: ["neck_shoulder", "headache", "fatigue", "low_back_pain", "mood"],
    triggers: ["pressure_up", "heat", "dry", "temp_shift"],
    policies: ["yurumeru", "sasaeru", "shizumeru"],
    styles: ["accel"],
    item_role: "open_grip",
    effort: "low",
  },
  {
    id: "tension-little-finger-thumb-line",
    scene_family: "holding",
    scene: "バッグや取っ手を持つなら",
    headline: "小指側をたたみ、親指側を長くする",
    text: "小指側の指を軽くたたみ、親指の付け根は握り込まず、橈骨側が腕の先まで伸びる形で持つ",
    reason: "手首と前腕の外側へ力を集めず、母指側の長さを正中の支えへつなぐためです。",
    felt_sense: "ひじが固まらず、肩を動かせる余白が残れば十分です。",
    reset: "親指の付け根が縮むなら、持つ位置か荷物の量を変える",
    symptoms: ["neck_shoulder", "fatigue"],
    triggers: ["pressure_up", "heat", "dry"],
    policies: ["yurumeru", "sasaeru"],
    styles: ["accel"],
    item_role: "handle_support",
    effort: "low",
  },
  {
    id: "tension-load-to-ground",
    scene_family: "carrying",
    scene: "少し重さのある物を持つ場面では",
    headline: "腕で持たず、足元へ重さを通す",
    text: "物を包む手の空間を残し、頭は上へ、重さは内くるぶしの真下へ落ちる向きを保ってから動く",
    reason: "腕・肩・腰を重さの終点にせず、正中側から地面へ荷重を流すためです。",
    felt_sense: "物は持っていても、腕の存在感が少し薄くなれば十分です。",
    reset: "肩や腰が先に重くなるなら、いったん置いて足元から作り直す",
    symptoms: ["fatigue", "neck_shoulder", "low_back_pain", "swelling"],
    triggers: ["damp", "pressure_down", "cold", "heat"],
    policies: ["sasaeru", "nagasu", "yurumeru"],
    styles: ["brake", "reserve_small"],
    item_role: "carry_support",
    effort: "medium",
  },
  {
    id: "tension-fixed-object-turn",
    scene_family: "pantomime",
    scene: "物を持ったまま向きを変える時は",
    headline: "手先を止め、体の付け根から動く",
    text: "持った物を空間に置いたつもりで位置を保ち、手首で回さず、ひじ・肩・胸・足の順に体側を動かす",
    reason: "末端だけで操作せず、停止した手先に対して体の中心側を動かすためです。",
    felt_sense: "手先の位置を保ったまま、ひじや肩が自由に動けば十分です。",
    reset: "手首が先に曲がるなら、物を軽くするか両手で試す",
    symptoms: ["neck_shoulder", "low_back_pain", "fatigue"],
    triggers: ["temp_shift", "pressure_down", "pressure_up", "cold"],
    policies: ["yurumeru", "sasaeru", "meguraseru"],
    item_role: "rotation_support",
    effort: "low",
  },
  {
    id: "tension-phone-thumb-line",
    scene_family: "screen",
    scene: "スマホを見る時間があるなら",
    headline: "親指の付け根を縮めない",
    text: "手のひらを端末へ貼りつけず、小指側で軽く支えて、親指の付け根から前腕の親指側を長くしたまま操作する",
    reason: "親指と手首の収縮だけで操作せず、腕の内側へ伸張を残すためです。",
    felt_sense: "親指を動かしても、前腕と肩が固まらなければ十分です。",
    reset: "親指の付け根が詰まるなら、端末を置くか反対の手へ替える",
    symptoms: ["neck_shoulder", "headache", "mood", "sleep"],
    triggers: ["dry", "heat", "pressure_up"],
    policies: ["yurumeru", "shizumeru"],
    styles: ["accel"],
    item_role: "phone_height",
    effort: "low",
  },
  {
    id: "tension-screen-head-up",
    scene_family: "screen",
    scene: "画面から顔を上げる時は",
    headline: "あごではなく頭の奥を上へ伸ばす",
    text: "あごを持ち上げず、目頭の奥と首の前側が天井へ伸びるつもりで、胸郭の上へ頭を戻す",
    reason: "首の後ろだけを縮めず、頭と体幹の間に長さを保つためです。",
    felt_sense: "あごや後頭部に力を入れず、視線が正面へ戻れば十分です。",
    reset: "首の後ろが詰まるなら、動きを小さくして目線だけ先に戻す",
    symptoms: ["neck_shoulder", "headache", "mood", "sleep", "dizziness"],
    triggers: ["pressure_up", "dry", "heat", "temp_shift"],
    policies: ["yurumeru", "shizumeru", "sasaeru"],
    styles: ["accel"],
    item_role: "screen_height",
    effort: "low",
  },
  {
    id: "tension-wall-axis",
    scene_family: "axis_training",
    scene: "安定した壁の前に立てるなら",
    headline: "壁と地面の間に体を通す",
    text: "手のひら中央をふわっと浮かせるつもりで壁へ触れ、腕で押さず、内くるぶしの真下から頭頂までを長くする",
    reason: "手の力で壁を動かすのではなく、壁と地面の間へ正中の支えを通すためです。",
    felt_sense: "腕の力より、足裏から手までが一本につながる感じがあれば十分です。",
    reset: "手首や肩へ圧が集まるなら、壁へ近づいて押す強さを下げる",
    symptoms: ["neck_shoulder", "low_back_pain", "fatigue", "mood"],
    triggers: ["pressure_down", "temp_shift", "cold"],
    policies: ["sasaeru", "yurumeru", "meguraseru"],
    styles: ["brake"],
    item_role: "grounding_support",
    effort: "medium",
  },
  {
    id: "tension-inner-ankle-stand",
    scene_family: "standing_axis",
    scene: "立ったまま待つ時間があるなら",
    headline: "内くるぶしの真下へ重さを落とす",
    text: "足裏を固めず、内側アーチが静かにたわむ範囲で、内くるぶしの真下へ重さを預け、頭は上へ長く保つ",
    reason: "外側の脚や腰で踏ん張らず、足の内側から体幹深部へ支えをつなぐためです。",
    felt_sense: "足裏はやわらかいまま、上半身が少し軽く感じられれば十分です。",
    reset: "足指を握るなら、重さを減らして両足へ戻す",
    symptoms: ["swelling", "fatigue", "low_back_pain", "digestion", "mood"],
    triggers: ["damp", "pressure_down", "cold"],
    policies: ["sasaeru", "nagasu", "meguraseru"],
    styles: ["brake", "reserve_small"],
    item_role: "standing_support",
    effort: "low",
  },
  {
    id: "tension-supported-one-leg",
    scene_family: "balance_training",
    scene: "安定した机や壁へ手を添えられるなら",
    headline: "片足で内側の軸を探す",
    text: "支えへ指を添え、片足を少し浮かせて、立っている足の内くるぶし直下へ重さが落ちる位置を10秒だけ探す",
    reason: "強く踏ん張らず、足裏から体幹へ続く内側の張力を感じ分けるためです。",
    felt_sense: "足指で床をつかまずに立てれば十分です。",
    reset: "ぐらつく時は足をすぐ着き、両足で同じ位置を探す",
    symptoms: ["swelling", "fatigue", "low_back_pain"],
    excluded_symptoms: ["dizziness"],
    triggers: ["damp", "pressure_down", "cold"],
    policies: ["sasaeru", "meguraseru"],
    styles: ["brake", "batt_large"],
    item_role: "balance_training",
    effort: "training",
  },
  {
    id: "tension-walk-center-first",
    scene_family: "walking",
    scene: "数歩だけ歩き方を試せるなら",
    headline: "足で蹴らず、体の中心を先へ出す",
    text: "みぞおちの少し下を先へ運び、倒れそうになる直前に足が自然についてくる歩幅で進む",
    reason: "足で地面を蹴って進まず、重心線の移動から歩行を始めるためです。",
    felt_sense: "蹴る力が小さく、足音が静かになれば十分です。",
    reset: "急いだり不安定になるなら、歩幅を半分にして両足で止まる",
    symptoms: ["fatigue", "swelling", "low_back_pain", "mood", "digestion"],
    excluded_symptoms: ["dizziness"],
    triggers: ["damp", "pressure_down", "cold", "temp_shift"],
    policies: ["meguraseru", "nagasu", "sasaeru"],
    styles: ["brake"],
    item_role: "walking_support",
    effort: "medium",
  },
  {
    id: "tension-seated-foot-head",
    scene_family: "seated_axis",
    scene: "座ったまま一度整えるなら",
    headline: "足は下、頭は上へ離す",
    text: "足裏を床へ預け、内くるぶしの真下へ重さを落としながら、目頭の奥から頭頂を上へ長くする",
    reason: "腰や首を固めず、下向きと上向きの伸張で正中の長さを作るためです。",
    felt_sense: "背筋を力ませず、みぞおち周りに余白ができれば十分です。",
    reset: "腰を反らすなら、頭の高さを欲張らず足裏だけを感じる",
    symptoms: ["dizziness", "digestion", "sleep", "fatigue", "headache", "mood"],
    triggers: ["pressure_down", "pressure_up", "damp", "temp_shift"],
    policies: ["sasaeru", "shizumeru", "yurumeru"],
    styles: ["reserve_small", "brake"],
    item_role: "sitting_support",
    effort: "low",
  },
  {
    id: "tension-sit-stand-innerline",
    scene_family: "sit_stand",
    scene: "椅子から立つ場面では",
    headline: "内くるぶしの上へ体を運ぶ",
    text: "足を軽く引き、頭を上へ長く保ったまま、みぞおち下を足の上へ移してから自然に立つ",
    reason: "太ももや腰で持ち上げず、重心線を足の内側へ移して立つためです。",
    felt_sense: "脚で強く蹴らず、お尻が座面から離れれば十分です。",
    reset: "太ももが力むなら、足を少し近づけて動きを小さくする",
    symptoms: ["fatigue", "low_back_pain", "digestion", "swelling"],
    excluded_symptoms: ["dizziness"],
    triggers: ["damp", "pressure_down", "cold"],
    policies: ["sasaeru", "meguraseru", "nukumeru"],
    styles: ["brake", "reserve_small"],
    item_role: "sit_to_stand",
    effort: "medium",
  },
  {
    id: "tension-stairs-center-up",
    scene_family: "stairs",
    scene: "階段を使う場面では",
    headline: "後ろ足で蹴らず、中心を上へ運ぶ",
    text: "前の足へ内くるぶし側から重さを預け、頭を上へ長くしたまま、みぞおち下を次の段へ運ぶ",
    reason: "ふくらはぎや太ももだけで蹴り上がらず、正中の移動から上るためです。",
    felt_sense: "後ろ足の蹴りが小さく、前の足へ静かに乗れれば十分です。",
    reset: "息が上がる、ふらつく、膝へ集まる時は通常の上り方へ戻す",
    symptoms: ["fatigue", "swelling", "low_back_pain"],
    excluded_symptoms: ["dizziness"],
    triggers: ["damp", "cold", "pressure_down"],
    policies: ["sasaeru", "meguraseru"],
    styles: ["batt_large"],
    item_role: "step_support",
    effort: "training",
  },
  {
    id: "tension-reach-thumb-line",
    scene_family: "reaching",
    scene: "少し先の物へ手を伸ばす時は",
    headline: "指先で取りに行かず、母指側を長くする",
    text: "親指の付け根を縮めず、鎖骨の下から橈骨、母指球までが一本に伸びるつもりで手を届かせる",
    reason: "肩や手首だけを前へ出さず、胸郭から手先までの張力を連続させるためです。",
    felt_sense: "肩がすくまず、ひじを固めずに届けば十分です。",
    reset: "肩が上がるなら、一歩近づいて伸ばす距離を短くする",
    symptoms: ["neck_shoulder", "headache", "fatigue"],
    triggers: ["pressure_up", "dry", "heat", "temp_shift"],
    policies: ["yurumeru", "sasaeru"],
    styles: ["accel"],
    item_role: "reach_support",
    effort: "low",
  },
  {
    id: "tension-floor-object-axis",
    scene_family: "reaching",
    scene: "床の物を取る場面では",
    headline: "手を下げず、体の中心を近づける",
    text: "親指側の長さを保ち、手先で床へ引っ張られず、足を寄せて股関節から体の中心を物へ近づける",
    reason: "手と腰だけを縮めず、正中の長さを保ったまま高さを変えるためです。",
    felt_sense: "腰より足裏と股関節へ動きが分かれれば十分です。",
    reset: "腰へ重さが集まるなら、片膝を着くか道具を使う",
    symptoms: ["low_back_pain", "fatigue", "neck_shoulder"],
    excluded_symptoms: ["dizziness"],
    triggers: ["cold", "pressure_down", "damp"],
    policies: ["sasaeru", "yurumeru"],
    styles: ["brake"],
    item_role: "reach_support",
    effort: "medium",
  },
  {
    id: "tension-door-origin-move",
    scene_family: "fixed_endpoint",
    scene: "扉や引き出しを動かす時は",
    headline: "取っ手を止め、体の方を動かす",
    text: "手の中の空間を残して取っ手へ触れ、手首で引かず、足と骨盤を後ろへ移して体側から動かす",
    reason: "停止部を手先に置き、起始側から動くことで腕の局所収縮を減らすためです。",
    felt_sense: "手首の角度を変えず、足の移動で扉が動けば十分です。",
    reset: "握りが強くなるなら、両手を使うか体を取っ手へ近づける",
    symptoms: ["neck_shoulder", "low_back_pain", "fatigue"],
    triggers: ["cold", "pressure_down", "temp_shift"],
    policies: ["sasaeru", "yurumeru"],
    item_role: "grip_support",
    effort: "low",
  },
  {
    id: "tension-mop-fixed-end",
    scene_family: "fixed_endpoint",
    scene: "モップやワイパーを使うなら",
    headline: "道具の先を置き、体を歩かせる",
    text: "道具の先を床へ置いたまま、腕で振らず、親指側を長く保って足・骨盤・胸を小さく移動する",
    reason: "手先を動かす仕事から、停止した道具に対して体側を動かす仕事へ変えるためです。",
    felt_sense: "肩を振らず、足の移動で道具が進めば十分です。",
    reset: "前腕が張るなら、柄を長くして一歩の幅を小さくする",
    symptoms: ["neck_shoulder", "low_back_pain", "fatigue"],
    triggers: ["damp", "heat", "pressure_down"],
    policies: ["sasaeru", "yurumeru", "nagasu"],
    styles: ["reserve_small"],
    item_role: "long_handle_support",
    effort: "medium",
  },
  {
    id: "tension-kitchen-open-grip",
    scene_family: "kitchen",
    scene: "包丁や調理道具を持つ時は",
    headline: "柄を握り潰さず、手の中に空間を残す",
    text: "小指側を軽くたたみ、親指の付け根と手のひら中央をつぶさず、前腕の親指側を長く保つ",
    reason: "握力と手首だけに頼らず、手から体幹へ張力をつなげたまま扱うためです。",
    felt_sense: "刃先や道具を扱っても、肩とひじが固まらなければ十分です。",
    reset: "滑る、扱いにくい、力が必要な時は安全を優先して通常の持ち方へ戻す",
    symptoms: ["neck_shoulder", "fatigue"],
    triggers: ["pressure_up", "dry", "heat"],
    policies: ["yurumeru", "sasaeru"],
    styles: ["accel"],
    item_role: "open_grip",
    effort: "low",
  },
  {
    id: "tension-laundry-axis",
    scene_family: "carrying",
    scene: "洗濯かごなどを運ぶなら",
    headline: "かごを抱えず、正中へ重さを通す",
    text: "指を握り込まずにかごを包み、頭を上へ、内くるぶしの真下を下へ伸ばしてから歩き始める",
    reason: "腕と腰へ荷重をためず、上下に伸びる正中側を通して地面へ逃がすためです。",
    felt_sense: "かごの重さより、足裏への圧を先に感じられれば十分です。",
    reset: "肩や腰が重いなら、量を分けるか床を転がす",
    symptoms: ["fatigue", "low_back_pain", "swelling", "neck_shoulder"],
    triggers: ["damp", "heat", "pressure_down"],
    policies: ["sasaeru", "nagasu"],
    styles: ["reserve_small", "brake"],
    item_role: "carry_support",
    effort: "medium",
  },
  {
    id: "tension-bed-long-roll",
    scene_family: "bed",
    scene: "寝床で向きを変える時は",
    headline: "体を折らず、長いまま転がる",
    text: "頭は上、足は下、親指側は遠くへ伸びる向きを保ち、肩だけを先に回さず体全体を一緒に転がす",
    reason: "首・腰・肩の一部を折り目にせず、正中の長さを保ったまま向きを変えるためです。",
    felt_sense: "肩や腰をねじらず、体が一つの筒のように転がれば十分です。",
    reset: "腰や首へ引っかかりを感じるなら、膝を曲げて動きを小さくする",
    symptoms: ["sleep", "low_back_pain", "fatigue", "neck_shoulder", "dizziness"],
    triggers: ["cold", "pressure_down", "temp_shift"],
    policies: ["sasaeru", "yurumeru", "nukumeru"],
    styles: ["reserve_small", "brake"],
    item_role: "sleep_turning",
    effort: "low",
  },
  {
    id: "tension-head-sky-line",
    scene_family: "head_axis",
    scene: "頭や気分が詰まる感じがある時は",
    headline: "目頭の奥から頭を上へ伸ばす",
    text: "あごを引き込まず、目頭の奥と耳の内側が頭頂へ向かうつもりで、首の前側に長さを作る",
    reason: "後頭部やあごを固めず、頭部を正中の上向きの伸張へ戻すためです。",
    felt_sense: "目やあごへ力を入れず、頭の位置が少し高くなれば十分です。",
    reset: "目や首が疲れるなら、動かさず足裏の感覚だけへ戻る",
    symptoms: ["headache", "mood", "sleep", "neck_shoulder", "dizziness"],
    triggers: ["pressure_up", "dry", "heat", "temp_shift"],
    policies: ["shizumeru", "yurumeru", "sasaeru"],
    styles: ["accel"],
    item_role: "reduce_light",
    effort: "low",
  },
  {
    id: "tension-palm-axis-reset",
    scene_family: "hand_training",
    scene: "手や肩が縮こまっていると感じたら",
    headline: "朝顔の手で母指側を開く",
    text: "小指側を軽くたたみ、手のひら中央をふわっと浮かせ、親指から橈骨側を遠くへ伸ばす",
    reason: "母指側を力で開かず、小指側との拮抗を使って腕の内側へ長さを作るためです。",
    felt_sense: "指先を力ませず、ひじと肩が動かしやすくなれば十分です。",
    reset: "指がつる、前腕が張る時は握る強さを半分以下にする",
    symptoms: ["neck_shoulder", "headache", "mood", "fatigue"],
    triggers: ["pressure_up", "dry", "heat"],
    policies: ["yurumeru", "shizumeru"],
    styles: ["accel"],
    item_role: "hand_training",
    effort: "low",
  },
];

// 場面は九つの基本動作へまとめ、その中で具体操作を日替わりにする。
// 「モップ」「洗濯かご」などの個別家事は場面名にせず、操作の例として内部へ残す。
const LIFESTYLE_SCENE_DEFINITIONS = {
  hold_carry: {
    label: "持つ・運ぶ",
    scene: "物を持つ・運ぶ時は",
  },
  push_pull_turn: {
    label: "押す・引く・回す",
    scene: "物を押す・引く・回す時は",
  },
  reach_take: {
    label: "手を伸ばす・物を取る",
    scene: "手を伸ばして物を取る時は",
  },
  bend_height: {
    label: "かがむ・高さを変える",
    scene: "かがむ・高さを変える時は",
  },
  sit_rise: {
    label: "立つ・座る・起き上がる",
    scene: "立つ・座る・起き上がる時は",
  },
  walk_step: {
    label: "歩く・段差を移動する",
    scene: "歩く・段差を移動する時は",
  },
  screen_handwork: {
    label: "手作業・画面操作",
    scene: "手作業や画面操作が続く時は",
  },
  hold_posture: {
    label: "同じ姿勢で待つ・作業する",
    scene: "同じ姿勢で待つ・作業する時は",
  },
  lie_turn: {
    label: "横になる・寝返る",
    scene: "横になる・寝返る時は",
  },
};

// ここには解剖・経絡・筋膜・武術の専門語を置かない。
// 一つの候補は「場面」ではなく、場面内で選ぶ具体操作のバリエーション。
const PUBLIC_ACTION_COPY_BY_ID = {
  "tension-open-palm-carry": {
    scene_family: "hold_carry",
    scene: "コップやボトルなどをしばらく持つ時は",
    symptoms: ["neck_shoulder", "fatigue"],
    headline: "手のひらと物の間に隙間を残す",
    text: "指先で強く握り込まず、手のひらと物の間に少し隙間が残る強さで持つ",
    reason: "指と手首だけへ力を集めずに持つためです。",
    felt_sense: "指の関節が白くならず、手首がまっすぐならできています。",
    reset: "指の関節が白くなるほど握っていたら、いったん置いて持つ強さを半分にする",
  },
  "tension-little-finger-thumb-line": {
    scene_family: "hold_carry",
    scene: "買い物袋やバケツなど、細い取っ手を持つ時は",
    symptoms: ["neck_shoulder", "fatigue"],
    headline: "取っ手を指の付け根側へ掛ける",
    text: "取っ手を指先へ掛けず、指の付け根側へ深く掛け、親指は上から軽く添える",
    reason: "細い取っ手を指先だけでつかみ続けないためです。",
    felt_sense: "取っ手が指の第一関節へ食い込まず、手首がまっすぐならできています。",
    reset: "手首が曲がる、片方の肩が上がる場合は、荷物を分けるか反対の手へ持ち替える",
  },
  "tension-load-to-ground": {
    scene_family: "hold_carry",
    scene: "少し重い荷物を両手で運び始める時は",
    symptoms: ["fatigue", "neck_shoulder", "low_back_pain", "swelling"],
    headline: "荷物を体の正面へ寄せてから歩く",
    text: "荷物を両手で持ち、へそより下の高さで体の正面へ寄せてから歩き始める",
    reason: "片方の腕や腰だけで重さを支え続けないためです。",
    felt_sense: "左右の肩の高さがそろい、上体を横へ傾けず歩ければできています。",
    reset: "片方の肩が上がる、腰が横へ曲がる場合は、荷物を小分けにする",
  },
  "tension-fixed-object-turn": {
    scene_family: "push_pull_turn",
    scene: "荷物を持ったまま向きを変える時は",
    symptoms: ["neck_shoulder", "low_back_pain"],
    headline: "手首をひねらず、足の向きを変える",
    text: "持った物を胸の前に保ち、手首をひねらず、行きたい方向へ足を踏み替えて体ごと向きを変える",
    reason: "手首や腰だけをひねって方向を変えないためです。",
    felt_sense: "物と胸が同じ方向を向いたまま移動できればできています。",
    reset: "手首か腰だけが先に回る場合は、歩幅を小さくして足をもう一度踏み替える",
  },
  "tension-phone-thumb-line": {
    scene_family: "screen_handwork",
    scene: "スマホを片手で操作する時間が続く時は",
    symptoms: ["neck_shoulder", "headache"],
    headline: "片手で握り続けず、両手で下側を支える",
    text: "スマホの下側を両手で支え、親指が画面の端まで届かない操作は、持ち替えるか反対の手で行う",
    reason: "一方の親指だけを大きく動かし続けないためです。",
    felt_sense: "親指を画面の端へ伸ばしても、手首が外側へ曲がらなければできています。",
    reset: "手首が曲がる、親指の付け根が痛む場合は、机へ置いて操作する",
  },
  "tension-screen-head-up": {
    scene_family: "screen_handwork",
    scene: "スマホやパソコンの画面を見る時間が続く時は",
    symptoms: ["neck_shoulder", "headache"],
    headline: "画面の上端を目の高さへ近づける",
    text: "椅子を机へ近づけ、画面の上端が目の高さ付近に来るよう位置を変えてから作業する",
    reason: "画面を見るために首を下へ曲げ続けないためです。",
    felt_sense: "正面を見た時、耳が肩のほぼ真上にあればできています。",
    reset: "画面へ顔を近づける、あごが前へ出る場合は、文字を大きくして画面を近づける",
  },
  "tension-wall-axis": {
    scene_family: "screen_handwork",
    scene: "キーボードやマウスを使い続ける時は",
    symptoms: ["neck_shoulder", "headache", "fatigue"],
    headline: "ひじを体の近くへ置き、前腕を机へ載せる",
    text: "椅子を机へ近づけ、ひじを体の横へ置き、前腕の手首寄りではなく、ひじ寄りの部分を机へ載せる",
    reason: "浮かせた腕を肩だけで支え続けないためです。",
    felt_sense: "手首を上下へ曲げずに、キーやマウスへ手が届けばできています。",
    reset: "肩が上がる場合は椅子を高くし、足が床から離れる場合は足元へ台を置く",
    item_role: "forearm_support",
    effort: "low",
  },
  "tension-inner-ankle-stand": {
    scene_family: "hold_posture",
    scene: "台所や洗面所で立ち続ける時は",
    symptoms: ["low_back_pain", "fatigue", "swelling"],
    headline: "足裏の三か所へ体重を分ける",
    text: "両足を腰幅に開き、かかと・親指の付け根・小指の付け根の三か所を床につけて立つ",
    reason: "かかとや足の外側だけへ体重を集めないためです。",
    felt_sense: "足指が床をつかむように曲がらず、三か所が床へ着いていればできています。",
    reset: "足指で床をつかむ、膝を伸ばし切る場合は、膝を少しゆるめて両足を置き直す",
  },
  "tension-supported-one-leg": {
    scene_family: "hold_posture",
    scene: "レジ待ちや立ち仕事が続く時は",
    symptoms: ["low_back_pain", "fatigue", "swelling"],
    headline: "片足を半歩前へ出し、前後を入れ替える",
    text: "片足を半歩前へ出して両足を床につけ、数分ごとに前後の足を入れ替える",
    reason: "同じ脚と腰だけで立ち続けないためです。",
    felt_sense: "腰を横へ突き出さず、左右どちらの足も床へ着いていればできています。",
    reset: "片方の膝を伸ばし切る、腰が横へずれる場合は、両足を横に並べて立ち直す",
    excluded_symptoms: [],
    styles: ["brake", "reserve_small"],
    item_role: "standing_support",
    effort: "low",
  },
  "tension-walk-center-first": {
    scene_family: "walk_step",
    scene: "歩き始めの足取りが重い時は",
    symptoms: ["fatigue", "swelling", "low_back_pain"],
    headline: "歩幅を小さくし、足を体の真下へ着く",
    text: "最初の五歩だけ歩幅を普段より小さくし、前へ伸ばした足ではなく、体の真下へ来た足へ体重を移す",
    reason: "後ろ足で強く蹴って歩き始めないためです。",
    felt_sense: "靴音が小さく、頭の高さが上下に跳ねなければできています。",
    reset: "前へ倒れそうになる、歩く速度が上がる場合は、いったん止まって通常の歩幅へ戻す",
  },
  "tension-seated-foot-head": {
    scene_family: "hold_posture",
    scene: "椅子に座った作業が続く時は",
    symptoms: ["low_back_pain", "fatigue"],
    headline: "両足裏と左右のお尻を着ける",
    text: "両足裏を膝の真下へ置き、左右のお尻へ同じくらい体重が掛かる位置まで座り直す",
    reason: "片方の腰や背もたれだけへ体重を預け続けないためです。",
    felt_sense: "足を組まず、左右の肩の高さがそろえばできています。",
    reset: "片方のお尻が浮く、足裏が床から離れる場合は、椅子の奥行きか高さを調整する",
  },
  "tension-sit-stand-innerline": {
    scene_family: "sit_rise",
    scene: "椅子から立ち上がる時は",
    symptoms: ["low_back_pain", "fatigue"],
    headline: "足を膝の真下へ引き、鼻をつま先の上へ移す",
    text: "両足を膝の真下へ引き、鼻がつま先の上へ来るまで上体を前へ移してから立つ",
    reason: "腰を反らせたり、勢いをつけたりせずに立つためです。",
    felt_sense: "かかとが床へ着いたまま、お尻が座面から離れればできています。",
    reset: "かかとが浮く、後ろへ戻る場合は、足をもう少し椅子側へ引く",
  },
  "tension-stairs-center-up": {
    scene_family: "walk_step",
    scene: "階段を上る時は",
    symptoms: ["fatigue", "low_back_pain", "swelling"],
    headline: "前の足裏を段へ置いてから上る",
    text: "前の足はつま先だけでなく足裏全体を段へ置き、胸を前の膝の上へ移してから後ろ足を上げる",
    reason: "後ろ足のつま先だけで体を押し上げないためです。",
    felt_sense: "前のかかとが浮かず、後ろ足を強く蹴らずに上がれればできています。",
    reset: "膝が内側へ入る、ふらつく場合は、手すりを使って通常の上り方へ戻す",
    effort: "medium",
  },
  "tension-reach-thumb-line": {
    scene_family: "reach_take",
    scene: "棚の奥や高い所の物を取る時は",
    symptoms: ["neck_shoulder", "low_back_pain"],
    headline: "ひじが少し曲がる距離まで近づく",
    text: "先に一歩近づき、手が物へ届いた時に、ひじが伸び切らず少し曲がる距離から取る",
    reason: "腕と肩だけを遠くへ伸ばして取らないためです。",
    felt_sense: "肩が耳へ近づかず、両足が床へ着いたまま取れればできています。",
    reset: "ひじが伸び切る、片足が浮く場合は、もう一歩近づく",
  },
  "tension-floor-object-axis": {
    scene_family: "bend_height",
    scene: "床にある物を拾う時は",
    symptoms: ["low_back_pain", "fatigue"],
    headline: "物を両足の間へ置いてから、膝を曲げる",
    text: "物の近くまで歩き、物が両足の間に来る位置で、片足を半歩前へ出して膝と股関節を曲げる",
    reason: "腰だけを曲げ、腕を遠くへ伸ばして拾わないためです。",
    felt_sense: "物を持つ手が膝より外へ離れず、両足が床へ着いていればできています。",
    reset: "腰が丸まる、手が足元から離れる場合は、片膝を床へ着ける",
  },
  "tension-door-origin-move": {
    scene_family: "push_pull_turn",
    scene: "重い扉や引き出しを開ける時は",
    symptoms: ["neck_shoulder", "low_back_pain"],
    headline: "ひじを少し曲げたまま、足を一歩動かす",
    text: "取っ手の近くへ立ち、ひじを少し曲げて持ち、引く方向へ片足を一歩動かして体ごと移動する",
    reason: "手首と腕だけで取っ手を引かないためです。",
    felt_sense: "手首の角度が変わらず、足の移動と一緒に扉が動けばできています。",
    reset: "ひじが伸び切る、手首が曲がる場合は、取っ手へ半歩近づく",
  },
  "tension-mop-fixed-end": {
    scene_family: "push_pull_turn",
    scene: "モップや掃除機を前後に動かす時は",
    symptoms: ["neck_shoulder", "low_back_pain", "fatigue"],
    headline: "道具を腕で振らず、前後へ一歩ずつ動く",
    text: "持ち手をへその前に置き、ひじを軽く曲げたまま、道具を進める方向へ足を一歩ずつ動かす",
    reason: "肩と腰を左右へ繰り返しひねらないためです。",
    felt_sense: "持ち手が体の正面から大きく外れず、足と一緒に道具が動けばできています。",
    reset: "持ち手が体の横へ外れる、腰だけが回る場合は、掃除する幅を半分にする",
  },
  "tension-kitchen-open-grip": {
    scene_family: "screen_handwork",
    scene: "まな板や器を使う手作業が続く時は",
    symptoms: ["neck_shoulder", "low_back_pain", "fatigue"],
    headline: "道具を体の正面へ置き、ひじを体の近くへ置く",
    text: "まな板や器を台の手前へ寄せ、作業する手のひじを体の横へ置ける距離で使う",
    reason: "腕を前へ伸ばしたまま、道具を使い続けないためです。",
    felt_sense: "肩が上がらず、ひじが体の横から前へ大きく離れなければできています。",
    reset: "肩が上がる、腰が台へ触れる場合は、道具の位置か立つ位置を変える",
  },
  "tension-laundry-axis": {
    scene_family: "hold_carry",
    scene: "洗濯かごや買い物袋を運ぶ時は",
    symptoms: ["fatigue", "low_back_pain", "swelling", "neck_shoulder"],
    headline: "一度に持たず、左右へ重さを分ける",
    text: "中身を二つへ分け、左右の手に一つずつ持ち、腕を体の横へ近づけて運ぶ",
    reason: "片側の肩と腰だけへ重さを集めないためです。",
    felt_sense: "左右の肩の高さがそろい、腰を横へ曲げずに歩ければできています。",
    reset: "片方の荷物が膝へ当たる、肩が上がる場合は、中身をさらに減らす",
  },
  "tension-bed-long-roll": {
    scene_family: "lie_turn",
    scene: "寝床で寝返る時は",
    symptoms: ["sleep", "low_back_pain", "neck_shoulder"],
    headline: "両膝を曲げ、膝と肩を同じ方向へ動かす",
    text: "両膝を曲げてそろえ、膝を倒す方向へ顔と両肩も一緒に向けて寝返る",
    reason: "腰か首だけを先にひねって寝返らないためです。",
    felt_sense: "左右の膝が離れず、肩と骨盤がほぼ同時に向きを変えればできています。",
    reset: "腰だけが先に回る場合は、膝を胸側へ少し近づけて動きを小さくする",
  },
  "tension-head-sky-line": {
    scene_family: "screen_handwork",
    scene: "画面や人へ顔を向け直す時は",
    symptoms: ["neck_shoulder", "headache"],
    headline: "目だけで追わず、胸ごと見たい方向へ向ける",
    text: "先に見たい方向へ視線を向け、次に胸の正面が同じ方向へ向くまで足か椅子を動かす",
    reason: "目と首だけを横へ向け続けないためです。",
    felt_sense: "鼻と胸の正面がほぼ同じ方向を向けばできています。",
    reset: "首だけが横へ向く、片方の肩が前へ残る場合は、足か椅子をもう少し回す",
  },
  "tension-palm-axis-reset": {
    scene_family: "screen_handwork",
    scene: "スマホや道具を握る時間が続いた時は",
    symptoms: ["neck_shoulder", "headache", "fatigue"],
    headline: "道具を置き、手のひらを太ももへ載せる",
    text: "いったん道具を置き、手のひらを太ももへ載せ、指を開く・閉じる動きをゆっくり三回行う",
    reason: "同じ握り方を長く続けないためです。",
    felt_sense: "三回目に、指を閉じても爪が手のひらへ食い込まなければできています。",
    reset: "指がつる、痛みが出る場合は、指を動かさず手のひらを載せるだけにする",
    item_role: "grip_support",
  },
};

const BODY_MECHANICS_LIFESTYLE_CANDIDATES = BODY_MECHANICS_INTERNAL_CANDIDATES.map((candidate) => {
  const publicCopy = PUBLIC_ACTION_COPY_BY_ID[candidate.id] || {};
  const sceneDefinition = LIFESTYLE_SCENE_DEFINITIONS[publicCopy.scene_family] || null;
  return {
    ...candidate,
    ...publicCopy,
    care_kind: "body",
    kind_label: "身体の使い方",
    scene_family: publicCopy.scene_family || candidate.scene_family || candidate.id,
    scene_label: sceneDefinition?.label || "",
    scene: publicCopy.scene || sceneDefinition?.scene || candidate.scene || "",
  };
});


const FOOD_IDEAS = {
  damp: [
    { id: "damp-soba", label: "温かいそば＋大根おろし・しそを少し", note: "汁気で食べやすく、香りで重さをためずに通します。", tags: ["light", "aroma", "quick"] },
    { id: "damp-onigiri", label: "おにぎり＋茶碗蒸し＋温かいお茶", note: "主食とたんぱく質を小さくそろえ、胃腸へ荷物を積みすぎません。", tags: ["light", "support", "quick"] },
    { id: "damp-chicken", label: "蒸し鶏と夏野菜＋少量のごはん", note: "油を控えながら、余力を支える材料は残します。", tags: ["support", "light", "home"] },
    { id: "damp-oat", label: "だしで煮たオートミール＋卵・小ねぎ", note: "やわらかく温かい形で、食後の重さを残しにくくします。", tags: ["digestion", "quick", "support"] },
    { id: "damp-fish", label: "白身魚の蒸し物＋大根・柑橘＋ごはん少なめ", note: "軽いたんぱく質に香りを添え、強く発散せず巡りを助けます。", tags: ["aroma", "light", "home"] },
  ],
  pressure_down: [
    { id: "pd-rice", label: "小さめのおにぎり＋具だくさんの汁物", note: "食事を抜かず、あとで動き出せる軽さに整えます。", tags: ["support", "light", "quick"] },
    { id: "pd-soba", label: "温かいそば＋焼きのり・ねぎ", note: "頭と胃腸が重い日に、量を増やさず温かさと香りを足します。", tags: ["aroma", "light", "quick"] },
    { id: "pd-fish", label: "焼き魚＋大根おろし＋ごはん少なめ", note: "脂っこさを重ねず、午後まで持つ材料をそろえます。", tags: ["support", "home"] },
    { id: "pd-chawan", label: "茶碗蒸し＋梅のおにぎり", note: "食欲が揺れる時でも、やわらかく小さく入りやすい組み合わせです。", tags: ["digestion", "quick"] },
    { id: "pd-soup", label: "鶏と大根のスープ＋少量のごはん", note: "汁気を使い、胃腸の動きが遅い日にも重さを残しにくくします。", tags: ["support", "digestion"] },
  ],
  pressure_up: [
    { id: "pu-fish", label: "焼き魚定食を、ごはん少なめ・味つけ薄めで", note: "刺激で押さず、食事のリズムを落ち着けます。", tags: ["support", "calm"] },
    { id: "pu-chicken", label: "蒸し鶏＋温野菜＋柑橘を少し", note: "油と辛味を増やさず、香りだけで詰まりをほどきます。", tags: ["aroma", "light", "calm"] },
    { id: "pu-soba", label: "そば＋大根おろし＋焼きのり", note: "濃い味や早食いへ寄りにくく、軽く区切りやすい一食です。", tags: ["light", "quick"] },
    { id: "pu-tofu", label: "豆腐ときのこのスープ＋少量のごはん", note: "熱と力みを足さず、胃腸へ静かな燃料を入れます。", tags: ["calm", "digestion"] },
    { id: "pu-onigiri", label: "おにぎり＋ゆで卵＋常温の飲み物", note: "忙しい時も、カフェインだけで前のめりになる流れを止めます。", tags: ["quick", "support"] },
  ],
  cold: [
    { id: "cold-porridge", label: "しょうがを少量入れた卵雑炊", note: "内側を冷やさず、やわらかい形で余力を支えます。", tags: ["warm", "digestion", "support"] },
    { id: "cold-udon", label: "鶏と根菜の温かいうどん", note: "温かさと材料を一皿にまとめ、動き出す燃料を足します。", tags: ["warm", "support", "quick"] },
    { id: "cold-salmon", label: "ごはん＋焼き鮭＋根菜の味噌汁", note: "冷えで縮こまりやすい日に、食事を抜かず土台を作ります。", tags: ["warm", "support", "home"] },
    { id: "cold-pot", label: "豆腐と鶏肉の小鍋＋ごはん少なめ", note: "熱くしすぎず、温かい汁気でお腹を守ります。", tags: ["warm", "digestion"] },
    { id: "cold-chawan", label: "茶碗蒸し＋温かいおにぎり茶漬け", note: "食欲が弱い時も、冷たさを入れず少量から始められます。", tags: ["warm", "light", "quick"] },
  ],
  heat: [
    { id: "heat-shabu", label: "冷やしすぎない豚しゃぶ＋ごはん少なめ", note: "熱をこもらせず、冷たい物だけで胃腸を止めない組み合わせです。", tags: ["cool", "support", "home"] },
    { id: "heat-soba", label: "常温に近いそば＋大根おろし・すだち", note: "香りと軽さを使い、辛味や油で火を足しません。", tags: ["cool", "aroma", "quick"] },
    { id: "heat-fish", label: "白身魚の蒸し物＋トマトを少し＋ごはん", note: "軽いたんぱく質を残しながら、暑さに合わせて熱を足しすぎません。", tags: ["cool", "light", "home"] },
    { id: "heat-tofu", label: "冷蔵庫から少し置いた豆腐＋おにぎり＋汁物少量", note: "冷えすぎを避けつつ、食欲がない時も材料を小さくそろえます。", tags: ["cool", "quick", "digestion"] },
    { id: "heat-chicken", label: "蒸し鶏ときゅうり・トマト＋常温の飲み物", note: "汗で消耗しやすい日に、刺激を増やさず支えます。", tags: ["cool", "support"] },
  ],
  dry: [
    { id: "dry-soup", label: "鶏と大根のとろみスープ＋ごはん", note: "汁気を食事として取り、乾きと消耗を一緒に見ます。", tags: ["moist", "support", "digestion"] },
    { id: "dry-tofu", label: "豆腐と卵のスープ＋白ごま", note: "やわらかい材料と汁気で、乾いた物だけの一食を避けます。", tags: ["moist", "quick"] },
    { id: "dry-fish", label: "白身魚の煮つけ＋青菜＋ごはん", note: "乾燥で削れやすい日に、汁気と養う材料をそろえます。", tags: ["moist", "support", "home"] },
    { id: "dry-porridge", label: "きのこ卵がゆ＋ねぎを少し", note: "食べやすい形で、胃腸へ負担を増やさずうるおいを補います。", tags: ["moist", "digestion", "quick"] },
    { id: "dry-udon", label: "とろろ昆布うどん＋卵", note: "汁気を増やしながら、食事抜きや乾いた菓子だけを避けます。", tags: ["moist", "quick", "support"] },
  ],
  default: [
    { id: "base-set", label: "ごはん＋汁物＋卵か魚を一つ", note: "食材を増やすより、主食・汁気・たんぱく質を小さくそろえます。", tags: ["support", "home"] },
    { id: "base-quick", label: "おにぎり＋茶碗蒸し＋飲み物", note: "忙しい時も、甘い物やカフェインだけで済ませない組み合わせです。", tags: ["quick", "light"] },
    { id: "base-soba", label: "温かいそば＋大根おろし・ねぎ", note: "量を増やさず、温かさと香りを足します。", tags: ["quick", "aroma"] },
    { id: "base-chicken", label: "蒸し鶏と温野菜＋少量のごはん", note: "油を控えながら、回復に使う材料は残します。", tags: ["support", "light"] },
    { id: "base-soup", label: "豆腐と青菜のとろみスープ＋ごはん", note: "汁気とやわらかさを足し、乾いた物だけの食事を避けます。", tags: ["moist", "digestion"] },
    { id: "base-aroma", label: "白身魚＋大根おろし・しそ＋ごはん少なめ", note: "軽さを保ちながら、香りを小さな巡りのきっかけにします。", tags: ["aroma", "light"] },
  ],
};


// 「何を足すか」と同じ重みで、「今日は何を重ねないか」を選ぶ。
// 一般栄養学の禁止リストではなく、食性・天候・体質・ケア方針が
// 同時に負担を増やしやすい組み合わせを、日ごとに一つだけ提示する。
const FOOD_SUBTRACTION_IDEAS = {
  damp: [
    {
      id: "damp-cold-sweet",
      label: "冷たい甘い飲み物を、食事や間食に重ねない",
      reason: "冷たさと濃い甘味が重なると、湿気の日の重さを胃腸へ残しやすくなります。",
      policies: ["nagasu", "sasaeru"],
      subLabels: ["dampness", "痰湿"],
      symptoms: ["digestion", "swelling"],
      compound: true,
    },
    {
      id: "damp-fried-dessert",
      label: "揚げ物のあとに、甘いデザートまで続けない",
      reason: "油と濃い甘味を続けると、体の中へ湿った重さを上乗せしやすい日です。",
      policies: ["nagasu"],
      subLabels: ["dampness", "痰湿"],
      compound: true,
    },
    {
      id: "damp-bread-dairy",
      label: "菓子パンと冷たい乳製品だけで一食を終えない",
      reason: "甘さ・油・冷たさが一度に重なると、食後の動き出しが鈍くなりやすくなります。",
      policies: ["nagasu", "sasaeru"],
      symptoms: ["fatigue", "digestion"],
      compound: true,
    },
    {
      id: "damp-raw-only",
      label: "サラダや冷たい麺だけで一食を終えない",
      reason: "湿気の日に冷たい物だけで済ませると、軽くしたつもりでも胃腸の働きを落としやすくなります。",
      policies: ["sasaeru", "nagasu"],
      subLabels: ["qi_deficiency", "気虚"],
      symptoms: ["digestion", "fatigue"],
      reserveRisk: true,
    },
    {
      id: "damp-overdrink",
      label: "湿気対策の茶や水を、一気に大量に流し込まない",
      reason: "水はけを急いでも、余力が小さい日は胃腸が疲れて、かえって重さを残すことがあります。",
      policies: ["sasaeru", "nagasu"],
      subLabels: ["qi_deficiency", "気虚", "fluid_deficiency", "津液不足"],
      reserveRisk: true,
    },
  ],
  pressure_down: [
    {
      id: "pd-skip-caffeine",
      label: "食事を抜いて、カフェインだけで押し切らない",
      reason: "低気圧の日に空腹のまま無理に起こすと、あとから疲れと胃の重さが重なりやすくなります。",
      policies: ["sasaeru"],
      subLabels: ["qi_deficiency", "気虚"],
      symptoms: ["fatigue", "dizziness", "digestion"],
      reserveRisk: true,
    },
    {
      id: "pd-fried-sweet",
      label: "揚げ物と甘いものを、一度にまとめて入れない",
      reason: "動きが鈍い日に油と甘味を重ねると、食後の重さを長く引きずりやすくなります。",
      policies: ["nagasu", "sasaeru"],
      symptoms: ["digestion", "fatigue"],
      compound: true,
    },
    {
      id: "pd-alcohol-fat",
      label: "お酒を飲みながら、脂っこいものを続けない",
      reason: "巡りが落ちやすい日に、酒と油を重ねると、眠りや翌朝の重さへ持ち越しやすくなります。",
      policies: ["yurumeru", "nagasu"],
      symptoms: ["sleep", "headache"],
      compound: true,
    },
    {
      id: "pd-late-full",
      label: "夜遅い食事で、満腹まで食べない",
      reason: "低気圧で処理の速度が落ちる日は、遅い時間の食べすぎが翌朝まで残りやすくなります。",
      policies: ["sasaeru"],
      symptoms: ["digestion", "sleep"],
      reserveRisk: true,
    },
    {
      id: "pd-cold-only",
      label: "冷たい飲み物と軽食だけで、一日をつながない",
      reason: "軽く済ませても、冷たさと材料不足が重なると、余力をさらに削りやすくなります。",
      policies: ["sasaeru", "nukumeru"],
      subLabels: ["qi_deficiency", "気虚", "blood_deficiency", "血虚"],
      reserveRisk: true,
    },
  ],
  pressure_up: [
    {
      id: "pu-spice-coffee",
      label: "辛いもののあとに、コーヒーを重ねない",
      reason: "辛味とカフェインを続けると、前のめりな熱と緊張をさらに上乗せしやすくなります。",
      policies: ["shizumeru", "yurumeru"],
      subLabels: ["qi_stagnation", "気滞"],
      symptoms: ["mood", "sleep", "headache"],
      compound: true,
    },
    {
      id: "pu-fast-salty",
      label: "濃い味の食事を、急いでかき込まない",
      reason: "気持ちが前へ出やすい日に、濃い味と早食いが重なると、張りつめたまま食事を終えやすくなります。",
      policies: ["yurumeru", "shizumeru"],
      symptoms: ["mood", "digestion", "headache"],
      compound: true,
    },
    {
      id: "pu-alcohol-salty",
      label: "アルコールと塩辛いものを、同じ時間帯に重ねない",
      reason: "熱と乾きを足しやすい組み合わせで、のぼせや眠りの浅さへつながりやすくなります。",
      policies: ["shizumeru", "uruosu"],
      symptoms: ["sleep", "headache"],
      compound: true,
    },
    {
      id: "pu-sweet-only",
      label: "空腹を、甘いものだけで埋めない",
      reason: "一度は動けても、そのあとに気分とエネルギーの波を大きくしやすい食べ方です。",
      policies: ["sasaeru", "shizumeru"],
      subLabels: ["qi_deficiency", "気虚"],
      symptoms: ["mood", "fatigue"],
      reserveRisk: true,
    },
    {
      id: "pu-hot-spice",
      label: "熱々の料理へ、強い辛味をさらに足さない",
      reason: "熱い温度と辛味が重なると、体の上側へ熱と力みを集めやすくなります。",
      policies: ["shizumeru"],
      subLabels: ["qi_stagnation", "気滞"],
      symptoms: ["headache", "mood"],
      compound: true,
    },
  ],
  cold: [
    {
      id: "cold-iced-raw",
      label: "冷たい飲み物と生ものだけで、一食を終えない",
      reason: "外からの冷えに食事の冷たさが重なると、胃腸の動きも鈍くなりやすくなります。",
      policies: ["nukumeru", "sasaeru"],
      symptoms: ["digestion", "fatigue"],
      compound: true,
    },
    {
      id: "cold-empty-coffee",
      label: "空腹のまま、コーヒーだけで動き始めない",
      reason: "冷えた朝に燃料を入れず刺激だけ足すと、あとから疲れや胃の不快感が出やすくなります。",
      policies: ["sasaeru", "nukumeru"],
      subLabels: ["qi_deficiency", "気虚"],
      symptoms: ["fatigue", "digestion"],
      reserveRisk: true,
    },
    {
      id: "cold-night-ice",
      label: "夜遅くに、アイスや冷たい乳製品を重ねない",
      reason: "眠る前に内側まで冷やすと、翌朝のだるさや胃の重さへ持ち越しやすくなります。",
      policies: ["nukumeru", "sasaeru"],
      symptoms: ["sleep", "digestion"],
      compound: true,
    },
    {
      id: "cold-salad-only",
      label: "サラダだけで一食を済ませない",
      reason: "量は軽くても寒涼に偏ると、冷えやすい日は回復に使う火まで弱めやすくなります。",
      policies: ["nukumeru", "sasaeru"],
      subLabels: ["qi_deficiency", "気虚", "blood_deficiency", "血虚"],
      reserveRisk: true,
    },
    {
      id: "cold-force-sweat",
      label: "強い辛味で、無理に汗を出そうとしない",
      reason: "一時的に温まっても、余力が小さい日は発散しすぎて冷え戻りを招くことがあります。",
      policies: ["sasaeru", "nukumeru"],
      subLabels: ["qi_deficiency", "気虚"],
      reserveRisk: true,
    },
  ],
  heat: [
    {
      id: "heat-spice-alcohol",
      label: "辛い料理とアルコールを、同じ食事に重ねない",
      reason: "暑さに辛味と酒の熱が加わると、のぼせや乾き、寝苦しさを増やしやすくなります。",
      policies: ["shizumeru", "uruosu"],
      symptoms: ["sleep", "headache", "mood"],
      compound: true,
    },
    {
      id: "heat-ice-gulp",
      label: "キンキンの飲み物を、一気に流し込まない",
      reason: "表面は涼しくても、急な冷たさで胃腸の動きを止めると、食後の重さが残りやすくなります。",
      policies: ["sasaeru", "shizumeru"],
      symptoms: ["digestion", "fatigue"],
      reserveRisk: true,
    },
    {
      id: "heat-fried-strong",
      label: "揚げ物へ、濃い味や辛味をさらに足さない",
      reason: "油・濃味・辛味はどれも熱をこもらせやすく、暑い日の負担を三重にしやすい組み合わせです。",
      policies: ["shizumeru", "nagasu"],
      compound: true,
    },
    {
      id: "heat-cold-only",
      label: "冷たい麺や飲み物だけで、一食を終えない",
      reason: "冷やすことだけに寄ると、汗で削れた材料を補えず、あとからだるさが出やすくなります。",
      policies: ["sasaeru", "uruosu"],
      subLabels: ["qi_deficiency", "気虚", "fluid_deficiency", "津液不足"],
      symptoms: ["fatigue", "dizziness"],
      reserveRisk: true,
    },
    {
      id: "heat-energy-caffeine",
      label: "暑さ疲れを、エナジードリンクや濃いコーヒーだけで押さない",
      reason: "刺激で一時的に動けても、熱と消耗を重ね、余力の反動を大きくしやすくなります。",
      policies: ["sasaeru", "shizumeru"],
      subLabels: ["qi_deficiency", "気虚", "fluid_deficiency", "津液不足"],
      symptoms: ["fatigue", "mood", "sleep"],
      reserveRisk: true,
    },
  ],
  dry: [
    {
      id: "dry-snack-coffee",
      label: "乾いた菓子を、コーヒーだけで流し込まない",
      reason: "乾いた食感とカフェインが重なると、のどや胃への水分補給が追いつきにくくなります。",
      policies: ["uruosu", "sasaeru"],
      subLabels: ["fluid_deficiency", "津液不足"],
      symptoms: ["fatigue", "digestion"],
      compound: true,
    },
    {
      id: "dry-spice-roast",
      label: "辛いもの・焼きすぎたもの・濃い塩味を重ねない",
      reason: "乾かす方向の食性が重なると、口やのどの乾きが強まり、気分の余裕も減りやすくなります。",
      policies: ["uruosu", "shizumeru"],
      subLabels: ["fluid_deficiency", "津液不足", "blood_deficiency", "血虚"],
      compound: true,
    },
    {
      id: "dry-alcohol-caffeine",
      label: "アルコールのあとに、カフェインで押し切らない",
      reason: "どちらも乾きと睡眠の浅さを重ねやすく、翌日の消耗へつながりやすい組み合わせです。",
      policies: ["uruosu", "sasaeru"],
      symptoms: ["sleep", "headache"],
      compound: true,
    },
    {
      id: "dry-water-only",
      label: "水分だけ取って、食事を抜かない",
      reason: "水だけでは、乾燥で消耗した体を養う材料までは補えません。",
      policies: ["sasaeru", "uruosu"],
      subLabels: ["qi_deficiency", "気虚", "blood_deficiency", "血虚"],
      symptoms: ["fatigue", "dizziness"],
      reserveRisk: true,
    },
    {
      id: "dry-fried-snack",
      label: "揚げ物やスナック菓子を、間を空けず続けない",
      reason: "油と乾いた食感が続くと、うるおいを補うより先に重さと乾きを増やしやすくなります。",
      policies: ["uruosu", "nagasu"],
      compound: true,
    },
  ],
  default: [
    {
      id: "base-skip-stimulant",
      label: "食事を抜いて、甘いものやカフェインだけでつながない",
      reason: "刺激だけで動くと、体調の波が読みにくい日に余力の上下を大きくしやすくなります。",
      policies: ["sasaeru", "shizumeru"],
      subLabels: ["qi_deficiency", "気虚"],
      symptoms: ["fatigue", "mood"],
      reserveRisk: true,
    },
    {
      id: "base-late-full",
      label: "夜遅くに、満腹まで食べない",
      reason: "回復へ切り替える時間に処理の仕事を増やすと、翌朝へ重さを持ち越しやすくなります。",
      policies: ["sasaeru"],
      symptoms: ["sleep", "digestion"],
      reserveRisk: true,
    },
    {
      id: "base-fried-sweet",
      label: "揚げ物と甘いものを、一度に重ねない",
      reason: "油と濃い甘味を同時に入れると、胃腸へ重い荷物をまとめて渡す食べ方になります。",
      policies: ["nagasu", "sasaeru"],
      symptoms: ["digestion", "fatigue"],
      compound: true,
    },
    {
      id: "base-cold-only",
      label: "冷たい飲み物だけで、食事を済ませない",
      reason: "一時的に軽くても、内側を冷やしながら材料不足を重ねやすい食べ方です。",
      policies: ["nukumeru", "sasaeru"],
      symptoms: ["digestion", "fatigue"],
      reserveRisk: true,
    },
  ],
};

const FOOD_SUBTRACTION_PAIR_IDEAS = {
  "damp+heat": [
    {
      id: "pair-damp-heat-triple",
      label: "辛い料理・揚げ物・冷たい甘い飲み物を、一度に重ねない",
      reason: "暑さで熱を足し、湿気で重さを残す組み合わせです。冷たさで打ち消そうとしても胃腸へ負担が集まります。",
      policies: ["shizumeru", "nagasu", "sasaeru"],
      compound: true,
    },
    {
      id: "pair-damp-heat-noodle-ice",
      label: "冷たい麺だけで終えたあと、アイスまで続けない",
      reason: "暑さには涼しく感じても、冷たさと甘味が湿気の重さを胃腸へ残しやすくなります。",
      policies: ["nagasu", "sasaeru"],
      symptoms: ["digestion", "fatigue"],
      compound: true,
    },
  ],
  "cold+damp": [
    {
      id: "pair-cold-damp-dairy-bread",
      label: "冷たい乳製品と甘いパンを、朝食の中心にしない",
      reason: "冷え・甘味・油分が重なると、湿った重さを動かす力まで弱めやすくなります。",
      policies: ["nukumeru", "nagasu", "sasaeru"],
      symptoms: ["fatigue", "digestion"],
      compound: true,
    },
    {
      id: "pair-cold-damp-raw-sweet",
      label: "生もの・冷たい飲み物・甘味を、一食に重ねない",
      reason: "寒涼と甘味が重なると、冷えと湿気の両方を内側へ持ち込みやすくなります。",
      policies: ["nukumeru", "nagasu"],
      compound: true,
    },
  ],
  "dry+heat": [
    {
      id: "pair-dry-heat-spice-alcohol",
      label: "辛い焼き物とアルコールを、同じ食事に重ねない",
      reason: "熱を足しながら水分を削る組み合わせで、のどの乾きや寝苦しさを強めやすくなります。",
      policies: ["shizumeru", "uruosu"],
      compound: true,
    },
    {
      id: "pair-dry-heat-snack-coffee",
      label: "乾いた菓子を、冷たいコーヒーで流し込まない",
      reason: "暑さで消耗している日に、乾いた物とカフェインを重ねると、うるおいと余力の両方を削りやすくなります。",
      policies: ["uruosu", "sasaeru"],
      reserveRisk: true,
      compound: true,
    },
  ],
  "cold+dry": [
    {
      id: "pair-cold-dry-snack",
      label: "冷たい飲み物と乾いた菓子だけで、食事を済ませない",
      reason: "冷えで動きを落とし、乾いた食事でうるおいも足せない組み合わせです。",
      policies: ["nukumeru", "uruosu", "sasaeru"],
      reserveRisk: true,
      compound: true,
    },
  ],
  "damp+pressure_down": [
    {
      id: "pair-damp-pd-rebound",
      label: "食事を抜いた反動で、揚げ物と甘いものをまとめて入れない",
      reason: "低気圧で動きが鈍いところへ、湿った重さを一気に積む食べ方になりやすい日です。",
      policies: ["nagasu", "sasaeru"],
      symptoms: ["fatigue", "digestion"],
      reserveRisk: true,
      compound: true,
    },
  ],
  "heat+pressure_up": [
    {
      id: "pair-heat-pu-stimulants",
      label: "辛いもの・カフェイン・アルコールを、同じ時間帯に重ねない",
      reason: "暑さと気圧上昇で前のめりになりやすい日に、熱と刺激を三重に足す組み合わせです。",
      policies: ["shizumeru", "yurumeru", "uruosu"],
      symptoms: ["mood", "sleep", "headache"],
      compound: true,
    },
  ],
};

const POLICY_FOOD_SUBTRACTION_IDEAS = {
  sasaeru: [
    {
      id: "policy-support-skip",
      label: "食事を抜いて、刺激だけで動こうとしない",
      reason: "余力を守りたい日は、カフェインや甘味で一時的に上げるより、小さくても材料を入れる方が反動を減らせます。",
      policies: ["sasaeru"],
      subLabels: ["qi_deficiency", "気虚", "blood_deficiency", "血虚"],
      symptoms: ["fatigue", "dizziness"],
      reserveRisk: true,
    },
  ],
  nagasu: [
    {
      id: "policy-drain-heavy-stack",
      label: "冷たい・甘い・脂っこいを、一度に重ねない",
      reason: "重さを逃がしたい日に、湿った荷物を三つまとめて積まないための引き算です。",
      policies: ["nagasu"],
      subLabels: ["dampness", "痰湿"],
      compound: true,
    },
  ],
  meguraseru: [
    {
      id: "policy-move-force",
      label: "辛味やお酒で、無理に巡らせようとしない",
      reason: "詰まりを動かしたい日でも、強い発散は余力まで一緒に削ることがあります。",
      policies: ["meguraseru", "sasaeru"],
      subLabels: ["qi_stagnation", "気滞", "qi_deficiency", "気虚"],
      reserveRisk: true,
    },
  ],
  yurumeru: [
    {
      id: "policy-release-fast-eating",
      label: "画面や仕事を見ながら、急いで食べない",
      reason: "力みをほどきたい日は、食事中まで頭と体を働かせ続けないことも大切な引き算です。",
      policies: ["yurumeru"],
      symptoms: ["mood", "neck_shoulder", "digestion"],
    },
  ],
  shizumeru: [
    {
      id: "policy-calm-stimulant",
      label: "辛味・カフェイン・アルコールを、続けて重ねない",
      reason: "高ぶりをしずめたい日に、熱と刺激を追加し続けないための引き算です。",
      policies: ["shizumeru"],
      symptoms: ["mood", "sleep", "headache"],
      compound: true,
    },
  ],
  nukumeru: [
    {
      id: "policy-warm-cold-stack",
      label: "冷たい飲み物と生ものを、同じ食事に重ねない",
      reason: "温めたい日に、食事から冷たさを二重に入れないための引き算です。",
      policies: ["nukumeru"],
      symptoms: ["digestion", "fatigue"],
      compound: true,
    },
  ],
  uruosu: [
    {
      id: "policy-moist-dry-stack",
      label: "乾いた菓子とカフェインだけで、空腹をつながない",
      reason: "うるおしたい日に、乾かす食感と飲み物を重ねないための引き算です。",
      policies: ["uruosu", "sasaeru"],
      subLabels: ["fluid_deficiency", "津液不足", "blood_deficiency", "血虚"],
      compound: true,
    },
  ],
};

const MERIDIAN_LINE_CARE = {
  lung_li: {
    id: "line-lung-li",
    title: "首・鎖骨ラインをひらく",
    action: "鎖骨の下を内側から肩先へ、服の上からゆっくり3往復する",
    reason: "呼吸が浅い時や首肩に力が集まる時の、体質上の入口です。",
  },
  heart_si: {
    id: "line-heart-si",
    title: "肩甲骨〜小指側をゆるめる",
    action: "反対の手で肩甲骨の外側から腕の小指側を、痛くない範囲でゆっくりなでる",
    reason: "頭の使いすぎや睡眠の乱れが、肩から腕へ残りやすいラインです。",
  },
  kidney_bl: {
    id: "line-kidney-bl",
    title: "背中〜足元の土台を守る",
    action: "腰へ手を当てて温めたあと、ふくらはぎの後ろを手のひらでゆっくりなでる",
    reason: "冷えや消耗が、背中・腰・脚の後ろへ出やすいラインです。",
  },
  liver_gb: {
    id: "line-liver-gb",
    title: "体側の張りを逃がす",
    action: "脇腹へ手を当て、息を吐きながら外ももまで手のひらでゆっくりなでる",
    reason: "気分の詰まりや緊張が、体側と脚の内外側へ表れやすいラインです。",
  },
  spleen_st: {
    id: "line-spleen-st",
    title: "お腹〜すねの前面を支える",
    action: "お腹へ手を置いて呼吸したあと、太もも前からすねを手のひらで軽くなでる",
    reason: "胃腸の疲れや湿気の重さが、体の前面へ出やすいラインです。",
  },
  pc_sj: {
    id: "line-pc-sj",
    title: "腕の外側から熱と力みを逃がす",
    action: "手首から肩の外側へ、反対の手でゆっくり3往復なでる",
    reason: "上半身の熱や緊張が、腕と肩へ逃げ場を探しやすいラインです。",
  },
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniq(values) {
  return Array.from(new Set(safeArray(values).filter(Boolean)));
}

export function normalizeDailyCareTrigger(value) {
  const key = String(value || "").trim();
  if (key === "humidity") return "damp";
  if (key === "temp") return "cold";
  return TRIGGER_POLICY_SCORES[key] ? key : "default";
}

export function stableCareHash(value) {
  const text = String(value || "");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function dateOrdinal(targetDate) {
  const match = String(targetDate || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return 0;
  return Math.floor(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86400000);
}

export function getDailyCareRotationIndex({ targetDate, contextKey = "", length = 1, offset = 0 } = {}) {
  const size = Math.max(1, Number(length || 1));
  const base = dateOrdinal(targetDate) + stableCareHash(contextKey) + Number(offset || 0);
  return ((base % size) + size) % size;
}

function addScores(scores, weights, multiplier = 1) {
  Object.entries(weights || {}).forEach(([key, value]) => {
    if (!Object.prototype.hasOwnProperty.call(scores, key)) return;
    scores[key] += Number(value || 0) * multiplier;
  });
}

function getCoreCode(riskContext) {
  return String(riskContext?.constitution_context?.core_code || "");
}

function getSubLabels(riskContext, explicit = []) {
  return uniq([...safeArray(explicit), ...safeArray(riskContext?.constitution_context?.sub_labels)]);
}

function getThemeSummary(policies) {
  const keys = safeArray(policies).map((item) => item.key);
  if (keys.length >= 2) {
    return POLICY_PAIR_SUMMARIES[`${keys[0]}+${keys[1]}`]
      || POLICY_PAIR_SUMMARIES[`${keys[1]}+${keys[0]}`]
      || `${policies[0].short}、${policies[1].short}方針です。`;
  }
  const policy = policies[0] || POLICY_DEFINITIONS.sasaeru;
  return `${policy.short}方針です。`;
}

function getContinuousConstitution(riskContext) {
  const constitution = riskContext?.constitution_context || {};
  const axes = constitution?.axes && typeof constitution.axes === "object" ? constitution.axes : null;
  const split = constitution?.split_scores && typeof constitution.split_scores === "object"
    ? constitution.split_scores
    : null;
  const material = {
    qi_deficiency: Number(split?.qi?.deficiency || 0),
    qi_stagnation: Number(split?.qi?.stagnation || 0),
    blood_deficiency: Number(split?.blood?.deficiency || 0),
    blood_stasis: Number(split?.blood?.stasis || 0),
    fluid_deficiency: Number(split?.fluid?.deficiency || 0),
    fluid_damp: Number(split?.fluid?.damp || 0),
  };
  return {
    available: Boolean(axes || split),
    yin_yang_score: Math.max(-1, Math.min(1, Number(axes?.yin_yang_score || 0))),
    drive_score: Math.max(-1, Math.min(1, Number(axes?.drive_score || 0))),
    obstruction_score: Math.max(0, Math.min(1, Number(axes?.obstruction_score || 0))),
    material,
  };
}

function addContinuousConstitutionScores(scores, continuous) {
  if (!continuous?.available) return;

  const yy = Number(continuous.yin_yang_score || 0);
  if (yy > 0) addScores(scores, { yurumeru: 0.9, shizumeru: 0.55 }, yy);
  if (yy < 0) addScores(scores, { nagasu: 0.75, meguraseru: 0.7 }, Math.abs(yy));

  const reserveNeed = Math.max(0, -Number(continuous.drive_score || 0));
  if (reserveNeed > 0) addScores(scores, { sasaeru: 1.35 }, reserveNeed);
  if (continuous.obstruction_score > 0) {
    addScores(scores, { meguraseru: 0.75, yurumeru: 0.4 }, continuous.obstruction_score);
  }

  Object.entries(continuous.material || {}).forEach(([key, raw]) => {
    const value = Math.max(0, Number(raw || 0));
    const normalized = value / (value + 2.5);
    addScores(scores, MATERIAL_POLICY_SCORES[key], normalized);
  });
}

function isAllowedPolicyPair(first, second) {
  return ALLOWED_POLICY_PAIRS.has(`${first}+${second}`)
    || ALLOWED_POLICY_PAIRS.has(`${second}+${first}`);
}

export function buildDailyCareTheme({
  mode = "today",
  targetDate = null,
  triggerKey = "default",
  secondaryKey = null,
  signal = 0,
  symptomFocus = null,
  riskContext = null,
  subLabels = [],
} = {}) {
  const responseSource = riskContext || null;
  const primaryInput = hasExplicitPressureResponseDirection(responseSource)
    ? getLegacyCareTriggerKey(triggerKey, responseSource)
    : triggerKey;
  const secondaryInput = secondaryKey && hasExplicitPressureResponseDirection(responseSource)
    ? getLegacyCareTriggerKey(secondaryKey, responseSource)
    : secondaryKey;
  const primary = normalizeDailyCareTrigger(primaryInput);
  const secondary = secondaryInput ? normalizeDailyCareTrigger(secondaryInput) : null;
  const scores = Object.fromEntries(Object.keys(POLICY_DEFINITIONS).map((key) => [key, 0]));
  addScores(scores, TRIGGER_POLICY_SCORES[primary] || TRIGGER_POLICY_SCORES.default, 1);
  if (secondary && secondary !== primary) addScores(scores, TRIGGER_POLICY_SCORES[secondary], 0.38);

  getSubLabels(riskContext, subLabels).forEach((label, index) => {
    addScores(scores, SUB_LABEL_POLICY_SCORES[label], index === 0 ? 1 : 0.58);
  });
  addScores(scores, SYMPTOM_POLICY_SCORES[symptomFocus], 1);

  const coreCode = getCoreCode(riskContext);
  const continuous = getContinuousConstitution(riskContext);
  addContinuousConstitutionScores(scores, continuous);
  // Old profiles and old snapshots do not have continuous values. Preserve the
  // previous categorical fallback only for those rows.
  if (!continuous.available) {
    if (coreCode.includes("batt_small")) addScores(scores, { sasaeru: 1.2 }, 1);
    if (coreCode.startsWith("accel_")) addScores(scores, { yurumeru: 0.65, shizumeru: 0.45 }, 1);
    if (coreCode.startsWith("brake_")) addScores(scores, { nagasu: 0.55, meguraseru: 0.45 }, 1);
  }
  if (Number(signal) >= 2) addScores(scores, { sasaeru: 0.65 }, 1);
  else if (Number(signal) === 1) addScores(scores, { sasaeru: 0.22 }, 1);

  const ranked = Object.entries(scores)
    .map(([key, score]) => ({ key, score }))
    .sort((a, b) => b.score - a.score);
  const selected = [ranked[0] || { key: "sasaeru", score: 1 }];
  const second = ranked.find((item) =>
    item.key !== selected[0].key && isAllowedPolicyPair(selected[0].key, item.key)
  );
  if (
    Number(signal) > 0
    && second
    && second.score >= Math.max(1.9, selected[0].score * 0.5)
    && !([selected[0].key, second.key].includes("shizumeru") && [selected[0].key, second.key].includes("nukumeru"))
  ) {
    selected.push(second);
  }
  const policies = selected.map((item) => POLICY_DEFINITIONS[item.key]).filter(Boolean);
  const intensity = Number(signal) >= 2 ? "high" : Number(signal) === 1 ? "middle" : "low";
  const reserveSmall = coreCode.includes("batt_small");
  const stimulus = reserveSmall || Number(signal) >= 2 ? "弱め・短め" : intensity === "low" ? "軽く一度" : "やさしく短く";
  const labels = [TRIGGER_LABELS[primary] || TRIGGER_LABELS.default];
  if (secondary && secondary !== primary) labels.push(TRIGGER_LABELS[secondary] || TRIGGER_LABELS.default);

  return {
    version: DAILY_CARE_LOGIC_VERSION,
    mode: mode === "tomorrow" ? "tomorrow" : "today",
    target_date: targetDate || null,
    trigger_key: primary,
    secondary_trigger_key: secondary,
    trigger_labels: labels,
    signal: Number(signal || 0),
    intensity,
    stimulus,
    policies,
    scores,
    continuous_constitution_used: continuous.available,
    summary: getThemeSummary(policies),
    core_code: coreCode || null,
    reserve_small: reserveSmall,
    sub_labels: getSubLabels(riskContext, subLabels),
    symptom_focus: symptomFocus || null,
    primary_meridian: riskContext?.constitution_context?.primary_meridian || null,
    secondary_meridian: riskContext?.constitution_context?.secondary_meridian || null,
  };
}

function candidateScore(candidate, { theme, symptomFocus }) {
  let score = 0;
  const policyKeys = safeArray(theme?.policies).map((item) => item.key);
  const primaryTrigger = normalizeDailyCareTrigger(theme?.trigger_key);
  const secondaryTrigger = normalizeDailyCareTrigger(theme?.secondary_trigger_key);
  const coreCode = String(theme?.core_code || "");
  const styleKeys = [
    coreCode.startsWith("accel_") ? "accel" : "",
    coreCode.startsWith("brake_") ? "brake" : "",
    theme?.reserve_small ? "reserve_small" : "",
    coreCode.includes("batt_large") ? "batt_large" : "",
  ].filter(Boolean);

  safeArray(candidate?.policies).forEach((policy) => {
    const rank = policyKeys.indexOf(policy);
    if (rank === 0) score += 3;
    else if (rank === 1) score += 1.4;
  });
  if (symptomFocus && safeArray(candidate?.symptoms).includes(symptomFocus)) score += 6;
  else if (symptomFocus && safeArray(candidate?.symptoms).length) score -= 1.8;
  if (safeArray(candidate?.triggers).includes(primaryTrigger)) score += 2.5;
  if (secondaryTrigger && secondaryTrigger !== primaryTrigger && safeArray(candidate?.triggers).includes(secondaryTrigger)) score += 1.1;
  if (
    safeArray(candidate?.triggers).length
    && !safeArray(candidate?.triggers).includes(primaryTrigger)
    && (!secondaryTrigger || !safeArray(candidate?.triggers).includes(secondaryTrigger))
  ) {
    score -= 1.4;
  }
  if (safeArray(candidate?.modes).includes(theme?.mode)) score += 0.4;
  if (styleKeys.some((key) => safeArray(candidate?.styles).includes(key))) score += 0.9;
  if (theme?.reserve_small && safeArray(candidate?.policies).includes("sasaeru")) score += 0.9;
  if (symptomFocus && safeArray(candidate?.excluded_symptoms).includes(symptomFocus)) score -= 100;
  if (theme?.reserve_small && candidate?.effort === "training") score -= 5;
  if (!theme?.reserve_small && coreCode.includes("batt_large") && candidate?.effort === "training") score += 0.8;
  if (theme?.intensity === "high" && candidate?.effort === "low") score += 0.7;
  return score;
}

const LIFESTYLE_CANDIDATE_NEAR_TIE_DELTA = 0.75;
const LIFESTYLE_LANE_NEAR_TIE_DELTA = 0.75;

function selectDailyCandidates(candidates, {
  theme,
  symptomFocus,
  targetDate,
  contextKey,
  limit = 3,
  nearTieDelta = LIFESTYLE_CANDIDATE_NEAR_TIE_DELTA,
  requireSymptomMatch = false,
}) {
  const unique = Array.from(new Map(safeArray(candidates).filter((item) => item?.id && item?.text).map((item) => [item.id, item])).values());
  if (!unique.length) return [];
  const scored = unique
    .map((item) => ({ ...item, _score: candidateScore(item, { theme, symptomFocus }) }))
    .sort((a, b) => b._score - a._score || a.id.localeCompare(b.id));
  const eligible = scored.filter((item) => item._score > -50);
  const symptomMatched = symptomFocus
    ? eligible.filter((item) => safeArray(item?.symptoms).includes(symptomFocus))
    : [];
  if (requireSymptomMatch && symptomFocus && !symptomMatched.length) return [];

  const groupByScene = (items) => {
    const groups = new Map();
    safeArray(items).forEach((item) => {
      const family = item.scene_family || item.id;
      if (!groups.has(family)) groups.set(family, []);
      groups.get(family).push(item);
    });
    return Array.from(groups.entries())
      .map(([family, variants]) => ({
        family,
        score: Math.max(...variants.map((item) => Number(item._score || 0))),
        variants: variants.sort((a, b) => b._score - a._score || a.id.localeCompare(b.id)),
      }))
      .sort((a, b) => b.score - a.score || a.family.localeCompare(b.family));
  };

  // 第一段階では、個別家事ではなく九つの基本動作から場面を選ぶ。
  // 選択中の不調に合う場面が一つでもあれば、主提案はその中から選ぶ。
  const symptomSceneGroups = groupByScene(symptomMatched);
  const eligibleSceneGroups = groupByScene(eligible);
  const sceneBase = symptomSceneGroups.length ? symptomSceneGroups : eligibleSceneGroups;
  if (!sceneBase.length) return [];

  // 日替わりに回すのは最高点とほぼ同点の場面だけ。
  // 候補数を確保するために適合度の低い場面まで主役へ昇格させない。
  const bestSceneScore = Number(sceneBase[0]?.score || 0);
  const nearTieScenes = sceneBase
    .filter((group) => group.score >= bestSceneScore - nearTieDelta)
    .slice(0, 4);
  const sceneRotationIndex = getDailyCareRotationIndex({
    targetDate,
    contextKey: `${contextKey}|scene`,
    length: nearTieScenes.length,
  });
  const rotatedNearTieScenes = [
    ...nearTieScenes.slice(sceneRotationIndex),
    ...nearTieScenes.slice(0, sceneRotationIndex),
  ];
  const nearTieFamilies = new Set(nearTieScenes.map((group) => group.family));
  const orderedScenes = [
    ...rotatedNearTieScenes,
    ...sceneBase.filter((group) => !nearTieFamilies.has(group.family)),
  ];

  // 第二段階で、選ばれた基本動作の中からその日の具体操作を選ぶ。
  // 同じ場面の中でも、最高点とほぼ同点の具体策だけをローテーションする。
  const sceneCycle = Math.floor(dateOrdinal(targetDate) / Math.max(1, nearTieScenes.length));
  const pickVariant = (group, order) => {
    const bestVariantScore = Number(group.variants[0]?._score || 0);
    const variants = group.variants.filter((item) => item._score >= bestVariantScore - nearTieDelta);
    const variantIndex = getDailyCareRotationIndex({
      targetDate: null,
      contextKey: `${contextKey}|variant|${group.family}`,
      length: variants.length,
      offset: sceneCycle + order,
    });
    return variants[variantIndex] || group.variants[0] || null;
  };

  const selected = orderedScenes
    .slice(0, Math.min(limit, orderedScenes.length))
    .map((group, order) => pickVariant(group, order))
    .filter(Boolean);

  if (selected.length >= limit) return selected;

  // 不調に合う場面が少ない場合だけ、安全に残った別場面を補う。
  const usedFamilies = new Set(selected.map((item) => item.scene_family || item.id));
  for (const group of eligibleSceneGroups) {
    if (usedFamilies.has(group.family)) continue;
    const item = pickVariant(group, selected.length);
    if (!item) continue;
    selected.push(item);
    usedFamilies.add(group.family);
    if (selected.length >= limit) break;
  }
  return selected;
}

function bestSelectedLifestyleScore(candidates) {
  const scores = safeArray(candidates)
    .map((item) => Number(item?._score))
    .filter(Number.isFinite);
  return scores.length ? Math.max(...scores) : -100;
}

function lifestyleCandidatesForContext(candidates, theme, symptomFocus = null) {
  const primaryTrigger = normalizeDailyCareTrigger(theme?.trigger_key);
  const secondaryTrigger = normalizeDailyCareTrigger(theme?.secondary_trigger_key);
  const modeMatched = safeArray(candidates).filter((item) => (
    !safeArray(item?.modes).length || safeArray(item.modes).includes(theme?.mode)
  ));
  const triggerMatched = modeMatched.filter((item) => {
    const triggers = safeArray(item?.triggers);
    if (!triggers.length) return true;
    return triggers.includes(primaryTrigger) || (secondaryTrigger && triggers.includes(secondaryTrigger));
  });
  const weatherMatched = triggerMatched.length ? triggerMatched : modeMatched;
  if (!symptomFocus) return weatherMatched;
  const symptomMatched = weatherMatched.filter((item) => safeArray(item?.symptoms).includes(symptomFocus));
  return symptomMatched.length ? symptomMatched : weatherMatched;
}

function selectLifestyleCareCandidates({
  theme,
  targetDate,
  symptomFocus,
  contextKey,
  limit = 3,
} = {}) {
  const selectionArgs = { theme, symptomFocus, targetDate };
  const contextualEnvironment = lifestyleCandidatesForContext(ENVIRONMENT_EXPERIMENT_CANDIDATES, theme, symptomFocus);
  const contextualFoundation = lifestyleCandidatesForContext(FOUNDATION_LIFESTYLE_CANDIDATES, theme);
  const body = selectDailyCandidates(BODY_MECHANICS_LIFESTYLE_CANDIDATES, {
    ...selectionArgs,
    contextKey: `${contextKey}|body`,
    limit: 4,
    requireSymptomMatch: true,
  });
  const environment = selectDailyCandidates(contextualEnvironment, {
    ...selectionArgs,
    contextKey: `${contextKey}|environment`,
    limit: 4,
  });
  const foundation = selectDailyCandidates(contextualFoundation, {
    ...selectionArgs,
    contextKey: `${contextKey}|foundation`,
    limit: 2,
  });

  const laneScores = {
    body: bestSelectedLifestyleScore(body),
    environment: bestSelectedLifestyleScore(environment),
  };
  const availablePrimaryKinds = [
    body.length ? "body" : null,
    environment.length ? "environment" : null,
  ].filter(Boolean);
  let primaryKind = availablePrimaryKinds[0] || "body";
  let laneRotationApplied = false;
  if (availablePrimaryKinds.length === 2) {
    const scoreGap = laneScores.body - laneScores.environment;
    if (Math.abs(scoreGap) <= LIFESTYLE_LANE_NEAR_TIE_DELTA) {
      laneRotationApplied = true;
      primaryKind = getDailyCareRotationIndex({
        targetDate,
        contextKey: `${contextKey}|primary-kind`,
        length: 2,
      }) === 0 ? "body" : "environment";
    } else {
      primaryKind = scoreGap > 0 ? "body" : "environment";
    }
  }

  const laneMap = { body, environment };
  const otherKind = primaryKind === "body" ? "environment" : "body";
  const selected = [];
  const usedIds = new Set();
  const usedFamilies = new Set();
  const add = (item) => {
    if (!item?.id || usedIds.has(item.id)) return false;
    const family = item.scene_family || item.id;
    if (usedFamilies.has(family)) return false;
    selected.push(item);
    usedIds.add(item.id);
    usedFamilies.add(family);
    return true;
  };

  // 主提案は、身体操作と環境実験のうち、その日の適合度が高い側。
  // 最高点の差が0.75以内の時だけ日付で主役を交代する。
  add(laneMap[primaryKind]?.[0]);
  add(laneMap[otherKind]?.[0]);

  // 水分・着替え・休憩などの基礎ケアは、強い日または余力が小さい日だけ
  // 三つ目の補助案に置く。通常日の主提案にはしない。
  const includeFoundation = theme?.intensity === "high" || Boolean(theme?.reserve_small);
  if (includeFoundation) add(foundation[0]);

  for (const item of [
    ...safeArray(laneMap[primaryKind]).slice(1),
    ...safeArray(laneMap[otherKind]).slice(1),
    ...(includeFoundation ? foundation.slice(1) : []),
  ]) {
    if (selected.length >= limit) break;
    add(item);
  }

  return {
    selected: selected.slice(0, limit),
    primaryKind,
    primaryCandidateScore: Number(selected[0]?._score ?? -100),
    laneScores,
    laneRotationApplied,
    foundationIncluded: selected.some((item) => item.care_kind === "foundation"),
  };
}

export function enhanceLifestylePlan({
  basePlan = null,
  theme,
  targetDate = null,
  symptomFocus = null,
} = {}) {
  const plan = basePlan || {};
  const trigger = normalizeDailyCareTrigger(theme?.trigger_key);
  const secondary = normalizeDailyCareTrigger(theme?.secondary_trigger_key);
  const policySignature = safeArray(theme?.policies).map((item) => item.key).join("+") || "none";
  const selection = selectLifestyleCareCandidates({
    theme,
    symptomFocus,
    targetDate,
    contextKey: `lifestyle|${theme?.mode || "today"}|${trigger}|${secondary}|${symptomFocus || "none"}|${theme?.core_code || "none"}|${policySignature}`,
    limit: 3,
  });
  const selected = selection.selected;
  const primary = selected[0] || {
    id: "tension-fallback-axis",
    care_kind: "body",
    kind_label: "身体の使い方",
    scene_family: "sit_rise",
    scene_label: LIFESTYLE_SCENE_DEFINITIONS.sit_rise.label,
    scene: LIFESTYLE_SCENE_DEFINITIONS.sit_rise.scene,
    headline: "両足裏を膝の真下へ置く",
    text: "両足裏を膝の真下へ置き、左右のお尻へ同じくらい体重が掛かる位置まで座り直す",
    reason: "片方の腰や背もたれだけへ体重を預け続けないためです。",
    felt_sense: "足を組まず、左右の肩の高さがそろえばできています。",
    reset: "足裏が床から離れる場合は、椅子へ浅く座るか足元へ台を置く",
    item_role: "general",
  };
  const alternatives = selected.slice(1, 3);

  const enhanced = {
    ...plan,
    version: DAILY_CARE_LOGIC_VERSION,
    title: theme?.mode === "tomorrow" ? "今夜の暮らしの一手" : "今日の暮らしの一手",
    lead: theme?.summary || "無理を増やさない方針です。",
    primary_action: {
      id: primary.id,
      label: primary.text,
      care_kind: primary.care_kind || "body",
      kind_label: primary.kind_label || "身体の使い方",
      scene: primary.scene || "",
      scene_family: primary.scene_family || null,
      scene_label: primary.scene_label || "",
      reason: primary.reason || "同じ場所だけへ負担を集めないための動きです。",
      felt_sense: primary.felt_sense || "",
      reset: primary.reset || "",
      item_role: primary.item_role || null,
    },
    alternatives: alternatives.map((item) => ({
      id: item.id,
      label: item.text,
      care_kind: item.care_kind || "body",
      kind_label: item.kind_label || "身体の使い方",
      scene: item.scene || "",
      scene_family: item.scene_family || null,
      scene_label: item.scene_label || "",
      reason: item.reason || "",
      felt_sense: item.felt_sense || "",
      reset: item.reset || "",
    })),
    steps: [primary.text, ...alternatives.map((item) => item.text)],
    step_ids: [primary.id, ...alternatives.map((item) => item.id)],
    trap: String(plan.trap || "").trim(),
    selection_basis: {
      primary_kind: selection.primaryKind,
      body_score: Number(selection.laneScores?.body || 0),
      environment_score: Number(selection.laneScores?.environment || 0),
      primary_candidate_score: Number(selection.primaryCandidateScore || 0),
      lane_score_gap: Number(
        Math.abs(Number(selection.laneScores?.body || 0) - Number(selection.laneScores?.environment || 0)).toFixed(3)
      ),
      near_tie_delta: LIFESTYLE_LANE_NEAR_TIE_DELTA,
      lane_rotation_applied: Boolean(selection.laneRotationApplied),
      foundation_included: Boolean(selection.foundationIncluded),
    },
    care_theme: theme,
  };
  return enhanced;
}

function foodTagScore(idea, { theme, symptomFocus, subLabels, mode }) {
  let score = 0;
  const tags = new Set(safeArray(idea?.tags));
  const policyKeys = new Set(safeArray(theme?.policies).map((item) => item.key));
  if (policyKeys.has("sasaeru") && tags.has("support")) score += 2;
  if (policyKeys.has("nagasu") && tags.has("light")) score += 1.8;
  if (policyKeys.has("meguraseru") && tags.has("aroma")) score += 1.5;
  if (policyKeys.has("yurumeru") && tags.has("aroma")) score += 1.1;
  if (policyKeys.has("nukumeru") && tags.has("warm")) score += 2.1;
  if (policyKeys.has("shizumeru") && (tags.has("calm") || tags.has("cool"))) score += 1.8;
  if (policyKeys.has("uruosu") && tags.has("moist")) score += 2.1;
  if (["digestion", "dizziness"].includes(symptomFocus) && tags.has("digestion")) score += 1.7;
  if (symptomFocus === "fatigue" && tags.has("support")) score += 1.4;
  if (["mood", "neck_shoulder", "headache"].includes(symptomFocus) && tags.has("aroma")) score += 1;
  const labels = new Set(safeArray(subLabels));
  if (["qi_deficiency", "気虚"].some((label) => labels.has(label)) && tags.has("support")) score += 1.2;
  if (["qi_stagnation", "気滞"].some((label) => labels.has(label)) && tags.has("aroma")) score += 1.1;
  if (["dampness", "fluid_damp", "痰湿"].some((label) => labels.has(label)) && tags.has("light")) score += 1.2;
  if (["fluid_deficiency", "津液不足"].some((label) => labels.has(label)) && tags.has("moist")) score += 1.2;
  if (["blood_deficiency", "血虚"].some((label) => labels.has(label)) && tags.has("support")) score += 0.9;
  if (["blood_stasis", "血瘀"].some((label) => labels.has(label)) && tags.has("aroma")) score += 0.8;
  if (theme?.reserve_small && (tags.has("light") || tags.has("support"))) score += 0.8;
  if (theme?.intensity === "high" && tags.has("quick")) score += 0.7;
  if (mode === "tomorrow" && tags.has("quick")) score += 0.3;
  return score;
}

function selectFoodIdeas({ theme, targetDate, symptomFocus, subLabels, mode }) {
  const key = normalizeDailyCareTrigger(theme?.trigger_key);
  const source = safeArray(FOOD_IDEAS[key] || FOOD_IDEAS.default);
  const scored = source
    .map((idea) => ({ ...idea, _score: foodTagScore(idea, { theme, symptomFocus, subLabels, mode }) }))
    .sort((a, b) => b._score - a._score || a.id.localeCompare(b.id));
  const best = scored[0]?._score || 0;
  const preferred = scored.filter((idea) => idea._score >= best - 1.2);
  const rest = scored.filter((idea) => !preferred.includes(idea));
  const contextKey = `food|${key}|${symptomFocus || "none"}|${theme?.core_code || "none"}`;
  const rotate = (items, offset) => {
    if (!items.length) return [];
    const index = getDailyCareRotationIndex({ targetDate, contextKey, length: items.length, offset });
    return [...items.slice(index), ...items.slice(0, index)];
  };
  return [...rotate(preferred, 0), ...rotate(rest, 3)].slice(0, 3);
}

function foodSubtractionPairKey(primary, secondary) {
  if (!primary || !secondary || primary === "default" || secondary === "default" || primary === secondary) return null;
  return [primary, secondary].sort().join("+");
}

function foodSubtractionScore(candidate, { theme, symptomFocus, subLabels, sourceWeight = 0 }) {
  let score = sourceWeight;
  const policyKeys = safeArray(theme?.policies).map((item) => item.key);
  safeArray(candidate?.policies).forEach((policy) => {
    const rank = policyKeys.indexOf(policy);
    if (rank === 0) score += 3;
    else if (rank === 1) score += 1.5;
  });
  if (safeArray(candidate?.symptoms).includes(symptomFocus)) score += 1.6;
  const labels = new Set(safeArray(subLabels));
  const subtypeHits = safeArray(candidate?.subLabels).filter((label) => labels.has(label)).length;
  score += subtypeHits * 1.15;
  if (theme?.reserve_small && candidate?.reserveRisk) score += 1.15;
  if (theme?.intensity === "high" && candidate?.compound) score += 0.55;
  if (theme?.intensity === "low" && candidate?.compound) score -= 0.15;
  return score;
}

function selectFoodSubtraction({ theme, targetDate, symptomFocus, subLabels, legacyItems = [] }) {
  const primary = normalizeDailyCareTrigger(theme?.trigger_key);
  const secondary = theme?.secondary_trigger_key
    ? normalizeDailyCareTrigger(theme.secondary_trigger_key)
    : null;
  const pairKey = foodSubtractionPairKey(primary, secondary);
  const candidates = [];
  const pushAll = (items, sourceWeight) => {
    safeArray(items).forEach((item) => candidates.push({ ...item, _sourceWeight: sourceWeight }));
  };

  pushAll(FOOD_SUBTRACTION_PAIR_IDEAS[pairKey], 2.4);
  pushAll(FOOD_SUBTRACTION_IDEAS[primary] || FOOD_SUBTRACTION_IDEAS.default, 1.6);
  if (secondary && secondary !== primary) pushAll(FOOD_SUBTRACTION_IDEAS[secondary], 0.65);
  safeArray(theme?.policies).forEach((policy, index) => {
    pushAll(POLICY_FOOD_SUBTRACTION_IDEAS[policy.key], index === 0 ? 1.1 : 0.45);
  });
  safeArray(legacyItems).forEach((item, index) => {
    const label = String(item || "").trim().replace(/[。]$/, "");
    if (!label) return;
    candidates.push({
      id: `legacy-caution-${stableCareHash(label)}-${index}`,
      label,
      reason: `${(theme?.trigger_labels || ["今日の天気"]).join("と")}と体質が重なる日は、負担を追加しやすい食べ方です。`,
      policies: safeArray(theme?.policies).map((policy) => policy.key),
      _sourceWeight: 0.15,
    });
  });

  const unique = Array.from(new Map(candidates
    .filter((item) => item?.id && item?.label)
    .map((item) => [item.id, item])).values());
  const scored = unique
    .map((item) => ({
      ...item,
      _score: foodSubtractionScore(item, {
        theme,
        symptomFocus,
        subLabels,
        sourceWeight: item._sourceWeight,
      }),
    }))
    .sort((a, b) => b._score - a._score || a.id.localeCompare(b.id));
  const best = scored[0]?._score || 0;
  const preferred = scored.filter((item) => item._score >= best - 3);
  const rest = scored.filter((item) => !preferred.includes(item));
  const contextKey = `food-subtraction|${primary}|${secondary || "none"}|${symptomFocus || "none"}|${theme?.core_code || "none"}`;
  const rotate = (items, offset) => {
    if (!items.length) return [];
    const index = getDailyCareRotationIndex({ targetDate, contextKey, length: items.length, offset });
    return [...items.slice(index), ...items.slice(0, index)];
  };
  return [...rotate(preferred, 0), ...rotate(rest, 2)][0]
    || FOOD_SUBTRACTION_IDEAS.default[0];
}

export function enhanceFoodContext({
  baseFood = null,
  theme,
  targetDate = null,
  symptomFocus = null,
  subLabels = [],
  mode = "today",
} = {}) {
  const food = baseFood || {};
  const ideas = selectFoodIdeas({ theme, targetDate, symptomFocus, subLabels, mode });
  const primary = ideas[0] || FOOD_IDEAS.default[0];
  const alternatives = ideas.slice(1, 3);
  const existingDrinkCard = safeArray(food.action_cards).find((card) => card?.key === "drink");
  const drinkItems = safeArray(existingDrinkCard?.items).slice(0, 2);
  const cautionItems = safeArray(food.caution_items).length
    ? safeArray(food.caution_items)
    : safeArray(food.action_cards).find((card) => card?.key === "caution")?.items || [];
  const subtraction = selectFoodSubtraction({
    theme,
    targetDate,
    symptomFocus,
    subLabels,
    legacyItems: cautionItems,
  });
  const primaryLabel = mode === "tomorrow" ? "今夜〜明朝の一手" : "今日の一手";
  const cautionLabel = mode === "tomorrow" ? "今夜〜明朝に控えたい" : "今日は控えたい";
  const actionCards = [
    {
      key: "choice",
      label: primaryLabel,
      body: primary.note,
      items: [primary.label],
      primary: true,
      prominent: true,
    },
    {
      key: "caution",
      label: cautionLabel,
      body: subtraction.reason,
      items: [subtraction.label],
      prominent: true,
      subtraction_basis: {
        trigger: theme?.trigger_key || "default",
        secondary_trigger: theme?.secondary_trigger_key || null,
        policies: safeArray(subtraction.policies),
      },
    },
    alternatives.length ? {
      key: "alternative",
      label: "別案",
      body: "同じ方針で、場面に合わせて選べる候補です。",
      items: alternatives.map((item) => item.label),
    } : null,
    drinkItems.length ? {
      key: "drink",
      label: "飲み物を合わせるなら",
      body: existingDrinkCard?.body || "一気に飲まず、食事や喉の渇きに合わせて少しずつ。",
      items: drinkItems,
    } : null,
  ].filter(Boolean);

  const enhanced = {
    ...food,
    version: DAILY_CARE_LOGIC_VERSION,
    badge: primaryLabel,
    title: primary.label,
    recommendation: null,
    focus: null,
    detail_eyebrow: "ほかの選び方",
    detail_title: mode === "tomorrow" ? "別案・飲み物・明日の理由" : "別案・飲み物・選んだ理由",
    primary_action: { id: primary.id, label: primary.label, reason: primary.note },
    subtraction_action: {
      id: subtraction.id,
      label: subtraction.label,
      reason: subtraction.reason,
      policies: safeArray(subtraction.policies),
    },
    alternatives: alternatives.map((item) => ({ id: item.id, label: item.label, reason: item.note })),
    action_cards: actionCards,
    add_items: [primary.label, ...alternatives.map((item) => item.label)],
    caution_items: [subtraction.label],
    avoid: subtraction.label,
    how_to: primary.note,
    reason: `${theme?.summary || "無理を増やさない方針です。"} ${(theme?.trigger_labels || []).join("と")}に合わせて、この一食と引き算を選びました。`,
    care_theme: theme,
    display_compact: true,
  };
  return enhanced;
}

export function buildMeridianLineCare({ theme, riskContext = null } = {}) {
  const primary = theme?.primary_meridian || riskContext?.constitution_context?.primary_meridian || null;
  const secondary = theme?.secondary_meridian || riskContext?.constitution_context?.secondary_meridian || null;
  const selected = MERIDIAN_LINE_CARE[primary] || MERIDIAN_LINE_CARE[secondary] || null;
  if (!selected) return null;
  return {
    ...selected,
    meridian_code: MERIDIAN_LINE_CARE[primary] ? primary : secondary,
    intensity: theme?.stimulus || "やさしく短く",
    label: selected.action,
  };
}

export function enhanceTsuboSet({ baseTsuboSet = null, theme, riskContext = null } = {}) {
  const set = baseTsuboSet || {};
  const lineCare = buildMeridianLineCare({ theme, riskContext });
  const points = safeArray(set.points);
  const primaryPoint = points[0] || null;
  return {
    ...set,
    version: DAILY_CARE_LOGIC_VERSION,
    title: theme?.mode === "tomorrow" ? "明日に備えるほぐしの一手" : "今日のほぐしの一手",
    lead: lineCare
      ? `${lineCare.reason} 今日は${lineCare.intensity}で十分です。`
      : set.lead || "強く効かせるより、短く触れて体の反応を見ます。",
    line_care: lineCare,
    primary_action: lineCare || (primaryPoint ? {
      id: `point-${primaryPoint.code || primaryPoint.name_ja}`,
      label: `${primaryPoint.name_ja || primaryPoint.code}を軽く触る`,
      reason: primaryPoint?.explanation?.role_summary || "今日の状態に合わせて選んだツボです。",
    } : null),
    care_theme: theme,
  };
}

export function enhanceDailyCarePlan({
  baseCarePlan = null,
  forecast = null,
  riskContext = null,
  mode = "today",
  targetDate = null,
  symptomFocus = null,
  triggerKey = null,
  secondaryKey = null,
} = {}) {
  const plan = baseCarePlan || {};
  const target = targetDate || forecast?.target_date || plan?.target_date || null;
  const summary = riskContext?.summary || {};
  const physicalTrigger = triggerKey || summary.main_trigger_exact || summary.personal_main_trigger_exact || forecast?.personal_main_trigger_exact || forecast?.main_trigger || "default";
  const physicalSecondary = secondaryKey || summary.secondary_trigger_exact || summary.personal_secondary_trigger_exact || forecast?.personal_secondary_trigger_exact || null;
  const responseSource = riskContext || forecast || null;
  const trigger = hasExplicitPressureResponseDirection(responseSource)
    ? getLegacyCareTriggerKey(physicalTrigger, responseSource)
    : physicalTrigger;
  const secondary = physicalSecondary && hasExplicitPressureResponseDirection(responseSource)
    ? getLegacyCareTriggerKey(physicalSecondary, responseSource)
    : physicalSecondary;
  const activeSymptom = symptomFocus || riskContext?.constitution_context?.symptom_focus || null;
  const theme = buildDailyCareTheme({
    mode,
    targetDate: target,
    triggerKey: trigger,
    secondaryKey: secondary,
    signal: forecast?.signal ?? riskContext?.target?.signal ?? 0,
    symptomFocus: activeSymptom,
    riskContext,
  });
  const baseFood = plan.tomorrow_food_context || plan.night_food || {};
  const food = enhanceFoodContext({
    baseFood,
    theme,
    targetDate: target,
    symptomFocus: activeSymptom,
    subLabels: riskContext?.constitution_context?.sub_labels || [],
    mode,
  });
  const lifestyle = enhanceLifestylePlan({
    basePlan: plan.lifestyle_plan || null,
    theme,
    targetDate: target,
    symptomFocus: activeSymptom,
  });
  const tsuboSet = enhanceTsuboSet({
    baseTsuboSet: plan.night_tsubo_set || {},
    theme,
    riskContext,
  });

  const enhancedPlan = {
    ...plan,
    version: DAILY_CARE_LOGIC_VERSION,
    target_date: target,
    care_theme: theme,
    lifestyle_plan: lifestyle,
    night_tsubo_set: tsuboSet,
    tomorrow_food_context: food,
    night_food: food,
    night_food_reason: food.reason,
    tomorrow_caution: food.avoid || plan.tomorrow_caution || "",
  };

  return rewritePressureBodyCopyDeep(enhancedPlan, responseSource);
}
