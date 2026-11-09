import { supabaseServer } from "@/lib/supabaseServer";
import { loadRecordsProfile, loadRecentCompletedCare } from "@/lib/records/server";
import { buildMimoruProfileContext } from "./explanationContext";
import { buildForecastReasoningContext } from "@/lib/records/forecastReasoning";
import { buildConstitutionWeatherAffinityV2, rankConstitutionWeatherAffinityV2 } from "@/lib/radar_v1/personalizeForecastV2";
import { scoreDiagnosis } from "@/lib/diagnosis/v2/scoring";
import { validateDiagnosisAnswers } from "@/lib/diagnosis/v2/validateAnswers";
import { loadResultProfileState } from "@/lib/diagnosis/v2/profileState";
import { hasValidGuestToken } from "@/lib/diagnosisGuestAccess";
import { SYMPTOM_LABELS } from "@/lib/diagnosis/v2/labels";
import { getRiskContext, resolveDisplayedCarePlan } from "@/app/radar/utils";
import { buildDisplayedCareItems } from "@/lib/radar_v1/careActionItems";
import { buildCareExplanationItems } from "./careExplanationInput";
import { addDaysYmd } from "@/lib/records/analysis";
import { jstDateString } from "@/lib/dateJST";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function insightError(message, code, status = 400) {
  return Object.assign(new Error(message), { code, status });
}
function assertId(value) {
  if (!UUID.test(String(value || ""))) throw insightError("対象が見つかりません。", "invalid_subject");
}
export function normalizeInsightProfile(value = {}) {
  const a = value.axes || {};
  return {
    core_code: value.core_code, sub_labels: value.sub_labels || [],
    primary_meridian: value.primary_meridian || null, secondary_meridian: value.secondary_meridian || null,
    symptom_focus: value.symptom_focus,
    axes: { yin_yang_score: a.reaction_score ?? a.yin_yang_score ?? 0, drive_score: a.reserve_score ?? a.drive_score ?? 0,
      obstruction_score: a.obstruction_score ?? 0, cold_score: a.cold_score ?? 0, heat_score: a.heat_score ?? 0,
      thermal_direction: a.thermal_direction ?? 0, thermal_mixed: Boolean(a.thermal_mixed), thermo_answer: a.thermo_answer || "neutral" },
    split_scores: value.split_scores || {}, material_scores: value.material_scores || null,
    score_scale: value.score_scale || value.split_scores?.scale || null,
    env: { sensitivity: value.env?.sensitivity || 0, vectors: value.env?.vectors || [] },
  };
}
export function constitutionInput(profile) {
  const normalized = normalizeInsightProfile(profile);
  if (!normalized.core_code || !SYMPTOM_LABELS[normalized.symptom_focus]) throw insightError("体質チェックの結果を確認してください。", "constitution_required", 409);
  const affinity = buildConstitutionWeatherAffinityV2({ constitution: normalized });
  return { constitution: buildMimoruProfileContext(normalized),
    weather_affinity: rankConstitutionWeatherAffinityV2(affinity.weights).slice(0, 3) };
}
export async function loadResultSubject({ req, user, eventId }) {
  assertId(eventId);
  const { data: row, error } = await supabaseServer.from("diagnosis_events")
    .select("id,user_id,answers").eq("id", eventId).maybeSingle();
  if (error) throw error;
  if (!row || (row.user_id ? row.user_id !== user.id : !await hasValidGuestToken({ req, supabase: supabaseServer, eventId }))) {
    throw insightError("この結果を表示できません。", "subject_not_found", 404);
  }
  const validation = validateDiagnosisAnswers(row.answers || {});
  if (!validation.ok) throw insightError("新しい体質チェックが必要です。", "retake_required", 409);
  const computed = scoreDiagnosis({ ...validation.answers,
    body_line_primary: row.answers?.body_line_primary, body_line_secondary: row.answers?.body_line_secondary });
  let profile = normalizeInsightProfile(computed);
  if (row.user_id) {
    const state = await loadResultProfileState(supabaseServer, user.id, eventId);
    if (state.is_current) {
      const current = await loadRecordsProfile(user.id);
      if (current?.symptom_focus) profile.symptom_focus = current.symptom_focus;
    }
  }
  return { eventId, profile, base: constitutionInput(profile) };
}
export async function loadForecastSubject({ user, forecastId, mode, lifestyleScene = "general", symptomFocus = null, forecastRevision = null, forChat = false }) {
  assertId(forecastId);
  if (!["today", "tomorrow"].includes(mode)) throw insightError("対象日の区分を確認してください。", "invalid_mode");
  if (!["general", "desk", "screen", "carry", "sleep"].includes(lifestyleScene)) throw insightError("ケアの場面を確認してください。", "invalid_scene");
  const { data: raw, error } = await supabaseServer.from("radar_forecasts").select("*")
    .eq("id", forecastId).eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  if (!raw) throw insightError("予報を読み直してください。", "subject_not_found", 404);
  const today = jstDateString(new Date());
  if (!forChat && raw.target_date !== (mode === "today" ? today : addDaysYmd(today, 1))) {
    throw insightError("日付が変わりました。予報を読み直してください。", "forecast_date_changed", 409);
  }
  const forecast = { ...raw, ...(raw.computed?.forecast_snapshot || {}), id: raw.id, target_date: raw.target_date, computed: raw.computed };
  const revision = raw.updated_at || raw.created_at || null;
  if (forecastRevision && revision && Date.parse(forecastRevision) !== Date.parse(revision)) {
    throw insightError("予報が更新されました。画面を読み直して質問する対象を選び直してください。", "forecast_revision_changed", 409);
  }
  const savedProfile = getRiskContext({ forecast })?.constitution_context;
  const profile = normalizeInsightProfile(forChat && savedProfile?.core_code ? savedProfile : await loadRecordsProfile(user.id) || {});
  if (forChat && SYMPTOM_LABELS[symptomFocus]) profile.symptom_focus = symptomFocus;
  const [care, completedCare, comparison] = await Promise.all([
    supabaseServer.from("radar_care_plans").select("*").eq("forecast_id", raw.id).maybeSingle(),
    loadRecentCompletedCare(user.id, raw.target_date),
    mode === "tomorrow" ? supabaseServer.from("radar_forecasts").select("*")
      .eq("user_id", user.id).eq("target_date", addDaysYmd(raw.target_date, -1)).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (care.error) throw care.error;
  if (comparison.error) throw comparison.error;
  const todayRaw = comparison.data;
  const todayForecast = todayRaw ? { ...todayRaw, ...(todayRaw.computed?.forecast_snapshot || {}), computed: todayRaw.computed } : null;
  const comparisonCare = todayForecast ? resolveDisplayedCarePlan({ forecast: todayForecast,
    riskContext: getRiskContext({ forecast: todayForecast }), mode: "today", targetDate: todayRaw.target_date,
    symptomFocus: profile.symptom_focus, completedCare, lifestyleScene }) : null;
  const carePlan = resolveDisplayedCarePlan({ forecast, storedCarePlan: care.data, riskContext: getRiskContext({ forecast }),
    mode, targetDate: raw.target_date, symptomFocus: profile.symptom_focus, completedCare, lifestyleScene,
    avoidLifestyleIds: comparisonCare?.lifestyle_plan?.step_ids || [] });
  const food = carePlan?.tomorrow_food_context || carePlan?.night_food || {};
  const tsuboSet = carePlan?.night_tsubo_set || {};
  const items = buildDisplayedCareItems({ lifestylePlan: carePlan?.lifestyle_plan, food,
    tsuboPoints: tsuboSet.points || [], tsuboSet, sourceMode: mode });
  return {
    profile, base: constitutionInput(profile), forecastId: raw.id, targetDate: raw.target_date, mode, lifestyleScene, items,
    daily: {
      target_date: raw.target_date, mode, symptom_focus: profile.symptom_focus,
      signal: forecast.signal, score: forecast.score_display_0_10 ?? forecast.score_0_10,
      forecast_reasoning: buildForecastReasoningContext(forecast),
      // Coordinates and free text are intentionally omitted from the AI input.
      selected_care: { role: "対象日の画面へ選定されたケアの提案", policies: carePlan?.care_theme?.policies || [], selection_reason: carePlan?.care_theme?.selection_reason || "",
        items: buildCareExplanationItems({ items, food, lifestylePlan: carePlan?.lifestyle_plan, tsuboSet }) },
      forecast_revision: revision, lifestyle_scene: lifestyleScene,
    },
  };
}

