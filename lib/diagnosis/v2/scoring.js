// lib/diagnosis/v2/scoring.js

/**
 * Diagnosis v2 Scoring Engine (FINAL)
 *
 * Goals:
 * - Accept split signals (qty/flow) and allow coexistence internally
 * - Store DB-compatible tri-state (qi/blood/fluid: -1/0/+1)
 * - Emit computed object for UI + AI:
 *   - core_code (8)
 *   - sub_labels (material only, max 2)
 *   - primary_meridian / secondary_meridian (6 groups + null)
 *   - env_sensitivity, env_vectors
 *   - internal scores for explainability (qty/flow scores)
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

function thermoFromAnswer(a) {
  // cold/heat/mixed/neutral
  if (a === "cold") return { thermo: -1, is_mixed: false };
  if (a === "heat") return { thermo: +1, is_mixed: false };
  if (a === "mixed") return { thermo: 0, is_mixed: true };
  return { thermo: 0, is_mixed: false }; // neutral
}

function resilienceFromFreq(freqKey) {
  // "持ち越し日数" が多いほどレジリエンス低い
  const p = fp(freqKey);
  // 0-1: high(+1), 2: mid(0), 3-4: low(-1)
  if (p <= 1) return 1;
  if (p === 2) return 0;
  return -1;
}

function computeCoreCode({ thermo, resilience, is_mixed }) {
  const hi = resilience === 1;
  if (is_mixed) return hi ? "mixed_high" : "mixed_low";
  if (thermo === -1) return hi ? "cold_high" : "cold_low";
  if (thermo === 1) return hi ? "heat_high" : "heat_low";
  return hi ? "neutral_high" : "neutral_low";
}

/**
 * Decide tri-state from split scores.
 * - deficiencyScore: qty side
 * - stagnationScore: flow side
 * - tie-break by symptom_focus when close
 */
function decideTriState(deficiencyScore, stagnationScore, symptom_focus, kind) {
  if (deficiencyScore <= 0 && stagnationScore <= 0) return 0;

  const diff = deficiencyScore - stagnationScore;

  // clear wins
  if (diff >= 2) return -1;
  if (diff <= -2) return +1;

  // close -> tie-break
  // mood/headache tends to flow problems; fatigue tends to deficiency; swelling tends to fluid_flow, etc.
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

  // fallback deterministic: larger score wins, exact tie -> deficiency
  if (deficiencyScore > stagnationScore) return -1;
  if (stagnationScore > deficiencyScore) return +1;
  return -1;
}

function candidateList(scores) {
  // scores: { code: number }
  const entries = Object.entries(scores)
    .filter(([, v]) => (v ?? 0) > 0)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    });
  return entries;
}

export function scoreDiagnosis(answers = {}) {
  const symptom_focus = answers.symptom_focus || SYMPTOM_FOCUS_DEFAULT;

  // ----------------
  // Qi split scores
  // ----------------
  const qi_common = fp(answers.qi_common);
  let qi_qty_score = fp(answers.qi_qty);
  let qi_flow_score = fp(answers.qi_flow_1) + fp(answers.qi_flow_2);

  // allocate common buffer (agreed approach)
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

  // thermo/resilience/core
  const { thermo, is_mixed } = thermoFromAnswer(answers.thermo);
  const resilience = resilienceFromFreq(answers.resilience);
  const core_code = computeCoreCode({ thermo, resilience, is_mixed });

  // ENV
  const env_sensitivity = Number(answers.env_sensitivity ?? 0) || 0;
  const env_vectors_raw = Array.isArray(answers.env_vectors) ? answers.env_vectors : [];
  const env_vectors =
    env_vectors_raw.includes("none")
      ? []
      : env_vectors_raw.slice(0, 2);

  // Meridians (primary/secondary)
  const pKey = answers.meridian_primary;
  const sKey = answers.meridian_secondary;

  const primary_meridian = MERIDIAN_MAP[pKey] || null;
  let secondary_meridian = MERIDIAN_MAP[sKey] || null;

  if (sKey === "none") secondary_meridian = null;
  if (pKey === "none") {
    // if primary none, treat both null
    secondary_meridian = null;
  }
  if (secondary_meridian && secondary_meridian === primary_meridian) {
    secondary_meridian = null;
  }

  // sub_labels: material only (max 2), allow coexistence
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
    // don't add more than 2
    if (sub_labels.length >= 2) break;
    sub_labels.push(code);
  }

  return {
    symptom_focus,

    // DB-compatible tri-state
    qi: clampTri(qi),
    blood: clampTri(blood),
    fluid: clampTri(fluid),

    // nature axes
    thermo: clampTri(thermo),
    resilience: clampTri(resilience),
    is_mixed: !!is_mixed,

    // meridians
    primary_meridian,
    secondary_meridian,

    // UI
    core_code,
    sub_labels,

    // explainability payload
    split_scores: {
      qi: { qty: qi_qty_score, flow: qi_flow_score, common: qi_common },
      blood: { qty: blood_qty_score, flow: blood_flow_score },
      fluid: { qty: fluid_qty_score, flow: fluid_flow_score },
    },
    env: { sensitivity: env_sensitivity, vectors: env_vectors },

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
