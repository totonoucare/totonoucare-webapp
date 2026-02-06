// lib/diagnosis/v2/scoring.js

/**
 * Diagnosis v2 Scoring Engine (UPDATED: 虚実×陰陽ベース)
 *
 * Goals:
 * - Keep existing outputs stable for UI/DB:
 *   - core_code (8)
 *   - sub_labels (material only, max 2)
 *   - primary_meridian / secondary_meridian (6 groups + null)
 *   - env_sensitivity, env_vectors
 *   - split_scores (qty/flow scores) for explainability
 *
 * Update:
 * - core_code is no longer "寒熱(主観) x 回復(持ち越し)" だけで決めない。
 * - 内部軸として「陰陽(yin_yang)」「虚実(def_ex)」「回復/立て直し(recovery)」を統合して推定し、
 *   その結果を 8タイプ(core_code) に落とし込む。
 *
 * Notes:
 * - 表裏は本サービスの前提上（慢性・内因中心）「裏固定」扱いでUIには出さない。
 * - ユーザー向け文言では「陰陽/虚実」を使わない（AIプロンプト側で内部語として使うのはOK）。
 */

const MERIDIAN_MAP = {
  A: "kidney_bl",
  B: "spleen_st",
  C: "liver_gb",
  D: "heart_si",
  E: "lung_li",
  F: "pc_sj",
};

const SYMPTOM_FOCUS_DEFAULT = "fatigue";

// freq bucket -> severity points (0..4)
const FREQ_POINTS = {
  "0": 0,
  "1_2": 1,
  "3_5": 2,
  "6_9": 3,
  "10p": 4,
};

function fp(v) {
  return FREQ_POINTS[v] ?? 0;
}

function clampTri(v) {
  if (v > 0) return 1;
  if (v < 0) return -1;
  return 0;
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function clamp11(v) {
  return Math.max(-1, Math.min(1, v));
}

function safeArr(v) {
  return Array.isArray(v) ? v : [];
}

/**
 * Thermo mapping from answer (ユーザー主観)
 * - cold -> -1
 * - heat -> +1
 * - mixed -> 0 + is_mixed true
 * - neutral -> 0
 */
function thermoFromAnswer(a) {
  if (a === "cold") return { thermo: -1, is_mixed: false };
  if (a === "heat") return { thermo: +1, is_mixed: false };
  if (a === "mixed") return { thermo: 0, is_mixed: true };
  return { thermo: 0, is_mixed: false }; // neutral
}

/**
 * Resilience from freq:
 * "持ち越し日数" が多いほどレジリエンス低い
 * - returns tri: high(+1), mid(0), low(-1)
 */
function resilienceFromFreq(freqKey) {
  const p = fp(freqKey);
  if (p <= 1) return 1;
  if (p === 2) return 0;
  return -1;
}

/**
 * Decide tri-state from split scores.
 * - deficiencyScore: qty side
 * - stagnationScore: flow side
 * - tie-break by symptom_focus when close
 *
 * Returns:
 * -1 = deficiency dominant, +1 = flow/stagnation dominant, 0 = none
 */
function decideTriState(deficiencyScore, stagnationScore, symptom_focus, kind) {
  if (deficiencyScore <= 0 && stagnationScore <= 0) return 0;

  const diff = deficiencyScore - stagnationScore;

  // clear wins
  if (diff >= 2) return -1;
  if (diff <= -2) return +1;

  // close -> tie-break
  const sf = symptom_focus || SYMPTOM_FOCUS_DEFAULT;

  if (kind === "qi") {
    if (sf === "mood" || sf === "headache") return +1;
    if (sf === "fatigue" || sf === "sleep") return -1;
  }
  if (kind === "blood") {
    if (sf === "headache") return +1;
    if (sf === "sleep" || sf === "fatigue") return -1;
  }
  if (kind === "fluid") {
    if (sf === "swelling" || sf === "dizziness") return +1;
    if (sf === "headache" || sf === "mood") return 0;
  }

  // fallback deterministic
  if (deficiencyScore > stagnationScore) return -1;
  if (stagnationScore > deficiencyScore) return +1;
  return -1;
}

/**
 * Candidate list: sort positive scores desc, tie by code asc
 */
function candidateList(scores) {
  return Object.entries(scores)
    .filter(([, v]) => (v ?? 0) > 0)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    });
}

/**
 * ---- 内部軸: 虚実(def_ex) / 陰陽(yin_yang) / 回復(recovery) ----
 *
 * def_ex_score:
 *  -1 .. +1
 *  - negative: deficiency (虚) dominant
 *  - positive: excess/stagnation/heaviness (実) dominant
 *
 * yin_yang_score:
 *  -1 .. +1
 *  - negative: yin-leaning (cold/heavy/damp-ish)
 *  - positive: yang-leaning (heat/dry-ish)
 *
 * recovery_score:
 *  -1 .. +1
 *  - higher:戻しや_bt ; lower:引きずりやすい
 *
 * Note:
 * - ここは「東洋医学の語」をUIに出すためのものではなく、
 *   8タイプの"軸"を因果っぽく統合するための内部推定。
 */

function computeDefExScore({ qi_qty, qi_flow, blood_qty, blood_flow, fluid_qty, fluid_flow }) {
  const qty = qi_qty + blood_qty + fluid_qty;
  const flow = qi_flow + blood_flow + fluid_flow;
  const denom = qty + flow + 1;
  // flowが強いほど +（実/詰まり/重さ側）、qtyが強いほど -（虚/不足側）
  return clamp11((flow - qty) / denom);
}

function computeYinYangScore({
  thermo,
  is_mixed,
  qi_qty,
  qi_flow,
  blood_qty,
  blood_flow,
  fluid_qty,
  fluid_flow,
}) {
  // base from self-report thermo (主観は強いシグナル)
  // cold:-0.6, heat:+0.6, neutral/mixed:0
  let yy = 0;
  if (thermo === -1) yy += -0.6;
  if (thermo === +1) yy += +0.6;

  //補正：乾き(=fluid_qty)は陽寄り、重さ/湿(=fluid_flow)は陰寄り
  const fSum = fluid_qty + fluid_flow + 1;
  const drynessBias = (fluid_qty - fluid_flow) / fSum; // -1..+1 ざっくり
  yy += 0.35 * drynessBias;

  //補正：詰まり/滞り（flow総量）は陰寄りに少し振れる（停滞/重さとして扱う）
  //※強くしすぎると「全部陰」になるので弱め
  const total = qi_qty + qi_flow + blood_qty + blood_flow + fluid_qty + fluid_flow + 1;
  const flowRatio = (qi_flow + blood_flow + fluid_flow) / total; // 0..1
  yy += -0.12 * (flowRatio - 0.33); // 中庸(ざっくり1/3)からの差

  // mixed回答は最終ラベル判定で優先するので、ここではスコアだけ計算して返す
  return clamp11(yy);
}

function labelYinYang({ thermoAnswer, is_mixed, yin_yang_score }) {
  // mixed を優先
  if (thermoAnswer === "mixed" || is_mixed) return "mixed";

  // 閾値は“混ぜすぎない”ためにやや強めに寄せる
  if (yin_yang_score >= 0.22) return "heat";
  if (yin_yang_score <= -0.22) return "cold";
  return "neutral";
}

function labelDefEx(def_ex_score) {
  // 0付近は中庸扱い
  if (def_ex_score >= 0.22) return "excess";
  if (def_ex_score <= -0.22) return "deficient";
  return "neutral";
}

function computeRecoveryScore({ resilienceTri, def_ex_score, qtyTotal, flowTotal }) {
  // resilienceTri: -1/0/+1 を主軸
  const base = resilienceTri; // -1..+1

  // 偏りが強いほど（虚でも実でも）立て直しは難しくなりがち → recoveryを下げる
  const imbalance = Math.abs(def_ex_score); // 0..1

  // 全体負荷（症状量）が大きいほど recovery を下げる（ただし弱め）
  const load = clamp01((qtyTotal + flowTotal) / 18); // 0..1（ざっくり上限想定）

  // 統合（重みは調整しやすい）
  const r = 0.65 * base + -0.25 * imbalance + -0.10 * load;
  return clamp11(r);
}

/**
 * core_code 결정:
 * - yin/yang label -> cold/neutral/heat/mixed
 * - high/low -> recovery_score >= 0 ? high : low
 *
 * ※high/lowを「回復Qだけ」で決めない。
 *   resilience(持ち越し) + 気血津液の偏りの強さ(虚実) + 全体負荷 を統合。
 */
function computeCoreCodeByAxes({ yin_yang_label, recovery_score }) {
  const hi = recovery_score >= 0;

  if (yin_yang_label === "mixed") return hi ? "mixed_high" : "mixed_low";
  if (yin_yang_label === "cold") return hi ? "cold_high" : "cold_low";
  if (yin_yang_label === "heat") return hi ? "heat_high" : "heat_low";
  return hi ? "neutral_high" : "neutral_low";
}

export function scoreDiagnosis(answers = {}) {
  const symptom_focus = answers.symptom_focus || SYMPTOM_FOCUS_DEFAULT;

  // ----------------
  // Qi split scores
  // ----------------
  const qi_common = fp(answers.qi_common);
  let qi_qty_score = fp(answers.qi_qty);
  let qi_flow_score = fp(answers.qi_flow_1) + fp(answers.qi_flow_2);

  // allocate common buffer
  if (qi_flow_score >= qi_qty_score) qi_flow_score += qi_common;
  else qi_qty_score += qi_common;

  // ----------------
  // Blood split scores
  // ----------------
  const blood_qty_score = fp(answers.blood_qty_1) + fp(answers.blood_qty_2);
  const blood_flow_score = fp(answers.blood_flow_1) + fp(answers.blood_flow_2);

  // ----------------
  // Fluid split scores
  // ----------------
  const fluid_qty_score = fp(answers.fluid_qty_1) + fp(answers.fluid_qty_2);
  const fluid_flow_score = fp(answers.fluid_flow_1) + fp(answers.fluid_flow_2);

  // tri-state columns for DB
  const qi = decideTriState(qi_qty_score, qi_flow_score, symptom_focus, "qi");
  const blood = decideTriState(blood_qty_score, blood_flow_score, symptom_focus, "blood");
  const fluid = decideTriState(fluid_qty_score, fluid_flow_score, symptom_focus, "fluid");

  // thermo/resilience (inputs)
  const thermoAnswer = answers.thermo;
  const { thermo, is_mixed } = thermoFromAnswer(thermoAnswer);
  const resilience = resilienceFromFreq(answers.resilience);

  // ENV
  const env_sensitivity = Number(answers.env_sensitivity ?? 0) || 0;
  const env_vectors_raw = safeArr(answers.env_vectors);
  const env_vectors = env_vectors_raw.includes("none") ? [] : env_vectors_raw.slice(0, 2);

  // Meridians (primary/secondary)
  const pKey = answers.meridian_primary;
  const sKey = answers.meridian_secondary;

  const primary_meridian = MERIDIAN_MAP[pKey] || null;
  let secondary_meridian = MERIDIAN_MAP[sKey] || null;

  if (sKey === "none") secondary_meridian = null;
  if (pKey === "none") secondary_meridian = null;
  if (secondary_meridian && secondary_meridian === primary_meridian) secondary_meridian = null;

  // ----------------
  // sub_labels: material only (max 2), allow coexistence
  // ----------------
  const materialScores = {
    qi_deficiency: qi_qty_score,
    qi_stagnation: qi_flow_score,
    blood_deficiency: blood_qty_score,
    blood_stasis: blood_flow_score,
    fluid_deficiency: fluid_qty_score,
    fluid_damp: fluid_flow_score,
  };

  const ranked = candidateList(materialScores);
  const sub_labels = [];
  for (const [code] of ranked) {
    if (sub_labels.length >= 2) break;
    sub_labels.push(code);
  }

  // ----------------
  // NEW: internal axes (def_ex / yin_yang / recovery)
  // ----------------
  const qtyTotal = qi_qty_score + blood_qty_score + fluid_qty_score;
  const flowTotal = qi_flow_score + blood_flow_score + fluid_flow_score;

  const def_ex_score = computeDefExScore({
    qi_qty: qi_qty_score,
    qi_flow: qi_flow_score,
    blood_qty: blood_qty_score,
    blood_flow: blood_flow_score,
    fluid_qty: fluid_qty_score,
    fluid_flow: fluid_flow_score,
  });

  const yin_yang_score = computeYinYangScore({
    thermo,
    is_mixed,
    qi_qty: qi_qty_score,
    qi_flow: qi_flow_score,
    blood_qty: blood_qty_score,
    blood_flow: blood_flow_score,
    fluid_qty: fluid_qty_score,
    fluid_flow: fluid_flow_score,
  });

  const yin_yang_label_internal = labelYinYang({
    thermoAnswer,
    is_mixed,
    yin_yang_score,
  });

  const def_ex_label_internal = labelDefEx(def_ex_score);

  const recovery_score = computeRecoveryScore({
    resilienceTri: resilience,
    def_ex_score,
    qtyTotal,
    flowTotal,
  });

  // core_code from axes
  const core_code = computeCoreCodeByAxes({
    yin_yang_label: yin_yang_label_internal,
    recovery_score,
  });

  return {
    symptom_focus,

    // DB-compatible tri-state
    qi: clampTri(qi),
    blood: clampTri(blood),
    fluid: clampTri(fluid),

    // keep original nature fields for backward compatibility
    thermo: clampTri(thermo),
    resilience: clampTri(resilience),
    is_mixed: !!is_mixed,

    // meridians
    primary_meridian,
    secondary_meridian,

    // UI
    core_code,
    sub_labels,

    // explainability payload (existing)
    split_scores: {
      qi: { qty: qi_qty_score, flow: qi_flow_score, common: qi_common },
      blood: { qty: blood_qty_score, flow: blood_flow_score },
      fluid: { qty: fluid_qty_score, flow: fluid_flow_score },
      total: { qty: qtyTotal, flow: flowTotal },
    },
    env: { sensitivity: env_sensitivity, vectors: env_vectors },

    // NEW: internal axes for AI/debug (ユーザーに直接は見せない想定)
    axes: {
      // 表裏は裏固定（UIには出さない）
      exterior_interior: "interior",

      // 虚実・陰陽（内部認識）
      def_ex_score, // -1..+1
      def_ex_label_internal, // deficient/excess/neutral

      yin_yang_score, // -1..+1
      yin_yang_label_internal, // cold/heat/neutral/mixed

      // 立て直しやすさ（high/lowの根拠）
      recovery_score, // -1..+1

      // raw inputs snapshot (optional)
      thermo_answer: thermoAnswer ?? "neutral",
      resilience_tri: clampTri(resilience),
    },

    version: "v2",
  };
}

/**
 * Prepare DB payload for constitution_profiles (latest cache)
 * - latest_event_id is injected by attach route after constitution_events upsert
 */
export function buildConstitutionProfilePayload(userId, answers) {
  const computed = scoreDiagnosis(answers);

  return {
    user_id: userId,
    symptom_focus: computed.symptom_focus,

    qi: computed.qi,
    blood: computed.blood,
    fluid: computed.fluid,

    cold_heat: computed.thermo, // profiles は cold_heat に tri-state を置く
    resilience: computed.resilience,

    primary_meridian: computed.primary_meridian,
    secondary_meridian: computed.secondary_meridian,

    organs: computed.primary_meridian ? [computed.primary_meridian] : [],

    answers,
    computed,

    // extra cache fields (schema has these)
    thermo: computed.thermo,
    is_mixed: computed.is_mixed,
    core_code: computed.core_code,
    sub_labels: computed.sub_labels,
    engine_version: "v2",

    version: "v2",
  };
}
