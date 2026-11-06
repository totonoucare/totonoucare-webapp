import { normalizeConsultContext } from "./chatContext";
import { loadResultSubject, loadForecastSubject, constitutionInput, insightError } from "./subjects";
import { readConstitutionInsight, findInsight } from "./insightService";
import { SYMPTOM_LABELS } from "@/lib/diagnosis/v2/labels";

async function cachedBase(userId, input) {
  try { return await readConstitutionInsight(userId, input); }
  catch (e) { if (e.code === "insight_schema_required") return null; throw e; }
}
export async function sharedConstitutionContext(userId, profile) {
  if (!profile?.core_code || !SYMPTOM_LABELS[profile.symptom_focus]) return null;
  const input = constitutionInput(profile);
  return { insight: await cachedBase(userId, input), role: "結果画面と共通の主訴についての見立て。生成済みの場合のみ使用し、確認された原因には読み替えない。" };
}
export async function resolveConsultContext({ req, user, requested }) {
  let request;
  try { request = normalizeConsultContext(requested); }
  catch { throw insightError("質問する対象をもう一度選んでください。", "invalid_consult_context"); }
  if (!request) return null;
  if (request.kind === "result") {
    const subject = await loadResultSubject({ req, user, eventId: request.result_id });
    if (request.symptom_focus !== subject.profile.symptom_focus) throw insightError("不調が変更されました。質問する対象を選び直してください。", "subject_changed", 409);
    return { request, label: SYMPTOM_LABELS[subject.profile.symptom_focus] + "と体質の見立て",
      constitution: subject.base.constitution, constitution_insight: await cachedBase(user.id, subject.base) };
  }
  const subject = await loadForecastSubject({ user, forecastId: request.forecast_id, mode: request.mode,
    lifestyleScene: request.lifestyle_scene, forecastRevision: request.forecast_revision, symptomFocus: request.symptom_focus, forChat: true });
  if (subject.targetDate !== request.target_date) throw insightError("対象日をもう一度確認してください。", "target_date_mismatch", 409);
  const item = request.kind === "care" ? subject.items.find(x => (x.canonical_key || x.item_key) === request.item_key) : null;
  if (request.kind === "care" && !item) throw insightError("ケアの表示が更新されました。予報を読み直して選び直してください。", "care_context_changed", 409);
  const base = await cachedBase(user.id, subject.base);
  let dailyInsight = null;
  if (base) {
    const cached = await findInsight(user.id, "forecast", { ...subject.daily, constitution: subject.base.constitution, constitution_insight: base });
    if (cached.row?.state === "ready") dailyInsight = cached.row.payload;
  }
  return { request, label: subject.targetDate + (item ? "の「" + item.label + "」" : "の予報"),
    constitution: subject.base.constitution, constitution_insight: base, forecast_insight: dailyInsight,
    forecast_context: subject.daily,
    selected_care: item ? { item_key: item.item_key, label: item.label, detail: item.detail, domain: item.domain, kind: item.kind } : null };
}

