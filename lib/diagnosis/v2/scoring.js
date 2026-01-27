// lib/diagnosis/v2/scoring.js
//
// Diagnosis v2 Scoring Engine (FIXED RULES)
// - answers(文字列) -> tri(-1/0/1) 正規化
// - core_code(8) + sub_labels(最大2) + meridian_code(5) を確定
// - labels.js の辞書キーと完全一致させる
//
// answers shape (validateAnswers と一致):
// {
//   symptom_focus: 'fatigue'|'sleep'|'mood'|'neck_shoulder'|'low_back_pain'|'swelling'|'headache'|'dizziness',
//   qi_state: 'deficiency'|'balanced'|'stagnation',
//   blood_state: 'deficiency'|'balanced'|'stasis',
//   fluid_state: 'deficiency'|'balanced'|'damp',
//   cold_heat: 'cold'|'neutral'|'heat',
//   resilience: 'low'|'medium'|'high',
//   meridian_test: 'A'|'B'|'C'|'D'|'E'
// }

import { CORE_LABELS, SUB_LABELS, MERIDIAN_LINES } from "./labels";

export const DIAGNOSIS_VERSION = "v2";

// ---------- normalize to tri ----------
function triColdHeat(v) {
  if (v === "cold") return -1;
  if (v === "heat") return 1;
  return 0;
}

// 8タイプに畳む都合で「low vs それ以外」
function triResilience(v) {
  if (v === "low") return -1;
  return 1; // medium/high
}

function triQi(v) {
  if (v === "deficiency") return -1;
  if (v === "stagnation") return 1;
  return 0;
}

function triBlood(v) {
  if (v === "deficiency") return -1;
  if (v === "stasis") return 1;
  return 0;
}

function triFluid(v) {
  if (v === "deficiency") return -1;
  if (v === "damp") return 1;
  return 0;
}

// ---------- meridian mapping (A-E -> code) ----------
function meridianFromTest(letter) {
  if (letter === "A") return "lung_li";
  if (letter === "B") return "heart_si";
  if (letter === "C") return "kidney_bl";
  if (letter === "D") return "liver_gb";
  return "spleen_st"; // E
}

// ---------- mixed detection (conservative) ----------
function detectMixed({ coldHeatTri, resilienceTri, symptom_focus, answers }) {
  if (coldHeatTri !== 0) return false;
  if (resilienceTri !== -1) return false;

  // “揺れ”主訴のみ
  const sway = new Set(["headache", "dizziness", "mood", "sleep"]);
  if (!sway.has(symptom_focus)) return false;

  // 情報が全部balancedなら混在とは言わない
  const allBalanced =
    answers.qi_state === "balanced" &&
    answers.blood_state === "balanced" &&
    answers.fluid_state === "balanced";

  return !allBalanced;
}

// ---------- core_code ----------
function coreCode({ coldHeatTri, resilienceTri, is_mixed }) {
  const bucket = resilienceTri === -1 ? "low" : "high";
  if (is_mixed) return `mixed_${bucket}`;
  if (coldHeatTri === -1) return `cold_${bucket}`;
  if (coldHeatTri === 1) return `heat_${bucket}`;
  return `neutral_${bucket}`;
}

// ---------- sub_labels (max 2) ----------
function symptomMaterialPriority(symptom) {
  switch (symptom) {
    case "dizziness":
    case "swelling":
      return ["fluid", "qi", "blood"];
    case "mood":
      return ["qi", "blood", "fluid"];
    case "sleep":
      return ["blood", "qi", "fluid"];
    case "fatigue":
      return ["qi", "fluid", "blood"];
    case "headache":
      return ["qi", "blood", "fluid"];
    case "neck_shoulder":
    case "low_back_pain":
      return ["blood", "qi", "fluid"];
    default:
      return ["qi", "blood", "fluid"];
  }
}

function toSubLabel(material, tri) {
  if (tri === 0) return null;
  if (material === "qi") return tri === -1 ? "qi_deficiency" : "qi_stagnation";
  if (material === "blood") return tri === -1 ? "blood_deficiency" : "blood_stasis";
  if (material === "fluid") return tri === -1 ? "fluid_deficiency" : "fluid_damp";
  return null;
}

function pickSubLabels({ symptom_focus, coldHeatTri, resilienceTri, qiTri, bloodTri, fluidTri }) {
  const mats = { qi: qiTri, blood: bloodTri, fluid: fluidTri };
  const prefs = symptomMaterialPriority(symptom_focus);

  const out = [];
  let picked = null;

  // slot#1: 主訴優先（±が付いてる素材）
  for (const m of prefs) {
    const code = toSubLabel(m, mats[m]);
    if (code) {
      out.push(code);
      picked = m;
      break;
    }
  }

  // slot#1 fallback（全部0のとき）
  if (out.length === 0) {
    if (resilienceTri === -1) {
      out.push("qi_deficiency");
      picked = "qi";
    } else if (symptom_focus === "swelling" || symptom_focus === "dizziness") {
      out.push("fluid_damp");
      picked = "fluid";
    } else if (symptom_focus === "sleep") {
      out.push("blood_deficiency");
      picked = "blood";
    } else if (symptom_focus === "mood" || symptom_focus === "headache") {
      out.push("qi_stagnation");
      picked = "qi";
    } else {
      out.push("qi_deficiency");
      picked = "qi";
    }
  }

  // slot#2: 残り素材で±があるもの（あれば）
  const candidates = ["qi", "blood", "fluid"].filter((m) => m !== picked && mats[m] !== 0);
  if (candidates.length > 0) {
    const m = candidates[0];
    const code = toSubLabel(m, mats[m]);
    if (code && !out.includes(code)) out.push(code);
  } else {
    // 補完（意味が出るときだけ）
    if (out.length < 2) {
      if (coldHeatTri === 1 && !out.includes("fluid_deficiency")) out.push("fluid_deficiency");
      else if (coldHeatTri === -1 && !out.includes("fluid_damp")) out.push("fluid_damp");
      else if (symptom_focus === "sleep" && !out.includes("blood_deficiency")) out.push("blood_deficiency");
    }
  }

  return out.slice(0, 2);
}

// ---------- main ----------
export function scoreDiagnosis(answers = {}) {
  const symptom_focus = answers.symptom_focus || "fatigue";

  const thermo = triColdHeat(answers.cold_heat);
  const resilience = triResilience(answers.resilience);

  const qi = triQi(answers.qi_state);
  const blood = triBlood(answers.blood_state);
  const fluid = triFluid(answers.fluid_state);

  const primary_meridian = meridianFromTest(answers.meridian_test);
  const secondary_meridian = null;

  const is_mixed = detectMixed({ coldHeatTri: thermo, resilienceTri: resilience, symptom_focus, answers });

  const core_code = coreCode({ coldHeatTri: thermo, resilienceTri: resilience, is_mixed });

  const sub_labels = pickSubLabels({
    symptom_focus,
    coldHeatTri: thermo,
    resilienceTri: resilience,
    qiTri: qi,
    bloodTri: blood,
    fluidTri: fluid,
  });

  return {
    symptom_focus,

    // tri values for DB/radar
    qi,
    blood,
    fluid,
    thermo,        // constitution_events.thermo にも使える
    cold_heat: thermo, // profiles互換
    resilience,
    is_mixed,

    primary_meridian,
    secondary_meridian,

    core_code,
    sub_labels,

    // UI helper bundles（辞書に直結）
    core_label: CORE_LABELS[core_code] || CORE_LABELS.neutral_high,
    sub_label_details: sub_labels.map((c) => SUB_LABELS[c]).filter(Boolean),
    meridian_line: MERIDIAN_LINES[primary_meridian] || null,

    version: DIAGNOSIS_VERSION,
  };
}

// constitution_profiles payload builder
export function buildConstitutionProfilePayload(userId, answers) {
  const computed = scoreDiagnosis(answers);

  return {
    user_id: userId,
    symptom_focus: computed.symptom_focus,

    qi: computed.qi,
    blood: computed.blood,
    fluid: computed.fluid,

    cold_heat: computed.cold_heat,
    resilience: computed.resilience,

    primary_meridian: computed.primary_meridian,
    secondary_meridian: computed.secondary_meridian,

    organs: [],

    answers,
    computed,

    version: DIAGNOSIS_VERSION,
    updated_at: new Date().toISOString(),
  };
}
