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
      title: "温め回復サポートタイプ",
      short: "寒＋回復遅",
      tcm_hint:
        "体の土台が“冷え寄り”で、消耗すると戻るのに時間がかかりやすいタイプ。まず温めと回復量の確保が効きやすい。",
      care_priority: "warm",
    },
    cold_high: {
      title: "冷え対策意識タイプ",
      short: "寒＋回復早",
      tcm_hint:
        "冷えやすさはあるが、整えれば戻りやすいタイプ。冷えスイッチを早めに切ると安定しやすい。",
      care_priority: "warm",
    },

    // --- neutral ---
    neutral_low: {
      title: "土台立て直しタイプ",
      short: "平＋回復遅",
      tcm_hint:
        "寒熱の偏りは強くないが、疲れが溜まると“土台”が落ちやすいタイプ。回復の設計（睡眠/負荷配分）で差が出る。",
      care_priority: "steady",
    },
    neutral_high: {
      title: "バランス維持タイプ",
      short: "平＋回復早",
      tcm_hint:
        "寒熱の偏りが少なく、微調整が効きやすいタイプ。崩れにくいので“整える習慣”を続けるほど強くなる。",
      care_priority: "steady",
    },

    // --- heat ---
    heat_low: {
      title: "クールダウン必須タイプ",
      short: "熱＋回復遅",
      tcm_hint:
        "熱が上がりやすく、消耗すると長引きやすいタイプ。クールダウンと“使いすぎ防止”が最優先になりやすい。",
      care_priority: "cool",
    },
    heat_high: {
      title: "熱コントロール意識タイプ",
      short: "熱＋回復早",
      tcm_hint:
        "熱は出やすいが、整えれば戻りやすいタイプ。熱の逃がし方（休息/水分/強度調整）を押さえると伸びる。",
      care_priority: "cool",
    },

    // --- mixed ---
    mixed_low: {
      title: "調整リズム再構築タイプ",
      short: "寒熱混在＋遅",
      tcm_hint:
        "冷えと熱の“ゆらぎ”が出やすく、崩れると引きずりやすいタイプ。波を小さくする生活リズムの再構築が鍵。",
      care_priority: "balance",
    },
    mixed_high: {
      title: "揺れ対処習熟タイプ",
      short: "寒熱混在＋早",
      tcm_hint:
        "ゆらぎは出やすいが、対処で戻しやすいタイプ。波が出た瞬間に“整える一手”を入れると安定しやすい。",
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
