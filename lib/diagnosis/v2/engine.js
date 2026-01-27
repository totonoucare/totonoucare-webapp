// lib/diagnosis/v2/engine.js
//
// 未病レーダー v2 診断エンジン（ルールベース）
// - AIは文章化だけ。判定はここで固定。
// - 出力は constitution_events にそのまま保存できる形。
// - constitution_profiles はDBトリガーで events から同期する想定。
//
// Expected answers shape (ゆるく対応):
// {
//   symptom_focus: 'fatigue' | 'sleep' | ...
//   thermo: 'cold'|'neutral'|'heat'  or -1|0|1  or {value:...}
//   resilience: 'low'|'mid'|'high'   or -1|0|1  or {value:...}
//   qi: -1|0|1   (deficiency / neutral / stagnation)
//   blood: -1|0|1 (deficiency / neutral / stasis)
//   fluid: -1|0|1 (deficiency / neutral / damp)
//   meridian: 'A'|'B'|'C'|'D'|'E' or 'lung_li'|'heart_si'|...
//   ...anything else
// }

import { SYMPTOM_LABELS } from "./labels";

/** @typedef {'fatigue'|'sleep'|'neck_shoulder'|'low_back_pain'|'swelling'|'headache'|'dizziness'|'mood'} Symptom */
/** @typedef {'cold_low'|'cold_high'|'neutral_low'|'neutral_high'|'heat_low'|'heat_high'|'mixed_low'|'mixed_high'} CoreCode */
/** @typedef {'qi_stagnation'|'qi_deficiency'|'blood_deficiency'|'blood_stasis'|'fluid_damp'|'fluid_deficiency'} SubLabelCode */
/** @typedef {'lung_li'|'heart_si'|'kidney_bl'|'liver_gb'|'spleen_st'} MeridianCode */

export const ENGINE_VERSION = "v2";

/**
 * Normalize value (-1/0/1) from multiple possible encodings.
 * @param {any} raw
 * @param {number} fallback
 */
function normTri(raw, fallback = 0) {
  const v =
    raw?.value ??
    raw?.score ??
    raw?.tri ??
    raw ??
    fallback;

  if (v === -1 || v === 0 || v === 1) return v;

  // string encodings
  if (typeof v === "string") {
    const s = v.toLowerCase();
    if (s === "cold" || s === "low" || s === "deficiency" || s === "minus" || s === "-1") return -1;
    if (s === "neutral" || s === "mid" || s === "none" || s === "0") return 0;
    if (s === "heat" || s === "high" || s === "stagnation" || s === "stasis" || s === "damp" || s === "plus" || s === "1") return 1;
  }

  return fallback;
}

/**
 * Normalize symptom focus.
 * @param {any} raw
 * @returns {Symptom}
 */
function normSymptom(raw) {
  const s = raw?.symptom_focus ?? raw?.symptom ?? raw ?? "fatigue";
  if (typeof s !== "string") return "fatigue";
  /** @type {Set<string>} */
  const allowed = new Set(Object.keys(SYMPTOM_LABELS));
  return /** @type {Symptom} */ (allowed.has(s) ? s : "fatigue");
}

/**
 * Meridian mapping from motion-test choice.
 * @param {any} raw
 * @returns {MeridianCode|null}
 */
function mapMeridian(raw) {
  const v = raw?.meridian ?? raw?.primary_meridian ?? raw;
  if (!v) return null;

  // Already code
  if (["lung_li", "heart_si", "kidney_bl", "liver_gb", "spleen_st"].includes(v)) {
    return /** @type {MeridianCode} */ (v);
  }

  const s = String(v).trim().toUpperCase();
  if (s === "A") return "lung_li";
  if (s === "B") return "heart_si";
  if (s === "C") return "kidney_bl";
  if (s === "D") return "liver_gb";
  if (s === "E") return "spleen_st";

  return null;
}

/**
 * Determine if "mixed" should be set.
 * NOTE: 最初は保守的に。後でログや追加質問で強化する。
 *
 * current rule (minimal, practical):
 * - thermo is neutral (0)
 * - AND symptom is "揺れやすい/天気病っぽい"系
 * - AND resilience is low (-1)
 *
 * @param {Symptom} symptom
 * @param {number} thermo
 * @param {number} resilience
 * @returns {boolean}
 */
function detectMixed(symptom, thermo, resilience) {
  if (thermo !== 0) return false;
  if (resilience !== -1) return false;

  // “揺れ”が出やすい主訴（ここは後で調整可）
  const swaySet = new Set(["headache", "dizziness", "mood", "sleep"]);
  return swaySet.has(symptom);
}

/**
 * Convert thermo + resilience (+ mixed) into core_code.
 * resilience bucket: low if -1 else high (0/1 are absorbed as high)
 *
 * @param {number} thermo -1/0/1
 * @param {number} resilience -1/0/1
 * @param {boolean} isMixed
 * @returns {CoreCode}
 */
function toCoreCode(thermo, resilience, isMixed) {
  const bucket = resilience === -1 ? "low" : "high"; // mid absorbed into high
  if (isMixed) return /** @type {CoreCode} */ (`mixed_${bucket}`);

  if (thermo === -1) return /** @type {CoreCode} */ (`cold_${bucket}`);
  if (thermo === 1) return /** @type {CoreCode} */ (`heat_${bucket}`);
  return /** @type {CoreCode} */ (`neutral_${bucket}`);
}

/**
 * Material -> sublabel by sign.
 * @param {'qi'|'blood'|'fluid'} material
 * @param {number} value -1/0/1
 * @returns {SubLabelCode|null}
 */
function toSubLabel(material, value) {
  if (value === 0) return null;
  if (material === "qi") return value === -1 ? "qi_deficiency" : "qi_stagnation";
  if (material === "blood") return value === -1 ? "blood_deficiency" : "blood_stasis";
  if (material === "fluid") return value === -1 ? "fluid_deficiency" : "fluid_damp";
  return null;
}

/**
 * Choose the "primary" material for the symptom (slot#1).
 * Returns ordered material preferences.
 *
 * @param {Symptom} symptom
 * @returns {Array<'qi'|'blood'|'fluid'>}
 */
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
      // 痛み・つらさは「固さ（血）」or「詰まり（気）」が説明として納得しやすい
      return ["blood", "qi", "fluid"];
    default:
      return ["qi", "blood", "fluid"];
  }
}

/**
 * Pick up to 2 sublabels:
 * - slot#1: symptom-driven (must try to link to the user's chosen symptom)
 * - slot#2: strongest remaining material (non-zero), else heuristic by thermo/resilience
 *
 * @param {Symptom} symptom
 * @param {number} thermo
 * @param {number} resilience
 * @param {{qi:number,blood:number,fluid:number}} materials
 * @returns {SubLabelCode[]}
 */
function pickSubLabels(symptom, thermo, resilience, materials) {
  /** @type {SubLabelCode[]} */
  const out = [];

  // Slot #1
  const prefs = symptomMaterialPriority(symptom);
  let pickedMaterial = null;

  for (const m of prefs) {
    const val = materials[m];
    const code = toSubLabel(m, val);
    if (code) {
      out.push(code);
      pickedMaterial = m;
      break;
    }
  }

  // If still none, make symptom-consistent fallback
  if (out.length === 0) {
    // If resilience low => “補充”が最も無難で行動に繋がる
    if (resilience === -1) {
      out.push("qi_deficiency");
      pickedMaterial = "qi";
    } else {
      // symptom based fallback
      if (symptom === "swelling" || symptom === "dizziness") {
        out.push("fluid_damp");
        pickedMaterial = "fluid";
      } else if (symptom === "sleep") {
        out.push("blood_deficiency");
        pickedMaterial = "blood";
      } else if (symptom === "mood" || symptom === "headache") {
        out.push("qi_stagnation");
        pickedMaterial = "qi";
      } else {
        out.push("qi_deficiency");
        pickedMaterial = "qi";
      }
    }
  }

  // Slot #2: strongest remaining non-zero (excluding pickedMaterial)
  /** @type {Array<{m:'qi'|'blood'|'fluid', v:number}>} */
  const candidates = [
    { m: "qi", v: materials.qi },
    { m: "blood", v: materials.blood },
    { m: "fluid", v: materials.fluid },
  ].filter((c) => c.m !== pickedMaterial && c.v !== 0);

  if (candidates.length > 0) {
    // all abs values are 1, but keep robust
    candidates.sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
    const c = candidates[0];
    const code = toSubLabel(c.m, c.v);
    if (code && !out.includes(code)) out.push(code);
  } else {
    // Heuristic second label (only if it adds meaning and doesn't duplicate)
    // - thermo heat tends to consume fluids => fluid_deficiency
    // - thermo cold tends to cause damp/stasis => fluid_damp or blood_stasis
    if (out.length < 2) {
      let fallback = null;

      if (thermo === 1 && !out.includes("fluid_deficiency")) fallback = "fluid_deficiency";
      if (thermo === -1 && !out.includes("fluid_damp")) fallback = "fluid_damp";

      // sleep can benefit from blood_deficiency explanation even if score=0
      if (symptom === "sleep" && !out.includes("blood_deficiency")) fallback = fallback ?? "blood_deficiency";

      if (fallback) out.push(/** @type {SubLabelCode} */ (fallback));
    }
  }

  return out.slice(0, 2);
}

/**
 * Main diagnose function (pure).
 * @param {any} answersRaw
 */
export function diagnoseV2(answersRaw) {
  const symptom_focus = normSymptom(answersRaw);

  // thermo/resilience are "axes"
  const thermo = normTri(answersRaw?.thermo ?? answersRaw?.cold_heat ?? answersRaw?.coldHeat ?? answersRaw?.thermo_choice, 0);
  const resilience = normTri(answersRaw?.resilience ?? answersRaw?.resilience_choice ?? answersRaw?.recovery ?? answersRaw?.recovery_speed, 0);

  // materials
  const qi = normTri(answersRaw?.qi ?? answersRaw?.materials?.qi ?? answersRaw?.qi_score, 0);
  const blood = normTri(answersRaw?.blood ?? answersRaw?.materials?.blood ?? answersRaw?.blood_score, 0);
  const fluid = normTri(answersRaw?.fluid ?? answersRaw?.materials?.fluid ?? answersRaw?.fluid_score, 0);

  const primary_meridian = mapMeridian(answersRaw?.meridian ?? answersRaw?.primary_meridian ?? answersRaw?.motion ?? answersRaw?.motion_choice);

  const is_mixed = Boolean(answersRaw?.is_mixed) || detectMixed(symptom_focus, thermo, resilience);

  const core_code = toCoreCode(thermo, resilience, is_mixed);

  const sub_labels = pickSubLabels(
    symptom_focus,
    thermo,
    resilience,
    { qi, blood, fluid }
  );

  // Notes: keep debug-friendly but minimal
  const notes = {
    debug: {
      symptom_focus,
      thermo,
      resilience,
      is_mixed,
      qi,
      blood,
      fluid,
      primary_meridian,
      core_code,
      sub_labels,
    },
  };

  return {
    symptom_focus,
    answers: answersRaw ?? {},
    thermo,
    resilience,
    is_mixed,
    qi,
    blood,
    fluid,
    primary_meridian,
    secondary_meridian: null,
    core_code,
    sub_labels,
    engine_version: ENGINE_VERSION,
    notes,
  };
}

/**
 * Helper: build a minimal "computed" payload for constitution_profiles.computed
 * (if you still use it on the UI side). Not required if you read columns directly.
 *
 * @param {ReturnType<typeof diagnoseV2>} d
 */
export function toComputedPayload(d) {
  return {
    engine_version: d.engine_version,
    core_code: d.core_code,
    sub_labels: d.sub_labels,
    thermo: d.thermo,
    resilience: d.resilience,
    is_mixed: d.is_mixed,
    qi: d.qi,
    blood: d.blood,
    fluid: d.fluid,
    primary_meridian: d.primary_meridian,
  };
}
