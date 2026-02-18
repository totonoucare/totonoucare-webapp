// lib/diagnosis/v2/engine.js
// Single source of truth: scoring.js

import { scoreDiagnosis } from "./scoring";

export const ENGINE_VERSION = "v2";

/**
 * Main entry (new)
 * @param {object} answers
 */
export function computeDiagnosisV2(answers = {}) {
  return scoreDiagnosis(answers);
}

/**
 * Compatibility wrapper (old callers may expect this shape)
 * @param {object} answers
 */
export function diagnoseV2(answers = {}) {
  const computed = scoreDiagnosis(answers);
  return {
    symptom_focus: computed?.symptom_focus || answers?.symptom_focus || "fatigue",
    answers,
    computed,
    version: "v2",
  };
}

/**
 * Backward compatible alias
 * @param {object} answers
 */
export function toComputedPayload(answers = {}) {
  return scoreDiagnosis(answers);
}
