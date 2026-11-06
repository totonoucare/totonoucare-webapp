const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SYMPTOMS = new Set(["fatigue","sleep","digestion","neck_shoulder","low_back_pain","swelling","headache","dizziness","mood"]);
const SCENES = new Set(["general","desk","screen","carry","sleep"]);
export function normalizeConsultContext(value) {
  if (value == null) return null;
  if (!value || typeof value !== "object" || !["result","forecast","care"].includes(value.kind)) throw new Error("invalid_consult_context");
  const symptom = SYMPTOMS.has(value.symptom_focus) ? value.symptom_focus : null;
  if (!symptom) throw new Error("invalid_consult_symptom");
  if (value.kind === "result") {
    if (!UUID.test(value.result_id || "")) throw new Error("invalid_consult_result");
    return { kind: "result", result_id: value.result_id, symptom_focus: symptom };
  }
  if (!UUID.test(value.forecast_id || "") || !/^\d{4}-\d{2}-\d{2}$/.test(value.target_date || "")
    || !["today","tomorrow"].includes(value.mode) || !SCENES.has(value.lifestyle_scene || "general")) throw new Error("invalid_consult_forecast");
  const context = { kind: value.kind, forecast_id: value.forecast_id, target_date: value.target_date, mode: value.mode,
    symptom_focus: symptom, lifestyle_scene: value.lifestyle_scene || "general" };
  if (value.forecast_revision != null) {
    if (typeof value.forecast_revision !== "string" || value.forecast_revision.length > 64 || !Number.isFinite(Date.parse(value.forecast_revision))) throw new Error("invalid_consult_revision");
    context.forecast_revision = value.forecast_revision;
  }
  if (value.kind === "care") {
    if (typeof value.item_key !== "string" || !/^v3:[a-z0-9_:-]+$/i.test(value.item_key) || value.item_key.length > 120) throw new Error("invalid_consult_care");
    context.item_key = value.item_key;
  }
  return context;
}

