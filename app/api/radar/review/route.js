import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";
import { jstDateString } from "@/lib/dateJST";
import {
  addDaysYmd,
  buildActionTags,
  classifyRecord,
  forecastPatternKey,
  snapshotFromForecast,
} from "@/lib/records/analysis";
import { isMissingRecordsSchemaError, loadCareActionsForDate } from "@/lib/records/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const EXTENDED_SELECT = [
  "id",
  "user_id",
  "target_date",
  "condition_level",
  "prevent_level",
  "note",
  "action_tags",
  "care_domains",
  "care_timing",
  "context_factors",
  "forecast_snapshot",
  "record_version",
  "created_at",
  "updated_at",
].join(",");
const LEGACY_SELECT = "id,user_id,target_date,condition_level,prevent_level,note,action_tags,created_at";
const EDIT_LOOKBACK_DAYS = Math.max(1, Math.min(31, Number(process.env.RECORDS_EDIT_LOOKBACK_DAYS || 7)));
const DOMAIN_VALUES = new Set(["live", "eat", "loosen"]);
const TIMING_VALUES = new Set(["before_peak", "after_symptom", "mixed", "unknown"]);
const SAME_DAY_TIMING_VALUES = new Set(["same_day_before", "same_day_after", "same_day_mixed", "same_day_unknown"]);
const FACTOR_VALUES = new Set(["sleep_short", "busy", "food_alcohol", "mental_load", "body_change", "other", "none"]);

function normalizeDate(value) {
  const date = value || jstDateString(new Date());
  return /^\d{4}-\d{2}-\d{2}$/.test(String(date)) ? String(date) : "";
}

function safeList(value, allowed, limit) {
  return Array.from(new Set(
    (Array.isArray(value) ? value : [])
      .map((item) => String(item || "").trim())
      .filter((item) => allowed.has(item))
  )).slice(0, limit);
}

async function findLatestReview(userId, targetDate) {
  let result = await supabaseServer
    .from("radar_reviews")
    .select(EXTENDED_SELECT)
    .eq("user_id", userId)
    .eq("target_date", targetDate)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (!result.error) return { row: result.data?.[0] || null, schemaReady: true };
  if (!isMissingRecordsSchemaError(result.error)) throw result.error;

  result = await supabaseServer
    .from("radar_reviews")
    .select(LEGACY_SELECT)
    .eq("user_id", userId)
    .eq("target_date", targetDate)
    .order("created_at", { ascending: false })
    .limit(1);
  if (result.error) throw result.error;
  return { row: result.data?.[0] || null, schemaReady: false };
}

async function findForecast(userId, targetDate) {
  const { data, error } = await supabaseServer
    .from("radar_forecasts")
    .select("id,target_date,score_0_10,signal,main_trigger,trigger_dir,why_short,peak_start,peak_end,computed,created_at,updated_at")
    .eq("user_id", userId)
    .eq("target_date", targetDate)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] || null;
}

function responseReview(row) {
  if (!row) return null;
  return {
    ...row,
    care_domains: Array.isArray(row.care_domains) ? row.care_domains : [],
    care_timing: row.care_timing || "",
    context_factors: Array.isArray(row.context_factors) ? row.context_factors : [],
    updated_at: row.updated_at || row.created_at || null,
  };
}

function actionDomains(actions) {
  return Array.from(new Set((actions || []).map((item) => item?.domain).filter((item) => DOMAIN_VALUES.has(item))));
}

function deriveCareTiming(actions, submittedTiming = "") {
  const items = Array.isArray(actions) ? actions : [];
  if (!items.length) return TIMING_VALUES.has(submittedTiming) ? submittedTiming : "";
  const hasPreviousNight = items.some((item) => item?.source_mode === "tomorrow");
  const sameDay = items.filter((item) => item?.source_mode === "today");
  if (!sameDay.length) return hasPreviousNight ? "before_peak" : (TIMING_VALUES.has(submittedTiming) ? submittedTiming : "");
  const relations = new Set(sameDay.map((item) => item?.timing_relation || "same_day_unknown"));
  if (relations.has("same_day_unknown")) return "unknown";
  if (relations.has("same_day_mixed")) return "mixed";
  const hasBefore = relations.has("same_day_before") || hasPreviousNight;
  const hasAfter = relations.has("same_day_after");
  if (hasBefore && hasAfter) return "mixed";
  if (hasAfter) return "after_symptom";
  if (hasBefore) return "before_peak";
  return TIMING_VALUES.has(submittedTiming) ? submittedTiming : "unknown";
}

async function updateSameDayActionTiming(userId, targetDate, timingRelation) {
  if (!SAME_DAY_TIMING_VALUES.has(timingRelation)) return;
  const result = await supabaseServer
    .from("radar_care_actions")
    .update({ timing_relation: timingRelation })
    .eq("user_id", userId)
    .eq("target_date", targetDate)
    .eq("source_mode", "today");
  if (result.error && !isMissingRecordsSchemaError(result.error)) throw result.error;
}

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });
    const targetDate = normalizeDate(new URL(req.url).searchParams.get("date"));
    if (!targetDate) return NextResponse.json({ error: "date invalid" }, { status: 400 });

    const [reviewResult, currentForecast, careActionResult] = await Promise.all([
      findLatestReview(user.id, targetDate),
      findForecast(user.id, targetDate),
      loadCareActionsForDate(user.id, targetDate),
    ]);
    const review = responseReview(reviewResult.row);
    const forecast = review?.forecast_snapshot || (currentForecast ? snapshotFromForecast(currentForecast, "current_forecast") : null);
    return NextResponse.json({
      data: {
        date: targetDate,
        review,
        forecast,
        care_actions: careActionResult.actions,
        schema_ready: reviewResult.schemaReady,
        care_actions_schema_ready: careActionResult.schemaReady,
      },
    });
  } catch (error) {
    console.error("/api/radar/review GET error:", error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const targetDate = normalizeDate(body?.date);
    const conditionLevel = Number(body?.condition_level);
    const preventLevel = Number(body?.prevent_level);
    const today = jstDateString(new Date());
    const earliest = addDaysYmd(today, -(EDIT_LOOKBACK_DAYS - 1));

    if (!targetDate) return NextResponse.json({ error: "date invalid" }, { status: 400 });
    if (targetDate > today || targetDate < earliest) {
      return NextResponse.json(
        { error: `記録できるのは今日を含む直近${EDIT_LOOKBACK_DAYS}日です`, code: "record_date_out_of_range" },
        { status: 400 }
      );
    }
    if (![0, 1, 2].includes(conditionLevel)) {
      return NextResponse.json({ error: "condition_level invalid" }, { status: 400 });
    }
    if (![0, 1, 2].includes(preventLevel)) {
      return NextResponse.json({ error: "prevent_level invalid" }, { status: 400 });
    }

    const submittedDomains = preventLevel > 0 ? safeList(body?.care_domains, DOMAIN_VALUES, 3) : [];
    const submittedTiming = preventLevel > 0 && TIMING_VALUES.has(body?.care_timing) ? body.care_timing : "";
    const sameDayTiming = SAME_DAY_TIMING_VALUES.has(body?.same_day_timing) ? body.same_day_timing : "";
    let contextFactors = safeList(body?.context_factors, FACTOR_VALUES, 6);
    if (contextFactors.includes("none")) contextFactors = ["none"];

    const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) : "";
    if (sameDayTiming) await updateSameDayActionTiming(user.id, targetDate, sameDayTiming);
    const [existingResult, currentForecast, careActionResult] = await Promise.all([
      findLatestReview(user.id, targetDate),
      findForecast(user.id, targetDate),
      loadCareActionsForDate(user.id, targetDate),
    ]);
    const recordedActionDomains = actionDomains(careActionResult.actions);
    const effectivePreventLevel = careActionResult.actions.length > 0
      ? Math.max(1, preventLevel)
      : preventLevel;
    const careDomains = effectivePreventLevel > 0
      ? Array.from(new Set([...recordedActionDomains, ...submittedDomains])).slice(0, 3)
      : [];
    const careTiming = effectivePreventLevel > 0
      ? deriveCareTiming(careActionResult.actions, submittedTiming)
      : "";
    if (effectivePreventLevel > 0 && !careDomains.length) {
      return NextResponse.json({ error: "ケアをした場合は種類を選んでください" }, { status: 400 });
    }
    if (effectivePreventLevel > 0 && !careTiming) {
      return NextResponse.json({ error: "ケアをした時間を選んでください" }, { status: 400 });
    }
    const snapshot = existingResult.row?.forecast_snapshot
      || (currentForecast ? snapshotFromForecast(currentForecast, "record_save") : null);
    const preview = classifyRecord({
      date: targetDate,
      forecast: snapshot,
      care_actions: careActionResult.actions,
      review: { condition_level: conditionLevel, prevent_level: effectivePreventLevel },
    });
    if (forecastPatternKey({
      forecast: snapshot,
      review: { condition_level: conditionLevel, prevent_level: effectivePreventLevel },
    }) !== "stable_difficult") contextFactors = [];

    const actionTags = buildActionTags({
      domains: careDomains,
      timing: careTiming,
      factors: contextFactors,
      existing: existingResult.row?.action_tags,
    });
    const extendedPayload = {
      condition_level: conditionLevel,
      prevent_level: effectivePreventLevel,
      action_tags: actionTags,
      care_domains: careDomains,
      care_timing: careTiming || null,
      context_factors: contextFactors,
      note: note || null,
      record_version: 3,
      ...(existingResult.row?.forecast_snapshot || !snapshot ? {} : { forecast_snapshot: snapshot }),
    };
    const legacyPayload = {
      condition_level: conditionLevel,
      prevent_level: effectivePreventLevel,
      action_tags: actionTags,
      note: note || null,
    };

    async function write(payload, select) {
      if (existingResult.row?.id) {
        return supabaseServer
          .from("radar_reviews")
          .update(payload)
          .eq("id", existingResult.row.id)
          .eq("user_id", user.id)
          .select(select)
          .single();
      }
      return supabaseServer
        .from("radar_reviews")
        .insert({ user_id: user.id, target_date: targetDate, ...payload })
        .select(select)
        .single();
    }

    let written = await write(
      existingResult.schemaReady
        ? { ...extendedPayload, ...(!existingResult.row?.id && snapshot ? { forecast_snapshot: snapshot } : {}) }
        : legacyPayload,
      existingResult.schemaReady ? EXTENDED_SELECT : LEGACY_SELECT
    );
    let schemaReady = existingResult.schemaReady;
    if (written.error && isMissingRecordsSchemaError(written.error)) {
      written = await write(legacyPayload, LEGACY_SELECT);
      schemaReady = false;
    }
    if (written.error) throw written.error;

    if (schemaReady) {
      const { error: eventError } = await supabaseServer.from("records_feature_events").insert({
        user_id: user.id,
        event_type: "record_saved",
        metadata: { date: targetDate, comparison: preview.comparison, edited: Boolean(existingResult.row?.id) },
      });
      if (eventError) console.warn("record_saved metric skipped:", eventError.message);
    }

    const review = responseReview(written.data);
    return NextResponse.json({
      data: {
        date: targetDate,
        review,
        forecast: review?.forecast_snapshot || snapshot,
        care_actions: careActionResult.actions,
        schema_ready: schemaReady,
        care_actions_schema_ready: careActionResult.schemaReady,
      },
    });
  } catch (error) {
    console.error("/api/radar/review POST error:", error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
