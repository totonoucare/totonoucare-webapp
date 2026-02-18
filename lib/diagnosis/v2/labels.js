// lib/diagnosis/v2/labels.js

/**
 * 未病レーダー v2 Labels (REFRESHED: 9 core types)
 *
 * Core label: 9 types (yin_yang x drive)
 * - yin_yang: brake / steady / accel
 * - drive: batt_small / batt_standard / batt_large
 *
 * code format: <yin_yang>_<drive>
 *   - brake_batt_small, brake_batt_standard, brake_batt_large
 *   - steady_batt_small, steady_batt_standard, steady_batt_large
 *   - accel_batt_small, accel_batt_standard, accel_batt_large
 *
 * NOTE:
 * - thermo/resilience/is_mixed are kept for DB compatibility but semantics changed:
 *   - thermo    := yin_yang tri (-1/0/+1)
 *   - resilience:= drive tri   (-1/0/+1)
 *   - is_mixed  := always false
 */

/** @typedef {'fatigue'|'sleep'|'neck_shoulder'|'low_back_pain'|'swelling'|'headache'|'dizziness'|'mood'} Symptom */
/** @typedef {'brake_batt_small'|'brake_batt_standard'|'brake_batt_large'|'steady_batt_small'|'steady_batt_standard'|'steady_batt_large'|'accel_batt_small'|'accel_batt_standard'|'accel_batt_large'} CoreCode */
/** @typedef {'qi_stagnation'|'qi_deficiency'|'blood_deficiency'|'blood_stasis'|'fluid_damp'|'fluid_deficiency'} SubLabelCode */
/** @typedef {'lung_li'|'heart_si'|'kidney_bl'|'liver_gb'|'spleen_st'|'pc_sj'} MeridianCode */

export const CORE_LABELS =
  /** @type {Record<CoreCode, {title:string, short:string, tcm_hint:string, care_priority:'warm'|'cool'|'steady'|'balance'}>} */ ({
    // -------------------------
    // brake (ブレーキ優位)
    // -------------------------
    brake_batt_small: {
      title: "ブレーキ優位 × バッテリー小",
      short: "ブレーキ / 小",
      tcm_hint:
        "ブレーキが先に入りやすく、さらにバッテリー（正気）が小さめで余力が切れやすいタイプです。無理に踏ん張ると回復が追いつかず、じわじわ崩れやすいので、まず回復枠の確保が効きます。",
      care_priority: "warm",
    },
    brake_batt_standard: {
      title: "ブレーキ優位 × バッテリー標準",
      short: "ブレーキ / 標準",
      tcm_hint:
        "ブレーキが入りやすい一方で、バッテリーは標準的に保てているタイプです。頑張りすぎよりも、温め・整える方向で出力を作ると安定しやすいです。",
      care_priority: "warm",
    },
    brake_batt_large: {
      title: "ブレーキ優位 × バッテリー大",
      short: "ブレーキ / 大",
      tcm_hint:
        "ブレーキ寄りですが、バッテリーに余裕があるタイプです。立ち上がりは遅くても、整うと粘りが出やすいので、土台を守りつつ一定ペースで回すのが向きます。",
      care_priority: "steady",
    },

    // -------------------------
    // steady (安定運転)
    // -------------------------
    steady_batt_small: {
      title: "安定運転 × バッテリー小",
      short: "安定 / 小",
      tcm_hint:
        "踏み方のクセは強くないのに、バッテリーが小さめで余力が削れやすいタイプです。大崩れはしにくい反面、回復の遅れが積み重なると一気に落ちやすいので、休息設計で差が出ます。",
      care_priority: "steady",
    },
    steady_batt_standard: {
      title: "安定運転 × バッテリー標準",
      short: "安定 / 標準",
      tcm_hint:
        "アクセルとブレーキの偏りが少なく、バッテリーも標準的で、最も安定を作りやすいタイプです。乱れるときは生活リズムのズレが引き金になりやすいので、淡々と整えるほど強くなります。",
      care_priority: "steady",
    },
    steady_batt_large: {
      title: "安定運転 × バッテリー大",
      short: "安定 / 大",
      tcm_hint:
        "偏りが少なく、かつバッテリーに余裕があるタイプです。多少の環境変化でも耐えやすい一方、無理が続くと雑に消耗させがちなので、負荷の上げ方だけ丁寧にすると盤石になります。",
      care_priority: "balance",
    },

    // -------------------------
    // accel (アクセル優位)
    // -------------------------
    accel_batt_small: {
      title: "アクセル優位 × バッテリー小",
      short: "アクセル / 小",
      tcm_hint:
        "アクセルが入りやすいのに、バッテリーが小さめで反動が出やすいタイプです。勢いで走れる反面、後からガクッと落ちやすいので、上げきる前に“区切り”を入れるのが安定に直結します。",
      care_priority: "cool",
    },
    accel_batt_standard: {
      title: "アクセル優位 × バッテリー標準",
      short: "アクセル / 標準",
      tcm_hint:
        "アクセル寄りで動けるタイプですが、バッテリーは標準域にあります。勢いがつきすぎると消耗が残りやすいので、刺激と休息の切り替えが鍵になります。",
      care_priority: "cool",
    },
    accel_batt_large: {
      title: "アクセル優位 × バッテリー大",
      short: "アクセル / 大",
      tcm_hint:
        "アクセルが入りやすく、バッテリーにも余裕があるタイプです。出力が出るぶん、無自覚に詰めすぎてブレーキが壊れる方向に行きやすいので、“止まる技術”が身につくと最強になります。",
      care_priority: "balance",
    },
  });

/**
 * Sub label dictionary（整えポイント）
 */
export const SUB_LABELS =
  /** @type {Record<SubLabelCode, {title:string, short:string, action_hint:string}>} */ ({
    qi_stagnation: {
      title: "巡りを整えたい（気滞）",
      short: "巡り",
      action_hint: "切り替え（呼吸・軽い動き・詰まりを抜く）を意識すると楽になりやすい。",
    },
    qi_deficiency: {
      title: "エネルギー補充意識（気虚）",
      short: "補充",
      action_hint: "短時間・低負荷で“回復の入口”を作るのが効きやすい。",
    },
    blood_deficiency: {
      title: "滋養・休養重視（血虚）",
      short: "滋養",
      action_hint: "睡眠・目や脳の休息・刺激を減らすと整いやすい。",
    },
    blood_stasis: {
      title: "やわらかさ回復（血瘀）",
      short: "循環",
      action_hint: "温め＋ほぐし＋軽い可動で“固まり”をほどくと整いやすい。",
    },
    fluid_damp: {
      title: "余分な水を軽く（痰湿）",
      short: "軽さ",
      action_hint: "温め・軽めの食・出す（巡らせる）を意識すると重だるさが減りやすい。",
    },
    fluid_deficiency: {
      title: "潤い補給意識（津液不足）",
      short: "潤い",
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

/** Symptom labels for UI */
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
 * Normalize thermo (now: yin_yang tri)
 */
export function normalizeThermo(obj) {
  const v = obj?.thermo ?? obj?.cold_heat ?? 0;
  return v === -1 || v === 0 || v === 1 ? v : 0;
}

/**
 * Normalize resilience (now: drive tri)
 */
export function normalizeResilience(obj) {
  const v = obj?.resilience ?? 0;
  return v === -1 || v === 0 || v === 1 ? v : 0;
}

/**
 * Get core label by code safely.
 * @param {string} code
 */
export function getCoreLabel(code) {
  return CORE_LABELS[code] || CORE_LABELS.steady_batt_standard;
}

/**
 * Get sub labels by codes safely (keeps order, filters unknown).
 * @param {string[]} codes
 */
export function getSubLabels(codes) {
  if (!Array.isArray(codes)) return [];
  return codes.map((c) => SUB_LABELS[c]).filter(Boolean);
}

/**
 * Get meridian display safely.
 * @param {string|null|undefined} code
 */
export function getMeridianLine(code) {
  if (!code) return null;
  return MERIDIAN_LINES[code] || null;
}
