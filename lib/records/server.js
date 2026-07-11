import { supabaseServer } from "@/lib/supabaseServer";
import { addDaysYmd, buildRecordsSummary } from "@/lib/records/analysis";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidYmd(value) {
  return DATE_RE.test(String(value || ""));
}

export function daysBetween(start, end) {
  if (!isValidYmd(start) || !isValidYmd(end)) return Infinity;
  const a = Date.parse(`${start}T00:00:00Z`);
  const b = Date.parse(`${end}T00:00:00Z`);
  return Math.floor((b - a) / 86400000) + 1;
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

export async function loadRecordsRange(userId, start, end) {
  if (!userId) throw new Error("userId is required");
  if (!isValidYmd(start) || !isValidYmd(end)) throw new Error("invalid start/end");
  const span = daysBetween(start, end);
  if (span < 1 || span > 370) throw new Error("range must be 1-370 days");

  const [
    { data: forecasts, error: forecastError },
    { data: reviews, error: reviewError },
  ] = await Promise.all([
    supabaseServer
      .from("radar_forecasts")
      .select("target_date, score_0_10, signal, main_trigger, trigger_dir, why_short, created_at")
      .eq("user_id", userId)
      .gte("target_date", start)
      .lte("target_date", end)
      .order("target_date", { ascending: true }),
    supabaseServer
      .from("radar_reviews")
      .select("id, target_date, condition_level, prevent_level, action_tags, note, created_at")
      .eq("user_id", userId)
      .gte("target_date", start)
      .lte("target_date", end)
      .order("target_date", { ascending: true }),
  ]);

  if (forecastError) throw forecastError;
  if (reviewError) throw reviewError;

  const forecastMap = latestByDate(forecasts || []);
  const reviewMap = latestByDate(reviews || []);
  const rows = [];
  for (let index = 0; index < span; index += 1) {
    const date = addDaysYmd(start, index);
    const forecast = forecastMap.get(date);
    const review = reviewMap.get(date);
    rows.push({
      date,
      forecast: forecast
        ? {
            score_0_10: forecast.score_0_10 ?? null,
            signal: forecast.signal ?? null,
            main_trigger: forecast.main_trigger || null,
            trigger_dir: forecast.trigger_dir || null,
            why_short: forecast.why_short || "",
            created_at: forecast.created_at || null,
          }
        : null,
      review: review
        ? {
            id: review.id,
            condition_level: review.condition_level ?? null,
            prevent_level: review.prevent_level ?? null,
            action_tags: Array.isArray(review.action_tags) ? review.action_tags : [],
            note: review.note || "",
            created_at: review.created_at || null,
          }
        : null,
    });
  }

  return {
    start,
    end,
    rows,
    summary: buildRecordsSummary(rows),
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
    sub_labels: Array.isArray(profile.sub_labels)
      ? profile.sub_labels
      : Array.isArray(computed.sub_labels)
        ? computed.sub_labels
        : [],
    primary_meridian: profile.primary_meridian || computed.primary_meridian || null,
    secondary_meridian: profile.secondary_meridian || computed.secondary_meridian || null,
    symptom_focus:
      profile.active_symptom_focus ||
      profile.symptom_focus ||
      computed.symptom_focus ||
      null,
    updated_at: profile.updated_at || null,
  };
}

export function latestSourceAt(bundle, profile) {
  const stamps = [];
  for (const row of bundle?.rows || []) {
    if (row?.forecast?.updated_at) stamps.push(row.forecast.updated_at);
    if (row?.forecast?.created_at) stamps.push(row.forecast.created_at);
    if (row?.review?.created_at) stamps.push(row.review.created_at);
  }
  if (profile?.updated_at) stamps.push(profile.updated_at);
  return stamps.sort().at(-1) || null;
}
