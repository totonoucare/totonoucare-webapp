// lib/diagnosis/v2/labels.js

/**
 * 未病レーダー v2 Labels (FIXED DICTIONARIES)
 *
 * - Core label: 8 types (thermo x resilience)
 *   cold_low, cold_high, neutral_low, neutral_high,
 *   heat_low, heat_high, mixed_low, mixed_high
 *
 * - Sub labels: 6 types (materials: qi/blood/fluid)
 *   qi_stagnation, qi_deficiency, blood_deficiency, blood_stasis, fluid_damp, fluid_deficiency
 *
 * - Meridian lines: 6 groups from motion test (A-F mapping is handled in engine)
 *   lung_li, heart_si, kidney_bl, liver_gb, spleen_st, pc_sj
 *
 * NOTE:
 * We DO NOT let AI decide labels. AI only writes explanations based on these fixed outputs.
 */

/** @typedef {'fatigue'|'sleep'|'neck_shoulder'|'low_back_pain'|'swelling'|'headache'|'dizziness'|'mood'} Symptom */
/** @typedef {'cold_low'|'cold_high'|'neutral_low'|'neutral_high'|'heat_low'|'heat_high'|'mixed_low'|'mixed_high'} CoreCode */
/** @typedef {'qi_stagnation'|'qi_deficiency'|'blood_deficiency'|'blood_stasis'|'fluid_damp'|'fluid_deficiency'} SubLabelCode */
/** @typedef {'lung_li'|'heart_si'|'kidney_bl'|'liver_gb'|'spleen_st'|'pc_sj'} MeridianCode */

/**
 * Core label dictionary
 * - title: 覚えやすい“呼び名”
 * - short: UIの短縮表示（寒熱×回復）
 * - tcm_hint: 「なぜこのコアなのか」を一文で説明（寒熱＝体の温度傾向 / 回復＝戻りやすさ）
 * - care_priority: ケア方針の方向づけ（エンジン側で使ってもOK）
 */
export const CORE_LABELS =
  /** @type {Record<CoreCode, {title:string, short:string, tcm_hint:string, care_priority:'warm'|'cool'|'steady'|'balance'}>} */ ({
    // --- cold ---
cold_low: {
  title: "ブレーキ優位・戻しゆっくり",
  short: "ブレーキ優位 / 戻し遅め",
  tcm_hint:
    "体の“ブレーキ側”が強めで、余力が減ると回復に時間がかかりやすいタイプです。頑張るほど出力が落ちていく形になりやすいので、土台（休息・回復枠）を先に確保すると安定します。",
  care_priority: "warm",
},
cold_high: {
  title: "ブレーキ優位・戻し上手",
  short: "ブレーキ優位 / 戻し早め",
  tcm_hint:
    "体の“ブレーキ側”が効きやすい一方で、整えれば戻りやすいタイプです。乱れた後に長引かせるより、早めにペース配分を変えるとスッと安定しやすいです。",
  care_priority: "warm",
},

    // --- neutral ---
neutral_low: {
  title: "安定寄り・立て直し遅め",
  short: "安定寄り / 立て直し遅め",
  tcm_hint:
    "アクセルとブレーキの偏りは目立ちにくい一方で、余力が削れると土台が落ちやすいタイプです。大崩れはしにくいのに“戻しが遅い”ことがあるので、回復の設計（睡眠・負荷配分）で差が出ます。",
  care_priority: "steady",
},
neutral_high: {
  title: "安定寄り・維持が得意",
  short: "安定寄り / 維持が得意",
  tcm_hint:
    "アクセルとブレーキの釣り合いが取りやすく、微調整で安定を保ちやすいタイプです。崩れにくいぶん、乱れる時は生活リズムのズレが引き金になりやすいので、淡々と整えるほど強くなります。",
  care_priority: "steady",
},

    // --- heat ---
heat_low: {
  title: "アクセル優位・消耗が残る",
  short: "アクセル優位 / 消耗残り",
  tcm_hint:
    "体の“アクセル側”が入りやすいのに、余力が追いつかず消耗が残りやすいタイプです。頑張りが効く反面、後から反動が出やすいので、出力を上げきる前に休息で受け止めると崩れにくくなります。",
  care_priority: "cool",
},
heat_high: {
  title: "アクセル優位・切替が得意",
  short: "アクセル優位 / 切替上手",
  tcm_hint:
    "体の“アクセル側”が入りやすいものの、切り替えて戻しやすいタイプです。勢いがつくと一気に走りがちなので、区切り（休息・刺激の調整）が入ると安定しやすいです。",
  care_priority: "cool",
},


    // --- mixed ---
mixed_low: {
  title: "切替ゆらぎ・引きずりやすい",
  short: "切替ゆらぎ / 引きずり",
  tcm_hint:
    "アクセルとブレーキの切り替えが揺れやすく、崩れると引きずりやすいタイプです。状況に合わない対処をすると余計に乱れやすいので、まず“運転のリズム”を一定にするほど安定します。",
  care_priority: "balance",
},
mixed_high: {
  title: "切替ゆらぎ・立て直しが早い",
  short: "切替ゆらぎ / 立て直し早い",
  tcm_hint:
    "アクセルとブレーキの切り替えが揺れやすいものの、立て直して戻しやすいタイプです。波が出始めた段階でペース配分を変えられると、揺れを小さくまとめやすくなります。",
  care_priority: "balance",
},
  });

/**
 * Sub label dictionary
 * - title: 翻訳語（気血津液語）を括弧で併記
 * - short: UIの短縮表示
 * - action_hint: 行動の方向性（短く）
 */
export const SUB_LABELS =
  /** @type {Record<SubLabelCode, {title:string, short:string, action_hint:string}>} */ ({
    qi_stagnation: {
      title: "巡りを整えたい（気滞）",
      short: "巡り",
      action_hint:
        "切り替え（呼吸・軽い動き・詰まりを抜く）を意識すると楽になりやすい。",
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
      action_hint:
        "温め・軽めの食・出す（巡らせる）を意識すると重だるさが減りやすい。",
    },
    fluid_deficiency: {
      title: "潤い補給意識（津液不足）",
      short: "潤い",
      action_hint: "やりすぎを避け、補う（保つ）方向に寄せると整いやすい。",
    },
  });

/** Meridian “line” dictionary: show body region first, meridian name in parentheses */
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
 * Normalize profile/event shape differences.
 * - constitution_events: thermo
 * - constitution_profiles (your current schema): cold_heat
 */
export function normalizeThermo(obj) {
  const v = obj?.thermo ?? obj?.cold_heat ?? 0;
  return v === -1 || v === 0 || v === 1 ? v : 0;
}

/**
 * Normalize resilience
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
  return CORE_LABELS[code] || CORE_LABELS.neutral_high;
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
