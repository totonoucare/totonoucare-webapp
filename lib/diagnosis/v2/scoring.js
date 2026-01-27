// lib/diagnosis/v2/scoring.js

/**
 * Diagnosis v2 Scoring Engine
 *
 * Responsibilities:
 * - Convert answers into normalized TCM-style vectors
 * - Determine primary / secondary meridian (from movement test)
 * - Produce a stable computed object for DB, AI, and radar usage
 */

const MERIDIAN_MAP = {
  A: ["lung", "large_intestine"],
  B: ["heart", "small_intestine"],
  C: ["kidney", "bladder"],
  D: ["liver", "gallbladder"],
  E: ["spleen", "stomach"]
};

export function scoreDiagnosis(answers = {}) {
  // --- defaults ---
  let qi = 0;
  let blood = 0;
  let fluid = 0;
  let cold_heat = 0;
  let resilience = 0;

  // --- Qi ---
  if (answers.qi_state === "deficiency") qi = -1;
  if (answers.qi_state === "stagnation") qi = +1;

  // --- Blood ---
  if (answers.blood_state === "deficiency") blood = -1;
  if (answers.blood_state === "stasis") blood = +1;

  // --- Fluid ---
  if (answers.fluid_state === "deficiency") fluid = -1;
  if (answers.fluid_state === "damp") fluid = +1;

  // --- Cold / Heat ---
  if (answers.cold_heat === "cold") cold_heat = -1;
  if (answers.cold_heat === "heat") cold_heat = +1;

  // --- Resilience ---
  if (answers.resilience === "low") resilience = -1;
  if (answers.resilience === "high") resilience = +1;

  // --- Meridian (movement test) ---
  const meridianKey = answers.meridian_test;
  const meridians = MERIDIAN_MAP[meridianKey] || [];
  const primary_meridian = meridians[0] || null;
  const secondary_meridian = meridians[1] || null;

  // --- Derived descriptors (human-readable tags) ---
  const materials = [];
  if (qi === -1) materials.push("qi_deficiency");
  if (qi === +1) materials.push("qi_stagnation");
  if (blood === -1) materials.push("blood_deficiency");
  if (blood === +1) materials.push("blood_stasis");
  if (fluid === -1) materials.push("fluid_deficiency");
  if (fluid === +1) materials.push("damp");

  const tendencies = [];
  if (cold_heat === -1) tendencies.push("cold");
  if (cold_heat === +1) tendencies.push("heat");
  if (resilience === -1) tendencies.push("low_resilience");
  if (resilience === +1) tendencies.push("high_resilience");

  return {
    symptom_focus: answers.symptom_focus || "fatigue",

    qi,
    blood,
    fluid,

    cold_heat,
    resilience,

    primary_meridian,
    secondary_meridian,

    materials,
    tendencies,

    version: "v2"
  };
}

/**
 * Helper:
 * Prepare DB payload for constitution_profiles
 */
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

    organs: computed.primary_meridian
      ? [computed.primary_meridian]
      : [],

    answers,
    computed
  };
}
