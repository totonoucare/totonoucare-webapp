import crypto from "crypto";
import { supabaseServer } from "@/lib/supabaseServer";
import { addDaysYmd, buildRecordsSummary, safeArray } from "@/lib/records/analysis";
import { dedupeCareActions, normalizeCareAction } from "@/lib/radar_v1/careActionItems";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const REVIEW_EXTENDED_SELECT = [
  "id",
  "target_date",
  "condition_level",
  "prevent_level",
  "manual_prevent_level",
  "action_tags",
  "note",
  "care_domains",
  "manual_care_domains",
  "care_timing",
  "manual_care_timing",
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
const WEATHER_CHANNEL_KEYS = [
  "pressure_shift",
  "temperature_shift",
  "temp_shift",
  "pressure_down",
  "pressure_up",
  "cold",
  "heat",
  "damp",
  "dry",
];

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function compactSplitScores(value) {
  if (!value || typeof value !== "object") return null;
  return {
    qi: {
      deficiency: finiteOrNull(value?.qi?.deficiency),
      stagnation: finiteOrNull(value?.qi?.stagnation),
    },
    blood: {
      deficiency: finiteOrNull(value?.blood?.deficiency),
      stasis: finiteOrNull(value?.blood?.stasis),
    },
    fluid: {
      deficiency: finiteOrNull(value?.fluid?.deficiency),
      damp: finiteOrNull(value?.fluid?.damp),
    },
    total: {
      deficiency: finiteOrNull(value?.total?.deficiency),
      obstruction: finiteOrNull(value?.total?.obstruction),
    },
  };
}

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
    message.includes("manual_prevent_level") ||
    message.includes("manual_care_domains") ||
    message.includes("manual_care_timing") ||
    message.includes("forecast_snapshot") ||
    message.includes("records_ai_") ||
    message.includes("records_feature_") ||
    message.includes("radar_care_actions")
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
    manual_prevent_level: row.manual_prevent_level ?? row.prevent_level ?? 0,
    action_tags: safeArray(row.action_tags),
    care_domains: safeArray(row.care_domains),
    manual_care_domains: safeArray(row.manual_care_domains),
    care_timing: row.care_timing || "",
    manual_care_timing: row.manual_care_timing || "",
    context_factors: safeArray(row.context_factors),
    forecast_snapshot: row.forecast_snapshot || null,
    record_version: Number(row.record_version || 1),
    note: row.note || "",
    created_at: row.created_at || null,
    updated_at: row.updated_at || row.created_at || null,
  };
}

function compactChannelMap(value) {
  if (!value || typeof value !== "object") return null;
  const next = {};
  WEATHER_CHANNEL_KEYS.forEach((key) => {
    const number = Number(value[key]);
    if (Number.isFinite(number)) next[key] = Math.round(number * 1000) / 1000;
  });
  return Object.keys(next).length ? next : null;
}

function compactWeatherGroups(value) {
  if (!value || typeof value !== "object") return null;
  const groups = {};
  ["pressure", "temperature", "moisture"].forEach((key) => {
    const item = value[key];
    if (!item || typeof item !== "object") return;
    groups[key] = {
      group: key,
      event_key: item.event_key || null,
      exact: item.exact || null,
      direction: item.direction || null,
      effective_load: finiteOrNull(item.effective_load),
      weather_strength: finiteOrNull(item.weather_strength),
      affinity_weight: finiteOrNull(item.affinity_weight),
    };
  });
  return Object.keys(groups).length ? groups : null;
}

function forecastReasonTrace(row, computedSnapshot) {
  if (row?.reason_trace && typeof row.reason_trace === "object") return row.reason_trace;
  if (computedSnapshot?.reason_trace && typeof computedSnapshot.reason_trace === "object") {
    return computedSnapshot.reason_trace;
  }
  const riskContext = row?.computed?.radar_plan_meta?.risk_context || {};
  const personalized = riskContext?.meta?.personalized_meta || {};
  const weatherMeta = riskContext?.meta?.weather_meta || {};
  const carePolicies = Array.isArray(riskContext?.care_tone?.policies)
    ? riskContext.care_tone.policies.slice(0, 3).map((item) => ({
        key: item?.key || null,
        label: item?.label || null,
        guide: item?.guide || null,
      }))
    : [];
  const trace = {
    forecast_model_version:
      personalized.forecast_model_version || riskContext?.meta?.forecast_model_version || null,
    weather_strengths: compactChannelMap(
      riskContext?.weather_context?.channel_strengths || personalized.weather_strengths
    ),
    weather_event_strengths: compactChannelMap(
      riskContext?.weather_context?.event_strengths || personalized.weather_strengths
    ),
    pressure_direction: riskContext?.weather_context?.pressure_direction || null,
    temperature_direction: riskContext?.weather_context?.temperature_direction || null,
    moisture_shift_strength: Number.isFinite(Number(riskContext?.weather_context?.moisture_shift_strength))
      ? Number(riskContext.weather_context.moisture_shift_strength)
      : null,
    moisture_direction: riskContext?.weather_context?.moisture_direction || null,
    personal_affinity_weights: compactChannelMap(personalized.exact_affinity_weights),
    core_weather_weights: compactChannelMap(personalized.core_weather_weights),
    affinity_sub_codes: safeArray(personalized.sub_codes).slice(0, 2),
    event_effective_loads: compactChannelMap(personalized.event_effective_loads),
    effective_weather_groups: compactWeatherGroups(personalized.effective_weather_groups),
    effective_channel_loads: compactChannelMap(personalized.effective_channel_loads),
    continuous_axes: personalized.continuous_axes || null,
    material_scores: personalized.material_scores || personalized.normalized_material_scores || null,
    manifestation: personalized.manifestation || null,
    reserve_scalar: Number.isFinite(Number(personalized.reserve_scalar))
      ? Number(personalized.reserve_scalar)
      : null,
    battery_tier: personalized.battery_tier || null,
    battery_scalar: Number.isFinite(Number(personalized.battery_scalar))
      ? Number(personalized.battery_scalar)
      : null,
    battery_scalar_applied: Number.isFinite(Number(personalized.battery_scalar_applied))
      ? Number(personalized.battery_scalar_applied)
      : null,
    forecast_model: personalized.forecast_model || null,
    score_trace: personalized.score_trace || null,
    care_policies: carePolicies,
    weather_logic_version: weatherMeta.extraction_version || null,
    review_feedback_applied: Boolean(personalized?.review_feedback?.applied),
  };
  return Object.values(trace).some((value) => value != null && value !== false && (!Array.isArray(value) || value.length))
    ? trace
    : null;
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
    reason_trace: forecastReasonTrace(row, computedSnapshot),
    logic_version: row.logic_version || computedSnapshot.logic_version || {
      forecast_context:
        row?.computed?.radar_plan_meta?.risk_context?.meta?.forecast_model_version ||
        "radar_v1_personalized_weather",
      weather: row?.computed?.radar_plan_meta?.risk_context?.meta?.weather_meta?.extraction_version || null,
    },
    displayed_care: row.displayed_care || computedSnapshot.displayed_care || null,
    snapshot_source: row.snapshot_source || source,
    captured_at: row.captured_at || null,
    created_at: row.created_at || null,
    updated_at: row.forecast_updated_at || row.updated_at || row.created_at || null,
  };
}

async function loadCarePlansByForecastIds(forecastIds) {
  const ids = Array.from(new Set((forecastIds || []).filter(Boolean)));
  if (!ids.length) return new Map();
  const chunks = [];
  for (let index = 0; index < ids.length; index += 100) chunks.push(ids.slice(index, index + 100));
  const results = await Promise.all(chunks.map((chunk) => supabaseServer
    .from("radar_care_plans")
    .select("forecast_id,night_tsubo_set,tomorrow_food_context,tomorrow_caution,night_note,night_tsubo_reason")
    .in("forecast_id", chunk)));
  const map = new Map();
  results.forEach((result) => {
    if (result.error) throw result.error;
    (result.data || []).forEach((row) => map.set(row.forecast_id, row));
  });
  return map;
}


async function loadCareActionRows(userId, start, end) {
  const result = await supabaseServer
    .from("radar_care_actions")
    .select("id,target_date,source_date,source_mode,domain,item_key,kind,label,detail,item_snapshot,timing_relation,checked_at,created_at,updated_at")
    .eq("user_id", userId)
    .gte("target_date", start)
    .lte("target_date", end)
    .order("target_date", { ascending: true })
    .order("checked_at", { ascending: true });
  if (result.error) {
    if (isMissingRecordsSchemaError(result.error)) return { rows: [], schemaReady: false };
    throw result.error;
  }
  return { rows: result.data || [], schemaReady: true };
}

export async function loadCareActionsForDate(userId, targetDate) {
  const result = await loadCareActionRows(userId, targetDate, targetDate);
  return {
    actions: dedupeCareActions(result.rows || []),
    schemaReady: result.schemaReady,
  };
}

function careActionsByDate(rows) {
  const map = new Map();
  (rows || []).forEach((row) => {
    const action = normalizeCareAction(row);
    if (!action?.target_date) return;
    if (!map.has(action.target_date)) map.set(action.target_date, []);
    map.get(action.target_date).push(action);
  });
  for (const [date, actions] of map.entries()) map.set(date, dedupeCareActions(actions));
  return map;
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

export async function loadRecordsRange(userId, start, end, { includeCarePlans = false } = {}) {
  if (!userId) throw new Error("userId is required");
  if (!isValidYmd(start) || !isValidYmd(end)) throw new Error("invalid start/end");
  const span = daysBetween(start, end);
  if (span < 1 || span > 370) throw new Error("range must be 1-370 days");

  const [forecastResult, reviewResult, careActionResult] = await Promise.all([
    supabaseServer
      .from("radar_forecasts")
      .select(FORECAST_SELECT)
      .eq("user_id", userId)
      .gte("target_date", start)
      .lte("target_date", end)
      .order("target_date", { ascending: true }),
    loadReviewRows(userId, start, end),
    loadCareActionRows(userId, start, end),
  ]);
  if (forecastResult.error) throw forecastResult.error;

  const forecastMap = latestByDate(forecastResult.data || []);
  const reviewMap = latestByDate(reviewResult.rows || []);
  const careActionMap = careActionsByDate(careActionResult.rows);
  const carePlanMap = includeCarePlans
    ? await loadCarePlansByForecastIds([
        ...(forecastResult.data || []).map((row) => row.id),
        ...(reviewResult.rows || []).map((row) => row?.forecast_snapshot?.forecast_id),
      ])
    : new Map();
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
      care_plan: includeCarePlans && forecast?.id ? carePlanMap.get(forecast.id) || null : null,
      care_actions: careActionMap.get(date) || [],
    });
  }

  return {
    start,
    end,
    rows,
    summary: buildRecordsSummary(rows),
    schema_ready: reviewResult.schemaReady,
    care_actions_schema_ready: careActionResult.schemaReady,
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
    env: {
      sensitivity: Number(computed?.env?.sensitivity ?? 0),
      vectors: safeArray(computed?.env?.vectors),
    },
    axes: computed?.axes && typeof computed.axes === "object"
      ? {
          yin_yang_label: computed.axes.yin_yang_label || null,
          drive_label: computed.axes.drive_label || null,
          yin_yang_score: finiteOrNull(computed.axes.yin_yang_score),
          drive_score: finiteOrNull(computed.axes.drive_score),
          obstruction_score: finiteOrNull(computed.axes.obstruction_score),
          thermo_answer: computed.axes.thermo_answer || null,
        }
      : null,
    split_scores: compactSplitScores(computed?.split_scores),
    engine_version: computed.engine_version || computed.version || null,
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
    for (const action of row?.care_actions || []) {
      if (action?.updated_at) stamps.push(action.updated_at);
      else if (action?.checked_at) stamps.push(action.checked_at);
    }
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
