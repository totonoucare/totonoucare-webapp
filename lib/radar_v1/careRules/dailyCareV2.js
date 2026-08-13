// lib/radar_v1/careRules/dailyCareV2.js
// Daily Care v2: forecast logic chooses the care direction; this layer turns it
// into a stable, varied and concise daily action without changing the forecast.

export const DAILY_CARE_LOGIC_VERSION = "daily_care_v2_25_2026-08-13_natural_copy_polish";

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
    symptoms: ["neck_shoulder", "headache", "dizziness"],
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
    text: "片手に集めている荷物を、分けられるなら左右へ分ける。難しければ肩掛け・リュック・キャリーへ重さを移す",
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
        item_role: "screen_height",
      },
    },
    triggers: ["cold", "damp", "temp_shift", "pressure_down"],
    weather_affinity: { damp: 1, temp_shift: 0.95, pressure_down: 0.9, cold: 0.55 },
    symptom_affinity: { digestion: 1, neck_shoulder: 0.95, low_back_pain: 0.95, fatigue: 0.85 },
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
    symptoms: ["low_back_pain", "fatigue", "swelling", "digestion"],
    symptom_copy: {
      digestion: {
        scene: "座っているうちに、お腹まわりが詰まる感じがするなら",
        text: "足元へ安定した台を置き、足裏全体を預ける。お尻が前へ滑らず、お腹を折りたたまない高さにする",
        reason: "足元の支えを作ると、座っている間に身体が前へずれて、お腹を圧迫し続けるのを防げます。",
        felt_sense: "足を組まなくても、お腹の前に余裕を残して座れればその高さでOK。",
        reset: "膝がお腹へ近づきすぎるなら、台を一段低くしよう。",
      },
    },
    triggers: ["damp", "pressure_down", "cold"],
    weather_affinity: { cold: 1, pressure_down: 0.85, damp: 0.25 },
    symptom_affinity: { low_back_pain: 1, fatigue: 0.9, swelling: 0.9, digestion: 0.82 },
    policies: ["sasaeru", "nagasu", "nukumeru"],
    constitution_affinity: { brake: 0.7, reserve_small: 0.75, fluid_damp: 0.5 },
    care_needs: ["support_seated_contact", "distribute_load"],
    item_role: "sitting_support",
    shop_eligible: true,
    effort: "low",
  },
  {
    id: "tool-light-zone",
    care_kind: "environment",
    kind_label: "環境調整",
    scene_family: "reduce_sensory_input",
    scene_label: "光の入口を絞る",
    scene: "眠る前に部屋の光が強いなら",
    text: "天井灯を消し、手元灯か間接照明だけにする。スマホは明るさを一段下げ、見終えたら画面を消して手の届きにくい場所へ置く",
    reason: "目へ入る光と、続けて画面を見るきっかけを減らし、休む時間へ切り替えやすくします。",
    felt_sense: "目の奥や眉間へ力が入りにくければ、その明るさでOK。",
    reset: "手元が見えにくいなら、部屋全体ではなく手元灯だけ明るくしよう。",
    symptoms: ["headache", "sleep", "mood"],
    triggers: ["pressure_up", "pressure_down", "heat", "cold", "dry", "damp", "temp_shift"],
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
    symptom_copy: {
      digestion: {
        scene: "胃腸が重い日に、座る時間が続くなら",
        text: "椅子の奥へ座って背もたれへ背中を預ける。お腹が折れ曲がらない範囲で、腰の隙間へ薄いタオルを入れる",
        reason: "食後や作業中に、前かがみのままお腹を圧迫し続ける時間を減らせます。",
        felt_sense: "背中を預けても、お腹の前に余裕があればその厚さでOK。",
        reset: "腰が押されるなら、タオルを一段薄くしよう。",
      },
    },
    triggers: ["damp", "pressure_down", "pressure_up", "cold", "temp_shift", "heat", "dry"],
    weather_affinity: { dry: 1, pressure_up: 0.95, cold: 0.9, heat: 0.8, pressure_down: 0.7, temp_shift: 0.6, damp: 0.55 },
    symptom_affinity: { low_back_pain: 1, fatigue: 0.9, digestion: 0.94 },
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
    reason: "よく見る物を正面へ集めると、頭を何度も大きく動かさずに確認できます。",
    felt_sense: "見る物を切り替えても、ふわつきが増えなければその配置でOK。",
    reset: "手元が狭くなるなら、今日よく使う物だけ正面へ残そう。",
    symptoms: ["dizziness", "headache", "neck_shoulder"],
    triggers: ["pressure_down", "pressure_up", "temp_shift", "damp", "heat", "dry", "cold"],
    policies: ["sasaeru", "yurumeru", "shizumeru"],
    constitution_affinity: { brake: 0.65, reserve_small: 0.9, qi_deficiency: 0.45 },
    care_needs: ["reduce_head_turns", "reduce_visual_load"],
    item_role: "visual_layout",
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
    headline: "指で引き寄せず、手のひらの付け根から包む",
    text: "指先を物へ添えた位置は残し、手首に近い手のひらの付け根を物へ近づける。手のひらの中央に浅いくぼみを残し、包むように持つ",
    reason: "指先と前腕だけで握り込まず、手から腕へ動きを分けやすくなります。",
    felt_sense: "指先の食い込みと手首の力みが少し減ればOK。",
    reset: "滑りそうなら無理せず、両手で持つかいつもの持ち方へ戻そう。",
  },
  "tension-little-finger-thumb-line": {
    scene_family: "hold_carry",
    symptoms: ["neck_shoulder", "fatigue"],
    headline: "小指側から包み、親指は軽く添える",
    text: "指先を添えた位置のまま、手首に近い手のひらの付け根を物へ近づける。小指側から包み、親指は強く握り込まず軽く添える",
    reason: "親指と手首だけに力を集めず、手のひら全体で物を支えやすくなります。",
    felt_sense: "親指の付け根と手首が少し楽ならOK。",
    reset: "物が安定しないなら、両手で持つかいつもの持ち方へ戻そう。",
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
    scene_family: "hold_carry",
    symptoms: ["neck_shoulder", "low_back_pain"],
    headline: "物を身体の近くに保ち、足から向きを変える",
    text: "物を身体の近くに保ったまま、行きたい方向へ足を一歩出す。胸と物を一緒にその方向へ向ける",
    reason: "足から向きを変えると、物を持った腕と腰が一緒についてきやすくなります。",
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
    headline: "後頭部を1cm上へ運ぶつもりで、顔を起こす",
    text: "足裏を床へ置き、後頭部を1cm上へ運ぶつもりで顔を起こしてみる",
    reason: "首の後ろをつぶさず、視線を戻しやすくなります。",
    felt_sense: "顔を上げたあと、首の重さが残りにくければOK。",
    reset: "あごが上がるなら、動きを半分にしよう。",
  },
  "tension-wall-axis": {
    scene_family: "screen_handwork",
    symptoms: ["neck_shoulder", "headache", "fatigue"],
    headline: "手元へ近づき、前腕のひじ寄りを台へ載せる",
    text: "手元の作業へ体を近づけ、前腕のひじ寄りを安定した台へそっと載せる",
    reason: "腕の重さを肩だけで持ち続けずに済みます。",
    felt_sense: "肩を下げようとしなくても、手が動けばOK。",
    reset: "足が浮くなら、椅子を戻すか足元へ台を置こう。",
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
    headline: "片足を半歩前へ出して、前後を入れ替える",
    text: "片足を半歩前へ。しばらくしたら、前後の足を入れ替える",
    reason: "片方の脚と腰へ重さが居座りにくくなります。",
    felt_sense: "腰を横へ押し出す感じが減ったらOK。",
    reset: "ふらつくなら、両足を横に並べて戻ろう。",
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
    felt_sense: "地面を強く蹴る感じや足音が少し減ればOK。",
    reset: "前へ倒れそうなら、いつもの歩幅へ戻そう。",
  },
  "tension-seated-foot-head": {
    scene_family: "hold_posture",
    symptoms: ["low_back_pain", "fatigue"],
    headline: "お尻を左右へ小さく揺らして、座る場所を探す",
    text: "足をほどいて両足裏を床へ。お尻を左右へ小さく揺らし、片側の重さが減る所で止める",
    reason: "座り直すだけで、片方の腰へ集まった重さを散らせます。",
    felt_sense: "両方のお尻で座っている感じがあればOK。",
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
    headline: "段差へ前の足裏を置き、身体をその上へ運ぶ",
    text: "段差では、置ける範囲で前の足裏を載せる。胸を前の膝の上へ運んでから上がる",
    reason: "後ろ足で強く蹴る感じが減りやすくなります。",
    felt_sense: "前の足で立ち上がる感じがあればOK。",
    reset: "ふらつくなら、手すりを使っていつもの上り方へ。",
    effort: "medium",
  },
  "tension-reach-thumb-line": {
    scene_family: "reach_take",
    symptoms: ["neck_shoulder", "low_back_pain"],
    headline: "近づける物には、身体を先に寄せる",
    text: "近づける物なら、ひじが少し曲がる所まで身体を寄せてから手を伸ばす",
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
    headline: "分けられる荷物は、左右へ持つ",
    text: "荷物を分けられる時は、左右の手に一つずつ持つ。腕は身体の近くへ置く",
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
    scene_family: "screen_handwork",
    symptoms: ["neck_shoulder", "headache"],
    headline: "見たい方向へ、椅子か足も一緒に向ける",
    text: "先に見たい方向へ目を向ける。次に、椅子か足を動かして胸もそちらへ向ける",
    reason: "首だけで何度も振り向かずに済みます。",
    felt_sense: "振り向いたあと、首がすぐ戻るならOK。",
    reset: "肩が置いていかれるなら、椅子か足をもう少し回そう。",
  },
  "tension-palm-axis-reset": {
    scene_family: "screen_handwork",
    symptoms: ["neck_shoulder", "headache", "fatigue"],
    headline: "手のひらを太ももへ置き、指を3回ひらく",
    text: "道具を置き、手のひらを太ももへ。指をゆっくり開いて戻す動きを3回",
    reason: "握り続けていた指と手のひらの力を、いったん抜けやすくします。",
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
    // 身体操作は動きとして完結させ、商品へ直接変換しない。ショップは
    // 同じ反応プロファイルに合う環境調整の機能から別に組み立てる。
    item_role: null,
    shop_eligible: false,
    // 画面の場面名は九つの基本動作を正本にする。個別候補に残る
    // 「まな板」「モップ」などの旧sceneで上書きしない。
    scene: sceneDefinition?.scene || "身体を使う時は",
  };
});


const FOOD_IDEAS = {
  damp: [
    { id: "damp-soba", label: "温かいそば＋大根おろし・しそを少し", note: "汁気があって食べやすく、香味を添えるとさっぱり食べられます。", tags: ["light", "aroma", "quick"] },
    { id: "damp-onigiri", label: "おにぎり＋茶碗蒸し＋温かいお茶", note: "量を増やしすぎず、主食とたんぱく質をそろえられます。", tags: ["light", "support", "quick"] },
    { id: "damp-chicken", label: "蒸し鶏と夏野菜＋少量のごはん", note: "油を控えながら、たんぱく質と主食も取れます。", tags: ["support", "light", "home"] },
    { id: "damp-oat", label: "だしで煮たオートミール＋卵・小ねぎ", note: "やわらかく温かい形で、食後の重さを残しにくくします。", tags: ["digestion", "quick", "support"] },
    { id: "damp-fish", label: "白身魚の蒸し物＋大根・柑橘＋ごはん少なめ", note: "油を控えた魚料理に大根や柑橘を添え、さっぱり食べられます。", tags: ["aroma", "light", "home"] },
  ],
  pressure_down: [
    { id: "pd-rice", label: "小さめのおにぎり＋具だくさんの汁物", note: "食事を抜かず、あとで動き出せる軽さに整えます。", tags: ["support", "light", "quick"] },
    { id: "pd-soba", label: "温かいそば＋焼きのり・ねぎ", note: "頭と胃腸が重い日に、量を増やさず温かさと香りを足します。", tags: ["aroma", "light", "quick"] },
    { id: "pd-fish", label: "焼き魚＋大根おろし＋ごはん少なめ", note: "脂っこさを控えながら、魚とごはんで一食としてまとまります。", tags: ["support", "home"] },
    { id: "pd-chawan", label: "茶碗蒸し＋梅のおにぎり", note: "食欲が揺れる時でも、やわらかく小さく入りやすい組み合わせです。", tags: ["digestion", "quick"] },
    { id: "pd-soup", label: "鶏と大根のスープ＋少量のごはん", note: "汁気を使い、胃腸の動きが遅い日にも重さを残しにくくします。", tags: ["support", "digestion"] },
  ],
  pressure_up: [
    { id: "pu-fish", label: "焼き魚定食を、ごはん少なめ・味つけ薄めで", note: "辛味や濃い味を控え、急いで食べにくい定食にします。", tags: ["support", "calm"] },
    { id: "pu-chicken", label: "蒸し鶏＋温野菜＋柑橘を少し", note: "油と辛味を控え、柑橘の香りでさっぱり食べられます。", tags: ["aroma", "light", "calm"] },
    { id: "pu-soba", label: "そば＋大根おろし＋焼きのり", note: "濃い味を避けながら、量を調整しやすい一食です。", tags: ["light", "quick"] },
    { id: "pu-tofu", label: "豆腐ときのこのスープ＋少量のごはん", note: "刺激の強い味つけを避けながら、温かく軽めに食べられます。", tags: ["calm", "digestion"] },
    { id: "pu-onigiri", label: "おにぎり＋ゆで卵＋常温の飲み物", note: "忙しい時も、カフェインだけで済ませず主食とたんぱく質を取れます。", tags: ["quick", "support"] },
  ],
  cold: [
    { id: "cold-porridge", label: "しょうがを少量入れた卵雑炊", note: "お腹を冷やさず、食欲が弱い時にも食べやすい一食です。", tags: ["warm", "digestion", "support"] },
    { id: "cold-udon", label: "鶏と根菜の温かいうどん", note: "温かい一皿で、主食とたんぱく質を一緒に取れます。", tags: ["warm", "support", "quick"] },
    { id: "cold-salmon", label: "ごはん＋焼き鮭＋根菜の味噌汁", note: "温かい汁物と主菜をそろえ、冷たい物だけで済ませずに食べられます。", tags: ["warm", "support", "home"] },
    { id: "cold-pot", label: "豆腐と鶏肉の小鍋＋ごはん少なめ", note: "熱くしすぎず、温かい汁気でお腹を守ります。", tags: ["warm", "digestion"] },
    { id: "cold-chawan", label: "茶碗蒸し＋温かいおにぎり茶漬け", note: "食欲が弱い時も、冷たさを入れず少量から始められます。", tags: ["warm", "light", "quick"] },
  ],
  heat: [
    { id: "heat-shabu", label: "冷やしすぎない豚しゃぶ＋ごはん少なめ", note: "脂っこさを控えながら、冷たい物だけに偏らず食べられます。", tags: ["cool", "support", "home"] },
    { id: "heat-soba", label: "常温に近いそば＋大根おろし・すだち", note: "大根おろしとすだちで、辛味や油を増やさずさっぱり食べられます。", tags: ["cool", "aroma", "quick"] },
    { id: "heat-fish", label: "白身魚の蒸し物＋トマトを少し＋ごはん", note: "こってりしすぎず、魚とごはんで一食としてまとまります。", tags: ["cool", "light", "home"] },
    { id: "heat-tofu", label: "冷蔵庫から少し置いた豆腐＋おにぎり＋汁物少量", note: "冷えすぎを避けつつ、主食とたんぱく質を少量ずつ取れます。", tags: ["cool", "quick", "digestion"] },
    { id: "heat-chicken", label: "蒸し鶏ときゅうり・トマト＋常温の飲み物", note: "辛味や濃い味を控えながら、たんぱく質も取れます。", tags: ["cool", "support"] },
  ],
  dry: [
    { id: "dry-soup", label: "鶏と大根のとろみスープ＋ごはん", note: "汁気とたんぱく質を一緒に取り、乾いた物だけの食事を避けられます。", tags: ["moist", "support", "digestion"] },
    { id: "dry-tofu", label: "豆腐と卵のスープ＋白ごま", note: "豆腐と卵をスープにすると、乾いた物だけの一食を避けられます。", tags: ["moist", "quick"] },
    { id: "dry-fish", label: "白身魚の煮つけ＋青菜＋ごはん", note: "乾燥する日は、煮汁のある主菜とごはんで食事を整えます。", tags: ["moist", "support", "home"] },
    { id: "dry-porridge", label: "きのこ卵がゆ＋ねぎを少し", note: "食べやすい形で、胃腸へ負担を増やさずうるおいを補います。", tags: ["moist", "digestion", "quick"] },
    { id: "dry-udon", label: "とろろ昆布うどん＋卵", note: "汁気を増やしながら、食事抜きや乾いた菓子だけを避けます。", tags: ["moist", "quick", "support"] },
  ],
  default: [
    { id: "base-set", label: "ごはん＋汁物＋卵か魚を一つ", note: "食材を増やすより、主食・汁気・たんぱく質を小さくそろえます。", tags: ["support", "home"] },
    { id: "base-quick", label: "おにぎり＋茶碗蒸し＋飲み物", note: "忙しい時も、甘い物やカフェインだけで済ませない組み合わせです。", tags: ["quick", "light"] },
    { id: "base-soba", label: "温かいそば＋大根おろし・ねぎ", note: "量を増やさず、温かさと香りを足します。", tags: ["quick", "aroma"] },
    { id: "base-chicken", label: "蒸し鶏と温野菜＋少量のごはん", note: "油を控えながら、たんぱく質と主食をそろえられます。", tags: ["support", "light"] },
    { id: "base-soup", label: "豆腐と青菜のとろみスープ＋ごはん", note: "汁気とやわらかさを足し、乾いた物だけの食事を避けます。", tags: ["moist", "digestion"] },
    { id: "base-aroma", label: "白身魚＋大根おろし・しそ＋ごはん少なめ", note: "油を控えた魚料理に、大根おろしやしそを添えて食べやすくします。", tags: ["aroma", "light"] },
  ],
};

// v7.79.17: 天気別の小さな献立辞書を、身体反応から採点する料理カタログへ置き換える。
// 天気は候補を直接決めず、温度・汁気などの小さな適合加点にだけ使う。
// 料理文化・主たんぱく・料理形式を持たせ、同じ身体方針でも見た目と味が
// 連日似ないように選ぶ。文字列を部品から自動合成せず、自然な完成料理を監修単位にする。
function mealCandidate(id, label, note, policies, tags, cuisine, protein, format, options = {}) {
  return {
    id,
    label,
    note,
    policies,
    tags,
    cuisine,
    protein,
    format,
    symptoms: safeArray(options.symptoms),
    sub_labels: safeArray(options.sub_labels),
    triggers: safeArray(options.triggers),
    avoid_triggers: safeArray(options.avoid_triggers),
    effort: options.effort || "normal",
    prep: options.prep || "",
  };
}

const RESPONSE_MEAL_CATALOG = [
  // しずめる：刺激を増やさず、酸味・香草・だしで単調さを避ける。
  mealCandidate("calm-lemon-fish", "白身魚ときのこのレモン蒸し＋ごはんと温野菜", "辛味や濃い味を重ねず、柑橘とだしで食べやすくします。", ["shizumeru", "uruosu"], ["calm", "moist", "aroma", "support"], "和洋", "fish", "set"),
  mealCandidate("calm-pork-oroshi", "豚しゃぶと焼きなすのみぞれだれ＋麦ごはん", "油を控えた豚肉に大根おろしを合わせ、重さを残しにくくします。", ["shizumeru", "nagasu"], ["calm", "cool", "light", "aroma", "support"], "和食", "pork", "set", { triggers: ["heat", "damp"], avoid_triggers: ["cold", "dry"] }),
  mealCandidate("calm-chicken-citrus", "蒸し鶏とトマト・きゅうりの柑橘だれ＋ごはん少なめ", "熱い物や辛い物へ寄せず、さっぱりした主菜で一食を整えます。", ["shizumeru", "sasaeru"], ["calm", "cool", "light", "support"], "和食", "chicken", "plate", { triggers: ["heat", "damp"], avoid_triggers: ["cold", "dry"] }),
  mealCandidate("calm-salmon-escabeche", "鮭と彩り野菜の南蛮漬け＋小さめのごはん", "強い刺激ではなく、穏やかな酸味で魚と野菜を食べやすくします。", ["shizumeru", "meguraseru"], ["calm", "aroma", "moist", "support"], "洋食", "fish", "set"),
  mealCandidate("calm-tofu-ankake", "豆腐と青菜の塩あんかけ＋ごはん", "味を濃くしすぎず、とろみのある主菜で乾きと高ぶりを増やしにくくします。", ["shizumeru", "uruosu"], ["calm", "moist", "digestion"], "中華", "tofu", "rice"),
  mealCandidate("calm-turkey-pita", "鶏肉と焼き野菜のピタサンド・ヨーグルトハーブソース", "揚げ物や辛味を使わず、香草のある軽い一食にします。", ["shizumeru", "yurumeru"], ["calm", "aroma", "support"], "地中海", "chicken", "bread"),
  mealCandidate("calm-sea-bream-dashi", "鯛と三つ葉のだし茶漬け＋焼き野菜", "濃い味を重ねず、だしと香りでゆっくり食べやすい一食です。", ["shizumeru", "yurumeru"], ["calm", "moist", "aroma", "digestion"], "和食", "fish", "rice"),
  mealCandidate("calm-chickpea-taboule", "ひよこ豆と蒸し鶏のタブレ風サラダ＋小さめのパン", "レモンと香草を使い、油や刺激を増やさず食べ応えを残します。", ["shizumeru", "sasaeru"], ["calm", "aroma", "support", "cool"], "中東", "beans", "plate"),

  // ゆるめる：一皿でまとまり、香りと汁気があって急いでかき込みにくい料理。
  mealCandidate("relax-acquapazza", "白身魚とあさりのトマト蒸し＋パン少量", "魚介のだしとトマトの汁気で、濃い味に頼らず食べられます。", ["yurumeru", "uruosu"], ["aroma", "moist", "calm", "support"], "洋食", "fish", "plate"),
  mealCandidate("relax-mushroom-risotto", "温かい鶏肉ときのこの和風リゾット＋青菜", "だしの香りとやわらかさを使い、食べきりやすい一皿にします。", ["yurumeru", "uruosu"], ["warm", "moist", "aroma", "digestion", "support"], "和洋", "chicken", "rice"),
  mealCandidate("relax-basil-pasta", "鶏肉とズッキーニのバジルトマトパスタ", "辛味を足さず、バジルとトマトの香りで気分を切り替えます。", ["yurumeru", "meguraseru"], ["cool", "aroma", "calm", "support"], "イタリアン", "chicken", "noodle", { triggers: ["heat", "damp"], avoid_triggers: ["cold", "dry"] }),
  mealCandidate("relax-shiso-soboro", "鶏そぼろとしそ・炒りごまの混ぜごはん＋焼き野菜", "しそとごまの香りを使い、食べやすい一皿へまとめます。", ["yurumeru", "sasaeru"], ["aroma", "support", "quick"], "和食", "chicken", "rice"),
  mealCandidate("relax-salmon-potato", "鮭とじゃがいものディル蒸し＋ライ麦パン", "ディルとレモンを添え、重いソースを使わず満足感を残します。", ["yurumeru", "sasaeru"], ["aroma", "support", "moist"], "北欧", "fish", "plate"),
  mealCandidate("relax-mild-mapotofu", "生姜とねぎの辛くない麻婆豆腐＋青菜＋ごはん", "花椒や唐辛子を強くせず、生姜とねぎの香りで食べやすくします。", ["yurumeru", "meguraseru"], ["aroma", "warm", "support"], "中華", "tofu", "rice"),
  mealCandidate("relax-chicken-tagine", "鶏肉と根菜のレモン煮＋ごはん少なめ", "レモンとだしの香りを使い、油を増やさず食べやすくします。", ["yurumeru", "meguraseru"], ["aroma", "warm", "moist", "support"], "洋食", "chicken", "set"),
  mealCandidate("relax-tuna-potato", "まぐろとじゃがいもの温かいニース風サラダ＋パン", "温野菜と魚を一皿にし、急いで主食だけを食べる形を避けます。", ["yurumeru", "sasaeru"], ["calm", "support", "moist"], "フレンチ", "fish", "plate"),

  // めぐらせる：柑橘・香味野菜・香辛料を強すぎない範囲で使う。
  mealCandidate("move-ginger-pho", "鶏むねときのこの生姜フォー", "生姜と香味野菜を使い、油を増やさず温かい麺にします。", ["meguraseru", "nagasu"], ["aroma", "light", "warm", "moist"], "ベトナム", "chicken", "noodle"),
  mealCandidate("move-citrus-katsuo", "かつおのたたき香味野菜丼・柑橘だれ", "しそ・みょうが・柑橘を合わせ、濃い味へ寄せず香りを立てます。", ["meguraseru", "nagasu"], ["aroma", "light", "support"], "和食", "fish", "rice"),
  mealCandidate("move-cumin-chicken", "鶏肉とひよこ豆のクミントマト煮＋ごはん少なめ", "クミンとトマトの香りで、辛くしなくても満足しやすくします。", ["meguraseru", "sasaeru"], ["aroma", "warm", "moist", "support"], "中東", "chicken", "stew"),
  mealCandidate("move-celery-fish", "白身魚とセロリの黒酢蒸し＋ごはん", "セロリと黒酢の香りを使い、揚げずに魚を食べやすくします。", ["meguraseru", "nagasu"], ["aroma", "light", "moist"], "中華", "fish", "set"),
  mealCandidate("move-shiso-pork", "豚肉とれんこんのしそ生姜炒め＋ごはん", "油を控えめにし、しそと生姜で重くない炒め物にします。", ["meguraseru", "sasaeru"], ["aroma", "support", "warm"], "和食", "pork", "set"),
  mealCandidate("move-herb-falafel", "焼きひよこ豆ボールと香草サラダのプレート＋ピタ", "揚げずに焼き、ハーブとレモンで豆料理を軽くまとめます。", ["meguraseru", "nagasu"], ["aroma", "light", "support"], "中東", "beans", "plate"),
  mealCandidate("move-gremolata-salmon", "鮭のグリル・レモンパセリソース＋温野菜", "香味のあるソースを少量使い、濃い味や油へ頼らず食べます。", ["meguraseru", "shizumeru"], ["aroma", "calm", "support"], "イタリアン", "fish", "plate"),
  mealCandidate("move-coriander-rice", "海老と野菜の香菜レモン炒め＋ジャスミンライス", "香菜とレモンを使い、辛味を強くせず香りの違いを出します。", ["meguraseru", "shizumeru"], ["aroma", "light", "support"], "東南アジア", "seafood", "rice"),

  // ながす：油と量を重ねず、香味・酸味・蒸し調理を使う。
  mealCandidate("light-ume-pork", "豚しゃぶと焼きなすのみょうが梅だれ＋麦ごはん少なめ", "油を控え、梅とみょうがで食後の重さを残しにくくします。", ["nagasu", "sasaeru"], ["cool", "light", "aroma", "support"], "和食", "pork", "set", { symptoms: ["digestion", "swelling"], sub_labels: ["fluid_damp"], triggers: ["heat", "damp"], avoid_triggers: ["cold", "dry"] }),
  mealCandidate("light-fish-tomato", "たら・あさり・トマトの軽い蒸し煮＋バゲット少量", "魚介のだしを使い、油の多いソースなしで一食をまとめます。", ["nagasu", "uruosu"], ["light", "moist", "support"], "地中海", "fish", "plate"),
  mealCandidate("light-chicken-oroshi", "豆腐入り鶏つくねのみぞれ煮＋ごはん", "脂の少ないつくねに大根おろしを合わせ、やわらかく食べます。", ["nagasu", "sasaeru"], ["light", "moist", "digestion", "support"], "和食", "chicken", "set"),
  mealCandidate("light-shrimp-ankake", "海老と青梗菜の生姜あんかけごはん・小盛り", "油を控えたあんかけにし、生姜の香りと汁気を足します。", ["nagasu", "meguraseru"], ["light", "aroma", "moist"], "中華", "seafood", "rice"),
  mealCandidate("light-fish-tacos", "白身魚の焼きタコス・紫キャベツとライム添え", "魚は揚げずに焼き、ライムと野菜で軽く食べられる形にします。", ["nagasu", "meguraseru"], ["light", "aroma", "support"], "メキシカン", "fish", "bread"),
  mealCandidate("light-turkey-bulgur", "鶏肉とパセリのブルグルサラダ・レモン風味", "穀物と鶏肉を少量ずつ合わせ、香草と酸味で重さを抑えます。", ["nagasu", "sasaeru"], ["light", "aroma", "support"], "中東", "chicken", "grain"),
  mealCandidate("light-soba-duck", "鴨と焼きねぎの温かいつけそば・麺少なめ", "麺だけで終えず、鴨とねぎを合わせて量を小さく整えます。", ["nagasu", "sasaeru"], ["light", "warm", "support"], "和食", "duck", "noodle"),
  mealCandidate("light-tofu-bibimbap", "豆腐と彩り野菜のビビンバ・辛味控えめ", "ごま油と辛味を少量にし、野菜と豆腐を一皿にまとめます。", ["nagasu", "meguraseru"], ["light", "aroma", "support"], "韓国", "tofu", "rice"),

  // うるおす：汁物だけでなく、蒸し煮・あん・ソース・煮込みで水分を残す。
  mealCandidate("moist-chicken-fricassee", "鶏肉ときのこの軽いフリカッセ＋パン", "煮汁を残し、乾いた主食だけにならない一皿にします。", ["uruosu", "sasaeru"], ["moist", "support", "calm"], "フレンチ", "chicken", "stew"),
  mealCandidate("moist-fish-ankake", "白身魚と白菜の柚子あんかけ＋ごはん", "蒸した魚にあんを合わせ、柚子の香りと汁気を足します。", ["uruosu", "meguraseru"], ["moist", "aroma", "digestion"], "和食", "fish", "set"),
  mealCandidate("moist-tomato-beans", "白いんげん豆と鶏肉のトマト煮＋パン", "豆と鶏肉を煮汁ごと食べ、乾いた軽食だけになるのを避けます。", ["uruosu", "sasaeru"], ["moist", "support"], "地中海", "beans", "stew"),
  mealCandidate("moist-salmon-chowder", "鮭とじゃがいもの豆乳チャウダー＋全粒パン", "豆乳の汁気と魚を合わせ、主食だけで済ませない一食です。", ["uruosu", "sasaeru"], ["moist", "support", "warm"], "洋食", "fish", "stew"),
  mealCandidate("moist-chicken-congee", "鶏肉・青菜・香味野菜の中華がゆ", "鶏のだしとやわらかな米を使い、食欲が揺れる時にも量を調整できます。", ["uruosu", "sasaeru"], ["moist", "digestion", "warm", "support"], "中華", "chicken", "rice"),
  mealCandidate("moist-eggplant-moussaka", "なすとひよこ豆の軽いムサカ風＋サラダ", "なすとトマトの水分を生かし、チーズと油を控えめにします。", ["uruosu", "shizumeru"], ["moist", "calm", "support"], "地中海", "beans", "plate"),
  mealCandidate("moist-pork-cabbage", "豚肉とキャベツの蒸し煮・粒マスタード少量＋パン", "蒸し煮の汁気を残し、乾いたパンだけで終わらないようにします。", ["uruosu", "yurumeru"], ["moist", "aroma", "support"], "洋食", "pork", "plate"),
  mealCandidate("moist-tofu-tomato", "豆腐と海老のトマト卵煮＋ごはん", "豆腐とトマトを煮汁ごと食べ、やわらかい主菜にします。", ["uruosu", "sasaeru"], ["moist", "digestion", "support"], "中華", "seafood", "rice"),

  // ぬくめる：温度だけでなく、煮込み・焼き物・穏やかな香辛料で表現する。
  mealCandidate("warm-chicken-potaufeu", "鶏肉と根菜のポトフ＋ライ麦パン", "根菜と鶏肉を温かい煮込みにし、一皿で主食と主菜をそろえます。", ["nukumeru", "sasaeru"], ["warm", "moist", "support"], "洋食", "chicken", "stew"),
  mealCandidate("warm-ginger-pork-rice", "豚肉と生姜の炊き込みごはん＋焼きねぎ", "生姜とねぎの香りを使い、冷たい物だけで済ませない一食にします。", ["nukumeru", "meguraseru"], ["warm", "aroma", "support"], "和食", "pork", "rice"),
  mealCandidate("warm-cod-chowder", "たらと白菜の豆乳シチュー＋パン", "魚と白菜を温かい煮込みにし、重いクリームを使いすぎずまとめます。", ["nukumeru", "uruosu"], ["warm", "moist", "support"], "洋食", "fish", "stew"),
  mealCandidate("warm-mild-keema", "鶏ひき肉と根菜の甘口キーマカレー＋ごはん少なめ", "辛味を強くせず、香辛料と温かさで食べやすくします。", ["nukumeru", "meguraseru"], ["warm", "aroma", "support"], "インド", "chicken", "rice"),
  mealCandidate("warm-tofu-jjigae", "辛くしない豆腐とあさりの韓国風煮込み＋ごはん", "唐辛子を控え、生姜とねぎを使った温かい煮込みにします。", ["nukumeru", "sasaeru"], ["warm", "moist", "support"], "韓国", "tofu", "stew"),
  mealCandidate("warm-salmon-roast", "鮭と根菜のハーブオーブン焼き＋温かい麦サラダ", "焼いた根菜と魚を合わせ、冷たい副菜だけに偏らないようにします。", ["nukumeru", "sasaeru"], ["warm", "aroma", "support"], "洋食", "fish", "plate"),
  mealCandidate("warm-beef-pho", "牛肉とねぎの温かいフォー・八角控えめ", "温かいだしとねぎを使い、油の多い麺料理より軽くまとめます。", ["nukumeru", "meguraseru"], ["warm", "aroma", "moist", "support"], "ベトナム", "beef", "noodle"),
  mealCandidate("warm-chicken-gratin", "鶏肉と里芋の味噌豆乳グラタン＋青菜", "里芋と豆乳で温かくまとめ、チーズは少量にします。", ["nukumeru", "sasaeru"], ["warm", "support", "moist"], "和洋", "chicken", "plate"),

  // ささえる：主食とたんぱく質を確保しつつ、料理文化を固定しない。
  mealCandidate("support-oyakodon", "鶏肉と三つ葉の親子丼＋焼き野菜", "丼を小さめにし、鶏肉と卵で主食だけになるのを避けます。", ["sasaeru", "yurumeru"], ["support", "quick", "moist"], "和食", "chicken", "rice"),
  mealCandidate("support-salmon-bowl", "焼き鮭とアボカドの玄米ボウル・柑橘しょうゆ", "魚・主食・野菜を一皿にし、食事を抜かずに整えます。", ["sasaeru", "meguraseru"], ["support", "aroma"], "和洋", "fish", "rice"),
  mealCandidate("support-chicken-paella", "鶏肉とあさりの小さめパエリア＋温野菜", "米・鶏肉・魚介を一皿にまとめ、量を増やしすぎず食べ応えを残します。", ["sasaeru", "meguraseru"], ["support", "aroma", "moist"], "スペイン", "chicken", "rice"),
  mealCandidate("support-lentil-pasta", "レンズ豆と鶏肉のトマトパスタ＋青菜", "豆と鶏肉を合わせ、麺だけで食事を終えないようにします。", ["sasaeru", "uruosu"], ["support", "moist"], "イタリアン", "beans", "noodle"),
  mealCandidate("support-saba-sand", "焼きさばと紫キャベツのレモンサンド＋野菜スープ", "魚をはさんだパンと野菜を合わせ、菓子パンだけの食事を避けます。", ["sasaeru", "meguraseru"], ["support", "aroma", "moist"], "北欧", "fish", "bread"),
  mealCandidate("support-tofu-loco", "豆腐入り鶏ハンバーグのロコモコ風・ソース控えめ", "鶏肉と豆腐を使い、主食と主菜を一皿でそろえます。", ["sasaeru", "yurumeru"], ["support", "quick"], "ハワイ風", "chicken", "rice"),
  mealCandidate("support-pork-noodles", "豚肉と青菜のあんかけ焼きそば・油控えめ", "豚肉と野菜をあんにし、麺だけで済ませず一食にまとめます。", ["sasaeru", "uruosu"], ["support", "moist", "warm"], "中華", "pork", "noodle"),
  mealCandidate("support-bean-chili", "豆と牛肉の辛くないチリコンカン＋トルティーヤ", "豆と肉を一緒に取り、辛味を強くせず食べ応えを作ります。", ["sasaeru", "meguraseru"], ["support", "warm", "aroma"], "メキシカン", "beef", "plate"),
];

// 買って済ませる候補は、一般名だけでなく具・味・組み合わせまで固定する。
// 特定チェーンの商品名にはせず、店頭で同等品を探せる粒度を正本にする。
const BUY_MEAL_CATALOG = [
  mealCandidate("buy-calm-salmon", "鮭おにぎり＋蒸し鶏と海藻のサラダ", "濃い味へ寄せず、主食とたんぱく質を小さくそろえます。", ["shizumeru", "sasaeru"], ["calm", "support", "cool"], "和食", "fish", "buy", { effort: "buy" }),
  mealCandidate("buy-calm-sand", "全粒粉のハムたまごサンド＋トマト味の豆スープ", "パンだけで終えず、豆の入ったスープを合わせます。", ["shizumeru", "sasaeru"], ["calm", "support", "moist"], "洋食", "egg", "buy", { effort: "buy" }),
  mealCandidate("buy-calm-chicken", "蒸し鶏と野菜のロールサンド＋かぼちゃのポタージュ", "辛味のない主食と温かい汁気を合わせ、刺激を増やしません。", ["shizumeru", "uruosu"], ["calm", "moist", "support"], "洋食", "chicken", "buy", { effort: "buy" }),
  mealCandidate("buy-calm-soba", "とろろそば＋ほうれん草のごまあえ", "濃い味を重ねず、麺だけで終えない組み合わせです。", ["shizumeru", "yurumeru"], ["calm", "moist", "aroma"], "和食", "other", "buy", { effort: "buy" }),

  mealCandidate("buy-relax-ume", "梅おにぎり＋だし巻き卵＋きのこの和風スープ", "梅とだしの香りを使い、急いで菓子だけを食べる形を避けます。", ["yurumeru", "meguraseru"], ["aroma", "moist", "support"], "和食", "egg", "buy", { effort: "buy" }),
  mealCandidate("buy-relax-basil", "蒸し鶏とたまごのサンド＋ミネストローネ", "鶏肉と卵に、温かい野菜スープを合わせます。", ["yurumeru", "meguraseru"], ["aroma", "moist", "support"], "洋食", "chicken", "buy", { effort: "buy" }),
  mealCandidate("buy-relax-rice", "鶏五目おにぎり＋茶碗蒸し", "おにぎりと茶碗蒸しを、一口ずつ取りやすい組み合わせにします。", ["yurumeru", "sasaeru"], ["calm", "support", "warm"], "和食", "chicken", "buy", { effort: "buy" }),
  mealCandidate("buy-relax-pasta", "きのこの和風パスタサラダ＋サラダチキン・ハーブ味", "麺だけにせず、香りの違う鶏肉を合わせます。", ["yurumeru", "sasaeru"], ["aroma", "support"], "和洋", "chicken", "buy", { effort: "buy" }),

  mealCandidate("buy-move-ginger", "生姜こんぶおにぎり＋ねぎ入り鶏白湯スープ＋蒸し鶏", "生姜とねぎの香りを使い、主食だけで済ませません。", ["meguraseru", "sasaeru"], ["aroma", "warm", "support"], "和中", "chicken", "buy", { effort: "buy" }),
  mealCandidate("buy-move-citrus", "柚子こしょう風味の蒸し鶏サンド＋根菜スープ", "柚子の香りを使いながら、辛味は強くしない組み合わせです。", ["meguraseru", "nukumeru"], ["aroma", "warm", "support"], "和洋", "chicken", "buy", { effort: "buy" }),
  mealCandidate("buy-move-tuna", "しそ昆布おにぎり＋かつおだしの豚汁＋冷やしすぎない豆腐", "しそとだしの香りを使い、油の多い具を重ねません。", ["meguraseru", "nagasu"], ["aroma", "warm", "light"], "和食", "pork", "buy", { effort: "buy" }),
  mealCandidate("buy-move-taboule", "レモンチキンの雑穀サラダ＋小さめのくるみパン", "レモンとハーブのある惣菜を選び、甘いパンだけにしません。", ["meguraseru", "sasaeru"], ["aroma", "support"], "地中海", "chicken", "buy", { effort: "buy" }),

  mealCandidate("buy-light-ume", "梅おにぎり＋生姜入りの鶏スープ＋茶碗蒸し", "油と量を増やさず、温かい汁気とたんぱく質を足します。", ["nagasu", "sasaeru"], ["light", "warm", "support"], "和食", "egg", "buy", { effort: "buy", symptoms: ["digestion", "swelling"] }),
  mealCandidate("buy-light-salmon", "焼き鮭おにぎり＋きのこと鶏肉の和風スープ", "主食を小さくし、油の少ない温かい具を合わせます。", ["nagasu", "sasaeru"], ["light", "warm", "support"], "和食", "fish", "buy", { effort: "buy" }),
  mealCandidate("buy-light-soba", "おろしそば＋蒸し鶏の梅しそあえ", "麺だけで終えず、大根おろしと鶏肉を合わせます。", ["nagasu", "meguraseru"], ["light", "aroma", "support"], "和食", "chicken", "buy", { effort: "buy" }),
  mealCandidate("buy-light-pho", "鶏だしのフォー＋海老と香味野菜の生春巻き", "揚げ物ではなく、鶏だしと香味野菜の組み合わせを選びます。", ["nagasu", "meguraseru"], ["light", "aroma", "moist"], "ベトナム", "chicken", "buy", { effort: "buy" }),

  mealCandidate("buy-moist-minestrone", "ハムたまごサンド＋豆入りミネストローネ", "パンだけで終えず、トマト味の汁気と豆を足します。", ["uruosu", "sasaeru"], ["moist", "support"], "洋食", "egg", "buy", { effort: "buy" }),
  mealCandidate("buy-moist-salmon", "鮭とクリームチーズのサンド＋野菜の豆乳チャウダー", "乾いたパンだけにならないよう、魚と温かい汁気を合わせます。", ["uruosu", "sasaeru"], ["moist", "support"], "洋食", "fish", "buy", { effort: "buy" }),
  mealCandidate("buy-moist-rice", "鶏そぼろおにぎり＋白菜と豆腐のとろみスープ", "とろみのあるスープを合わせ、乾いた主食だけを避けます。", ["uruosu", "sasaeru"], ["moist", "warm", "support"], "和中", "chicken", "buy", { effort: "buy" }),
  mealCandidate("buy-moist-pasta", "海老とトマトのスープパスタ＋温野菜", "汁気のあるパスタと野菜を選び、焼き菓子だけで済ませません。", ["uruosu", "meguraseru"], ["moist", "aroma"], "イタリアン", "seafood", "buy", { effort: "buy" }),

  mealCandidate("buy-warm-chicken", "鶏五目おにぎり＋生姜入り豚汁＋ゆで卵", "温かい汁物とたんぱく質を合わせ、冷たい軽食だけにしません。", ["nukumeru", "sasaeru"], ["warm", "support"], "和食", "chicken", "buy", { effort: "buy" }),
  mealCandidate("buy-warm-sand", "温める照り焼きチキンサンド＋根菜のポタージュ", "温かい主食と根菜の汁気を組み合わせます。", ["nukumeru", "sasaeru"], ["warm", "moist", "support"], "洋食", "chicken", "buy", { effort: "buy" }),
  mealCandidate("buy-warm-curry", "辛さ控えめの鶏キーマカレー＋温野菜", "辛味を強くせず、温かい一皿で主食と主菜をそろえます。", ["nukumeru", "meguraseru"], ["warm", "aroma", "support"], "インド", "chicken", "buy", { effort: "buy" }),
  mealCandidate("buy-warm-udon", "鶏ごぼうの温かいうどん＋小松菜の白あえ", "温かい麺に鶏肉と副菜を合わせ、麺だけで終えません。", ["nukumeru", "sasaeru"], ["warm", "support", "moist"], "和食", "chicken", "buy", { effort: "buy" }),

  mealCandidate("buy-support-burrito", "鶏肉と豆のブリトー＋トマト野菜スープ", "主食・鶏肉・豆を一度に取り、甘い物だけで済ませません。", ["sasaeru", "meguraseru"], ["support", "aroma", "moist"], "メキシカン", "chicken", "buy", { effort: "buy" }),
  mealCandidate("buy-support-bento", "焼きさばと雑穀ごはんの弁当＋青菜の副菜", "魚・主食・野菜がそろう弁当を選び、単品だけにしません。", ["sasaeru", "meguraseru"], ["support", "aroma"], "和食", "fish", "buy", { effort: "buy" }),
  mealCandidate("buy-support-pasta", "鶏肉とトマトのショートパスタ＋豆サラダ", "鶏肉と豆を合わせ、パスタだけで食事を終えません。", ["sasaeru", "uruosu"], ["support", "moist"], "イタリアン", "chicken", "buy", { effort: "buy" }),
  mealCandidate("buy-support-rice", "牛しぐれおにぎり＋だし巻き卵＋具だくさんけんちん汁", "量を増やしすぎず、主食・主菜・汁気をそろえます。", ["sasaeru", "nukumeru"], ["support", "warm", "moist"], "和食", "beef", "buy", { effort: "buy" }),
];

const EAT_OUT_MEAL_CATALOG = [
  mealCandidate("out-calm-fish", "焼き魚定食をごはん少なめ・漬物控えめで", "辛味や濃い味を重ねず、魚と野菜のある定食にします。", ["shizumeru", "sasaeru"], ["calm", "support"], "和食", "fish", "out", { effort: "out" }),
  mealCandidate("out-calm-chicken", "蒸し鶏と野菜のフォー・辛味調味料なし", "香草は使いながら、辛味と油を強くしない麺を選びます。", ["shizumeru", "yurumeru"], ["calm", "aroma", "moist"], "ベトナム", "chicken", "out", { effort: "out" }),
  mealCandidate("out-calm-deli", "白身魚のグリルと温野菜のプレート・レモン添え", "揚げ物や濃いソースではなく、魚と温野菜を選びます。", ["shizumeru", "uruosu"], ["calm", "support", "aroma"], "洋食", "fish", "out", { effort: "out" }),
  mealCandidate("out-relax-pasta", "きのこと鶏肉のトマトパスタ・唐辛子なし", "辛味を足さず、トマトときのこの香りで一皿をまとめます。", ["yurumeru", "meguraseru"], ["aroma", "moist", "support"], "イタリアン", "chicken", "out", { effort: "out" }),
  mealCandidate("out-relax-tagine", "鶏肉と野菜のトマト煮込み＋パン少量", "油を増やさず、温かい煮込みと野菜を取ります。", ["yurumeru", "meguraseru"], ["aroma", "moist", "support"], "洋食", "chicken", "out", { effort: "out" }),
  mealCandidate("out-relax-sushi", "寿司（白身魚と赤身中心）＋茶碗蒸し", "揚げ物やマヨネーズ系を重ねず、温かい一品を添えます。", ["yurumeru", "shizumeru"], ["calm", "support"], "和食", "fish", "out", { effort: "out" }),
  mealCandidate("out-move-katsuo", "かつおのたたき香味野菜定食・ごはん小盛り", "しそ・ねぎ・柑橘の香りを使い、油の多い主菜を避けます。", ["meguraseru", "nagasu"], ["aroma", "light", "support"], "和食", "fish", "out", { effort: "out" }),
  mealCandidate("out-move-vietnam", "海老と香味野菜の生春巻き＋鶏だしフォー", "揚げ物ではなく、香味野菜と温かいだしを選びます。", ["meguraseru", "nagasu"], ["aroma", "light", "moist"], "ベトナム", "seafood", "out", { effort: "out" }),
  mealCandidate("out-move-curry", "鶏と豆のスパイスカレー・辛さ控えめ・ごはん少なめ", "香辛料の香りは使い、辛さと量を増やしすぎない一皿にします。", ["meguraseru", "sasaeru"], ["aroma", "warm", "support"], "インド", "chicken", "out", { effort: "out" }),
  mealCandidate("out-light-soba", "おろしそば＋焼き魚か蒸し鶏の小鉢", "麺だけで終えず、油の少ないたんぱく質を一品足します。", ["nagasu", "sasaeru"], ["light", "aroma", "support"], "和食", "fish", "out", { effort: "out" }),
  mealCandidate("out-light-steam", "点心店で海老蒸し餃子＋青菜炒め＋小さめのおかゆ", "揚げ点心を重ねず、蒸し物と青菜を中心にします。", ["nagasu", "sasaeru"], ["light", "moist", "support"], "中華", "seafood", "out", { effort: "out" }),
  mealCandidate("out-light-grill", "白身魚のグリルと豆サラダのプレート", "揚げ物ではなく焼いた魚を選び、豆と野菜を添えます。", ["nagasu", "uruosu"], ["light", "support", "moist"], "地中海", "fish", "out", { effort: "out" }),
  mealCandidate("out-moist-risotto", "魚介ときのこのトマトリゾット＋温野菜", "煮汁のある米料理と野菜を合わせ、乾いたパンだけを避けます。", ["uruosu", "meguraseru"], ["moist", "aroma", "support"], "イタリアン", "seafood", "out", { effort: "out" }),
  mealCandidate("out-moist-chowder", "鮭と野菜のチャウダー＋全粒パン", "魚と野菜の汁気を取り、パンだけの食事にしません。", ["uruosu", "sasaeru"], ["moist", "support"], "洋食", "fish", "out", { effort: "out" }),
  mealCandidate("out-moist-ankake", "白身魚と青菜のあんかけ定食・ごはん小盛り", "とろみのある主菜を選び、汁気とたんぱく質をそろえます。", ["uruosu", "sasaeru"], ["moist", "digestion", "support"], "中華", "fish", "out", { effort: "out" }),
  mealCandidate("out-warm-potaufeu", "鶏肉と根菜のポトフ＋小さめのパン", "温かい煮込みを中心にし、冷たい飲み物だけを合わせません。", ["nukumeru", "sasaeru"], ["warm", "moist", "support"], "洋食", "chicken", "out", { effort: "out" }),
  mealCandidate("out-warm-udon", "鶏ごぼううどん＋青菜の小鉢", "温かい麺に鶏肉と副菜を添え、麺だけで終えません。", ["nukumeru", "sasaeru"], ["warm", "support", "moist"], "和食", "chicken", "out", { effort: "out" }),
  mealCandidate("out-warm-stew", "牛肉と根菜の赤ワイン煮・ソース少なめ＋パン", "温かい煮込みを選び、量と濃いソースを重ねすぎません。", ["nukumeru", "sasaeru"], ["warm", "support", "moist"], "フレンチ", "beef", "out", { effort: "out" }),
  mealCandidate("out-support-bowl", "焼き鮭と野菜の雑穀ボウル・柑橘だれ", "魚・穀物・野菜を一皿にし、食事を抜かずに整えます。", ["sasaeru", "meguraseru"], ["support", "aroma"], "和洋", "fish", "out", { effort: "out" }),
  mealCandidate("out-support-paella", "鶏肉と魚介のパエリア＋温野菜・取り分けは小さめ", "主食とたんぱく質を一皿で取り、量を調整します。", ["sasaeru", "meguraseru"], ["support", "aroma", "moist"], "スペイン", "chicken", "out", { effort: "out" }),
  mealCandidate("out-support-set", "豚の生姜焼き定食・ごはん小盛り・キャベツ多め", "主食と主菜をそろえ、たれとごはんの量を増やしすぎません。", ["sasaeru", "nukumeru"], ["support", "warm", "aroma"], "和食", "pork", "out", { effort: "out" }),
];

const TOMORROW_BREAKFAST_CATALOG = [
  mealCandidate("am-calm-sand", "全粒粉のハムたまごサンド＋ミネストローネ", "パンだけで済ませず、温かい野菜の汁気を合わせます。", ["shizumeru", "sasaeru"], ["calm", "support", "moist"], "洋食", "egg", "breakfast", { effort: "quick", prep: "ハムたまごサンドかミネストローネを、今夜見える場所へ用意しておく" }),
  mealCandidate("am-calm-rice", "鮭と三つ葉の小さなだし茶漬け", "濃い味を重ねず、魚とだしで朝の一食を小さく整えます。", ["shizumeru", "yurumeru"], ["calm", "moist", "support"], "和食", "fish", "breakfast", { effort: "quick", prep: "鮭フレークではなく、焼き鮭か鮭おにぎりを用意しておく" }),
  mealCandidate("am-calm-yogurt", "無糖ヨーグルトと洋梨・オートミール＋温かいルイボスティー", "甘味を強くせず、朝の量を調整しやすい組み合わせです。", ["shizumeru", "uruosu"], ["calm", "moist", "quick"], "洋食", "dairy", "breakfast", { effort: "quick", prep: "無糖ヨーグルトと洋梨を冷蔵庫の手前へ置く" }),
  mealCandidate("am-calm-tofu", "豆腐と青菜の塩あんかけ丼・小盛り", "辛味を使わず、やわらかい主菜とごはんを合わせます。", ["shizumeru", "uruosu"], ["calm", "moist", "digestion"], "中華", "tofu", "breakfast", { prep: "豆腐と冷凍青菜を、朝すぐ取れる場所へ置く" }),
  mealCandidate("am-calm-avocado", "アボカドと蒸し鶏のトースト＋トマトスープ", "カフェインだけで始めず、鶏肉と汁気を足します。", ["shizumeru", "sasaeru"], ["calm", "support", "moist"], "洋食", "chicken", "breakfast", { prep: "蒸し鶏とトマトスープを用意しておく" }),

  mealCandidate("am-relax-risotto", "きのこと鶏肉の小さな和風リゾット", "だしの香りと汁気を使い、朝の一食を一皿へまとめます。", ["yurumeru", "uruosu"], ["aroma", "moist", "support"], "和洋", "chicken", "breakfast", { prep: "パックごはん半量ときのこを用意しておく" }),
  mealCandidate("am-relax-shiso", "鶏そぼろとしその小さな混ぜごはん＋温野菜", "しその香りを足し、甘いパンだけで終えません。", ["yurumeru", "sasaeru"], ["aroma", "support", "quick"], "和食", "chicken", "breakfast", { prep: "鶏そぼろか市販の鶏そぼろおにぎりを用意しておく" }),
  mealCandidate("am-relax-herb", "ハーブチキンとトマトのピタサンド", "香草とトマトを使い、食べやすい一品へまとめます。", ["yurumeru", "meguraseru"], ["aroma", "support", "quick"], "地中海", "chicken", "breakfast", { prep: "ハーブ味の蒸し鶏と小さめのパンを用意する" }),
  mealCandidate("am-relax-banana", "バナナとシナモンの温かいオートミール＋無糖ヨーグルト", "甘味を足しすぎず、温かい穀物と乳製品を合わせます。", ["yurumeru", "nukumeru"], ["warm", "moist", "quick"], "洋食", "dairy", "breakfast", { prep: "オートミールとシナモンを器へ量っておく" }),
  mealCandidate("am-relax-soup", "鶏肉とセロリのスープ＋小さなくるみパン", "セロリの香りと温かい汁気を使い、パンだけにしません。", ["yurumeru", "meguraseru"], ["aroma", "moist", "support"], "洋食", "chicken", "breakfast", { prep: "鶏肉とセロリのスープを一食分よけておく" }),

  mealCandidate("am-move-pho", "鶏だしと生姜の朝フォー・麺少なめ", "生姜と香味野菜を使い、油の少ない温かい麺にします。", ["meguraseru", "nagasu"], ["aroma", "light", "warm", "moist"], "ベトナム", "chicken", "breakfast", { prep: "米麺と鶏だし、生姜をひとまとめにしておく" }),
  mealCandidate("am-move-salmon", "鮭と根菜の温かい混ぜごはん＋具だくさん味噌汁", "魚と根菜を温かい朝食へまとめ、朝の主食とたんぱく質を一緒に取ります。", ["meguraseru", "sasaeru"], ["warm", "moist", "support", "quick"], "和食", "fish", "breakfast", { prep: "鮭と根菜、ごはんを一食分まとめておく" }),
  mealCandidate("am-move-cumin", "ひよこ豆と鶏肉のクミントマト煮＋小さめのパン", "辛くせずクミンの香りを使い、豆と鶏肉を取ります。", ["meguraseru", "sasaeru"], ["aroma", "warm", "support"], "中東", "chicken", "breakfast", { prep: "前夜の煮込みを朝の一食分よけておく" }),
  mealCandidate("am-move-citrus", "蒸し鶏と柑橘キャベツのロールサンド", "柑橘と野菜を使い、甘いパンだけで済ませません。", ["meguraseru", "nagasu"], ["aroma", "light", "support"], "洋食", "chicken", "breakfast", { prep: "蒸し鶏とカットキャベツを用意しておく" }),
  mealCandidate("am-move-ume", "梅おにぎり＋ねぎ入り鶏スープ", "梅とねぎの香りを使い、温かい汁気を合わせます。", ["meguraseru", "nagasu"], ["aroma", "light", "warm"], "和食", "chicken", "breakfast", { prep: "梅おにぎりと鶏スープを見える場所へ用意する" }),

  mealCandidate("am-light-ume", "梅おにぎり＋鶏と冬瓜の薄味スープ＋茶碗蒸し", "油を増やさず、朝も主食とたんぱく質を小さくそろえます。", ["nagasu", "sasaeru"], ["cool", "light", "support"], "和食", "egg", "breakfast", { effort: "quick", prep: "梅おにぎり・鶏スープ・茶碗蒸しを一か所へまとめる", triggers: ["heat", "damp"], avoid_triggers: ["cold", "dry"] }),
  mealCandidate("am-light-soba", "大根おろしとしその温かいそば・麺少なめ", "大根おろしとしそを添え、重い朝食へ寄せません。", ["nagasu", "meguraseru"], ["light", "aroma", "warm"], "和食", "other", "breakfast", { prep: "そばつゆと冷凍そば、大根おろしを用意しておく" }),
  mealCandidate("am-light-chicken", "蒸し鶏と焼き野菜のレモンラップサンド", "揚げ物ではなく蒸し鶏を使い、レモンで軽くまとめます。", ["nagasu", "meguraseru"], ["light", "aroma", "support"], "地中海", "chicken", "breakfast", { prep: "蒸し鶏と焼き野菜を一食分よけておく" }),
  mealCandidate("am-light-chawan", "鮭おにぎり＋きのこの茶碗蒸し", "量を小さくしながら、魚と卵を一緒に取れます。", ["nagasu", "sasaeru"], ["light", "support", "warm"], "和食", "fish", "breakfast", { prep: "鮭おにぎりと茶碗蒸しを用意しておく" }),
  mealCandidate("am-light-tomato", "白いんげん豆とトマトの温サラダ＋小さめのパン", "豆と温野菜を使い、油の多いパン食を避けます。", ["nagasu", "sasaeru"], ["light", "support", "moist"], "地中海", "beans", "breakfast", { prep: "豆の水煮とトマトを用意しておく" }),

  mealCandidate("am-moist-chowder", "鮭とじゃがいもの豆乳チャウダー＋小さめのパン", "魚と温かい汁気を合わせ、乾いたパンだけにしません。", ["uruosu", "sasaeru"], ["moist", "warm", "support"], "洋食", "fish", "breakfast", { prep: "チャウダーを朝の一食分よけておく" }),
  mealCandidate("am-moist-rice", "鶏肉と青菜の中華がゆ・生姜少量", "だしとやわらかい米を使い、朝の量を調整しやすくします。", ["uruosu", "sasaeru"], ["moist", "warm", "digestion"], "中華", "chicken", "breakfast", { prep: "パックがゆ、蒸し鶏、冷凍青菜を一か所へまとめる" }),
  mealCandidate("am-moist-toast", "きのこと豆腐のとろみ煮＋ごまトースト", "とろみのある主菜を添え、トーストだけで終えません。", ["uruosu", "sasaeru"], ["moist", "support"], "和洋", "tofu", "breakfast", { prep: "豆腐ときのこ、ごまパンを用意しておく" }),
  mealCandidate("am-moist-fruit", "洋梨と無糖ヨーグルトのオーバーナイトオーツ", "果物と乳製品の水分を使い、乾いたシリアルだけを避けます。", ["uruosu", "shizumeru"], ["moist", "calm", "quick"], "洋食", "dairy", "breakfast", { prep: "今夜、オートミール・無糖ヨーグルト・洋梨を混ぜて冷蔵する" }),
  mealCandidate("am-moist-tomato", "海老とトマトの小さなリゾット", "トマトの汁気と海老を使い、一皿で朝食をまとめます。", ["uruosu", "meguraseru"], ["moist", "aroma", "support"], "イタリアン", "seafood", "breakfast", { prep: "冷凍海老とトマト缶、ごはん半量を用意する" }),

  mealCandidate("am-warm-potato", "じゃがいもと鶏肉の温かいトルティージャ＋野菜スープ", "温かい卵料理と汁気を合わせ、冷たい朝食だけにしません。", ["nukumeru", "sasaeru"], ["warm", "support", "moist"], "スペイン", "egg", "breakfast", { prep: "トルティージャか厚焼き卵、野菜スープを用意する" }),
  mealCandidate("am-warm-rice", "生姜と鶏そぼろの小さな炊き込みごはん＋温野菜", "生姜の香りを使い、温かい主食と鶏肉を合わせます。", ["nukumeru", "sasaeru"], ["warm", "aroma", "support"], "和食", "chicken", "breakfast", { prep: "鶏そぼろと生姜、ごはんを一食分まとめる" }),
  mealCandidate("am-warm-oats", "りんごとシナモンの温かいオートミール＋くるみ少量", "冷たいシリアルではなく、温かい穀物と香りを使います。", ["nukumeru", "yurumeru"], ["warm", "aroma", "quick"], "洋食", "nuts", "breakfast", { prep: "オートミール・りんご・シナモンを器へ用意する" }),
  mealCandidate("am-warm-udon", "鶏ごぼうの温かいうどん・麺少なめ", "鶏肉と根菜のある温かい麺にし、主食だけにしません。", ["nukumeru", "sasaeru"], ["warm", "support", "moist"], "和食", "chicken", "breakfast", { prep: "冷凍うどん半量と鶏ごぼうの具を用意する" }),
  mealCandidate("am-warm-soup", "白いんげん豆とソーセージ少量のトマトスープ＋パン", "温かい豆のスープを中心にし、ソーセージは香りづけ程度にします。", ["nukumeru", "sasaeru"], ["warm", "moist", "support"], "洋食", "beans", "breakfast", { prep: "豆のトマトスープを朝の一食分よけておく" }),

  mealCandidate("am-support-egg", "鶏肉と三つ葉の小さな親子丼", "朝も主食とたんぱく質を一皿で取り、食事抜きを避けます。", ["sasaeru", "yurumeru"], ["support", "moist", "quick"], "和食", "chicken", "breakfast", { prep: "鶏肉と卵、ごはん半量を用意しておく" }),
  mealCandidate("am-support-burrito", "鶏肉と豆の朝ブリトー＋トマト", "主食・鶏肉・豆を一緒に取り、甘いパンだけにしません。", ["sasaeru", "meguraseru"], ["support", "aroma", "quick"], "メキシカン", "chicken", "breakfast", { prep: "鶏肉と豆の具、トルティーヤを用意しておく" }),
  mealCandidate("am-support-salmon", "鮭とアボカドの全粒トースト＋野菜スープ", "魚と主食を合わせ、コーヒーだけで始めません。", ["sasaeru", "uruosu"], ["support", "moist"], "洋食", "fish", "breakfast", { prep: "鮭・アボカド・全粒パンを用意しておく" }),
  mealCandidate("am-support-pasta", "鶏肉と青菜の小さなスープパスタ", "鶏肉と青菜を入れ、パスタだけで終わらない朝食にします。", ["sasaeru", "uruosu"], ["support", "moist", "warm"], "イタリアン", "chicken", "breakfast", { prep: "ショートパスタと蒸し鶏、青菜を用意する" }),
  mealCandidate("am-support-natto", "納豆としらすの小さな雑穀丼＋具だくさん汁", "主食とたんぱく質をそろえ、朝の食事量を小さく確保します。", ["sasaeru", "nagasu"], ["support", "warm", "quick"], "和食", "beans", "breakfast", { prep: "納豆・しらす・雑穀ごはんを一食分まとめる" }),
];

const NIGHT_SNACK_CATALOG = [
  mealCandidate("night-calm-pear", "小腹が空いたら、洋梨半分と無糖ヨーグルト", "甘い菓子へ寄せず、量を小さくします。", ["shizumeru", "uruosu"], ["calm", "moist"], "洋食", "dairy", "snack"),
  mealCandidate("night-calm-chawan", "小腹が空いたら、きのこの茶碗蒸しを一つ", "辛い物や菓子を重ねず、温かい一品で止めます。", ["shizumeru", "sasaeru"], ["calm", "warm", "support"], "和食", "egg", "snack"),
  mealCandidate("night-calm-ricotta", "小腹が空いたら、リコッタチーズと煮りんごを少量", "濃い甘味を足さず、少量でまとまる形にします。", ["shizumeru", "yurumeru"], ["calm", "moist"], "洋食", "dairy", "snack"),
  mealCandidate("night-relax-banana", "小腹が空いたら、焼きバナナにシナモンを少し", "冷たい菓子ではなく、温かい果物を少量にします。", ["yurumeru", "nukumeru"], ["warm", "aroma"], "洋食", "fruit", "snack"),
  mealCandidate("night-relax-soup", "小腹が空いたら、鶏とセロリのスープを小さなカップで", "香りと温かい汁気を使い、量を増やしません。", ["yurumeru", "meguraseru"], ["aroma", "warm", "moist"], "洋食", "chicken", "snack"),
  mealCandidate("night-relax-toast", "小腹が空いたら、くるみパンを半枚とカモミールティー", "パンは少量にし、甘い飲み物を重ねません。", ["yurumeru", "shizumeru"], ["calm", "aroma"], "洋食", "nuts", "snack"),
  mealCandidate("night-move-ume", "小腹が空いたら、梅としその小さなお茶漬け", "梅としその香りを使い、油の多い夜食を避けます。", ["meguraseru", "nagasu"], ["aroma", "light", "moist"], "和食", "other", "snack"),
  mealCandidate("night-move-ginger", "小腹が空いたら、生姜入りの鶏スープを小さなカップで", "生姜とねぎの香りを使い、夜食の量を小さくします。", ["meguraseru", "nukumeru"], ["aroma", "warm", "moist"], "和食", "chicken", "snack"),
  mealCandidate("night-move-tomato", "小腹が空いたら、豆とトマトのスープを小さなカップで", "トマトとハーブの香りを使い、菓子だけで終えません。", ["meguraseru", "sasaeru"], ["aroma", "moist", "support"], "地中海", "beans", "snack"),
  mealCandidate("night-light-chawan", "小腹が空いたら、茶碗蒸しを一つ", "油の多い夜食を避け、温かい一品で止めます。", ["nagasu", "sasaeru"], ["light", "warm", "support"], "和食", "egg", "snack"),
  mealCandidate("night-light-tofu", "小腹が空いたら、温めた豆腐にしそと大根おろし", "豆腐を冷たいままにせず、香味を少し添えます。", ["nagasu", "meguraseru"], ["light", "warm", "aroma"], "和食", "tofu", "snack"),
  mealCandidate("night-light-springroll", "小腹が空いたら、蒸し鶏と野菜の生春巻きを一本", "揚げ物ではなく、鶏肉と野菜を少量取ります。", ["nagasu", "sasaeru"], ["light", "support"], "ベトナム", "chicken", "snack"),
  mealCandidate("night-moist-pear", "小腹が空いたら、煮た洋梨を少量", "乾いた菓子ではなく、汁気のある果物を少量にします。", ["uruosu", "shizumeru"], ["moist", "calm"], "洋食", "fruit", "snack"),
  mealCandidate("night-moist-chicken", "小腹が空いたら、鶏と白菜のとろみスープを小さなカップで", "温かい汁気を使い、量を増やしません。", ["uruosu", "sasaeru"], ["moist", "warm", "support"], "中華", "chicken", "snack"),
  mealCandidate("night-moist-yogurt", "小腹が空いたら、無糖ヨーグルトにすりおろしりんご", "乾いた菓子を避け、甘味を足さずに少量食べます。", ["uruosu", "shizumeru"], ["moist", "calm"], "洋食", "dairy", "snack"),
  mealCandidate("night-warm-soup", "小腹が空いたら、根菜と鶏肉のスープを小さなカップで", "温かい汁物を少量取り、冷たい夜食を避けます。", ["nukumeru", "sasaeru"], ["warm", "moist", "support"], "洋食", "chicken", "snack"),
  mealCandidate("night-warm-oats", "小腹が空いたら、りんごとシナモンの温かいオートミールを半量", "冷たい菓子ではなく、温かい穀物を少量にします。", ["nukumeru", "yurumeru"], ["warm", "aroma"], "洋食", "grain", "snack"),
  mealCandidate("night-warm-rice", "小腹が空いたら、生姜とねぎの小さなお茶漬け", "温かいだしと生姜を使い、一膳分まで増やしません。", ["nukumeru", "meguraseru"], ["warm", "aroma", "moist"], "和食", "other", "snack"),
  mealCandidate("night-support-cheese", "小腹が空いたら、カッテージチーズとクラッカーを少量", "甘い物だけにせず、少量のたんぱく質を添えます。", ["sasaeru", "shizumeru"], ["support", "calm"], "洋食", "dairy", "snack"),
  mealCandidate("night-support-chicken", "小腹が空いたら、蒸し鶏と温野菜を小皿で", "主食を増やさず、鶏肉と野菜を少量取ります。", ["sasaeru", "nagasu"], ["support", "light", "warm"], "和食", "chicken", "snack"),
  mealCandidate("night-support-salmon", "小腹が空いたら、鮭とじゃがいもの小さな温サラダ", "魚といもを少量合わせ、菓子だけの夜食を避けます。", ["sasaeru", "nukumeru"], ["support", "warm"], "洋食", "fish", "snack"),
];


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
      reason: "油と濃い甘味を続けると、湿気の日は食後の重だるさが残りやすくなります。",
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
      label: "湿気が気になっても、茶や水を一気に大量に飲まない",
      reason: "一度に多く飲むと、余力が小さい日は胃腸が疲れ、かえって重く感じることがあります。",
      policies: ["sasaeru", "nagasu"],
      subLabels: ["qi_deficiency", "気虚", "fluid_deficiency", "津液不足"],
      reserveRisk: true,
    },
  ],
  pressure_down: [
    {
      id: "pd-skip-caffeine",
      label: "食事を抜いて、カフェインだけで乗り切ろうとしない",
      reason: "低気圧の日に空腹のままカフェインへ頼ると、あとから疲れや胃の重さが出やすくなります。",
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
      reason: "低気圧で胃腸がゆっくりになりやすい日は、遅い時間の食べすぎが翌朝まで残りやすくなります。",
      policies: ["sasaeru"],
      symptoms: ["digestion", "sleep"],
      reserveRisk: true,
    },
    {
      id: "pd-cold-only",
      label: "冷たい飲み物と軽食だけで、一日をつながない",
      reason: "軽く済ませても、冷たい物ばかりで食事量も少ないと、あとから疲れやすくなります。",
      policies: ["sasaeru", "nukumeru"],
      subLabels: ["qi_deficiency", "気虚", "blood_deficiency", "血虚"],
      reserveRisk: true,
    },
  ],
  pressure_up: [
    {
      id: "pu-spice-coffee",
      label: "辛いもののあとに、コーヒーを重ねない",
      reason: "辛味とカフェインを続けると、熱っぽさや落ち着かなさが強まりやすくなります。",
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
      reason: "一度は動けても、そのあとにだるさや空腹感が戻りやすい食べ方です。",
      policies: ["sasaeru", "shizumeru"],
      subLabels: ["qi_deficiency", "気虚"],
      symptoms: ["mood", "fatigue"],
      reserveRisk: true,
    },
    {
      id: "pu-hot-spice",
      label: "熱々の料理へ、強い辛味をさらに足さない",
      reason: "熱い料理と辛味が重なると、のぼせや頭・肩の力みが出やすくなります。",
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
      reason: "冷えた朝に食事を取らずコーヒーだけ飲むと、あとから疲れや胃の不快感が出やすくなります。",
      policies: ["sasaeru", "nukumeru"],
      subLabels: ["qi_deficiency", "気虚"],
      symptoms: ["fatigue", "digestion"],
      reserveRisk: true,
    },
    {
      id: "cold-night-ice",
      label: "夜遅くに、アイスや冷たい乳製品を重ねない",
      reason: "眠る前に冷たい物を取ると、翌朝までだるさや胃の重さが残りやすくなります。",
      policies: ["nukumeru", "sasaeru"],
      symptoms: ["sleep", "digestion"],
      compound: true,
    },
    {
      id: "cold-salad-only",
      label: "サラダだけで一食を済ませない",
      reason: "量は軽くても冷たい物に偏ると、冷えやすい日は胃腸まで冷えやすくなります。",
      policies: ["nukumeru", "sasaeru"],
      subLabels: ["qi_deficiency", "気虚", "blood_deficiency", "血虚"],
      reserveRisk: true,
    },
    {
      id: "cold-force-sweat",
      label: "強い辛味で、無理に汗を出そうとしない",
      reason: "一時的に温まっても、汗をかきすぎると、そのあとに冷えや疲れが残ることがあります。",
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
      reason: "その場は涼しくても、一気に冷たい物を飲むと胃腸が冷え、食後の重さが残りやすくなります。",
      policies: ["sasaeru", "shizumeru"],
      symptoms: ["digestion", "fatigue"],
      reserveRisk: true,
    },
    {
      id: "heat-fried-strong",
      label: "揚げ物へ、濃い味や辛味をさらに足さない",
      reason: "油・濃い味・辛味が重なると、暑い日は熱っぽさや胃もたれを感じやすくなります。",
      policies: ["shizumeru", "nagasu"],
      compound: true,
    },
    {
      id: "heat-cold-only",
      label: "冷たい麺や飲み物だけで、一食を終えない",
      reason: "冷たい物だけでは、汗で失った水分や栄養を十分に補えず、あとからだるさが出やすくなります。",
      policies: ["sasaeru", "uruosu"],
      subLabels: ["qi_deficiency", "気虚", "fluid_deficiency", "津液不足"],
      symptoms: ["fatigue", "dizziness"],
      reserveRisk: true,
    },
    {
      id: "heat-energy-caffeine",
      label: "暑さで疲れても、エナジードリンクや濃いコーヒーだけに頼らない",
      reason: "一時的に動けても、カフェインだけでは水分や食事を補えず、あとから疲れが強くなることがあります。",
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
      label: "アルコールのあとに、カフェインで無理に起きていようとしない",
      reason: "どちらも乾きと睡眠の浅さを重ねやすく、翌日の消耗へつながりやすい組み合わせです。",
      policies: ["uruosu", "sasaeru"],
      symptoms: ["sleep", "headache"],
      compound: true,
    },
    {
      id: "dry-water-only",
      label: "水分だけ取って、食事を抜かない",
      reason: "水分だけでは、食事から取るエネルギーやたんぱく質までは補えません。",
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
      reason: "甘い物やカフェインだけで済ませると、あとから空腹や疲れが強く出ることがあります。",
      policies: ["sasaeru", "shizumeru"],
      subLabels: ["qi_deficiency", "気虚"],
      symptoms: ["fatigue", "mood"],
      reserveRisk: true,
    },
    {
      id: "base-late-full",
      label: "夜遅くに、満腹まで食べない",
      reason: "夜遅くに満腹まで食べると、寝ている間も胃が休みにくく、翌朝に重さが残りやすくなります。",
      policies: ["sasaeru"],
      symptoms: ["sleep", "digestion"],
      reserveRisk: true,
    },
    {
      id: "base-fried-sweet",
      label: "揚げ物と甘いものを、一度に重ねない",
      reason: "油と濃い甘味を一度に取ると、胃もたれや食後のだるさが出やすくなります。",
      policies: ["nagasu", "sasaeru"],
      symptoms: ["digestion", "fatigue"],
      compound: true,
    },
    {
      id: "base-cold-only",
      label: "冷たい飲み物だけで、食事を済ませない",
      reason: "一時的には軽く感じても、お腹が冷えやすく、食事としても足りなくなりやすい組み合わせです。",
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
      reason: "暑い日に辛味と揚げ物を重ね、さらに冷たい甘い飲み物を取ると、胃腸へ負担がかかりやすくなります。",
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
      reason: "冷たい乳製品、甘味、油分が重なると、食後の重だるさが残りやすくなります。",
      policies: ["nukumeru", "nagasu", "sasaeru"],
      symptoms: ["fatigue", "digestion"],
      compound: true,
    },
    {
      id: "pair-cold-damp-raw-sweet",
      label: "生もの・冷たい飲み物・甘味を、一食に重ねない",
      reason: "冷たい物と甘い物が重なると、お腹の冷えと食後の重さが出やすくなります。",
      policies: ["nukumeru", "nagasu"],
      compound: true,
    },
  ],
  "dry+heat": [
    {
      id: "pair-dry-heat-spice-alcohol",
      label: "辛い焼き物とアルコールを、同じ食事に重ねない",
      reason: "辛い焼き物とアルコールが重なると、熱っぽさやのどの乾き、寝苦しさが出やすくなります。",
      policies: ["shizumeru", "uruosu"],
      compound: true,
    },
    {
      id: "pair-dry-heat-snack-coffee",
      label: "乾いた菓子を、冷たいコーヒーで流し込まない",
      reason: "暑い日に乾いた菓子とカフェインを重ねると、口やのどが乾き、あとから疲れやすくなります。",
      policies: ["uruosu", "sasaeru"],
      reserveRisk: true,
      compound: true,
    },
  ],
  "cold+dry": [
    {
      id: "pair-cold-dry-snack",
      label: "冷たい飲み物と乾いた菓子だけで、食事を済ませない",
      reason: "冷たい飲み物と乾いた菓子だけでは、お腹が冷えやすく、口やのどの乾きも残りやすくなります。",
      policies: ["nukumeru", "uruosu", "sasaeru"],
      reserveRisk: true,
      compound: true,
    },
  ],
  "damp+pressure_down": [
    {
      id: "pair-damp-pd-rebound",
      label: "食事を抜いた反動で、揚げ物と甘いものをまとめて入れない",
      reason: "低気圧の日に空腹の反動で油と甘味を一度に取ると、食後の重さが残りやすくなります。",
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
      reason: "暑い日に辛味・カフェイン・アルコールが重なると、熱っぽさや落ち着かなさが強まりやすくなります。",
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
      label: "食事を抜いて、カフェインや甘い物だけで動こうとしない",
      reason: "疲れを残したくない日は、少量でも食事を取る方が、あとから空腹やだるさが出にくくなります。",
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
      reason: "食後を軽くしたい日は、冷たさ・甘さ・脂っこさを一度に重ねないようにします。",
      policies: ["nagasu"],
      subLabels: ["dampness", "痰湿"],
      compound: true,
    },
  ],
  meguraseru: [
    {
      id: "policy-move-force",
      label: "辛味やお酒で、無理に巡らせようとしない",
      reason: "身体や気分が張る日でも、辛味やお酒を増やすと、汗や疲れが残ることがあります。",
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
    tomorrow_action: "眠る前に、鎖骨の下を内側から肩先へ服の上からゆっくり3往復する",
    reason: "呼吸が浅い時や首肩に力が集まる時の、体質上の入口です。",
  },
  heart_si: {
    id: "line-heart-si",
    title: "肩甲骨〜小指側をゆるめる",
    action: "反対の手で肩甲骨の外側から腕の小指側を、痛くない範囲でゆっくりなでる",
    tomorrow_action: "眠る前に、肩甲骨の外側から腕の小指側を痛くない範囲でゆっくりなでる",
    reason: "頭の使いすぎや睡眠の乱れが、肩から腕へ残りやすいラインです。",
  },
  kidney_bl: {
    id: "line-kidney-bl",
    title: "背中〜足元の土台を守る",
    action: "腰へ手を当てて温めたあと、ふくらはぎの後ろを手のひらでゆっくりなでる",
    tomorrow_action: "寝る支度の前に、腰へ手を当てて温め、ふくらはぎの後ろをゆっくりなでる",
    reason: "冷えや消耗が、背中・腰・脚の後ろへ出やすいラインです。",
  },
  liver_gb: {
    id: "line-liver-gb",
    title: "体側の張りを逃がす",
    action: "脇腹へ手を当て、息を吐きながら外ももまで手のひらでゆっくりなでる",
    tomorrow_action: "眠る前に、脇腹へ手を当て、息を吐きながら外ももまでゆっくりなでる",
    reason: "気分の詰まりや緊張が、体側と脚の内外側へ表れやすいラインです。",
  },
  spleen_st: {
    id: "line-spleen-st",
    title: "お腹〜すねの前面を支える",
    action: "お腹へ手を置いて呼吸したあと、太もも前からすねを手のひらで軽くなでる",
    tomorrow_action: "夕食後すぐを避け、お腹へ手を置いて呼吸し、太もも前からすねを軽くなでる",
    reason: "胃腸の疲れや湿気の重さが、体の前面へ出やすいラインです。",
  },
  pc_sj: {
    id: "line-pc-sj",
    title: "腕の外側から熱と力みを逃がす",
    action: "手首から肩の外側へ、反対の手でゆっくり3往復なでる",
    tomorrow_action: "眠る前に、手首から肩の外側へ反対の手でゆっくり3往復なでる",
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
  const shopCandidate = environmentPool.find((item) => item.shop_eligible && item.item_role) || null;
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
      shopCandidate,
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
  const displayedShopCandidate = selected.find((item) => item.care_kind === "environment" && item.shop_eligible && item.item_role)
    || shopCandidate;
  return {
    selected,
    primaryKind: primary.care_kind || "body",
    primaryCandidateScore: Number(primary._score || 0),
    laneScores: {
      body: bestLaneScore(scored, "body"),
      environment: bestLaneScore(scored, "environment"),
    },
    nearTieRotationApplied: nearTieCount > 1,
    shopCandidate: displayedShopCandidate,
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

const LIFESTYLE_FORECAST_BY_SYMPTOM = {
  fatigue: "疲れが抜けにくく、動作のたびに余計な力を使いやすい見込みです",
  sleep: "夜まで頭と身体の切り替えが遅れやすい見込みです",
  digestion: "胃腸の重さや張りが、座り方や前かがみで増えやすい見込みです",
  neck_shoulder: "首肩へ力が集まり、手元作業の負担が残りやすい見込みです",
  low_back_pain: "腰まわりが固まり、座る・立つ動作の負担が残りやすい見込みです",
  swelling: "脚の重さやむくみが、座り続ける時間に重なりやすい見込みです",
  headache: "頭や目のまわりへ力が集まり、画面や光の負担が残りやすい見込みです",
  dizziness: "頭の位置を変える動作で、ふらつきや違和感が増えやすい見込みです",
  mood: "気分の張りつめや切り替えにくさが、身体の力みとして残りやすい見込みです",
};

function buildLifestyleForecastInsight({ theme, symptomFocus } = {}) {
  const timing = theme?.mode === "tomorrow" ? "明日は" : "今日は";
  const weather = safeArray(theme?.trigger_labels).filter(Boolean).join("と") || "天気変化";
  const reaction = theme?.reaction_direction === "accel"
    ? "アクセル寄りの反応"
    : theme?.reaction_direction === "brake"
      ? "ブレーキ寄りの反応"
      : "体質の反応";
  const forecast = LIFESTYLE_FORECAST_BY_SYMPTOM[symptomFocus]
    || "いつもの不調が生活動作の負担として出やすい見込みです";
  return `${timing}${weather}の予報に${reaction}が重なり、${forecast}。`;
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
      forecast_insight: "",
      primary_action: null,
      alternatives: [],
      shop_context: null,
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
    lead: buildLifestyleForecastInsight({ theme, symptomFocus }),
    forecast_insight: buildLifestyleForecastInsight({ theme, symptomFocus }),
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
    shop_context: selection.shopCandidate ? {
      action_id: selection.shopCandidate.id,
      item_role: selection.shopCandidate.item_role,
      scene_family: selection.shopCandidate.scene_family || null,
      care_needs: safeArray(selection.shopCandidate.care_needs),
      target_response: theme?.response_profile?.target_response_label || "",
      symptom_key: symptomFocus || null,
      selected_because: safeArray(selection.shopCandidate.selected_because),
    } : null,
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

const POLICY_CULINARY_FIT = {
  shizumeru: { portion: "小〜中", temperature: "熱すぎない", moisture: "適度", fat_load: "軽め", stimulation: "控えめ", flavor: ["柑橘", "ハーブ", "だし"] },
  yurumeru: { portion: "小〜中", temperature: "温〜常温", moisture: "適度", fat_load: "中まで", stimulation: "穏やか", flavor: ["香味野菜", "ハーブ", "だし"] },
  meguraseru: { portion: "中まで", temperature: "温〜常温", moisture: "適度", fat_load: "中まで", stimulation: "香りを使う", flavor: ["しそ", "柑橘", "生姜", "香草"] },
  nagasu: { portion: "小〜中", temperature: "冷たい物だけにしない", moisture: "適度", fat_load: "軽め", stimulation: "穏やか", flavor: ["大根おろし", "梅", "香味野菜", "酸味"] },
  uruosu: { portion: "中まで", temperature: "温〜常温", moisture: "汁気を残す", fat_load: "中まで", stimulation: "控えめ", flavor: ["煮汁", "あん", "果物", "だし"] },
  nukumeru: { portion: "中まで", temperature: "温かい", moisture: "適度", fat_load: "中まで", stimulation: "辛すぎない", flavor: ["生姜", "ねぎ", "根菜", "穏やかな香辛料"] },
  sasaeru: { portion: "小〜中", temperature: "状態に合わせる", moisture: "適度", fat_load: "中まで", stimulation: "穏やか", flavor: ["主食", "主菜", "野菜"] },
};

// 食べるケアの導入文は、否定から始まる「AよりB」を正本にしない。
// 先に天気・反応方向・選択中の不調を示し、その後へ今日取り入れる
// 食べ方を直接書く。同じ方針でも天気が違えば、根拠の一文は変わる。
const POLICY_FOOD_ACTIONS = {
  shizumeru: "辛味や濃い味を控え、だしや穏やかな酸味で食べやすくします。",
  yurumeru: "だしや香味野菜を使った、食べやすい料理を選びます。",
  meguraseru: "しそ・ねぎ・柑橘など、香りのある食材を取り入れます。",
  nagasu: "油を控えた主菜に、野菜や汁物を組み合わせます。",
  uruosu: "蒸し煮・あんかけ・汁物など、汁気のある料理を選びます。",
  nukumeru: "温かい煮物・汁物・焼き物を中心にします。",
  sasaeru: "主食とたんぱく質がそろう一食を、食べきれる量で取ります。",
};

const MEAL_NUTRITION_REASONS = {
  chicken: "鶏肉でたんぱく質を取りやすい組み合わせです。",
  fish: "魚でたんぱく質を取り、主食だけで終わらない組み合わせです。",
  seafood: "魚介でたんぱく質を取り、料理の汁気も残せます。",
  pork: "豚肉でたんぱく質とビタミンB1を取りやすい組み合わせです。",
  beef: "牛肉でたんぱく質・鉄・ビタミンB群を取りやすい組み合わせです。",
  duck: "鴨肉でたんぱく質を取り、主食だけの食事を避けられます。",
  egg: "卵でたんぱく質を補い、食事量が多くなくても一食を整えやすくします。",
  tofu: "豆腐で大豆由来のたんぱく質を取りやすい組み合わせです。",
  beans: "豆でたんぱく質と食物繊維を取りやすい組み合わせです。",
  dairy: "乳製品でたんぱく質を補い、少量でも食事にしやすくします。",
  nuts: "穀物に少量のナッツを合わせ、脂質と食物繊維を補えます。",
  fruit: "果物から水分と糖質を少量取りやすい組み合わせです。",
  grain: "穀物を食事の土台にし、量を調整しやすくします。",
  other: "主食だけに偏らず、副菜や汁物を合わせやすい組み合わせです。",
};

// 料理名を正解として押しつけず、今日の食養生で中心になる食材を先に見せる。
// 自由な文字列抽出ではなく、ここで監修した食材名だけを料理案から拾う。
const MEAL_FOCUS_INGREDIENTS = [
  { label: "白身魚", pattern: /白身魚/ },
  { label: "鯛", pattern: /鯛/ },
  { label: "たら", pattern: /(?:^|[＋・、])たら(?=と|の|・|＋|、|$)/ },
  { label: "鮭", pattern: /鮭|サーモン/ },
  { label: "さば", pattern: /さば/ },
  { label: "かつお", pattern: /かつお/ },
  { label: "まぐろ", pattern: /まぐろ/ },
  { label: "しらす", pattern: /しらす/ },
  { label: "鶏肉", pattern: /鶏|親子丼/ },
  { label: "豚肉", pattern: /豚肉|豚しゃぶ|豚の|ポーク/ },
  { label: "牛肉", pattern: /牛肉/ },
  { label: "鴨", pattern: /鴨/ },
  { label: "海老", pattern: /海老|えび/ },
  { label: "あさり", pattern: /あさり/ },
  { label: "豆腐", pattern: /豆腐/ },
  { label: "卵", pattern: /卵|たまご|茶碗蒸し|親子丼|トルティージャ/ },
  { label: "納豆", pattern: /納豆/ },
  { label: "豆", pattern: /ひよこ豆|白いんげん豆|レンズ豆|豆と|豆の/ },
  { label: "トマト", pattern: /トマト|ミネストローネ/ },
  { label: "きのこ", pattern: /きのこ/ },
  { label: "大根", pattern: /大根|みぞれ/ },
  { label: "しそ", pattern: /しそ/ },
  { label: "みょうが", pattern: /みょうが/ },
  { label: "三つ葉", pattern: /三つ葉/ },
  { label: "生姜", pattern: /生姜/ },
  { label: "ねぎ", pattern: /ねぎ/ },
  { label: "セロリ", pattern: /セロリ/ },
  { label: "青菜", pattern: /青菜|青梗菜/ },
  { label: "ほうれん草", pattern: /ほうれん草/ },
  { label: "白菜", pattern: /白菜/ },
  { label: "キャベツ", pattern: /キャベツ/ },
  { label: "なす", pattern: /なす/ },
  { label: "きゅうり", pattern: /きゅうり/ },
  { label: "根菜", pattern: /根菜/ },
  { label: "れんこん", pattern: /れんこん/ },
  { label: "ごぼう", pattern: /ごぼう/ },
  { label: "じゃがいも", pattern: /じゃがいも/ },
  { label: "里芋", pattern: /里芋/ },
  { label: "アボカド", pattern: /アボカド/ },
  { label: "りんご", pattern: /りんご|煮りんご/ },
  { label: "洋梨", pattern: /洋梨/ },
  { label: "バナナ", pattern: /バナナ/ },
  { label: "柑橘", pattern: /柑橘|レモン|ライム|柚子/ },
  { label: "バジル", pattern: /バジル/ },
  { label: "ハーブ", pattern: /ハーブ/ },
  { label: "ディル", pattern: /ディル/ },
  { label: "香菜", pattern: /香菜/ },
  { label: "パセリ", pattern: /パセリ/ },
  { label: "シナモン", pattern: /シナモン/ },
  { label: "梅", pattern: /梅/ },
  { label: "海藻", pattern: /海藻|のり|とろろ昆布/ },
  { label: "ごま", pattern: /ごま/ },
  { label: "くるみ", pattern: /くるみ/ },
  { label: "オートミール", pattern: /オートミール|オーツ/ },
  { label: "そば", pattern: /そば/ },
  { label: "ヨーグルト", pattern: /ヨーグルト/ },
  { label: "チーズ", pattern: /チーズ|リコッタ/ },
  { label: "豆乳", pattern: /豆乳/ },
];

// 食性の説明は、専門用語をそのまま出さず「どちらへ整える食材か」まで
// 一般生活語へ翻訳する。栄養理由は、この理由の補足として次に置く。
const MEAL_FOOD_NATURE_RULES = [
  {
    pattern: /トマト|きゅうり|なす/,
    ingredients: ["トマト", "きゅうり", "なす"],
    policies: ["shizumeru", "uruosu"],
    text: (names) => `${names.join("・")}はこもった熱を冷ましながら、水分を補う方向の食材です。`,
  },
  {
    pattern: /洋梨|梨|りんご/,
    ingredients: ["洋梨", "りんご"],
    policies: ["uruosu", "shizumeru"],
    text: (names) => `${names.join("・")}は口や喉の乾きをやわらげる方向の食材です。`,
  },
  {
    pattern: /豆腐/,
    ingredients: ["豆腐"],
    policies: ["shizumeru", "uruosu"],
    text: (names) => `${names.join("・")}は熱をこもらせにくく、乾いた食事へ水分を足しやすい食材です。`,
  },
  {
    pattern: /しそ|みょうが|三つ葉|セロリ|柑橘|レモン|ライム|柚子|バジル|ハーブ|ディル|香菜|パセリ|梅/,
    ingredients: ["しそ", "みょうが", "三つ葉", "セロリ", "柑橘", "バジル", "ハーブ", "ディル", "香菜", "パセリ", "梅"],
    policies: ["meguraseru", "yurumeru", "shizumeru"],
    text: (names) => names.length
      ? `${names.join("・")}の香りで気分を切り替え、張りつめた感じをゆるめる方向へ整えます。`
      : "香味野菜や香草の香りで気分を切り替え、張りつめた感じをゆるめる方向へ整えます。",
  },
  {
    pattern: /大根|みぞれ|はとむぎ|小豆|海藻|とろろ昆布/,
    ingredients: ["大根", "海藻"],
    policies: ["nagasu", "sasaeru"],
    text: (names) => `${names.join("・")}は食後の重さや水分の偏りをためにくくする方向の食材です。`,
  },
  {
    pattern: /きのこ/,
    ingredients: ["きのこ"],
    policies: ["nagasu", "sasaeru", "yurumeru"],
    text: (names) => `${names.join("・")}は胃腸の働きを支え、余分な重さをためにくくする方向の食材です。`,
  },
  {
    pattern: /青菜|青梗菜|白菜|キャベツ/,
    ingredients: ["青菜", "白菜", "キャベツ"],
    policies: ["shizumeru", "nagasu", "sasaeru"],
    text: (names) => `${names.join("・")}は熱や重さを増やさず、食事を軽く整える方向の食材です。`,
  },
  {
    pattern: /白身魚|鯛|たら|鮭|さば|かつお|まぐろ|しらす|海老|あさり/,
    ingredients: ["白身魚", "鯛", "たら", "鮭", "さば", "かつお", "まぐろ", "しらす", "海老", "あさり"],
    policies: ["shizumeru", "nagasu", "sasaeru"],
    text: (names) => `${names.join("・")}を熱や油の重さを増やしにくい主菜として使います。`,
  },
  {
    pattern: /豚肉|豚しゃぶ|牛肉|鴨/,
    ingredients: ["豚肉", "牛肉", "鴨"],
    policies: ["sasaeru", "uruosu", "nukumeru"],
    text: (names) => `${names.join("・")}を消耗した日の食事を支える方向に使います。`,
  },
  {
    pattern: /ごま|くるみ|アボカド/,
    ingredients: ["ごま", "くるみ", "アボカド"],
    policies: ["uruosu", "sasaeru"],
    text: (names) => `${names.join("・")}を乾きをやわらげる方向に使います。量は少なめにします。`,
  },
  {
    pattern: /ヨーグルト|チーズ|リコッタ/,
    ingredients: ["ヨーグルト", "チーズ"],
    policies: ["uruosu", "shizumeru", "yurumeru"],
    text: (names) => `${names.join("・")}を乾きをやわらげる方向に使います。湿気で重さが出やすい日は少量にします。`,
  },
  {
    pattern: /白菜|白きくらげ|あんかけ|とろみ|蒸し煮|スープ|汁|茶漬け|おかゆ|がゆ|チャウダー|シチュー|リゾット/,
    ingredients: ["白菜"],
    policies: ["uruosu", "sasaeru"],
    text: (names) => names.length
      ? `${names.join("・")}と汁気を残す調理で乾いた食事が続かないようにします。`
      : "汁気を残す調理で乾いた食事が続かないようにします。",
  },
  {
    pattern: /生姜|ねぎ|シナモン|根菜|ごぼう|里芋|温かい/,
    ingredients: ["生姜", "ねぎ", "根菜", "ごぼう", "里芋", "シナモン"],
    policies: ["nukumeru", "meguraseru", "sasaeru"],
    text: (names) => names.length
      ? `${names.join("・")}でお腹を冷やさず、内側から温める方向へ整えます。`
      : "温かい料理でお腹を冷やさず、内側から温める方向へ整えます。",
  },
  {
    pattern: /鶏肉|鶏そぼろ|鶏つくね|親子丼|卵|たまご|鮭|じゃがいも|米|ごはん|オートミール|豆|納豆/,
    ingredients: ["鶏肉", "卵", "鮭", "じゃがいも", "豆", "納豆", "オートミール"],
    policies: ["sasaeru", "nukumeru"],
    text: (names) => names.length
      ? `${names.join("・")}は消耗した日の食事を支える方向の食材です。`
      : "主食と主菜をそろえ、消耗した日の食事を支える方向に使います。",
  },
];

function buildMealFocusIngredients(idea) {
  const label = String(idea?.label || "");
  return MEAL_FOCUS_INGREDIENTS
    .map((entry, index) => ({ ...entry, index, position: label.search(entry.pattern) }))
    .filter((entry) => entry.position >= 0)
    .sort((a, b) => a.position - b.position || a.index - b.index)
    .map((entry) => entry.label)
    .filter((entry, index, values) => values.indexOf(entry) === index)
    .slice(0, 3);
}

function mealReasonContextScore(rule, context = {}) {
  const trigger = normalizeDailyCareTrigger(context?.trigger_key);
  const symptom = context?.symptom_focus || "";
  const policies = safeArray(context?.policy_keys);
  const rulePolicies = safeArray(rule?.policies);
  let score = rulePolicies.filter((key) => policies.includes(key)).length * 2;
  if (trigger === "heat" && rulePolicies.some((key) => ["shizumeru", "uruosu"].includes(key))) score += 3;
  if (trigger === "dry" && rulePolicies.includes("uruosu")) score += 3;
  if (trigger === "cold" && rulePolicies.includes("nukumeru")) score += 3;
  if (trigger === "damp" && rulePolicies.includes("nagasu")) score += 3;
  if (symptom === "digestion" && rulePolicies.some((key) => ["sasaeru", "nagasu", "nukumeru"].includes(key))) score += 2;
  if (["neck_shoulder", "headache", "mood", "sleep"].includes(symptom) && rulePolicies.some((key) => ["yurumeru", "shizumeru", "meguraseru"].includes(key))) score += 1.5;
  return score;
}

function cleanMealReasonText(value) {
  return String(value || "").replace(/^/, "").replace(/^/, "");
}

function buildMealFoodNatureReason(idea, context = {}) {
  const label = String(idea?.label || "");
  const policies = safeArray(idea?.policies);
  const focusIngredients = buildMealFocusIngredients(idea);
  const matching = MEAL_FOOD_NATURE_RULES
    .map((rule, index) => ({
      ...rule,
      index,
      policyScore: safeArray(rule.policies).filter((policy) => policies.includes(policy)).length,
      contextScore: mealReasonContextScore(rule, context),
      matches: rule.pattern.test(label),
      matchedNames: safeArray(rule.ingredients).filter((ingredient) => focusIngredients.includes(ingredient)),
    }))
    .filter((rule) => rule.matches)
    .sort((a, b) => b.contextScore - a.contextScore
      || Number(b.matchedNames.length > 0) - Number(a.matchedNames.length > 0)
      || b.policyScore - a.policyScore
      || a.index - b.index);
  if (matching[0]) {
    return cleanMealReasonText(matching[0].text(matching[0].matchedNames));
  }

  const tags = new Set(safeArray(idea?.tags));
  if (tags.has("moist")) return "汁気を残す調理で、乾いた食事が続かないようにします。";
  if (tags.has("warm")) return "温かい料理でお腹を冷やさず、内側から温める方向へ整えます。";
  if (tags.has("aroma")) return "だしや香味のある食材で気分を切り替え、張りつめた感じをゆるめる方向へ整えます。";
  if (tags.has("light")) return "油を控えた調理で、食後の重さをためにくくします。";
  return "温度・汁気・量を整え、今日の崩れ方を増やしにくい一食として選びます。";
}

function buildMealReasons(idea, reasonContext = {}) {
  const nutrition = MEAL_NUTRITION_REASONS[idea?.protein] || MEAL_NUTRITION_REASONS.other;
  return [
    { label: "体調との相性", text: buildMealFoodNatureReason(idea, reasonContext) },
    { label: "栄養面", text: nutrition },
  ];
}

function buildMealItemDetail(idea, { label = null, reasonContext = {} } = {}) {
  return {
    label: label || idea?.label || "",
    focus_ingredients: buildMealFocusIngredients(idea),
    meal_example: idea?.label || "",
    reasons: buildMealReasons(idea, reasonContext),
  };
}

function buildFoodForecastInsight({ theme, symptomFocus, primaryPolicy }) {
  const timing = theme?.mode === "tomorrow" ? "明日は" : "今日は";
  const weather = safeArray(theme?.trigger_labels).filter(Boolean).join("と") || "天気変化";
  const reaction = theme?.reaction_direction === "accel"
    ? "アクセル寄りの反応"
    : theme?.reaction_direction === "brake"
      ? "ブレーキ寄りの反応"
      : "体質の反応";
  const symptom = symptomFocus === "digestion"
    ? "胃腸の調子が崩れやすい見込み"
    : `${SYMPTOM_CONTEXT_LABELS[symptomFocus] || "体調"}が出やすい見込み`;
  const actionLead = theme?.mode === "tomorrow" ? "明日の朝は、" : "食事では、";
  const action = POLICY_FOOD_ACTIONS[primaryPolicy] || POLICY_FOOD_ACTIONS.sasaeru;
  return `${timing}${weather}の予報に${reaction}が重なり、${symptom}です。${actionLead}${action}`;
}

const TCM_FOOD_FUNCTION_META = {
  jianpi: { label: "健脾", public_label: "食事の土台を整える" },
  buqi: { label: "補気", public_label: "消耗時の食事を支える" },
  yangxue: { label: "養血", public_label: "血を養う食生活を支える" },
  liqi: { label: "理気", public_label: "香りで食事を切り替える" },
  huoxue: { label: "活血", public_label: "滞りを残しにくくする" },
  huashi: { label: "化湿", public_label: "重さをためにくくする" },
  lishui: { label: "利水", public_label: "水分の偏りを見直す" },
  wenzhong: { label: "温中", public_label: "冷たい食事の連続を切る" },
  qingre: { label: "清熱", public_label: "熱と刺激を重ねない" },
  shengjin: { label: "生津", public_label: "料理の汁気を保つ" },
  anshen: { label: "安神", public_label: "夜の刺激を減らす" },
};

const SUBLABEL_TCM_FOOD_FUNCTIONS = {
  qi_deficiency: ["jianpi", "buqi"],
  qi_stagnation: ["liqi"],
  blood_deficiency: ["yangxue"],
  blood_stasis: ["huoxue", "liqi"],
  fluid_damp: ["huashi", "lishui", "jianpi"],
  dampness: ["huashi", "lishui", "jianpi"],
  fluid_deficiency: ["shengjin"],
};

const POLICY_TCM_FOOD_FUNCTIONS = {
  shizumeru: ["qingre", "anshen"],
  yurumeru: ["liqi", "anshen"],
  meguraseru: ["liqi", "huoxue"],
  nagasu: ["huashi", "lishui", "jianpi"],
  uruosu: ["shengjin"],
  nukumeru: ["wenzhong", "jianpi"],
  sasaeru: ["jianpi", "buqi"],
};

const NUTRITION_NEED_META = {
  meal_continuity: { label: "食事を抜かない仕組み", product_roles: ["prepared_meal", "meal_subscription", "pantry_food"] },
  protein_continuity: { label: "たんぱく質を続けやすくする", product_roles: ["prepared_meal", "nutrition_support"] },
  iron_b_food_support: { label: "鉄・ビタミンB群を含む食生活", product_roles: ["nutrition_support", "prepared_meal"] },
  digestive_load_management: { label: "食後の重さを増やしにくい備え", product_roles: ["daily_tea", "pantry_food", "prepared_meal"] },
  fiber_mineral_balance: { label: "穀物・豆・野菜を続けやすくする", product_roles: ["pantry_food", "meal_subscription"] },
  hydration_routine: { label: "飲み物と料理の汁気を整える", product_roles: ["daily_tea", "pantry_food"] },
  caffeine_shift: { label: "カフェイン以外の一杯を持つ", product_roles: ["daily_tea"] },
  warm_meal_routine: { label: "温かい食事へ戻りやすくする", product_roles: ["pantry_food", "prepared_meal", "daily_tea"] },
};

const FOOD_PRODUCT_ROLE_META = {
  daily_tea: "毎日の一杯",
  pantry_food: "食事へ足す常備品",
  prepared_meal: "用意できない日の備え",
  meal_subscription: "食事管理を外へ預ける",
  nutrition_support: "栄養を補助する",
};

function uniqueFoodKeys(items) {
  return Array.from(new Set(safeArray(items).filter(Boolean)));
}

export function buildFoodCareProfile({ theme, symptomFocus = null, subLabels = [] } = {}) {
  const policyKeys = safeArray(theme?.policies).map((item) => item.key).filter(Boolean);
  const primaryPolicy = policyKeys[0] || "sasaeru";
  const secondaryPolicy = policyKeys[1] || null;
  const fit = {
    ...(POLICY_CULINARY_FIT[primaryPolicy] || POLICY_CULINARY_FIT.sasaeru),
    supporting_policy: secondaryPolicy,
  };
  const response = theme?.response_profile || {};
  const symptomLabel = SYMPTOM_CONTEXT_LABELS[symptomFocus] || null;
  const responseLabel = response.target_response_label || POLICY_RESPONSE_LABELS[primaryPolicy] || "今日のゆらぎ";
  const insight = buildFoodForecastInsight({ theme, symptomFocus, primaryPolicy });
  return {
    version: "food_care_profile_v1",
    response_key: response.primary_response_key || primaryPolicy,
    secondary_response_key: response.secondary_response_key || secondaryPolicy,
    body_focus: symptomFocus || null,
    reserve_level: response.reserve_level || (theme?.reserve_small ? "small" : "standard"),
    policies: policyKeys,
    culinary_fit: fit,
    insight,
    response_label: responseLabel,
    context_chips: uniqueFoodKeys([
      ...safeArray(theme?.trigger_labels),
      responseLabel,
      symptomLabel,
      response.reaction_direction === "accel" ? "アクセル寄り" : response.reaction_direction === "brake" ? "ブレーキ寄り" : null,
      response.reserve_level === "small" ? "余力小さめ" : null,
    ]).slice(0, 5),
    material_keys: uniqueFoodKeys([...safeArray(response.material_keys), ...safeArray(subLabels)]),
  };
}

export function buildFoodCommerceContext({ theme, symptomFocus = null, subLabels = [] } = {}) {
  const labels = uniqueFoodKeys([...safeArray(theme?.sub_labels), ...safeArray(subLabels)]).map((key) => key === "dampness" ? "fluid_damp" : key);
  const persistentScores = Object.fromEntries(Object.keys(POLICY_DEFINITIONS).map((key) => [key, 0]));
  labels.forEach((label, index) => addScores(persistentScores, SUB_LABEL_POLICY_SCORES[label], index === 0 ? 1 : 0.62));
  addScores(persistentScores, SYMPTOM_POLICY_SCORES[symptomFocus], 0.85);
  addScores(persistentScores, REACTION_POLICY_SCORES[theme?.reaction_direction], 0.38);
  if (theme?.reserve_small) addScores(persistentScores, { sasaeru: 1.25 }, 1);
  const policyKeys = Object.entries(persistentScores)
    .map(([key, score]) => ({ key, score: Number(score || 0) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))
    .map((item) => item.key)
    .slice(0, 3);
  if (!policyKeys.length) policyKeys.push("sasaeru");
  const tcmKeys = uniqueFoodKeys([
    ...labels.flatMap((key) => SUBLABEL_TCM_FOOD_FUNCTIONS[key] || []),
    ...policyKeys.flatMap((key) => POLICY_TCM_FOOD_FUNCTIONS[key] || []),
  ]).slice(0, 5);
  const nutritionNeeds = [];
  if (theme?.reserve_small || labels.includes("qi_deficiency") || symptomFocus === "fatigue") {
    nutritionNeeds.push("meal_continuity", "protein_continuity");
  }
  if (labels.includes("blood_deficiency") || symptomFocus === "dizziness") nutritionNeeds.push("iron_b_food_support");
  if (labels.includes("fluid_damp") || ["digestion", "swelling"].includes(symptomFocus)) {
    nutritionNeeds.push("digestive_load_management", "fiber_mineral_balance");
  }
  if (labels.includes("fluid_deficiency") || theme?.trigger_key === "dry") nutritionNeeds.push("hydration_routine");
  if (["sleep", "mood", "headache"].includes(symptomFocus) || theme?.reaction_direction === "accel") nutritionNeeds.push("caffeine_shift");
  if (labels.includes("qi_deficiency") || policyKeys.includes("nukumeru")) nutritionNeeds.push("warm_meal_routine");
  if (!nutritionNeeds.length) nutritionNeeds.push("meal_continuity", "fiber_mineral_balance");

  const needKeys = uniqueFoodKeys(nutritionNeeds).slice(0, 5);
  const roleKeys = uniqueFoodKeys(needKeys.flatMap((key) => NUTRITION_NEED_META[key]?.product_roles || []));
  // 一過性の天気だけでは栄養補助を主役にしない。体質・余力・選択中の不調から
  // 継続理由がある時にだけ nutrition_support を残す。
  const hasNutritionBasis = theme?.reserve_small
    || labels.includes("qi_deficiency")
    || labels.includes("blood_deficiency")
    || ["fatigue", "dizziness"].includes(symptomFocus);
  const productRoles = roleKeys
    .filter((key) => key !== "nutrition_support" || hasNutritionBasis)
    .slice(0, 5);
  const publicNeeds = needKeys.map((key) => NUTRITION_NEED_META[key]?.label).filter(Boolean);
  const publicFunctions = tcmKeys.map((key) => TCM_FOOD_FUNCTION_META[key]?.public_label).filter(Boolean);
  return {
    version: "food_commerce_context_v1",
    horizon: "habit",
    basis: "constitution_symptom_reserve",
    // 商品棚の基礎は体質・不調・余力。今日の天気トリガーは含めず、
    // ショップ側で季節や明日の予報を軽い順位調整にだけ使う。
    policy_keys: policyKeys.slice(0, 3),
    tcm_function_keys: tcmKeys,
    tcm_functions: tcmKeys.map((key) => ({ key, ...TCM_FOOD_FUNCTION_META[key] })).filter((item) => item.label),
    nutrition_need_keys: needKeys,
    nutrition_needs: needKeys.map((key) => ({ key, ...NUTRITION_NEED_META[key] })).filter((item) => item.label),
    product_role_keys: productRoles,
    product_roles: productRoles.map((key) => ({ key, label: FOOD_PRODUCT_ROLE_META[key] })).filter((item) => item.label),
    summary: uniqueFoodKeys([...publicNeeds.slice(0, 2), ...publicFunctions.slice(0, 1)]).join("・"),
  };
}

function foodTagScore(idea, { theme, symptomFocus, subLabels }) {
  let score = 0;
  const tags = new Set(safeArray(idea?.tags));
  const activePolicies = safeArray(theme?.policies).map((item) => item.key);
  safeArray(idea?.policies).forEach((key) => {
    const rank = activePolicies.indexOf(key);
    if (rank === 0) score += 5.4;
    else if (rank === 1) score += 2.5;
  });

  if (activePolicies.includes("sasaeru") && tags.has("support")) score += 2;
  if (activePolicies.includes("nagasu") && tags.has("light")) score += 1.9;
  if (activePolicies.includes("meguraseru") && tags.has("aroma")) score += 1.7;
  if (activePolicies.includes("yurumeru") && (tags.has("aroma") || tags.has("calm"))) score += 1.3;
  if (activePolicies.includes("nukumeru") && tags.has("warm")) score += 2.2;
  if (activePolicies.includes("shizumeru") && tags.has("calm")) score += 2;
  if (activePolicies.includes("uruosu") && tags.has("moist")) score += 2.2;

  if (safeArray(idea?.symptoms).includes(symptomFocus)) score += 2.5;
  if (["digestion", "dizziness"].includes(symptomFocus) && tags.has("digestion")) score += 1.4;
  if (["fatigue", "dizziness"].includes(symptomFocus) && tags.has("support")) score += 1.25;
  if (["mood", "neck_shoulder", "headache", "sleep"].includes(symptomFocus) && (tags.has("aroma") || tags.has("calm"))) score += 0.95;
  if (symptomFocus === "swelling" && tags.has("light")) score += 1.25;
  if (symptomFocus === "low_back_pain" && tags.has("warm")) score += 0.9;

  const labels = new Set(safeArray(subLabels).map((key) => key === "dampness" ? "fluid_damp" : key));
  safeArray(idea?.sub_labels).forEach((key) => {
    if (labels.has(key)) score += 1.8;
  });
  if (labels.has("qi_deficiency") && tags.has("support")) score += 1.15;
  if (labels.has("qi_stagnation") && tags.has("aroma")) score += 1.05;
  if (labels.has("fluid_damp") && tags.has("light")) score += 1.15;
  if (labels.has("fluid_deficiency") && tags.has("moist")) score += 1.15;
  if (labels.has("blood_deficiency") && tags.has("support")) score += 0.85;
  if (labels.has("blood_stasis") && tags.has("aroma")) score += 0.8;

  // 天気は身体反応のきっかけとして小さく使い、献立母集団を決めない。
  const trigger = normalizeDailyCareTrigger(theme?.trigger_key);
  if (safeArray(idea?.avoid_triggers).includes(trigger)) score -= 12;
  if (safeArray(idea?.triggers).includes(trigger)) score += 0.7;
  if (trigger === "cold" && tags.has("warm")) score += 3;
  if (trigger === "cold" && !tags.has("warm")) score -= 2.2;
  if (trigger === "cold" && tags.has("cool")) score -= 5;
  if (trigger === "cold" && idea?.format === "snack" && !tags.has("warm")) score -= 0.8;
  if (trigger === "heat" && (tags.has("calm") || tags.has("cool"))) score += 1.15;
  if (trigger === "heat" && tags.has("light")) score += 0.8;
  if (trigger === "heat" && tags.has("moist")) score += 0.55;
  if (trigger === "heat" && tags.has("warm") && !tags.has("calm")) score -= 1.8;
  if (trigger === "dry" && tags.has("moist")) score += 0.65;
  if (trigger === "dry" && !tags.has("moist")) score -= 0.35;
  if (trigger === "dry" && tags.has("cool")) score -= 2.5;
  if (trigger === "dry" && symptomFocus === "digestion" && tags.has("warm")) score += 1.1;
  if (trigger === "damp" && tags.has("light")) score += 0.55;
  if (theme?.reserve_small && (tags.has("support") || idea?.effort === "quick" || idea?.effort === "buy")) score += 0.9;
  return score;
}

// 日本のスーパー・コンビニ・一般的な飲食店で想像しやすい料理を通常表示の
// 母集団にする。外国料理名そのものを多様性として優先しない。
const SPECIALTY_CUISINES = new Set([
  "地中海", "北アフリカ", "中東", "北欧", "フレンチ", "東南アジア",
  "ベトナム", "メキシカン", "スペイン", "ハワイ風",
]);

function isEverydayFoodCandidate(idea) {
  return !SPECIALTY_CUISINES.has(String(idea?.cuisine || ""));
}

function foodDateOrdinal(targetDate) {
  const parsed = new Date(`${targetDate || "2000-01-01"}T00:00:00Z`).getTime();
  return Number.isFinite(parsed) ? Math.floor(parsed / 86400000) : 0;
}

function diversifyFoodCandidates(items, limit) {
  const selected = [];
  for (const item of items) {
    if (selected.length >= limit) break;
    if (!selected.length) {
      selected.push(item);
      continue;
    }
    const exactDuplicate = selected.some((picked) => picked.id === item.id);
    if (exactDuplicate) continue;
    const differentEnough = selected.every((picked) => (
      picked.cuisine !== item.cuisine || picked.protein !== item.protein || picked.format !== item.format
    ));
    if (differentEnough) selected.push(item);
  }
  if (selected.length < limit) {
    for (const item of items) {
      if (selected.length >= limit) break;
      if (!selected.some((picked) => picked.id === item.id)) selected.push(item);
    }
  }
  return selected;
}

function selectFoodIdeas({ catalog, catalogKey, theme, targetDate, symptomFocus, subLabels, limit = 3 }) {
  const allScored = safeArray(catalog)
    .map((idea, sourceIndex) => ({
      ...idea,
      _sourceIndex: sourceIndex,
      _score: foodTagScore(idea, { theme, symptomFocus, subLabels }),
    }))
    .sort((a, b) => b._score - a._score || a.id.localeCompare(b.id));
  const everydayScored = allScored.filter(isEverydayFoodCandidate);
  const scored = everydayScored.length >= Math.max(limit, 4) ? everydayScored : allScored;
  const best = scored[0]?._score || 0;
  const preferredIds = new Set(scored.filter((idea) => idea._score >= best - 3.1).map((idea) => idea.id));
  scored.slice(0, Math.min(6, scored.length)).forEach((idea) => preferredIds.add(idea.id));
  const preferred = scored.filter((idea) => preferredIds.has(idea.id));
  const rest = scored.filter((idea) => !preferredIds.has(idea.id));
  const contextKey = [
    catalogKey,
    safeArray(theme?.policies).map((item) => item.key).join("+"),
    normalizeDailyCareTrigger(theme?.trigger_key),
    normalizeDailyCareTrigger(theme?.secondary_trigger_key),
    symptomFocus || "none",
    theme?.core_code || "none",
  ].join("|");
  const rotate = (items, offset = 0) => {
    if (!items.length) return [];
    const start = (stableCareHash(contextKey) + foodDateOrdinal(targetDate) + offset) % items.length;
    return [...items.slice(start), ...items.slice(0, start)];
  };
  return diversifyFoodCandidates([...rotate(preferred), ...rotate(rest, 5)], limit);
}

function parseDrinkChoice(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^[◎○△]?\s*([^：]+)(?:：(.+))?$/);
  const label = String(match?.[1] || raw).trim();
  const reason = String(match?.[2] || "天気と体調に合わせて、量と温度を調整しやすい飲み物です。").trim();
  return {
    label,
    reasons: [
      { label: "体調との相性", text: "天気と体調に合わせ、温める・冷ます・うるおす方向の偏りが小さい候補として選びます。" },
      { label: "成分・飲み方", text: reason },
    ],
  };
}

function normalizeDrinkChoiceCopy(detail) {
  if (!detail || typeof detail !== "object") return detail;
  return {
    ...detail,
    reasons: safeArray(detail.reasons).map((reason) => ({
      ...reason,
      text: String(reason?.text || "").replace(
        "香りや温度で、手元作業の区切りをつくる一杯です。",
        "一口飲むたびに手元作業をいったん止め、首肩の力を抜くきっかけにします。"
      ),
    })),
  };
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
  const normalizedMode = mode === "tomorrow" ? "tomorrow" : "today";
  const foodCareProfile = buildFoodCareProfile({ theme, symptomFocus, subLabels });
  const commerceContext = buildFoodCommerceContext({ theme, symptomFocus, subLabels });
  const mealReasonContext = {
    trigger_key: theme?.trigger_key,
    secondary_trigger_key: theme?.secondary_trigger_key,
    symptom_focus: symptomFocus,
    reaction_direction: theme?.reaction_direction,
    policy_keys: safeArray(theme?.policies).map((item) => item.key),
  };
  const mealItemDetail = (idea, options = {}) => buildMealItemDetail(idea, {
    ...options,
    reasonContext: mealReasonContext,
  });
  const ideas = selectFoodIdeas({
    catalog: normalizedMode === "tomorrow" ? TOMORROW_BREAKFAST_CATALOG : RESPONSE_MEAL_CATALOG,
    catalogKey: normalizedMode === "tomorrow" ? "tomorrow-breakfast" : "today-meal",
    theme,
    targetDate,
    symptomFocus,
    subLabels,
    limit: 2,
  });
  const primary = ideas[0] || RESPONSE_MEAL_CATALOG[0];
  const alternatives = ideas.slice(1, 3);
  const buyChoice = normalizedMode === "today" ? selectFoodIdeas({
    catalog: BUY_MEAL_CATALOG,
    catalogKey: "today-buy",
    theme,
    targetDate,
    symptomFocus,
    subLabels,
    limit: 1,
  })[0] : null;
  const eatOutChoice = normalizedMode === "today" ? selectFoodIdeas({
    catalog: EAT_OUT_MEAL_CATALOG,
    catalogKey: "today-eat-out",
    theme,
    targetDate,
    symptomFocus,
    subLabels,
    limit: 1,
  })[0] : null;
  const nightChoice = normalizedMode === "tomorrow" ? selectFoodIdeas({
    catalog: NIGHT_SNACK_CATALOG,
    catalogKey: "tonight-snack",
    theme,
    targetDate,
    symptomFocus,
    subLabels,
    limit: 1,
  })[0] : null;
  const existingDrinkCard = safeArray(food.action_cards).find((card) => card?.key === "drink");
  const existingDrinkDetails = safeArray(existingDrinkCard?.item_details);
  const drinkChoices = safeArray(existingDrinkCard?.items).slice(0, 2).map((item, index) => {
    const detail = existingDrinkDetails[index];
    return detail?.label && safeArray(detail?.reasons).length
      ? normalizeDrinkChoiceCopy(detail)
      : parseDrinkChoice(item);
  });
  const drinkItems = drinkChoices.map((item) => item.label);
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
  const primaryLabel = normalizedMode === "tomorrow" ? "明日の朝の一食" : "今日の一食";
  const cautionLabel = normalizedMode === "tomorrow" ? "今夜〜明朝に重ねない" : "今日は重ねない";
  const commonCautionCard = {
    key: "caution",
    label: cautionLabel,
    body: subtraction.reason,
    items: [subtraction.label],
    prominent: false,
    subtraction_basis: {
      trigger: theme?.trigger_key || "default",
      secondary_trigger: theme?.secondary_trigger_key || null,
      policies: safeArray(subtraction.policies),
    },
  };
  const todayCards = [
    {
      key: "choice",
      label: primaryLabel,
      body: null,
      items: [primary.label],
      item_details: [mealItemDetail(primary)],
      primary: true,
      prominent: true,
    },
    drinkItems.length ? {
      key: "drink",
      label: "今日、食事と合わせる飲み物",
      body: existingDrinkCard?.body || "食事や喉の渇きに合わせ、温度と量を調整します。",
      items: drinkItems,
      item_details: drinkChoices,
      prominent: true,
    } : null,
    commonCautionCard,
    buyChoice || eatOutChoice ? {
      key: "no_cook",
      label: "作らずに食べるなら",
      body: "持ち帰るならコンビニ・スーパー、店で食べるなら外食の欄を見ます。",
      items: [
        buyChoice ? `コンビニ・スーパー｜${buyChoice.label}` : null,
        eatOutChoice ? `外食｜${eatOutChoice.label}` : null,
      ].filter(Boolean),
      item_details: [
        buyChoice ? mealItemDetail(buyChoice, { label: `コンビニ・スーパー｜${buyChoice.label}` }) : null,
        eatOutChoice ? mealItemDetail(eatOutChoice, { label: `外食｜${eatOutChoice.label}` }) : null,
      ].filter(Boolean),
    } : null,
    alternatives.length ? {
      key: "alternative",
      label: "もう一つ見るなら",
      body: null,
      items: alternatives.map((item) => item.label),
      item_details: alternatives.map((item) => mealItemDetail(item)),
    } : null,
  ].filter(Boolean);

  const tomorrowCards = [
    {
      key: "choice",
      label: primaryLabel,
      body: null,
      items: [primary.label],
      item_details: [mealItemDetail(primary)],
      primary: true,
      prominent: true,
    },
    drinkItems.length ? {
      key: "drink",
      label: "今夜〜明朝の飲み物",
      body: existingDrinkCard?.body || "明日の朝に迷わないよう、今夜のうちに一つ決めます。",
      items: drinkItems,
      item_details: drinkChoices,
      prominent: true,
    } : null,
    nightChoice ? {
      key: "night",
      label: "今夜、小腹が空いたら",
      body: null,
      items: [nightChoice.label.replace(/^小腹が空いたら、/, "")],
      item_details: [{
        ...mealItemDetail(nightChoice, { label: nightChoice.label.replace(/^小腹が空いたら、/, "") }),
        meal_example: nightChoice.label.replace(/^小腹が空いたら、/, ""),
      }],
      prominent: false,
    } : null,
    commonCautionCard,
    primary.prep ? {
      key: "prep",
      label: "今夜しておくこと",
      body: "朝に考え直さず食べられるよう、一手だけ準備します。",
      items: [primary.prep],
    } : null,
    alternatives.length ? {
      key: "alternative",
      label: "朝の別案",
      body: null,
      items: alternatives.map((item) => item.label),
      item_details: alternatives.map((item) => mealItemDetail(item)),
    } : null,
  ].filter(Boolean);

  const actionCards = normalizedMode === "tomorrow" ? tomorrowCards : todayCards;

  const enhanced = {
    ...food,
    version: DAILY_CARE_LOGIC_VERSION,
    badge: normalizedMode === "tomorrow" ? "今夜から明朝に備える" : "今日の身体に合わせる",
    title: primary.label,
    recommendation: foodCareProfile.insight,
    focus: null,
    detail_eyebrow: "ほかの選び方",
    detail_title: normalizedMode === "tomorrow" ? "今夜の準備・朝の別案" : "作らない時・別の候補・控えたい物",
    primary_action: { id: primary.id, label: primary.label, reason: primary.note },
    subtraction_action: {
      id: subtraction.id,
      label: subtraction.label,
      reason: subtraction.reason,
      policies: safeArray(subtraction.policies),
    },
    alternatives: alternatives.map((item) => ({ id: item.id, label: item.label, reason: item.note })),
    scene_options: {
      home: { id: primary.id, label: primary.label, reason: primary.note },
      buy: buyChoice ? { id: buyChoice.id, label: buyChoice.label, reason: buyChoice.note } : null,
      eat_out: eatOutChoice ? { id: eatOutChoice.id, label: eatOutChoice.label, reason: eatOutChoice.note } : null,
      night: nightChoice ? { id: nightChoice.id, label: nightChoice.label, reason: nightChoice.note } : null,
    },
    action_cards: actionCards,
    add_items: uniqueFoodKeys([
      primary.label,
      buyChoice?.label,
      eatOutChoice?.label,
      nightChoice?.label,
      ...alternatives.map((item) => item.label),
    ]),
    caution_items: [subtraction.label],
    avoid: subtraction.label,
    how_to: primary.note,
    reason: `${foodCareProfile.response_label}が${SYMPTOM_CONTEXT_LABELS[symptomFocus] || "今日の体調"}へ出やすい見込みから、${safeArray(theme?.policies).map((item) => item.label).join("・") || "ささえる"}方針で選びました。`,
    context_chips: foodCareProfile.context_chips,
    food_care_profile: foodCareProfile,
    commerce_context: commerceContext,
    care_theme: theme,
    display_compact: true,
  };
  return enhanced;
}

function buildMeridianWeatherFinish(theme) {
  const trigger = normalizeDailyCareTrigger(theme?.trigger_key);
  if (trigger === "cold") return "最後に手のひらを重ね、10秒だけ温かさを残します。";
  if (trigger === "heat") return "強くこすらず、長く息を吐いて終えます。";
  if (["damp", "pressure_down"].includes(trigger)) return "左右を一度ずつ行い、最後に足裏を床へ預けます。";
  if (trigger === "dry") return "終えたら手を止め、そのまま2呼吸します。";
  if (["pressure_up", "temp_shift"].includes(trigger)) return "息を止めず、吐く息に合わせて行います。";
  return "痛くない範囲で、短く行います。";
}

export function buildMeridianLineCare({ theme, riskContext = null } = {}) {
  const primary = theme?.primary_meridian || riskContext?.constitution_context?.primary_meridian || null;
  const secondary = theme?.secondary_meridian || riskContext?.constitution_context?.secondary_meridian || null;
  const selected = MERIDIAN_LINE_CARE[primary] || MERIDIAN_LINE_CARE[secondary] || null;
  if (!selected) return null;
  const baseAction = theme?.mode === "tomorrow" && selected.tomorrow_action
    ? selected.tomorrow_action
    : selected.action;
  const action = `${baseAction}。${buildMeridianWeatherFinish(theme)}`.replace(/。。/g, "。");
  return {
    ...selected,
    meridian_code: MERIDIAN_LINE_CARE[primary] ? primary : secondary,
    intensity: theme?.stimulus || "やさしく短く",
    action,
    label: action,
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
      ? `${lineCare.reason} ${theme?.mode === "tomorrow" ? "今夜" : "今日"}は${lineCare.intensity}で十分です。`
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
