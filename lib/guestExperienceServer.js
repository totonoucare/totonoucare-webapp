import { createHash } from "node:crypto";
import { supabaseServer } from "@/lib/supabaseServer";
import { hasValidGuestToken } from "@/lib/diagnosisGuestAccess";
import { loadResultSubject, buildForecastInsightSubject } from "@/lib/mimoru/subjects";
import { buildFastRadarBundle } from "@/lib/radar_v1/buildFastRadarBundle";
import { nowJstParts, toJstISODate } from "@/lib/radar_v1/timeJST";
import { FORECAST_AI_CONSENT_VERSION, RECORDS_AI_CONSENT_VERSION } from "@/lib/records/aiEvents";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function guestError(message, code, status = 400) { return Object.assign(new Error(message), { code, status }); }
export async function requireGuestExperience(req, requestedId = null) {
  const id = requestedId || req.headers.get("x-mibyo-guest-result");
  if (!UUID.test(id || "") || !await hasValidGuestToken({ req, supabase: supabaseServer, eventId: id })) {
    throw guestError("体質チェックから、もう一度お試しください。", "guest_expired", 401);
  }
  const [result, state] = await Promise.all([
    supabaseServer.from("diagnosis_events").select("id,user_id,created_at").eq("id", id).maybeSingle(),
    supabaseServer.from("guest_experiences_v126").select("*").eq("result_id", id).maybeSingle(),
  ]);
  if (result.error || state.error) throw guestError("体験機能の更新準備中です。", "guest_schema_required", 503);
  if (!result.data || result.data.user_id || !state.data || state.data.claimed_by || Date.parse(state.data.expires_at) <= Date.now()) {
    throw guestError("体質チェックから、もう一度お試しください。", "guest_expired", 401);
  }
  return { id, state: state.data, createdAt: result.data.created_at };
}
export async function guestConstitution(req, guest) {
  return loadResultSubject({ req, user: null, eventId: guest.id });
}
export function guestAiConsentVersion(guest) {
  return guest.state.ai_consented_at ? guest.state.ai_consent_version : null;
}
export function guestConsentIsActive(guest) {
  return guestAiConsentVersion(guest) === RECORDS_AI_CONSENT_VERSION;
}
export async function setGuestConsent(guest, consent, { forecastOnly = false } = {}) {
  const now = new Date().toISOString();
  const version = forecastOnly ? FORECAST_AI_CONSENT_VERSION : RECORDS_AI_CONSENT_VERSION;
  let write = supabaseServer.from("guest_experiences_v126").update({
    ai_consent_version: consent ? version : null,
    ai_consented_at: consent ? now : null,
  }).eq("result_id", guest.id).is("claimed_by", null).gt("expires_at", now);
  if (forecastOnly) {
    write = consent
      ? write.or(`ai_consented_at.is.null,ai_consent_version.is.null,ai_consent_version.not.in.(${RECORDS_AI_CONSENT_VERSION},${FORECAST_AI_CONSENT_VERSION})`)
      : write.eq("ai_consent_version", FORECAST_AI_CONSENT_VERSION);
  }
  const { error } = await write;
  if (error) throw error;
}
export function guestForecastId(resultId, date) {
  const hex = createHash("sha256").update(resultId + ":" + date).digest("hex").slice(0, 32).split("");
  hex[12] = "5"; hex[16] = ((parseInt(hex[16], 16) & 3) | 8).toString(16);
  const h = hex.join("");
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
export function currentGuestDates() {
  const today = nowJstParts(new Date()).isoDate;
  const d = new Date(`${today}T12:00:00+09:00`); d.setUTCDate(d.getUTCDate() + 1);
  return { today, tomorrow: toJstISODate(d) };
}
export async function guestForecast(req, guest, { targetDate, location = null, cacheOnly = false, force = false } = {}) {
  const dates = currentGuestDates();
  if (![dates.today, dates.tomorrow].includes(targetDate)) throw guestError("今日か明日を選んでください。", "invalid_date");
  const subject = await guestConstitution(req, guest);
  const effectiveLocation = location || guest.state.location;
  if (!effectiveLocation) throw guestError("No radar location found. 地域を選んでください。", "location_required");
  const fingerprint = createHash("sha256").update(JSON.stringify({ profile: subject.profile, location: effectiveLocation })).digest("hex");
  const saved = await supabaseServer.from("guest_forecasts_v126").select("*").eq("result_id", guest.id).eq("target_date", targetDate).maybeSingle();
  if (saved.error) throw saved.error;
  let row = saved.data;
  let cached = Boolean(row && row.fingerprint === fingerprint);
  if (!cached && cacheOnly) return { ok: true, cached: false, location: effectiveLocation, forecast: null, care_plan: null, target_date: targetDate };
  if (!cached || force) {
    const built = await buildFastRadarBundle({ userId: null, profileOverride: subject.profile, targetDate, location: effectiveLocation });
    const id = row?.id || guestForecastId(guest.id, targetDate);
    const timestamp = new Date().toISOString();
    const forecast = { ...built.radarPlan.forecast, id, target_date: targetDate, updated_at: timestamp, created_at: timestamp,
      why_short: built.radarPlan.tonight?.note?.body || "", vendor_meta: built.vendorMeta,
      computed: { radar_plan_meta: built.radarPlan.meta || null, forecast_snapshot: built.radarPlan.forecast } };
    const care = { forecast_id: id, night_tsubo_set: built.radarPlan.tonight?.tsubo_set || {},
      night_note: built.radarPlan.tonight?.note?.body || "", tomorrow_food_context: built.radarPlan.tomorrow_food || {},
      tomorrow_caution: built.radarPlan.tomorrow_caution || "", review_schema: built.radarPlan.review_schema || {} };
    const updated = await supabaseServer.from("guest_forecasts_v126").upsert({ id, result_id: guest.id, target_date: targetDate,
      fingerprint, forecast, care_plan: care, updated_at: timestamp }, { onConflict: "result_id,target_date" }).select("*").single();
    if (updated.error) throw updated.error;
    row = updated.data; cached = false;
  }
  return { ok: true, cached, target_date: targetDate, target_mode: targetDate === dates.today ? "today" : "tomorrow",
    location: effectiveLocation, forecast: row.forecast, care_plan: row.care_plan };
}
export async function guestForecastSubject(req, guest, body) {
  const mode = body.mode;
  if (!["today", "tomorrow"].includes(mode) || !["general", "desk", "screen", "carry", "sleep"].includes(body.lifestyle_scene || "general")) {
    throw guestError("ケアの対象を確認してください。", "invalid_subject");
  }
  const date = currentGuestDates()[mode];
  const saved = await supabaseServer.from("guest_forecasts_v126").select("*").eq("result_id", guest.id).eq("target_date", date).eq("id", body.forecast_id).maybeSingle();
  if (saved.error) throw saved.error;
  if (!saved.data) throw guestError("予報を読み直してください。", "subject_not_found", 404);
  const latest = await guestForecast(req, guest, { targetDate: date, cacheOnly: true });
  if (!latest.forecast || latest.forecast.id !== saved.data.id) throw guestError("予報を読み直してください。", "subject_changed", 409);
  const raw = latest.forecast;
  if (body.expected_revision && Date.parse(body.expected_revision) !== Date.parse(raw.updated_at)) throw guestError("予報が更新されました。読み直してください。", "subject_changed", 409);
  const { profile, base } = await guestConstitution(req, guest);
  let todayForecast = null;
  if (mode === "tomorrow") {
    const comparison = await guestForecast(req, guest, { targetDate: currentGuestDates().today, cacheOnly: true });
    todayForecast = comparison.forecast;
  }
  return buildForecastInsightSubject({ profile, base, forecast: raw, raw, storedCarePlan: latest.care_plan,
    todayForecast, mode, lifestyleScene: body.lifestyle_scene || "general", revision: raw.updated_at });
}
