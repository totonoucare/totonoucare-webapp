// lib/diagnosis/v2/scoring.js

/**
 * Diagnosis v2 Scoring Engine (v2-final)
 *
 * Goals:
 * - Stable, fixed dictionaries (NO AI labels)
 * - Output:
 *   - vectors: qi/blood/fluid (-1/0/+1)
 *   - thermo: cold_heat (-1/0/+1) + is_mixed boolean
 *   - resilience (-1/0/+1) => core_code uses {high|low} (high=+1, else low)
 *   - meridian line: 5 codes (lung_li / heart_si / kidney_bl / liver_gb / spleen_st)
 *   - core_code: 8 types
 *   - sub_labels: max 2 (slot1 = symptom-based, slot2 = material-based)
 */

const MERIDIAN_MAP = {
  A: ["lung_li", "lung_li"],       // 肺・大腸ライン（まとめ）
  B: ["heart_si", "heart_si"],     // 心・小腸ライン（まとめ）
  C: ["kidney_bl", "kidney_bl"],   // 腎・膀胱ライン（まとめ）
  D: ["liver_gb", "liver_gb"],     // 肝・胆ライン（まとめ）
  E: ["spleen_st", "spleen_st"],   // 脾・胃ライン（まとめ）
};

// 主訴→サブラベル（slot1固定）
const SYMPTOM_TO_PRIMARY_SUB = {
  fatigue: "qi_deficiency",
  sleep: "blood_deficiency",
  mood: "qi_stagnation",
  neck_shoulder: "blood_stasis",
  low_back_pain: "blood_stasis",
  swelling: "fluid_damp",
  headache: "blood_stasis",
  dizziness: "fluid_damp",
};

// material sub label codes
const MATERIAL_SUBS = new Set([
  "qi_deficiency",
  "qi_stagnation",
  "blood_deficiency",
  "blood_stasis",
  "fluid_damp",
  "fluid_deficiency",
]);

function clampSign(v) {
  if (v === -1 || v === 0 || v === 1) return v;
  return 0;
}

function thermoFromAnswer(coldHeat) {
  // cold / neutral / heat / mixed
  if (coldHeat === "cold") return { thermo: -1, is_mixed: false };
  if (coldHeat === "heat") return { thermo: +1, is_mixed: false };
  if (coldHeat === "mixed") return { thermo: 0, is_mixed: true };
  return { thermo: 0, is_mixed: false };
}

function resilienceFromAnswer(res) {
  // low / medium / high
  if (res === "low") return -1;
  if (res === "high") return +1;
  return 0; // medium
}

function coreCode({ thermo, is_mixed, resilience }) {
  const bucket = resilience === +1 ? "high" : "low"; // mediumはlow扱い（8タイプに収める）
  if (is_mixed) return `mixed_${bucket}`;
  if (thermo === -1) return `cold_${bucket}`;
  if (thermo === +1) return `heat_${bucket}`;
  return `neutral_${bucket}`;
}

// slot2選定（主訴slot1は確定、slot2は素材の偏りを採用）
function pickSecondarySub({ qi, blood, fluid, thermo, is_mixed, resilience }, primarySub) {
  // base weights: imbalance -> 2
  const weights = {
    qi_deficiency: qi === -1 ? 2 : 0,
    qi_stagnation: qi === +1 ? 2 : 0,
    blood_deficiency: blood === -1 ? 2 : 0,
    blood_stasis: blood === +1 ? 2 : 0,
    fluid_deficiency: fluid === -1 ? 2 : 0,
    fluid_damp: fluid === +1 ? 2 : 0,
  };

  // adjustments by thermo / resilience (絞り込みのための重み付け)
  if (thermo === -1) {
    weights.qi_deficiency += 1;
    weights.fluid_damp += 1;
    weights.blood_stasis += 0.5;
  }
  if (thermo === +1) {
    weights.fluid_deficiency += 1;
    weights.qi_stagnation += 0.5;
  }
  if (is_mixed) {
    weights.qi_stagnation += 1;
    weights.fluid_damp += 0.5;
  }
  if (resilience === -1) {
    weights.qi_deficiency += 1;
    weights.blood_deficiency += 1;
    weights.fluid_deficiency += 1;
  }

  // remove primarySub
  if (primarySub && weights[primarySub] != null) weights[primarySub] = -999;

  // pick max
  const entries = Object.entries(weights)
    .filter(([k]) => MATERIAL_SUBS.has(k))
    .sort((a, b) => b[1] - a[1]);

  const [bestKey, bestScore] = entries[0] || [null, -999];
  if (!bestKey || bestScore <= 0) return null;

  return bestKey;
}

export function scoreDiagnosis(answers = {}) {
  // --- vectors ---
  let qi = 0;
  let blood = 0;
  let fluid = 0;

  if (answers.qi_state === "deficiency") qi = -1;
  if (answers.qi_state === "stagnation") qi = +1;

  if (answers.blood_state === "deficiency") blood = -1;
  if (answers.blood_state === "stasis") blood = +1;

  if (answers.fluid_state === "deficiency") fluid = -1;
  if (answers.fluid_state === "damp") fluid = +1;

  // --- thermo ---
  const { thermo, is_mixed } = thermoFromAnswer(answers.cold_heat);

  // --- resilience ---
  const resilience = resilienceFromAnswer(answers.resilience);

  // --- meridian line ---
  const meridianKey = answers.meridian_test;
  const meridians = MERIDIAN_MAP[meridianKey] || [null, null];
  const primary_meridian = meridians[0] || null;
  const secondary_meridian = meridians[1] || null;

  // --- labels ---
  const symptom_focus = answers.symptom_focus || "fatigue";
  const primarySub = SYMPTOM_TO_PRIMARY_SUB[symptom_focus] || "qi_deficiency";

  const core_code = coreCode({
    thermo,
    is_mixed,
    resilience,
  });

  const slot2 = pickSecondarySub(
    { qi, blood, fluid, thermo, is_mixed, resilience },
    primarySub
  );

  const sub_labels = [primarySub, slot2].filter(Boolean);

  return {
    symptom_focus,

    qi: clampSign(qi),
    blood: clampSign(blood),
    fluid: clampSign(fluid),

    thermo: clampSign(thermo),
    resilience: clampSign(resilience),
    is_mixed: !!is_mixed,

    primary_meridian,
    secondary_meridian,

    core_code,
    sub_labels,

    version: "v2",
  };
}

/**
 * For constitution_profiles upsert
 */
export function buildConstitutionProfilePayload(userId, answers) {
  const computed = scoreDiagnosis(answers);

  return {
    user_id: userId,
    symptom_focus: computed.symptom_focus,

    qi: computed.qi,
    blood: computed.blood,
    fluid: computed.fluid,

    cold_heat: computed.thermo, // profiles側は cold_heat カラム
    resilience: computed.resilience,

    primary_meridian: computed.primary_meridian,
    secondary_meridian: computed.secondary_meridian,

    organs: computed.primary_meridian ? [computed.primary_meridian] : [],

    answers,
    computed, // core_code/sub_labels まで含む
    version: "v2",
  };
}
