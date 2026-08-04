// lib/radar_v1/careRules/dailyCareV2.js
// Daily Care v2: forecast logic chooses the care direction; this layer turns it
// into a stable, varied and concise daily action without changing the forecast.

export const DAILY_CARE_LOGIC_VERSION = "daily_care_v2_12_2026-08-04_response_aligned_lifestyle";

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

const POLICY_RESPONSE_LABELS = {
  shizumeru: "熱・高ぶり",
  yurumeru: "力み・こわばり",
  meguraseru: "巡りの滞り",
  nagasu: "重だるさ・むくみ",
  uruosu: "乾き・消耗",
  nukumeru: "冷え・縮こまり",
  sasaeru: "疲れ・余力不足",
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
  // Weather is the trigger, not the care conclusion. Keep it influential, but
  // smaller than the combined constitution, reserve, material and symptom
  // response so the seven policies do not collapse into weather tips.
  damp: { nagasu: 1.8, meguraseru: 0.8, sasaeru: 0.4 },
  pressure_down: { yurumeru: 0.55, meguraseru: 0.55, sasaeru: 0.35, nagasu: 0.2 },
  pressure_up: { yurumeru: 0.55, meguraseru: 0.55, sasaeru: 0.35, shizumeru: 0.2 },
  temp_shift: { yurumeru: 0.8, sasaeru: 0.55, meguraseru: 0.35 },
  cold: { nukumeru: 1.8, sasaeru: 0.7, meguraseru: 0.25 },
  heat: { shizumeru: 1.8, uruosu: 0.75, sasaeru: 0.35 },
  dry: { uruosu: 1.8, sasaeru: 0.65, yurumeru: 0.25 },
  default: { sasaeru: 0.8, yurumeru: 0.4 },
};

const REACTION_POLICY_SCORES = {
  accel: { yurumeru: 1.4, shizumeru: 1, meguraseru: 0.25 },
  brake: { nagasu: 1.15, meguraseru: 0.95, sasaeru: 0.5 },
  balanced: {},
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

// 暮らすの第二軸は、室温・湿度の分かりきった操作ではなく、道具や配置で
// 身体へ入る負担を変えること。商品を売るために候補を作らず、まず不調・
// 天気・体質から「今日の負担モード」を選び、その一手を助ける道具だけを
// shop_eligible としてショップへ渡す。
const ENVIRONMENT_ADJUSTMENT_CANDIDATES = [
  {
    id: "tool-arm-support",
    care_kind: "environment",
    kind_label: "環境調整",
    scene_family: "support_arm_weight",
    scene_label: "腕の重さを預ける",
    scene: "画面や手作業が続く時は",
    text: "ひじの下へ折ったタオルや薄いクッションを置き、腕の重さを机へ預ける",
    reason: "首肩だけで腕の重さを支え続ける時間を減らせます。",
    felt_sense: "顔を上げた時、首肩が少し軽ければその高さでOK。",
    reset: "肩が上がるなら、支えを一枚薄くしよう。",
    symptoms: ["neck_shoulder", "headache", "fatigue"],
    triggers: ["pressure_up", "dry", "heat", "temp_shift"],
    policies: ["yurumeru", "sasaeru", "shizumeru"],
    constitution_affinity: { accel: 1, qi_stagnation: 0.7, reserve_small: 0.45 },
    care_needs: ["support_arm_weight", "reduce_static_tension"],
    item_role: "forearm_support",
    shop_eligible: true,
    effort: "low",
  },
  {
    id: "tool-screen-height",
    care_kind: "environment",
    kind_label: "環境調整",
    scene_family: "reduce_viewing_reach",
    scene_label: "見る高さを寄せる",
    scene: "画面や読み物を見る時は",
    text: "台やスタンドを使い、視線を大きく下げなくても読める高さまで画面や読み物を上げる",
    reason: "画面を見るたびに、首を深く曲げる時間を減らせます。",
    felt_sense: "顔を上げたあと、首の後ろへ重さが残りにくければOK。",
    reset: "目が疲れるなら、高さはそのままで少し遠ざけよう。",
    symptoms: ["neck_shoulder", "headache", "sleep", "dizziness"],
    symptom_copy: {
      dizziness: {
        scene: "画面を見る時は",
        text: "スマホや画面を台へ置き、頭を何度も上げ下げしなくても見える高さへ近づける",
        reason: "頭の位置を変えながら画面を追う回数を減らせます。",
        felt_sense: "画面から目を離した時、揺れる感じが増えていなければその高さでOK。",
        reset: "見えにくいなら、高くしすぎず画面を少し近づけよう。",
      },
    },
    triggers: ["pressure_up", "dry", "heat", "temp_shift"],
    policies: ["yurumeru", "shizumeru", "sasaeru"],
    constitution_affinity: { accel: 0.9, qi_stagnation: 0.65, fluid_deficiency: 0.35 },
    care_needs: ["reduce_viewing_reach", "reduce_static_tension"],
    item_role: "screen_height",
    shop_eligible: true,
    effort: "low",
  },
  {
    id: "tool-carry-distribution",
    care_kind: "environment",
    kind_label: "環境調整",
    scene_family: "distribute_carry_load",
    scene_label: "持つ重さを分ける",
    scene: "荷物を持って移動する時は",
    text: "片手の袋を二つに分けるか、肩掛け・リュック・キャリーへ重さを移す",
    reason: "指一本や片側の肩と腰へ、重さを集めずに運べます。",
    felt_sense: "歩き出した時、片方の肩が上がりにくければOK。",
    reset: "持ち替えても傾くなら、一度に運ぶ量を減らそう。",
    symptoms: ["fatigue", "neck_shoulder", "low_back_pain", "swelling"],
    triggers: ["damp", "pressure_down", "cold"],
    policies: ["sasaeru", "nagasu", "yurumeru"],
    constitution_affinity: { brake: 0.75, reserve_small: 1, qi_deficiency: 0.8, fluid_damp: 0.55 },
    care_needs: ["distribute_load", "reduce_carry_strain"],
    item_role: "carry_support",
    shop_eligible: true,
    effort: "low",
  },
  {
    id: "tool-work-height",
    care_kind: "environment",
    kind_label: "環境調整",
    scene_family: "bring_work_closer",
    scene_label: "作業の高さを近づける",
    scene: "手元の作業が続く時は",
    text: "よく使う物を台やトレーへまとめ、ひじが少し曲がる距離と高さへ寄せる",
    reason: "物を取るたびに肩を前へ出したり、腰を曲げたりする回数を減らせます。",
    felt_sense: "作業を終えた時、肩や腰の片側だけに重さが残りにくければOK。",
    reset: "手元が窮屈なら、台を低くするか少し遠ざけよう。",
    symptoms: ["neck_shoulder", "low_back_pain", "fatigue", "digestion"],
    symptom_copy: {
      digestion: {
        scene: "胃腸が重い日に、座って手元作業をする時は",
        text: "画面や読み物を台へ載せ、みぞおちと太ももの間がつぶれない高さまで手元を上げる",
        reason: "前かがみで、お腹を折りたたむ時間を減らせます。",
        felt_sense: "作業中、お腹まわりを押しつぶす感じが減ればその高さでOK。",
        reset: "肩が上がるなら、手元を一段低くしよう。",
      },
    },
    triggers: ["cold", "damp", "temp_shift", "pressure_down"],
    policies: ["sasaeru", "nagasu", "yurumeru", "meguraseru"],
    constitution_affinity: { brake: 0.55, reserve_small: 0.7, blood_stasis: 0.6, fluid_damp: 0.6 },
    care_needs: ["reduce_reach", "reduce_bending"],
    item_role: "reach_support",
    shop_eligible: true,
    effort: "low",
  },
  {
    id: "tool-foot-support",
    care_kind: "environment",
    kind_label: "環境調整",
    scene_family: "support_seated_contact",
    scene_label: "足裏を預ける",
    scene: "座った時に足裏が床へ届きにくいなら",
    text: "足元へ安定した台を置き、足裏全体をその上へ預ける",
    reason: "座っている間、太もも裏や腰だけで身体を支え続けずに済みます。",
    felt_sense: "足を組まなくても座りやすければ、その高さでOK。",
    reset: "膝が持ち上がりすぎるなら、台を低くしよう。",
    symptoms: ["low_back_pain", "fatigue", "swelling"],
    triggers: ["damp", "pressure_down", "cold"],
    policies: ["sasaeru", "nagasu", "nukumeru"],
    constitution_affinity: { brake: 0.7, reserve_small: 0.75, fluid_damp: 0.5 },
    care_needs: ["support_seated_contact", "distribute_load"],
    item_role: "sitting_support",
    shop_eligible: true,
    effort: "low",
  },
  {
    id: "tool-heat-shield",
    care_kind: "environment",
    kind_label: "環境調整",
    scene_family: "block_radiant_heat",
    scene_label: "窓からの熱を切る",
    scene: "冷房中も窓の近くだけ暑い時は",
    text: "日が当たる窓だけ、遮熱カーテン・ブラインド・日よけで光を遮る",
    reason: "設定温度をさらに下げる前に、窓から入る熱を一つ減らせます。",
    felt_sense: "窓側に立った時、顔や腕へ当たる熱が弱ければOK。",
    reset: "暗くなりすぎるなら、日が当たる側だけ遮ろう。",
    symptoms: ["fatigue", "headache", "sleep", "mood"],
    triggers: ["heat"],
    requires_weather_match: true,
    policies: ["shizumeru", "sasaeru", "uruosu"],
    constitution_affinity: { accel: 0.65, reserve_small: 0.7, fluid_deficiency: 0.4 },
    care_needs: ["block_radiant_heat", "reduce_heat_input"],
    item_role: "heat_shielding",
    shop_eligible: true,
    effort: "low",
  },
  {
    id: "tool-airflow-redirect",
    care_kind: "environment",
    kind_label: "環境調整",
    scene_family: "redirect_airflow",
    scene_label: "直風を外す",
    scene: "冷暖房の風が同じ所へ当たり続ける時は",
    text: "椅子を風の線から外すか、風向板やサーキュレーターで風を壁・天井へ逃がす",
    reason: "室温を変えすぎず、首肩や顔へ続く直風だけを外せます。",
    felt_sense: "首元や目の乾きが増えにくい位置ならOK。",
    reset: "暑さや寒さが戻るなら、風量はそのままで向きだけ調整しよう。",
    symptoms: ["neck_shoulder", "headache", "sleep"],
    triggers: ["cold", "dry", "heat"],
    requires_weather_match: true,
    policies: ["yurumeru", "uruosu", "nukumeru", "sasaeru"],
    constitution_affinity: { accel: 0.45, fluid_deficiency: 0.75, blood_deficiency: 0.35 },
    care_needs: ["redirect_airflow", "reduce_local_dryness"],
    item_role: "airflow_redirect",
    shop_eligible: true,
    effort: "low",
  },
  {
    id: "tool-bed-moisture-layer",
    care_kind: "environment",
    kind_label: "環境調整",
    scene_family: "change_sleep_surface",
    scene_label: "寝床の湿気を逃がす",
    scene: "今夜、寝具へ湿気が残っているなら",
    text: "敷寝具の下へ除湿シートや通気する層を一枚入れ、起きたら掛け寝具をめくって熱と湿気を逃がす",
    reason: "部屋全体ではなく、身体が触れ続ける寝床の湿気を切り分けられます。",
    felt_sense: "横になった時、背中の熱や湿りが戻りにくければOK。",
    reset: "寝床が硬く感じるなら、薄い物へ替えるか外そう。",
    symptoms: ["sleep", "fatigue", "low_back_pain"],
    triggers: ["damp", "heat"],
    requires_weather_match: true,
    policies: ["nagasu", "sasaeru", "shizumeru"],
    constitution_affinity: { brake: 0.7, fluid_damp: 1, reserve_small: 0.45 },
    care_needs: ["change_sleep_surface", "reduce_contact_moisture"],
    item_role: "bedding_moisture",
    shop_eligible: true,
    modes: ["tomorrow"],
    effort: "low",
  },
  {
    id: "tool-light-zone",
    care_kind: "environment",
    kind_label: "環境調整",
    scene_family: "reduce_sensory_input",
    scene_label: "光の入口を絞る",
    scene: "頭や気分が切り替わりにくい時は",
    text: "天井灯を一度消し、必要な場所だけ手元灯や間接照明で照らす",
    reason: "部屋全体から目へ入り続ける光を減らし、見る場所を一つに絞れます。",
    felt_sense: "目の奥や眉間へ力が入りにくければ、その明るさでOK。",
    reset: "手元が見えにくいなら、部屋全体ではなく手元灯だけ明るくしよう。",
    symptoms: ["headache", "sleep", "mood"],
    triggers: ["pressure_up", "heat", "dry", "temp_shift"],
    policies: ["shizumeru", "yurumeru", "sasaeru"],
    constitution_affinity: { accel: 1, qi_stagnation: 0.65, fluid_deficiency: 0.3 },
    care_needs: ["reduce_sensory_input", "reduce_visual_load"],
    item_role: "reduce_light",
    shop_eligible: true,
    effort: "low",
  },
  {
    id: "tool-back-support",
    care_kind: "environment",
    kind_label: "環境調整",
    scene_family: "support_seated_contact",
    scene_label: "背もたれへ重さを預ける",
    scene: "座っていると腰の重さが残る時は",
    text: "椅子の奥へ座り、腰と背もたれの隙間へ丸めたタオルを入れる。腰だけで上半身を支え続けない厚さにする",
    reason: "背もたれにも重さを分けると、腰だけで姿勢を保つ時間を減らせます。",
    felt_sense: "背中を預けても、お腹を圧迫せずに座れればその厚さでOK。",
    reset: "腰が押されるなら、タオルを一段薄くしよう。",
    symptoms: ["low_back_pain", "fatigue", "digestion"],
    triggers: ["damp", "pressure_down", "cold", "temp_shift", "heat"],
    policies: ["sasaeru", "yurumeru", "nukumeru"],
    constitution_affinity: { brake: 0.65, reserve_small: 0.9, qi_deficiency: 0.55 },
    care_needs: ["support_seated_contact", "reduce_back_strain"],
    item_role: "sitting_support",
    shop_eligible: true,
    effort: "low",
  },
  {
    id: "tool-leg-rest",
    care_kind: "environment",
    kind_label: "環境調整",
    scene_family: "support_leg_rest",
    scene_label: "脚を面で預ける",
    scene: "脚の重さが残る日に横になるなら",
    text: "膝下からふくらはぎへ薄いクッションを入れ、かかとだけでなく脚全体の重さを預ける",
    reason: "休む時の脚の置き場を作り、同じ場所だけへ圧を集めずに済みます。",
    felt_sense: "膝裏やかかとに圧が集まらず、脚を置いておければその高さでOK。",
    reset: "膝や腰が落ち着かないなら、クッションを薄くしよう。",
    symptoms: ["swelling", "fatigue", "sleep"],
    triggers: ["damp", "pressure_down", "cold", "heat", "temp_shift"],
    policies: ["nagasu", "sasaeru", "meguraseru"],
    constitution_affinity: { brake: 0.7, reserve_small: 0.75, fluid_damp: 1 },
    care_needs: ["support_leg_weight", "change_sleep_surface"],
    item_role: "leg_support",
    shop_eligible: true,
    effort: "low",
  },
  {
    id: "tool-side-sleep-support",
    care_kind: "environment",
    kind_label: "環境調整",
    scene_family: "change_sleep_surface",
    scene_label: "横向きのねじれを支える",
    scene: "横向きで休む時に腰や肩が落ち着かないなら",
    text: "膝の間へ薄い枕か折ったタオルを入れ、上側の脚をそこへ預ける",
    reason: "上側の脚が前へ落ち続けず、腰と肩のねじれを小さくできます。",
    felt_sense: "腰をひねって戻そうとしなくても横向きで休めれば、その厚さでOK。",
    reset: "股関節が窮屈なら、支えを薄くするか外そう。",
    symptoms: ["sleep", "low_back_pain", "neck_shoulder"],
    triggers: ["cold", "pressure_down", "temp_shift", "damp"],
    policies: ["sasaeru", "yurumeru", "nukumeru"],
    constitution_affinity: { brake: 0.65, reserve_small: 0.8, blood_stasis: 0.45 },
    care_needs: ["change_sleep_surface", "reduce_twist"],
    item_role: "sleep_environment",
    shop_eligible: true,
    modes: ["tomorrow"],
    effort: "low",
  },
  {
    id: "tool-facing-layout",
    care_kind: "environment",
    kind_label: "環境調整",
    scene_family: "reduce_head_turns",
    scene_label: "見る物を正面へ集める",
    scene: "頭を動かすとふわつきが気になる時は",
    text: "よく見る画面・時計・飲み物を身体の正面へ集め、頭を何度も上下左右へ動かさずに済む配置にする",
    reason: "必要な物を見るたびに、頭の向きを大きく変える回数を減らせます。",
    felt_sense: "見る物を切り替えても、ふわつきが増えなければその配置でOK。",
    reset: "手元が狭くなるなら、今日よく使う物だけ正面へ残そう。",
    symptoms: ["dizziness", "headache", "neck_shoulder"],
    triggers: ["pressure_down", "pressure_up", "temp_shift", "damp", "heat", "dry", "cold"],
    policies: ["sasaeru", "yurumeru", "shizumeru"],
    constitution_affinity: { brake: 0.65, reserve_small: 0.9, qi_deficiency: 0.45 },
    care_needs: ["reduce_head_turns", "reduce_visual_load"],
    item_role: "screen_height",
    shop_eligible: true,
    effort: "low",
  },
  {
    id: "tool-sound-zone",
    care_kind: "environment",
    kind_label: "環境調整",
    scene_family: "reduce_sensory_input",
    scene_label: "重なる音を一つ減らす",
    scene: "通知音・テレビ・音楽が重なる時は",
    text: "使っていない音を一つ止め、今必要な音だけ残す",
    reason: "複数の方向から入り続ける刺激を減らし、注意を向ける場所を絞れます。",
    felt_sense: "眉間や肩へ力を入れずに過ごせれば、その音量でOK。",
    reset: "静かすぎて落ち着かないなら、小さな音を一つだけ戻そう。",
    symptoms: ["mood", "sleep", "headache"],
    triggers: ["pressure_up", "heat", "dry", "temp_shift", "damp"],
    policies: ["shizumeru", "yurumeru", "sasaeru"],
    constitution_affinity: { accel: 0.9, reserve_small: 0.65, qi_stagnation: 0.55 },
    care_needs: ["reduce_sensory_input", "reduce_sound_input"],
    item_role: "reduce_sound",
    shop_eligible: true,
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
    headline: "片手で持ち続けず、反対の手でも支える",
    text: "スマホは片手で持ち続けず、反対の手でも下から支える。親指の先だけで操作せず、ひじを小さく動かして手全体の位置も変えてみる",
    reason: "親指と手首だけへ操作を集めず、腕全体へ動きを分けるためです。",
    felt_sense: "親指の付け根と肩が少し楽なら十分です。",
    reset: "手が疲れるなら、いったん机へ置いて操作する",
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
    symptoms: ["neck_shoulder", "fatigue"],
    headline: "指の力を一段ゆるめる",
    text: "手のひらと物の間に少し隙間を残す。落とさない範囲で、指の力を一段ゆるめて持つ",
    reason: "握る力が減ると、前腕や肩もゆるみやすくなります。",
    felt_sense: "同じ物が少し軽く感じたら、その持ち方でOK。",
    reset: "滑りそうなら無理せず、両手で持とう。",
  },
  "tension-little-finger-thumb-line": {
    scene_family: "hold_carry",
    symptoms: ["neck_shoulder", "fatigue"],
    headline: "細い持ち手を、指の付け根側へ掛ける",
    text: "細い持ち手を指先に掛けず、指の付け根側へ移す。親指は上から軽く添える",
    reason: "手首と肩に力が集まりにくい持ち方です。",
    felt_sense: "指先の食い込みが少し減ったらOK。",
    reset: "手首が曲がるなら、荷物を分けるか持ち替えよう。",
  },
  "tension-load-to-ground": {
    scene_family: "hold_carry",
    symptoms: ["fatigue", "neck_shoulder", "low_back_pain", "swelling"],
    headline: "荷物を体の正面へ寄せてから歩く",
    text: "すぐ歩き出さず、荷物をおへその下あたりへ寄せてから一歩目を出す",
    reason: "重さを腕と腰だけで受けにくくなります。",
    felt_sense: "一歩目で肩が上がらなければOK。",
    reset: "まだ重いなら、小分けにしよう。",
  },
  "tension-fixed-object-turn": {
    scene_family: "push_pull_turn",
    symptoms: ["neck_shoulder", "low_back_pain"],
    headline: "物を胸の前に置いたまま、足から向きを変える",
    text: "物を胸の前に置いたまま、行きたい方向へ足を一歩。胸と荷物を一緒に向ける",
    reason: "足から向きを変えると、腰と手首がついてきやすくなります。",
    felt_sense: "腰だけをねじる感じが減ったらOK。",
    reset: "まだ腰がねじれるなら、歩幅を小さくして二歩で回ろう。",
  },
  "tension-phone-thumb-line": {
    scene_family: "screen_handwork",
    symptoms: ["neck_shoulder", "headache"],
    headline: "片手で操作する物を、反対の手でも支える",
    text: "スマホは片手で持ち続けず、反対の手でも下から支える。親指の先だけで操作せず、ひじを小さく動かして手全体の位置も変えてみる",
    reason: "親指と手首だけへ操作を集めず、腕全体へ動きを分けられます。",
    felt_sense: "親指の付け根と肩がラクならOK。",
    reset: "手が疲れるなら、いったん机へ置いて操作しよう。",
  },
  "tension-screen-head-up": {
    scene_family: "screen_handwork",
    symptoms: ["neck_shoulder", "headache"],
    headline: "あごを突き出さず、頭全体を上へ運ぶ",
    text: "画面から顔を上げる時は、あごだけを持ち上げず、頭全体を真上へ少し運ぶつもりで視線を正面へ戻す",
    reason: "首の後ろだけを縮めずに、頭を体の上へ戻しやすくなります。",
    felt_sense: "顔を上げたあと、首の重さが残りにくければOK。",
    reset: "あごが上がるなら、動きを半分にしよう。",
  },
  "tension-wall-axis": {
    scene_family: "hold_posture",
    symptoms: ["neck_shoulder", "low_back_pain", "fatigue"],
    headline: "壁を腕で押さず、足元から身体を近づける",
    text: "壁に両手を当て、ひじを少し曲げる。手の位置を大きく変えず、足裏で床を受けながら身体全体を壁へ近づける",
    reason: "腕だけで押さず、壁から受ける力を足元まで分けられます。",
    felt_sense: "肩や手首だけでなく、足裏にも圧を感じられればOK。",
    reset: "手首や肩がつらいなら、壁へ近づいて動きを小さくしよう。",
    item_role: "grounding_support",
    effort: "medium",
  },
  "tension-inner-ankle-stand": {
    scene_family: "hold_posture",
    symptoms: ["low_back_pain", "fatigue", "swelling", "digestion"],
    headline: "内くるぶしの真下へ体重を置く",
    text: "立って待つ時は、足指で床をつかまず、内くるぶしの真下へ体重を落とす。頭は上へ伸びるつもりで立つ",
    reason: "足の外側や腰だけで踏ん張らず、足元から身体を支えやすくなります。",
    felt_sense: "足指が自由なまま、上半身が少し軽ければOK。",
    reset: "ふらつくなら、壁や台へ手を添えてやろう。",
  },
  "tension-supported-one-leg": {
    scene_family: "hold_posture",
    symptoms: ["low_back_pain", "fatigue", "swelling"],
    headline: "支えを使い、片足で10秒だけ立つ",
    text: "安定した机か壁へ手を添え、片足を床から少しだけ浮かせる。立っている足の内くるぶしの真下へ体重を置き、10秒で両足へ戻る",
    reason: "足指で強く踏ん張らず、足元から身体を支える位置を確かめられます。",
    felt_sense: "足指で床をつかまずに立てればOK。",
    reset: "ぐらついたらすぐに足を着き、両足で立とう。",
    excluded_symptoms: ["dizziness"],
    styles: ["brake", "batt_large"],
    item_role: "balance_training",
    effort: "training",
  },
  "tension-walk-center-first": {
    scene_family: "walk_step",
    symptoms: ["fatigue", "swelling", "low_back_pain", "digestion"],
    headline: "身体の中心を先へ運び、小さく歩き始める",
    text: "最初の5歩だけ、みぞおちの少し下を先へ運ぶ。地面を強く蹴らず、身体について足が出る程度の小さな歩幅で進む",
    reason: "後ろ足で地面を強く蹴らず、重心の移動から歩き始められます。",
    felt_sense: "靴音が少し小さくなったらOK。",
    reset: "前へ倒れそうなら、いつもの歩幅へ戻そう。",
  },
  "tension-seated-foot-head": {
    scene_family: "hold_posture",
    symptoms: ["digestion", "sleep", "fatigue", "headache", "mood"],
    headline: "足裏は下へ、頭は上へ離す",
    text: "両足裏を床へ置く。足裏を下へ預けながら、頭のてっぺんを上へ伸ばすつもりで座る",
    reason: "腰や首を固めず、身体の中心に長さを作りやすくなります。",
    felt_sense: "背筋を力ませず、みぞおちの周りが少し楽ならOK。",
    reset: "足が床へ届かないなら、足元へ台を置こう。",
  },
  "tension-sit-stand-innerline": {
    scene_family: "sit_rise",
    symptoms: ["low_back_pain", "fatigue"],
    headline: "足を膝の真下へ引いてから、鼻を前へ運ぶ",
    text: "座った所から立つ前に、足を膝の真下へ引く。鼻をつま先の上へ運び、お尻が浮いてから立つ",
    reason: "勢いをつけなくても、脚へ力が渡りやすくなります。",
    felt_sense: "かかとが浮かずに立てたらOK。",
    reset: "後ろへ戻るなら、足をもう少し椅子へ近づけよう。",
  },
  "tension-stairs-center-up": {
    scene_family: "walk_step",
    symptoms: ["fatigue", "low_back_pain", "swelling"],
    headline: "段差の一歩目だけ、前の足裏を全部置く",
    text: "段差の一歩目だけ、前の足裏を全部置く。胸をその膝の上へ運んで上がる",
    reason: "後ろ足で強く蹴る感じが減りやすくなります。",
    felt_sense: "前の足で立ち上がる感じがあればOK。",
    reset: "ふらつくなら、手すりを使っていつもの上り方へ。",
    effort: "medium",
  },
  "tension-reach-thumb-line": {
    scene_family: "reach_take",
    symptoms: ["neck_shoulder", "low_back_pain"],
    headline: "ひじが少し曲がる所まで、一歩近づく",
    text: "物へ一歩近づき、ひじが少し曲がる距離から手を伸ばす",
    reason: "肩を上げたまま、遠くへ手を出し続けずに済みます。",
    felt_sense: "物を取ったあと、肩がすぐ下りたらOK。",
    reset: "片足が浮くなら、もう一歩近づこう。",
  },
  "tension-floor-object-axis": {
    scene_family: "bend_height",
    symptoms: ["low_back_pain", "fatigue"],
    headline: "物のすぐ近くまで歩いてから、腰を落とす",
    text: "物のすぐ近くまで歩く。片足を半歩前へ出し、膝を曲げて手を下ろす",
    reason: "手と物の距離が縮まると、腰へ重さが集まりにくくなります。",
    felt_sense: "物が足元の近くにあるまま拾えたらOK。",
    reset: "まだ腰が重いなら、片膝を床へつこう。",
  },
  "tension-door-origin-move": {
    scene_family: "push_pull_turn",
    symptoms: ["neck_shoulder", "low_back_pain"],
    headline: "動かす物へ近づき、進む方向へ一歩ついていく",
    text: "押す・引く物へ近づいて軽く持つ。物が動く方向へ片足を一歩出し、体ごとついていく",
    reason: "腕で頑張る量を、足の一歩が引き受けてくれます。",
    felt_sense: "同じ物が少し軽く感じたら、その動かし方でOK。",
    reset: "ひじが伸び切るなら、動かす物へもう半歩近づこう。",
  },
  "tension-mop-fixed-end": {
    scene_family: "push_pull_turn",
    symptoms: ["neck_shoulder", "low_back_pain", "fatigue"],
    headline: "長い道具を進める方向へ、足も一歩動かす",
    text: "長い道具の持ち手をおへその前に置き、道具を進める方向へ足も一歩ずつ動かす",
    reason: "腕だけで大きく振らず、肩と腰を何度もねじらずに済みます。",
    felt_sense: "腕より脚が動いている感じならOK。",
    reset: "腰だけが回るなら、道具を動かす幅を半分にしよう。",
  },
  "tension-kitchen-open-grip": {
    scene_family: "screen_handwork",
    symptoms: ["neck_shoulder", "low_back_pain", "fatigue"],
    headline: "手元の作業物を、こぶし一つぶん手前へ寄せる",
    text: "手元で使う物を、こぶし一つぶん手前へ寄せる。ひじを軽く曲げたまま作業する",
    reason: "小さく近づけるだけで、肩を前へ出す時間が減ります。",
    felt_sense: "作業中、肩が上がりにくければOK。",
    reset: "窮屈なら、立つ位置を少し後ろへずらそう。",
  },
  "tension-laundry-axis": {
    scene_family: "hold_carry",
    symptoms: ["fatigue", "low_back_pain", "swelling", "neck_shoulder"],
    headline: "中身を二つに分けて、左右へ持つ",
    text: "中身を二つへ分け、左右の手に一つずつ持つ。腕は体の近くへ置く",
    reason: "片方の肩と腰へ、重さが集まりにくくなります。",
    felt_sense: "腰を横へ曲げずに歩けたらOK。",
    reset: "まだ肩が上がるなら、中身をもう少し減らそう。",
  },
  "tension-bed-long-roll": {
    scene_family: "lie_turn",
    symptoms: ["sleep", "low_back_pain", "neck_shoulder"],
    headline: "膝を曲げ、膝と肩を同じ方向へ動かす",
    text: "両膝を曲げてそろえる。膝を倒す方向へ、顔と両肩も一緒に向ける",
    reason: "体がまとまって転がると、腰や首のねじれが小さくなります。",
    felt_sense: "寝返りが一つの動きで終わったらOK。",
    reset: "腰だけが先に回るなら、膝を少し胸へ近づけよう。",
  },
  "tension-head-sky-line": {
    scene_family: "hold_posture",
    symptoms: ["neck_shoulder", "headache", "mood", "sleep"],
    headline: "あごを引き込まず、頭を上へ伸ばす",
    text: "座ったまま、あごを胸へ押しつけず、頭全体を上へ伸ばすつもりで10秒保つ",
    reason: "あごや後頭部を固めず、頭を身体の上へ戻しやすくなります。",
    felt_sense: "目やあごへ力を入れず、頭の位置が少し高く感じられればOK。",
    reset: "目や首が疲れるなら、動かさず足裏の感覚へ戻ろう。",
  },
  "tension-palm-axis-reset": {
    scene_family: "screen_handwork",
    symptoms: ["neck_shoulder", "headache", "fatigue"],
    headline: "手のひらを太ももへ置き、指を3回ひらく",
    text: "道具を置き、手のひらを太ももへ。指をゆっくり開いて戻す動きを3回",
    reason: "握ったままの手を、いったん普段の形へ戻せます。",
    felt_sense: "3回目に、指がすっと開けばOK。",
    reset: "痛みやつりが出るなら、動かさず置くだけで大丈夫。",
    item_role: "grip_support",
  },
};

const BODY_CARE_NEEDS_BY_SCENE = {
  hold_carry: ["distribute_load", "reduce_carry_strain"],
  push_pull_turn: ["reduce_twist", "move_from_feet"],
  reach_take: ["reduce_reach", "reduce_shoulder_load"],
  bend_height: ["reduce_bending", "share_load_with_legs"],
  sit_rise: ["transfer_weight", "reduce_back_strain"],
  walk_step: ["transfer_weight", "reduce_pushing_effort"],
  screen_handwork: ["reduce_static_tension", "support_arm_weight"],
  hold_posture: ["distribute_load", "reduce_static_tension"],
  lie_turn: ["reduce_twist", "change_sleep_surface"],
};

const BODY_MECHANICS_LIFESTYLE_CANDIDATES = BODY_MECHANICS_INTERNAL_CANDIDATES.map((candidate) => {
  const publicCopy = PUBLIC_ACTION_COPY_BY_ID[candidate.id] || {};
  const sceneDefinition = LIFESTYLE_SCENE_DEFINITIONS[publicCopy.scene_family] || null;
  const sceneFamily = publicCopy.scene_family || candidate.scene_family || candidate.id;
  return {
    ...candidate,
    ...publicCopy,
    care_kind: "body",
    kind_label: "身体の使い方",
    scene_family: sceneFamily,
    scene_label: sceneDefinition?.label || "",
    care_needs: safeArray(publicCopy.care_needs).length
      ? publicCopy.care_needs
      : (BODY_CARE_NEEDS_BY_SCENE[sceneFamily] || ["reduce_local_strain"]),
    // 商品適性は選定点へ入れない。身体操作が主役の日も、動作を助ける
    // 支持用品を別導線で提案できるよう、既存のitem_roleだけを引き継ぐ。
    shop_eligible: Boolean(candidate.item_role),
    // 画面の場面名は九つの基本動作を正本にする。個別候補に残る
    // 「まな板」「モップ」などの旧sceneで上書きしない。
    scene: sceneDefinition?.scene || "身体を使う時は",
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

function readDailyReactionDirection(source = null) {
  const values = [
    source?.reaction_direction,
    source?.summary?.reaction_direction,
    source?.constitution_context?.manifestation?.reaction_direction,
    source?.meta?.manifestation?.reaction_direction,
    source?.pressure_response_direction,
    source?.summary?.pressure_response_direction,
  ];
  return values
    .map((value) => String(value || "").trim().toLowerCase())
    .find((value) => ["accel", "brake", "balanced"].includes(value)) || null;
}

function getCareReactionDirection(riskContext, continuous, coreCode = "") {
  const explicit = readDailyReactionDirection(riskContext);
  if (explicit) return explicit;
  if (continuous?.available) {
    const score = Number(continuous.yin_yang_score || 0);
    if (score >= 0.15) return "accel";
    if (score <= -0.15) return "brake";
    return "balanced";
  }
  if (String(coreCode).startsWith("accel_")) return "accel";
  if (String(coreCode).startsWith("brake_")) return "brake";
  return "balanced";
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

export function buildDailyResponseProfile({
  triggerKey = "default",
  secondaryKey = null,
  signal = 0,
  symptomFocus = null,
  reactionDirection = "balanced",
  reserveSmall = false,
  subLabels = [],
  policies = [],
} = {}) {
  const primaryPolicy = policies[0] || POLICY_DEFINITIONS.sasaeru;
  const secondaryPolicy = policies[1] || null;
  const normalizedSubLabels = safeArray(subLabels).map((key) => key === "dampness" ? "fluid_damp" : key);
  const constitutionKey = reactionDirection !== "balanced"
    ? reactionDirection
    : reserveSmall
      ? "reserve_small"
      : normalizedSubLabels[0] || null;
  return {
    version: "daily_response_profile_v1",
    trigger_key: normalizeDailyCareTrigger(triggerKey),
    secondary_trigger_key: secondaryKey ? normalizeDailyCareTrigger(secondaryKey) : null,
    symptom_key: symptomFocus || null,
    reaction_direction: reactionDirection,
    reserve_level: reserveSmall ? "small" : "standard",
    material_keys: normalizedSubLabels.filter((key) => [
      "qi_deficiency", "qi_stagnation", "blood_deficiency", "blood_stasis", "fluid_deficiency", "fluid_damp",
    ].includes(key)),
    response_keys: policies.map((policy) => policy.key),
    primary_response_key: primaryPolicy.key,
    secondary_response_key: secondaryPolicy?.key || null,
    target_response_label: POLICY_RESPONSE_LABELS[primaryPolicy.key] || primaryPolicy.guide,
    target_zone_key: symptomFocus || null,
    signal: Number(signal || 0),
    evidence: {
      weather: TRIGGER_LABELS[normalizeDailyCareTrigger(triggerKey)] || TRIGGER_LABELS.default,
      symptom: SYMPTOM_CONTEXT_LABELS[symptomFocus] || null,
      constitution: CONSTITUTION_CONTEXT_LABELS[constitutionKey] || null,
    },
  };
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
  const reactionDirection = getCareReactionDirection(riskContext, continuous, coreCode);
  addScores(scores, REACTION_POLICY_SCORES[reactionDirection], 1);
  addContinuousConstitutionScores(scores, continuous);
  // Old profiles and old snapshots do not have continuous values. Preserve the
  // previous categorical fallback only for those rows.
  if (!continuous.available) {
    if (coreCode.includes("batt_small")) addScores(scores, { sasaeru: 1.2 }, 1);
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
    && second.score >= Math.max(1.9, selected[0].score * 0.42)
    && !([selected[0].key, second.key].includes("shizumeru") && [selected[0].key, second.key].includes("nukumeru"))
  ) {
    selected.push(second);
  }
  const policies = selected.map((item) => POLICY_DEFINITIONS[item.key]).filter(Boolean);
  const intensity = Number(signal) >= 2 ? "high" : Number(signal) === 1 ? "middle" : "low";
  const reserveSmall = coreCode.includes("batt_small") || Math.max(0, -Number(continuous.drive_score || 0)) >= 0.35;
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
    response_profile: buildDailyResponseProfile({
      triggerKey: primary,
      secondaryKey: secondary,
      signal,
      symptomFocus,
      reactionDirection,
      reserveSmall,
      subLabels: getSubLabels(riskContext, subLabels),
      policies,
    }),
    continuous_constitution_used: continuous.available,
    constitution_profile: continuous,
    summary: getThemeSummary(policies),
    core_code: coreCode || null,
    reaction_direction: reactionDirection,
    reserve_small: reserveSmall,
    sub_labels: getSubLabels(riskContext, subLabels),
    symptom_focus: symptomFocus || null,
    primary_meridian: riskContext?.constitution_context?.primary_meridian || null,
    secondary_meridian: riskContext?.constitution_context?.secondary_meridian || null,
  };
}

const SYMPTOM_CONTEXT_LABELS = {
  fatigue: "疲れ・だるさ",
  sleep: "眠りの不調",
  digestion: "胃腸の調子",
  neck_shoulder: "首肩のつらさ",
  low_back_pain: "腰のつらさ",
  swelling: "むくみ・重だるさ",
  headache: "頭のつらさ",
  dizziness: "ふらつき・めまい",
  mood: "気分の浮き沈み",
};

const CONSTITUTION_CONTEXT_LABELS = {
  accel: "アクセル寄り",
  brake: "ブレーキ寄り",
  reserve_small: "余力小さめ",
  batt_large: "余力あり",
  qi_deficiency: "気虚傾向",
  qi_stagnation: "気滞傾向",
  blood_deficiency: "血虚傾向",
  blood_stasis: "血瘀傾向",
  fluid_deficiency: "津液不足傾向",
  fluid_damp: "痰湿傾向",
};

const POLICY_CONSTITUTION_AFFINITY = {
  shizumeru: { accel: 0.7 },
  yurumeru: { accel: 0.55, qi_stagnation: 0.65, blood_stasis: 0.35 },
  meguraseru: { brake: 0.35, qi_stagnation: 0.65, blood_stasis: 0.7 },
  nagasu: { brake: 0.45, fluid_damp: 0.85 },
  uruosu: { fluid_deficiency: 0.9, blood_deficiency: 0.45 },
  nukumeru: { brake: 0.35, qi_deficiency: 0.55 },
  sasaeru: { reserve_small: 0.9, qi_deficiency: 0.75, blood_deficiency: 0.35 },
};

const LIFESTYLE_CANDIDATE_NEAR_TIE_DELTA = 12;
const LIFESTYLE_COMPLEMENTARY_KIND_DELTA = 12;
const LIFESTYLE_MIN_DISPLAY_SCORE = 18;

function mergeAffinity(target, source) {
  Object.entries(source || {}).forEach(([key, raw]) => {
    const value = Math.max(0, Number(raw || 0));
    target[key] = Math.max(Number(target[key] || 0), value);
  });
  return target;
}

function candidateConstitutionAffinity(candidate) {
  const affinity = {};
  mergeAffinity(affinity, candidate?.constitution_affinity);
  safeArray(candidate?.styles).forEach((key) => {
    affinity[key] = Math.max(Number(affinity[key] || 0), 0.8);
  });
  safeArray(candidate?.policies).forEach((key) => mergeAffinity(affinity, POLICY_CONSTITUTION_AFFINITY[key]));
  return affinity;
}

function activeConstitutionSignals(theme) {
  const signals = {};
  const coreCode = String(theme?.core_code || "");
  const profile = theme?.constitution_profile || {};
  const reactionDirection = String(theme?.reaction_direction || "");
  const yy = Number(profile?.yin_yang_score || 0);
  if (reactionDirection === "accel") signals.accel = Math.max(0.65, yy > 0 ? yy : 1);
  if (reactionDirection === "brake") signals.brake = Math.max(0.65, yy < 0 ? Math.abs(yy) : 1);
  if (!reactionDirection && coreCode.startsWith("accel_")) signals.accel = 1;
  if (!reactionDirection && coreCode.startsWith("brake_")) signals.brake = 1;
  if (theme?.reserve_small || coreCode.includes("batt_small")) signals.reserve_small = 1;
  if (coreCode.includes("batt_large")) signals.batt_large = 1;

  const reserveNeed = Math.max(0, -Number(profile?.drive_score || 0));
  if (reserveNeed > 0) signals.reserve_small = Math.max(Number(signals.reserve_small || 0), reserveNeed);
  if (Number(profile?.obstruction_score || 0) > 0) {
    signals.qi_stagnation = Math.max(Number(signals.qi_stagnation || 0), Number(profile.obstruction_score));
  }
  Object.entries(profile?.material || {}).forEach(([key, raw]) => {
    const value = Math.max(0, Number(raw || 0));
    if (value > 0) signals[key] = Math.max(Number(signals[key] || 0), value / (value + 2.5));
  });
  safeArray(theme?.sub_labels).forEach((key, index) => {
    const normalized = key === "dampness" ? "fluid_damp" : key;
    signals[normalized] = Math.max(Number(signals[normalized] || 0), index === 0 ? 1 : 0.72);
  });
  return signals;
}

function lifestyleCandidateScore(candidate, { theme, symptomFocus }) {
  if (symptomFocus && safeArray(candidate?.excluded_symptoms).includes(symptomFocus)) return null;
  if (safeArray(candidate?.modes).length && !safeArray(candidate.modes).includes(theme?.mode)) return null;
  if (theme?.reserve_small && candidate?.effort === "training") return null;

  const primaryTrigger = normalizeDailyCareTrigger(theme?.trigger_key);
  const secondaryTrigger = normalizeDailyCareTrigger(theme?.secondary_trigger_key);
  const activeTriggers = new Set([primaryTrigger, secondaryTrigger].filter(Boolean));
  const requiredTriggers = safeArray(candidate?.requires_all_triggers);
  if (requiredTriggers.length && !requiredTriggers.every((key) => activeTriggers.has(key))) return null;
  const candidateTriggers = safeArray(candidate?.triggers);
  const hasWeatherMatch = candidateTriggers.some((key) => activeTriggers.has(key));
  if (candidate?.requires_weather_match && !hasWeatherMatch) return null;

  const selectedBecause = [];
  const breakdown = { symptom: 0, response: 0, constitution: 0, weather: 0, timing: 0, feasibility: 0 };
  const symptomMatched = Boolean(symptomFocus && safeArray(candidate?.symptoms).includes(symptomFocus));
  if (symptomMatched) {
    const affinity = Math.max(0.25, Number(candidate?.symptom_affinity?.[symptomFocus] || 1));
    breakdown.symptom = Math.min(40, 40 * affinity);
    selectedBecause.push({
      axis: "symptom",
      key: symptomFocus,
      label: SYMPTOM_CONTEXT_LABELS[symptomFocus] || symptomFocus,
      score: breakdown.symptom,
    });
  }

  const triggerAffinity = candidate?.weather_affinity || {};
  if (candidateTriggers.includes(primaryTrigger)) {
    const affinity = Math.max(0.25, Number(triggerAffinity[primaryTrigger] || 1));
    const points = Math.min(12, 12 * affinity);
    breakdown.weather += points;
    selectedBecause.push({
      axis: "weather",
      key: primaryTrigger,
      label: TRIGGER_LABELS[primaryTrigger] || TRIGGER_LABELS.default,
      score: points,
    });
  }
  if (secondaryTrigger && secondaryTrigger !== primaryTrigger && candidateTriggers.includes(secondaryTrigger)) {
    const affinity = Math.max(0.25, Number(triggerAffinity[secondaryTrigger] || 1));
    const points = Math.min(6, 6 * affinity);
    breakdown.weather += points;
    selectedBecause.push({
      axis: "weather",
      key: secondaryTrigger,
      label: TRIGGER_LABELS[secondaryTrigger] || TRIGGER_LABELS.default,
      score: points,
    });
  }
  breakdown.weather = Math.min(12, breakdown.weather);

  const activePolicies = safeArray(theme?.policies).map((policy) => policy.key);
  const policyMatches = safeArray(candidate?.policies)
    .map((key) => ({ key, rank: activePolicies.indexOf(key) }))
    .filter((item) => item.rank >= 0)
    .sort((a, b) => a.rank - b.rank);
  if (policyMatches.length) {
    const bestPolicy = policyMatches[0];
    breakdown.response = bestPolicy.rank === 0 ? 22 : 11;
    if (policyMatches.some((item) => item.rank === 1) && bestPolicy.rank === 0) breakdown.response += 4;
    const policy = POLICY_DEFINITIONS[bestPolicy.key];
    selectedBecause.push({
      axis: "response",
      key: bestPolicy.key,
      label: POLICY_RESPONSE_LABELS[bestPolicy.key] || policy?.guide || bestPolicy.key,
      score: breakdown.response,
    });
  }

  const constitutionSignals = activeConstitutionSignals(theme);
  const constitutionAffinity = candidateConstitutionAffinity(candidate);
  const constitutionMatches = Object.entries(constitutionAffinity)
    .map(([key, affinity]) => ({
      key,
      value: Math.max(0, Number(affinity || 0)) * Math.max(0, Number(constitutionSignals[key] || 0)),
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
  if (constitutionMatches.length) {
    const weighted = constitutionMatches[0].value + Number(constitutionMatches[1]?.value || 0) * 0.35;
    breakdown.constitution = Math.min(20, weighted * 20);
    const best = constitutionMatches[0];
    selectedBecause.push({
      axis: "constitution",
      key: best.key,
      label: CONSTITUTION_CONTEXT_LABELS[best.key] || best.key,
      score: breakdown.constitution,
    });
  }

  breakdown.timing = safeArray(candidate?.modes).length ? 10 : 5;
  if (theme?.reserve_small) {
    const baseFeasibility = candidate?.effort === "low" ? 5 : candidate?.effort === "medium" ? 2 : 0;
    breakdown.feasibility = baseFeasibility + (candidate?.care_kind === "environment" ? 12 : 0);
  } else {
    breakdown.feasibility = candidate?.effort === "low" ? 3 : candidate?.effort === "medium" ? 2 : 1;
  }

  const anchorAxes = new Set(selectedBecause.map((item) => item.axis));
  if (!anchorAxes.size) return null;
  const total = Object.values(breakdown).reduce((sum, value) => sum + Number(value || 0), 0)
    + Number(candidate?.score_adjustment || 0);
  return {
    total: Number(total.toFixed(3)),
    breakdown,
    selectedBecause,
    anchorCount: anchorAxes.size,
    symptomMatched,
  };
}

function rotateNearTies(items, { targetDate, contextKey, offset = 0 } = {}) {
  if (!items.length) return [];
  const best = Number(items[0]?._score || 0);
  const nearTies = items.filter((item) => Number(item?._score || 0) >= best - LIFESTYLE_CANDIDATE_NEAR_TIE_DELTA);
  const index = getDailyCareRotationIndex({ targetDate, contextKey, length: nearTies.length, offset });
  const rotated = [...nearTies.slice(index), ...nearTies.slice(0, index)];
  const ids = new Set(nearTies.map((item) => item.id));
  return [...rotated, ...items.filter((item) => !ids.has(item.id))];
}

function bestLaneScore(items, careKind) {
  const scores = items
    .filter((item) => item?.care_kind === careKind)
    .map((item) => Number(item?._score))
    .filter(Number.isFinite);
  return scores.length ? Math.max(...scores) : -100;
}

function selectLifestyleCareCandidates({
  theme,
  targetDate,
  symptomFocus,
  contextKey,
  limit = 2,
} = {}) {
  const unique = Array.from(new Map([
    ...BODY_MECHANICS_LIFESTYLE_CANDIDATES,
    ...ENVIRONMENT_ADJUSTMENT_CANDIDATES,
  ].filter((item) => item?.id && item?.text).map((item) => [item.id, item])).values());
  const scored = unique
    .map((item) => {
      const candidate = {
        ...item,
        ...(item?.symptom_copy?.[symptomFocus] || {}),
      };
      const result = lifestyleCandidateScore(candidate, { theme, symptomFocus });
      if (!result) return null;
      return {
        ...candidate,
        _score: result.total,
        score_breakdown: result.breakdown,
        selected_because: result.selectedBecause,
        anchor_count: result.anchorCount,
        symptom_matched: result.symptomMatched,
      };
    })
    .filter((item) => item && item._score >= LIFESTYLE_MIN_DISPLAY_SCORE)
    .sort((a, b) => b._score - a._score || b.anchor_count - a.anchor_count || a.id.localeCompare(b.id));

  // 不調が選ばれている時は、今日の主役だけは必ずその不調へ当てる。
  // 天気や体質だけで高得点になった候補は、別案として残す。
  const symptomPool = symptomFocus ? scored.filter((item) => item.symptom_matched) : [];
  const relevantPool = symptomPool.length ? symptomPool : scored;
  const environmentPool = relevantPool.filter((item) => item.care_kind === "environment");
  const bodyPool = relevantPool.filter((item) => item.care_kind === "body");
  const primaryPolicyKey = theme?.policies?.[0]?.key || "";
  const bodyFirst = !theme?.reserve_small && ["yurumeru", "meguraseru"].includes(primaryPolicyKey);
  const primaryPool = theme?.reserve_small && environmentPool.length
    ? environmentPool
    : bodyFirst && bodyPool.length
      ? bodyPool
      : relevantPool;
  const orderedPrimary = rotateNearTies(primaryPool, {
    targetDate,
    contextKey: `${contextKey}|primary`,
  });
  const primary = orderedPrimary[0] || null;
  if (!primary) {
    return {
      selected: [],
      primaryKind: "none",
      primaryCandidateScore: 0,
      laneScores: { body: bestLaneScore(scored, "body"), environment: bestLaneScore(scored, "environment") },
      nearTieRotationApplied: false,
    };
  }

  const selected = [primary];
  const usedIds = new Set([primary.id]);
  const usedFamilies = new Set([primary.scene_family || primary.id]);
  const usedNeeds = new Set(safeArray(primary.care_needs));
  const complementaryKind = primary.care_kind === "body" ? "environment" : "body";
  const alternatives = scored
    .filter((item) => !usedIds.has(item.id) && !usedFamilies.has(item.scene_family || item.id))
    .filter((item) => !symptomFocus || item.symptom_matched)
    .sort((a, b) => {
      const aComplement = a.care_kind === complementaryKind && a.symptom_matched && a._score >= primary._score - LIFESTYLE_COMPLEMENTARY_KIND_DELTA ? 1 : 0;
      const bComplement = b.care_kind === complementaryKind && b.symptom_matched && b._score >= primary._score - LIFESTYLE_COMPLEMENTARY_KIND_DELTA ? 1 : 0;
      if (aComplement !== bComplement) return bComplement - aComplement;
      const aNewNeed = safeArray(a.care_needs).some((key) => !usedNeeds.has(key)) ? 1 : 0;
      const bNewNeed = safeArray(b.care_needs).some((key) => !usedNeeds.has(key)) ? 1 : 0;
      if (aNewNeed !== bNewNeed) return bNewNeed - aNewNeed;
      return b._score - a._score || b.anchor_count - a.anchor_count || a.id.localeCompare(b.id);
    });
  for (const item of alternatives) {
    if (selected.length >= limit) break;
    selected.push(item);
    usedIds.add(item.id);
    usedFamilies.add(item.scene_family || item.id);
    safeArray(item.care_needs).forEach((key) => usedNeeds.add(key));
  }

  const nearTieCount = primaryPool.filter((item) => item._score >= primaryPool[0]._score - LIFESTYLE_CANDIDATE_NEAR_TIE_DELTA).length;
  return {
    selected,
    primaryKind: primary.care_kind || "body",
    primaryCandidateScore: Number(primary._score || 0),
    laneScores: {
      body: bestLaneScore(scored, "body"),
      environment: bestLaneScore(scored, "environment"),
    },
    nearTieRotationApplied: nearTieCount > 1,
  };
}

function buildLifestyleWhyToday(candidate) {
  const reasons = safeArray(candidate?.selected_because);
  const symptom = reasons.find((item) => item.axis === "symptom")?.label || "";
  const weather = reasons.find((item) => item.axis === "weather")?.label || "";
  const constitution = reasons.find((item) => item.axis === "constitution")?.label || "";
  if (symptom && weather && constitution) {
    return `今日は${weather}が背景にあり、${symptom}と${constitution}の傾向に合う一手を選びました。`;
  }
  if (symptom && weather) return `${symptom}と、今日の${weather}に合う一手を選びました。`;
  if (symptom && constitution) return `${symptom}と${constitution}の傾向に合う一手を選びました。`;
  if (symptom) return `${symptom}に合う一手を選びました。`;
  if (weather && constitution) return `今日は${weather}が背景にあり、${constitution}の傾向に合う一手を選びました。`;
  if (weather) return `今日の${weather}に合う一手を選びました。`;
  if (constitution) return `${constitution}の傾向に合う一手を選びました。`;
  return "";
}

function buildLifestyleContextChips(candidate) {
  const reasons = safeArray(candidate?.selected_because);
  const orderedAxes = ["weather", "constitution", "symptom"];
  const labels = orderedAxes
    .map((axis) => reasons.find((item) => item.axis === axis)?.label || "")
    .filter(Boolean);
  if (labels.length < 3) {
    const response = reasons.find((item) => item.axis === "response")?.label || "";
    if (response) labels.splice(1, 0, response);
  }
  return [...new Set(labels)].slice(0, 3);
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
    // 日付が変われば、ほぼ同点の候補だけ自然に次へ回る。today/tomorrowを
    // hashへ混ぜると隣接日の巡回順が読めなくなるため、適合条件だけを鍵にする。
    contextKey: `lifestyle|${trigger}|${secondary}|${symptomFocus || "none"}|${theme?.core_code || "none"}|${policySignature}`,
    limit: 2,
  });
  const selected = selection.selected;
  const primary = selected[0] || null;
  const alternatives = selected.slice(1, 3);
  const timingLabel = theme?.mode === "tomorrow" ? "今夜〜明朝の一手" : "今日の一手";

  if (!primary) {
    const noSuggestionToday = theme?.mode !== "tomorrow";
    return {
      ...plan,
      version: DAILY_CARE_LOGIC_VERSION,
      timing_label: theme?.mode === "tomorrow" ? "今夜〜明朝の一手" : "今日の一手",
      title: theme?.mode === "tomorrow" ? "今夜〜明朝の暮らしの一手" : "今日の暮らしの一手",
      lead: theme?.summary || "身体の使い方か、環境調整から今の一手を選びます。",
      primary_action: null,
      alternatives: [],
      steps: [],
      step_ids: [],
      trap: "",
      no_suggestion: true,
      no_suggestion_text: noSuggestionToday
        ? "今日は、身体の使い方や環境調整で足す一手はありません。食べる・ほぐすを見てみてください。"
        : "今夜〜明朝は、身体の使い方や環境調整で足す一手はありません。食べる・ほぐすを見てみてください。",
      selection_basis: {
        primary_kind: "none",
        body_score: Number(selection.laneScores?.body || 0),
        tool_layout_score: Number(selection.laneScores?.environment || 0),
        environment_score: Number(selection.laneScores?.environment || 0),
        primary_candidate_score: 0,
        lane_score_gap: 0,
        near_tie_delta: LIFESTYLE_CANDIDATE_NEAR_TIE_DELTA,
        lane_rotation_applied: false,
        foundation_included: false,
      },
      care_theme: theme,
    };
  }

  const enhanced = {
    ...plan,
    version: DAILY_CARE_LOGIC_VERSION,
    timing_label: timingLabel,
    title: timingLabel,
    lead: theme?.summary || "身体の使い方か、環境調整から今の一手を選びます。",
    primary_action: {
      id: primary.id,
      label: primary.text,
      care_kind: primary.care_kind || "body",
      kind_label: primary.kind_label || "身体の使い方",
      scene: primary.scene || "",
      scene_family: primary.scene_family || null,
      scene_label: primary.scene_label || "",
      why_today: buildLifestyleWhyToday(primary),
      context_chips: buildLifestyleContextChips(primary),
      target_response: theme?.response_profile?.target_response_label || "",
      selected_because: safeArray(primary.selected_because),
      score_breakdown: primary.score_breakdown || {},
      care_needs: safeArray(primary.care_needs),
      reason: primary.reason || "同じ場所だけへ負担を集めないための動きです。",
      felt_sense: primary.felt_sense || "",
      reset: primary.reset || "",
      item_role: primary.shop_eligible ? primary.item_role || null : null,
      shop_eligible: Boolean(primary.shop_eligible && primary.item_role),
    },
    alternatives: alternatives.map((item) => ({
      id: item.id,
      label: item.text,
      care_kind: item.care_kind || "body",
      kind_label: item.kind_label || "身体の使い方",
      scene: item.scene || "",
      scene_family: item.scene_family || null,
      scene_label: item.scene_label || "",
      why_today: buildLifestyleWhyToday(item),
      context_chips: buildLifestyleContextChips(item),
      target_response: theme?.response_profile?.target_response_label || "",
      selected_because: safeArray(item.selected_because),
      score_breakdown: item.score_breakdown || {},
      care_needs: safeArray(item.care_needs),
      reason: item.reason || "",
      felt_sense: item.felt_sense || "",
      reset: item.reset || "",
      item_role: item.shop_eligible ? item.item_role || null : null,
      shop_eligible: Boolean(item.shop_eligible && item.item_role),
    })),
    steps: [primary.text, ...alternatives.map((item) => item.text)],
    step_ids: [primary.id, ...alternatives.map((item) => item.id)],
    // v7.79.10以前の予定・休憩・止め時コピーを、保存済みスナップショット
    // から持ち越さない。暮らすは身体の使い方と環境調整だけに限定する。
    trap: "",
    selection_basis: {
      primary_kind: selection.primaryKind,
      body_score: Number(selection.laneScores?.body || 0),
      tool_layout_score: Number(selection.laneScores?.environment || 0),
      environment_score: Number(selection.laneScores?.environment || 0),
      primary_candidate_score: Number(selection.primaryCandidateScore || 0),
      lane_score_gap: Number(
        Math.abs(Number(selection.laneScores?.body || 0) - Number(selection.laneScores?.environment || 0)).toFixed(3)
      ),
      near_tie_delta: LIFESTYLE_CANDIDATE_NEAR_TIE_DELTA,
      lane_rotation_applied: Boolean(selection.nearTieRotationApplied),
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
    // 古い固定予報のlifestyle_planは現在の候補契約と混ぜず、表示時に
    // 現行ルールから作り直す。予報点数や天気データは再計算しない。
    basePlan: plan?.version === DAILY_CARE_LOGIC_VERSION ? plan.lifestyle_plan || null : null,
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
