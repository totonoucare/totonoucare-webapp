// lib/diagnosis/v2/labels.js

/**
 * 未病レーダー v2 Labels
 *
 * Core label:
 * - accel_batt_small / accel_batt_standard / accel_batt_large
 * - brake_batt_small / brake_batt_standard / brake_batt_large
 */

/** @typedef {'fatigue'|'sleep'|'neck_shoulder'|'low_back_pain'|'swelling'|'headache'|'dizziness'|'mood'} Symptom */
/** @typedef {'accel_batt_small'|'accel_batt_standard'|'accel_batt_large'|'brake_batt_small'|'brake_batt_standard'|'brake_batt_large'} CoreCode */
/** @typedef {'qi_stagnation'|'qi_deficiency'|'blood_deficiency'|'blood_stasis'|'fluid_damp'|'fluid_deficiency'} SubLabelCode */
/** @typedef {'lung_li'|'heart_si'|'kidney_bl'|'liver_gb'|'spleen_st'|'pc_sj'} MeridianCode */

export const CORE_LABELS = {
  accel_batt_small: {
    title: "瞬発集中型",
    short: "アクセル寄り × 余力小",
    tcm_hint:
      "動きたい方向には進みやすい一方で、余力が削れやすいタイプです。勢いで乗り切れてしまうぶん、あとから張り・乾き・睡眠の質低下などの反動が出やすくなります。",
  },
  accel_batt_standard: {
    title: "推進型",
    short: "アクセル寄り × 余力標準",
    tcm_hint:
      "動きたい方向に体が乗りやすく、余力は標準域です。勢いがつくとやり過ぎやすいので、忙しさが続く時ほど“区切り”を入れると崩れにくくなります。",
  },
  accel_batt_large: {
    title: "持久推進型",
    short: "アクセル寄り × 余力大",
    tcm_hint:
      "活動量を上げても保ちやすいタイプです。頑張れてしまう分、張りやこわばりが溜まって不調として出ることがあるので、溜め込む前の微調整が効きます。",
  },
  brake_batt_small: {
    title: "慎重始動型",
    short: "ブレーキ寄り × 余力小",
    tcm_hint:
      "体が慎重モードに入りやすく、余力も小さめなタイプです。重だるさ・朝の動きづらさ・むくみ感が表に出やすいので、まずは削れにくい土台づくりが大切です。",
  },
  brake_batt_standard: {
    title: "マイペース型",
    short: "ブレーキ寄り × 余力標準",
    tcm_hint:
      "無理は効きづらい一方で、整えれば保ちやすいタイプです。動き始めや切り替えの重さが出やすいので、一定のリズムを作ると体調が乗りやすくなります。",
  },
  brake_batt_large: {
    title: "どっしり型",
    short: "ブレーキ寄り × 余力大",
    tcm_hint:
      "余力は保ちやすい一方で、活動のペースはゆっくりめなタイプです。重さ・むくみ・停滞感として出やすいので、ため込みやすいものをためない方向に整えると軽さが出やすくなります。",
  },
};

/**
 * Sub label dictionary
 */
export const SUB_LABELS = {
  qi_stagnation: {
    title: "緊張で巡り・気分が詰まりやすい",
    short: "気滞",
    action_hint:
      "オンオフの切り替えが苦手になり、無意識に力が入りやすくなっています。深呼吸や香りの良いお茶などで、体に「休むサイン」を送ると緊張がほどけやすくなります。",
  },
  qi_deficiency: {
    title: "エネルギー不足になりやすい",
    short: "気虚",
    action_hint:
      "体を動かすガソリン（気）を作りにくく、消耗しやすい状態です。無理に動いて発散するよりも、短時間でも横になるなど「まずはバッテリーを充電する」時間を最優先にしてください。",
  },
  blood_deficiency: {
    title: "滋養が足りず回復しにくい",
    short: "血虚",
    action_hint:
      "全身に栄養と潤いを運ぶ働きが不足しています。特に目や頭の使いすぎは消耗を加速させるため、スマホを置いて視覚の刺激を減らすと、睡眠の質や回復力が底上げされます。",
  },
  blood_stasis: {
    title: "こわばり・滞りが残りやすい",
    short: "血瘀",
    action_hint:
      "巡りが一部で滞り、冷えや局所的なこわばりを作っています。同じ姿勢を避け、温めながら軽く動かすことで「固まり」をほどいていくと、つらさが抜けやすくなります。",
  },
  fluid_damp: {
    title: "水分代謝が滞り、重だるさが出やすい",
    short: "痰湿",
    action_hint:
      "余分な水分が体内に停滞し、重さやむくみを生んでいます。冷たいものや甘いものを少し控え、胃腸を休ませながら汗をかく習慣をつけると、体がスッと軽くなりやすいです。",
  },
  fluid_deficiency: {
    title: "乾きやすく潤いが足りない",
    short: "津液不足",
    action_hint:
      "体を冷まし、滑らかに動かすための「潤い」が不足しやすい状態です。汗のかきすぎや夜更かしを避け、体に水分を留める（保つ）食事や過ごし方を意識すると整いやすいです。",
  },
};

export const MERIDIAN_LINES = {
  lung_li: {
    title: "首・鎖骨まわりライン",
    body_area: "首〜鎖骨〜腕の外側",
    meridians: ["肺経", "大腸経"],
    organs_hint:
      "呼吸が浅くなった時や、自律神経やバリア機能の乱れがサインとして現れやすいゾーンです。",
  },
  heart_si: {
    title: "肩〜腕ライン",
    body_area: "肩甲骨まわり〜腕の内側〜小指側",
    meridians: ["心経", "小腸経"],
    organs_hint:
      "頭の使いすぎや緊張、睡眠の質が低下した時にこわばりとして現れやすいゾーンです。",
  },
  kidney_bl: {
    title: "背骨・下半身軸ライン",
    body_area: "背中〜腰〜脚の後ろ側",
    meridians: ["腎経", "膀胱経"],
    organs_hint:
      "冷えや、根本的なエネルギーの消耗が、背中の張りや腰の重さとして現れやすいゾーンです。",
  },
  liver_gb: {
    title: "体側・ねじりライン",
    body_area: "脇腹〜股関節〜脚の外側/内側",
    meridians: ["肝経", "胆経"],
    organs_hint:
      "ストレスや我慢、感情の抑圧が、体の側面の張りや巡りの悪さとして現れやすいゾーンです。",
  },
  spleen_st: {
    title: "前面・消化軸ライン",
    body_area: "お腹〜太もも前〜すね",
    meridians: ["脾経", "胃経"],
    organs_hint:
      "胃腸の疲れや水分代謝の滞りが、お腹の重さや前面のだるさとして現れやすいゾーンです。",
  },
  pc_sj: {
    title: "上肢外側ライン",
    body_area: "腕の外側〜肩の外側〜手の甲側",
    meridians: ["心包経", "三焦経"],
    organs_hint:
      "上半身の熱や過度な緊張が逃げ場を失った時に、腕や肩周りの重さとして現れやすいゾーンです。",
  },
};

export const SYMPTOM_LABELS = {
  fatigue: "だるさ・疲労",
  sleep: "睡眠",
  neck_shoulder: "首肩のつらさ",
  low_back_pain: "腰のつらさ",
  swelling: "むくみ",
  headache: "頭痛",
  dizziness: "めまい",
  mood: "気分の浮き沈み",
};

export function normalizeThermo(obj) {
  const v = obj?.thermo ?? obj?.cold_heat ?? 0;
  return v === -1 || v === 0 || v === 1 ? v : 0;
}

export function normalizeResilience(obj) {
  const v = obj?.resilience ?? 0;
  return v === -1 || v === 0 || v === 1 ? v : 0;
}

export function getCoreLabel(code) {
  return CORE_LABELS[code] || CORE_LABELS.brake_batt_standard;
}

export function getSubLabels(codes) {
  if (!Array.isArray(codes)) return [];
  return codes
    .map((c) => {
      const v = SUB_LABELS[c];
      if (!v) return null;
      return { code: c, ...v };
    })
    .filter(Boolean);
}

export function getMeridianLine(code) {
  if (!code) return null;
  return MERIDIAN_LINES[code] || null;
}
