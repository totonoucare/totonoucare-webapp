// lib/diagnosis/v2/labels.js

/**
 * 未病レーダー v2 Labels (REFRESHED: 9 core types)
 *
 * - Core label: 9 types (yin_yang × drive)
 *   accel_batt_small / accel_batt_standard / accel_batt_large
 *   steady_batt_small / steady_batt_standard / steady_batt_large
 *   brake_batt_small / brake_batt_standard / brake_batt_large
 *
 * - Sub labels: 6 types (materials)
 *   qi_stagnation, qi_deficiency, blood_deficiency, blood_stasis, fluid_damp, fluid_deficiency
 *
 * - Meridian lines: 6 groups
 *
 * NOTE:
 * AIにラベルを決めさせない。辞書で固定。
 */

/** @typedef {'fatigue'|'sleep'|'neck_shoulder'|'low_back_pain'|'swelling'|'headache'|'dizziness'|'mood'} Symptom */
/** @typedef {'accel_batt_small'|'accel_batt_standard'|'accel_batt_large'|'steady_batt_small'|'steady_batt_standard'|'steady_batt_large'|'brake_batt_small'|'brake_batt_standard'|'brake_batt_large'} CoreCode */
/** @typedef {'qi_stagnation'|'qi_deficiency'|'blood_deficiency'|'blood_stasis'|'fluid_damp'|'fluid_deficiency'} SubLabelCode */
/** @typedef {'lung_li'|'heart_si'|'kidney_bl'|'liver_gb'|'spleen_st'|'pc_sj'} MeridianCode */

/**
 * Core label dictionary
 * - title: 覚えやすい呼び名
 * - short: UI短縮
 * - tcm_hint: 世界観を崩さない説明（アクセル/ブレーキ＝踏み癖、バッテリー＝余力）
 */
export const CORE_LABELS = ({
  // ----------------
  // accel × battery
  // ----------------
  accel_batt_small: {
    title: "アクセル優位 × バッテリー小",
    short: "アクセル / 小",
    tcm_hint:
      "頑張りが効きやすい一方で、余力が削れやすいタイプです。調子が良い日は動けますが、無理が続くと後から疲れや乾き、睡眠の質低下などで反動が出やすくなります。",
  },
  accel_batt_standard: {
    title: "アクセル優位 × バッテリー標準",
    short: "アクセル / 標準",
    tcm_hint:
      "動きたい方向に体が乗りやすく、余力は標準域です。勢いがつくとやり過ぎやすいので、忙しさが続く時ほど“区切り”を入れると安定しやすくなります。",
  },
  accel_batt_large: {
    title: "アクセル優位 × バッテリー大",
    short: "アクセル / 大",
    tcm_hint:
      "活動量を上げても保ちやすいタイプです。頑張れてしまう分、張りやこわばりが溜まって不調として出ることがあるので、溜め込む前の微調整が効きます。",
  },

  // ----------------
  // steady × battery
  // ----------------
  steady_batt_small: {
    title: "安定運転 × バッテリー小",
    short: "安定 / 小",
    tcm_hint:
      "普段は大きく乱れにくい一方で、余力が小さめなので、気づかない消耗が溜まると一気にしんどくなりやすいタイプです。回復の確保で体調が底上げされやすいです。",
  },
  steady_batt_standard: {
    title: "安定運転 × バッテリー標準",
    short: "安定 / 標準",
    tcm_hint:
      "偏りが強くなく、全体としてバランスが取りやすいタイプです。乱れるときは生活リズムのズレや環境の変化が重なった時なので、整えるほど安定感が出ます。",
  },
  steady_batt_large: {
    title: "安定運転 × バッテリー大",
    short: "安定 / 大",
    tcm_hint:
      "余力があり、崩れにくいタイプです。大きな不調は出にくい反面、こわばりや重だるさを放置すると別の形で表に出ることがあるので、違和感の段階で整えると良いです。",
  },

  // ----------------
  // brake × battery
  // ----------------
  brake_batt_small: {
    title: "ブレーキ優位 × バッテリー小",
    short: "ブレーキ / 小",
    tcm_hint:
      "体が慎重モードになりやすく、余力も小さめなタイプです。冷え・重だるさ・朝の動きづらさが出やすいので、まず“削れにくい土台”を作るほど安定します。",
  },
  brake_batt_standard: {
    title: "ブレーキ優位 × バッテリー標準",
    short: "ブレーキ / 標準",
    tcm_hint:
      "無理が効きづらい反面、整えれば保ちやすいタイプです。動き始めや切り替えの重さが出やすいので、一定のリズムを作ると体調が乗りやすくなります。",
  },
  brake_batt_large: {
    title: "ブレーキ優位 × バッテリー大",
    short: "ブレーキ / 大",
    tcm_hint:
      "余力はあるのに、体のペースが上がりにくいタイプです。重さ・むくみ感・停滞感として出やすいので、溜まりやすいものを溜めない方向に整えると軽さが出やすいです。",
  },
});

/**
 * Sub label dictionary
 */
export const SUB_LABELS =
  /** @type {Record<SubLabelCode, {title:string, short:string, action_hint:string}>} */ ({
  qi_stagnation: {
    title: "緊張で巡り・気分が詰まりやすい",
    short: "気滞",
    action_hint: "切り替え（呼吸・軽い動き）を意識すると楽になりやすい。",
  },
  qi_deficiency: {
    title: "エネルギー不足になりやすい",
    short: "気虚",
    action_hint: "短時間・低負荷で“回復の入口”を作るのが効きやすい。",
  },
  blood_deficiency: {
    title: "滋養が足りず回復しにくい",
    short: "血虚",
    action_hint: "睡眠・目や脳の休息・刺激を減らすと整いやすい。",
  },
  blood_stasis: {
    title: "こわばり・滞りが残りやすい",
    short: "血瘀",
    action_hint: "温め＋ほぐし＋軽い可動で“固まり”をほどくと整いやすい。",
  },
  fluid_damp: {
    title: "水分代謝が滞り、重だるさが出やすい",
    short: "痰湿",
    action_hint: "温め・軽めの食・出す（巡らせる）を意識すると重だるさが減りやすい。",
  },
  fluid_deficiency: {
    title: "乾きやすく潤いが足りない",
    short: "津液不足",
    action_hint: "やりすぎを避け、補う（保つ）方向に寄せると整いやすい。",
    },
  });

/** Meridian “line” dictionary */
export const MERIDIAN_LINES =
  /** @type {Record<MeridianCode, {title:string, body_area:string, meridians:string[], organs_hint:string}>} */ ({
    lung_li: {
      title: "首・鎖骨まわりライン",
      body_area: "首〜鎖骨〜腕の外側",
      meridians: ["肺経", "大腸経"],
      organs_hint: "呼吸・皮膚・自律神経の影響が出やすいゾーン。",
    },
    heart_si: {
      title: "肩〜腕ライン",
      body_area: "肩甲骨まわり〜腕の内側〜小指側",
      meridians: ["心経", "小腸経"],
      organs_hint: "緊張・睡眠・上半身のこわばりに関連しやすいゾーン。",
    },
    kidney_bl: {
      title: "背骨・下半身軸ライン",
      body_area: "背中〜腰〜脚の後ろ側",
      meridians: ["腎経", "膀胱経"],
      organs_hint: "腰・冷え・回復の土台に関連しやすいゾーン。",
    },
    liver_gb: {
      title: "体側・ねじりライン",
      body_area: "脇腹〜股関節〜脚の外側/内側",
      meridians: ["肝経", "胆経"],
      organs_hint: "ストレス反応・巡り・側面の張りに関連しやすいゾーン。",
    },
    spleen_st: {
      title: "前面・消化軸ライン",
      body_area: "お腹〜太もも前〜すね",
      meridians: ["脾経", "胃経"],
      organs_hint: "消化・水分代謝・だるさに関連しやすいゾーン。",
    },
    pc_sj: {
      title: "上肢外側ライン",
      body_area: "腕の外側〜肩の外側〜手の甲側",
      meridians: ["心包経", "三焦経"],
      organs_hint: "腕の挙上・肩の外側の張り、上半身の熱/緊張の逃げ道に関連しやすいゾーン。",
    },
  });

/** Symptom labels */
export const SYMPTOM_LABELS =
  /** @type {Record<Symptom, string>} */ ({
    fatigue: "だるさ・疲労",
    sleep: "睡眠",
    neck_shoulder: "首肩のつらさ",
    low_back_pain: "腰のつらさ",
    swelling: "むくみ",
    headache: "頭痛",
    dizziness: "めまい",
    mood: "気分の浮き沈み",
  });

/**
 * Normalize thermo (repurposed tri)
 * - constitution_events: thermo
 * - constitution_profiles: cold_heat
 */
export function normalizeThermo(obj) {
  const v = obj?.thermo ?? obj?.cold_heat ?? 0;
  return v === -1 || v === 0 || v === 1 ? v : 0;
}

/**
 * Normalize resilience (repurposed tri)
 */
export function normalizeResilience(obj) {
  const v = obj?.resilience ?? 0;
  return v === -1 || v === 0 || v === 1 ? v : 0;
}

/**
 * Get core label safely
 */
export function getCoreLabel(code) {
  return CORE_LABELS[code] || CORE_LABELS.steady_batt_standard;
}

/**
 * Get sub labels safely (keeps order)
 */
export function getSubLabels(codes) {
  if (!Array.isArray(codes)) return [];
  return codes.map((c) => SUB_LABELS[c]).filter(Boolean);
}

/**
 * Get meridian display safely
 */
export function getMeridianLine(code) {
  if (!code) return null;
  return MERIDIAN_LINES[code] || null;
}
