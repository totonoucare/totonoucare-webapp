import crypto from "crypto";
import { supabaseServer } from "@/lib/supabaseServer";
import { addDaysYmd, buildRecordsSummary, safeArray } from "@/lib/records/analysis";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const REVIEW_EXTENDED_SELECT = [
  "id",
  "target_date",
  "condition_level",
  "prevent_level",
  "action_tags",
  "note",
  "care_domains",
  "care_timing",
  "context_factors",
  "forecast_snapshot",
  "record_version",
  "created_at",
  "updated_at",
].join(",");
const REVIEW_LEGACY_SELECT = "id,target_date,condition_level,prevent_level,action_tags,note,created_at";
const FORECAST_SELECT = [
  "id",
  "target_date",
  "score_0_10",
  "signal",
  "main_trigger",
  "trigger_dir",
  "why_short",
  "peak_start",
  "peak_end",
  "computed",
  "created_at",
  "updated_at",
].join(",");

export function isValidYmd(value) {
  if (!DATE_RE.test(String(value || ""))) return false;
  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function daysBetween(start, end) {
  if (!isValidYmd(start) || !isValidYmd(end)) return Infinity;
  const a = Date.parse(`${start}T00:00:00Z`);
  const b = Date.parse(`${end}T00:00:00Z`);
  return Math.floor((b - a) / 86400000) + 1;
}

export function isMissingRecordsSchemaError(error) {
  const message = String(error?.message || "");
  return (
    error?.code === "42P01" ||
    error?.code === "42703" ||
    error?.code === "PGRST204" ||
    error?.code === "PGRST205" ||
    message.includes("care_domains") ||
    message.includes("forecast_snapshot") ||
    message.includes("records_ai_") ||
    message.includes("records_feature_")
  );
}

function latestByDate(rows) {
  const map = new Map();
  for (const row of rows || []) {
    const date = String(row.target_date || "");
    if (!date) continue;
    const previous = map.get(date);
    const currentStamp = String(row.updated_at || row.created_at || "");
    const previousStamp = String(previous?.updated_at || previous?.created_at || "");
    if (!previous || currentStamp >= previousStamp) map.set(date, row);
  }
  return map;
}

function normalizeReview(row) {
  if (!row) return null;
  return {
    id: row.id,
    condition_level: row.condition_level ?? null,
    prevent_level: row.prevent_level ?? null,
    action_tags: safeArray(row.action_tags),
    care_domains: safeArray(row.care_domains),
    care_timing: row.care_timing || "",
    context_factors: safeArray(row.context_factors),
    forecast_snapshot: row.forecast_snapshot || null,
    record_version: Number(row.record_version || 1),
    note: row.note || "",
    created_at: row.created_at || null,
    updated_at: row.updated_at || row.created_at || null,
  };
}

function normalizeForecast(row, source = "current_forecast") {
  if (!row) return null;
  const computedSnapshot = row?.computed?.forecast_snapshot || {};
  return {
    id: row.id || row.forecast_id || null,
    target_date: row.target_date || null,
    score_0_10: row.score_0_10 ?? null,
    score_precise_0_10:
      row.score_precise_0_10 ??
      row.score_display_0_10 ??
      computedSnapshot.score_precise_0_10 ??
      computedSnapshot.score_display_0_10 ??
      null,
    signal: row.signal ?? null,
    main_trigger: row.main_trigger || null,
    trigger_dir: row.trigger_dir || null,
    personal_main_trigger_exact:
      row.personal_main_trigger_exact || computedSnapshot.personal_main_trigger_exact || null,
    personal_secondary_trigger_exact:
      row.personal_secondary_trigger_exact || computedSnapshot.personal_secondary_trigger_exact || null,
    trigger_factors: safeArray(row.trigger_factors || computedSnapshot.trigger_factors),
    peak_start: row.peak_start || computedSnapshot.peak_start || null,
    peak_end: row.peak_end || computedSnapshot.peak_end || null,
    why_short: row.why_short || computedSnapshot.why_short || "",
    snapshot_source: row.snapshot_source || source,
    captured_at: row.captured_at || null,
    created_at: row.created_at || null,
    updated_at: row.forecast_updated_at || row.updated_at || row.created_at || null,
  };
}

async function loadReviewRows(userId, start, end) {
  let result = await supabaseServer
    .from("radar_reviews")
    .select(REVIEW_EXTENDED_SELECT)
    .eq("user_id", userId)
    .gte("target_date", start)
    .lte("target_date", end)
    .order("target_date", { ascending: true });

  if (!result.error) return { rows: result.data || [], schemaReady: true };
  if (!isMissingRecordsSchemaError(result.error)) throw result.error;

  result = await supabaseServer
    .from("radar_reviews")
    .select(REVIEW_LEGACY_SELECT)
    .eq("user_id", userId)
    .gte("target_date", start)
    .lte("target_date", end)
    .order("target_date", { ascending: true });
  if (result.error) throw result.error;
  return { rows: result.data || [], schemaReady: false };
}

export async function loadRecordsRange(userId, start, end) {
  if (!userId) throw new Error("userId is required");
  if (!isValidYmd(start) || !isValidYmd(end)) throw new Error("invalid start/end");
  const span = daysBetween(start, end);
  if (span < 1 || span > 370) throw new Error("range must be 1-370 days");

  const [forecastResult, reviewResult] = await Promise.all([
    supabaseServer
      .from("radar_forecasts")
      .select(FORECAST_SELECT)
      .eq("user_id", userId)
      .gte("target_date", start)
      .lte("target_date", end)
      .order("target_date", { ascending: true }),
    loadReviewRows(userId, start, end),
  ]);
  if (forecastResult.error) throw forecastResult.error;

  const forecastMap = latestByDate(forecastResult.data || []);
  const reviewMap = latestByDate(reviewResult.rows || []);
  const rows = [];

  for (let index = 0; index < span; index += 1) {
    const date = addDaysYmd(start, index);
    const rawReview = reviewMap.get(date) || null;
    const review = normalizeReview(rawReview);
    const savedSnapshot = review?.forecast_snapshot;
    const currentForecast = forecastMap.get(date) || null;
    const forecast = savedSnapshot
      ? normalizeForecast(savedSnapshot, savedSnapshot.snapshot_source || "record_snapshot")
      : normalizeForecast(currentForecast, "current_forecast");

    rows.push({
      date,
      review,
      forecast,
      forecast_source: savedSnapshot ? "record_snapshot" : currentForecast ? "current_forecast" : "none",
    });
  }

  return {
    start,
    end,
    rows,
    summary: buildRecordsSummary(rows),
    schema_ready: reviewResult.schemaReady,
  };
}

export async function loadRecordsProfile(userId) {
  const selectWithActive = [
    "user_id",
    "core_code",
    "sub_labels",
    "primary_meridian",
    "secondary_meridian",
    "computed",
    "symptom_focus",
    "active_symptom_focus",
    "latest_event_id",
    "updated_at",
  ].join(",");

  let result = await supabaseServer
    .from("constitution_profiles")
    .select(selectWithActive)
    .eq("user_id", userId)
    .maybeSingle();

  if (result.error) {
    const message = String(result.error?.message || "");
    const missingColumn =
      result.error?.code === "42703" ||
      result.error?.code === "PGRST204" ||
      message.includes("active_symptom_focus");
    if (!missingColumn) throw result.error;
    result = await supabaseServer
      .from("constitution_profiles")
      .select("user_id,core_code,sub_labels,primary_meridian,secondary_meridian,computed,symptom_focus,latest_event_id,updated_at")
      .eq("user_id", userId)
      .maybeSingle();
  }

  if (result.error) throw result.error;
  const profile = result.data;
  if (!profile) return null;
  const computed = profile.computed || {};
  return {
    core_code: profile.core_code || computed.core_code || null,
    sub_labels: safeArray(profile.sub_labels).length ? profile.sub_labels : safeArray(computed.sub_labels),
    primary_meridian: profile.primary_meridian || computed.primary_meridian || null,
    secondary_meridian: profile.secondary_meridian || computed.secondary_meridian || null,
    symptom_focus:
      profile.active_symptom_focus || profile.symptom_focus || computed.symptom_focus || null,
    updated_at: profile.updated_at || null,
  };
}

export function latestSourceAt(bundle, profile) {
  const stamps = [];
  for (const row of bundle?.rows || []) {
    if (row?.forecast?.captured_at) stamps.push(row.forecast.captured_at);
    if (row?.forecast?.updated_at) stamps.push(row.forecast.updated_at);
    if (row?.review?.updated_at) stamps.push(row.review.updated_at);
    if (row?.review?.created_at) stamps.push(row.review.created_at);
  }
  if (profile?.updated_at) stamps.push(profile.updated_at);
  return stamps.sort().at(-1) || null;
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = stableValue(value[key]);
      return result;
    }, {});
  }
  return value;
}

export function sourceHash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stableValue(value))).digest("hex");
}

export function buildSafetyIdentifier(userId) {
  const secret = process.env.OPENAI_SAFETY_IDENTIFIER_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("OPENAI_SAFETY_IDENTIFIER_SECRET is not configured");
  return `mibyo_${crypto.createHmac("sha256", secret).update(String(userId)).digest("hex").slice(0, 48)}`;
}
