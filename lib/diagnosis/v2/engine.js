// lib/diagnosis/v2/engine.js
// Single source of truth: scoring.js

import { scoreDiagnosis } from "./scoring";

export const ENGINE_VERSION = "v2";

export function computeDiagnosisV2(answers = {}) {
  return scoreDiagnosis(answers);
}

export function diagnoseV2(answers = {}) {
  const computed = scoreDiagnosis(answers);
  return {
    symptom_focus: computed?.symptom_focus || answers?.symptom_focus || "fatigue",
    answers,
    computed,
    version: "v2",
  };
}

export function toComputedPayload(answers = {}) {
  return scoreDiagnosis(answers);
}
