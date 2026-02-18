// lib/diagnosis/v2/engine.js
import { scoreDiagnosis, ENGINE_VERSION } from "./scoring";

export { ENGINE_VERSION };

export function computeDiagnosisV2(answers = {}) {
  return scoreDiagnosis(answers);
}

export function diagnoseV2(answers = {}) {
  const computed = scoreDiagnosis(answers);
  return {
    symptom_focus: computed?.symptom_focus || answers?.symptom_focus || "fatigue",
    answers,
    computed,
    version: "v3",
  };
}

export function toComputedPayload(answers = {}) {
  return scoreDiagnosis(answers);
}
