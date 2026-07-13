import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireUser";
import { supabaseServer } from "@/lib/supabaseServer";
import { jstDateString } from "@/lib/dateJST";
import { addDaysYmd } from "@/lib/records/analysis";
import { isMissingRecordsSchemaError } from "@/lib/records/server";
import { normalizeCareAction } from "@/lib/radar_v1/careActionItems";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DOMAIN_VALUES = new Set(["live", "eat", "loosen"]);
const SOURCE_MODE_VALUES = new Set(["today", "tomorrow"]);
const SAME_DAY_TIMING_VALUES = new Set([
  "same_day_before",
  "same_day_after",
  "same_day_mixed",
  "same_day_unknown",
]);
const SELECT = [
  "id",
  "user_id",
  "target_date",
  "source_date",
  "source_mode",
  "domain",
  "item_key",
  "kind",
  "label",
  "detail",
  "item_snapshot",
  "timing_relation",
  "checked_at",
  "created_at",
  "updated_at",
].join(",");

function normalizeDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value) : "";
}

function compact(value, limit) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, limit);
}

function cleanSnapshot(value, fallback) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const meta = input.meta && typeof input.meta === "object" && !Array.isArray(input.meta)
    ? input.meta
    : {};
  return {
    version: 1,
    label: compact(input.label || fallback.label, 160),
    detail: compact(input.detail || fallback.detail, 240),
    kind: compact(input.kind || fallback.kind, 50),
    domain: fallback.domain,
    source_mode: fallback.sourceMode,
    meta: {
      plan_title: compact(meta.plan_title, 100) || null,
      card_key: compact(meta.card_key, 40) || null,
      card_label: compact(meta.card_label, 120) || null,
      point_code: compact(meta.point_code, 30) || null,
      point_name: compact(meta.point_name, 80) || null,
      reading: compact(meta.reading, 50) || null,
      order: Number.isFinite(Number(meta.order)) ? Number(meta.order) : null,
      items: (Array.isArray(meta.items) ? meta.items : [])
        .map((item) => compact(item, 120))
        .filter(Boolean)
        .slice(0, 8),
      forecast_id: compact(meta.forecast_id, 80) || null,
      forecast_signal: Number.isFinite(Number(meta.forecast_signal)) ? Number(meta.forecast_signal) : null,
      forecast_score: Number.isFinite(Number(meta.forecast_score)) ? Number(meta.forecast_score) : null,
      primary_trigger: compact(meta.primary_trigger, 40) || null,
      care_plan_id: compact(meta.care_plan_id, 80) || null,
      care_logic_version: compact(meta.care_logic_version, 80) || null,
    },
  };
}

function allowedTargetDate(targetDate, sourceMode) {
  const today = jstDateString(new Date());
  const tomorrow = addDaysYmd(today, 1);
  return sourceMode === "today" ? targetDate === today : targetDate === tomorrow;
}

async function listActions(userId, targetDate) {
  const result = await supabaseServer
    .from("radar_care_actions")
    .select(SELECT)
    .eq("user_id", userId)
    .eq("target_date", targetDate)
    .order("source_mode", { ascending: false })
    .order("checked_at", { ascending: true });
  if (result.error) {
    if (isMissingRecordsSchemaError(result.error)) return { actions: [], schemaReady: false };
    throw result.error;
  }
  return {
    actions: (result.data || []).map(normalizeCareAction).filter(Boolean),
    schemaReady: true,
  };
}

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });
    const targetDate = normalizeDate(new URL(req.url).searchParams.get("date"));
    if (!targetDate) return NextResponse.json({ error: "date invalid" }, { status: 400 });
    const result = await listActions(user.id, targetDate);
    return NextResponse.json({ data: { date: targetDate, actions: result.actions, schema_ready: result.schemaReady } });
  } catch (error) {
    console.error("/api/radar/care-actions GET error:", error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const targetDate = normalizeDate(body?.target_date);
    const sourceMode = SOURCE_MODE_VALUES.has(body?.source_mode) ? body.source_mode : "";
    const domain = DOMAIN_VALUES.has(body?.domain) ? body.domain : "";
    const itemKey = compact(body?.item_key, 120);
    const kind = compact(body?.kind, 50);
    const label = compact(body?.label, 160);
    const detail = compact(body?.detail, 240);
    const checked = body?.checked !== false;

    if (!targetDate || !sourceMode || !domain || itemKey.length < 3 || !label) {
      return NextResponse.json({ error: "care action invalid" }, { status: 400 });
    }
    if (!allowedTargetDate(targetDate, sourceMode)) {
      return NextResponse.json({ error: "このカードのケアは今日または明日の対象日にだけ記録できます" }, { status: 400 });
    }

    if (!checked) {
      const removed = await supabaseServer
        .from("radar_care_actions")
        .delete()
        .eq("user_id", user.id)
        .eq("target_date", targetDate)
        .eq("source_mode", sourceMode)
        .eq("item_key", itemKey);
      if (removed.error) {
        if (isMissingRecordsSchemaError(removed.error)) {
          return NextResponse.json({ error: "ケア記録用DBが未適用です", code: "care_actions_schema_required" }, { status: 503 });
        }
        throw removed.error;
      }
    } else {
      const sourceDate = jstDateString(new Date());
      const snapshot = cleanSnapshot(body?.item_snapshot, { label, detail, kind, domain, sourceMode });
      const timingRelation = sourceMode === "tomorrow" ? "previous_night" : "same_day_unknown";
      const written = await supabaseServer
        .from("radar_care_actions")
        .upsert({
          user_id: user.id,
          target_date: targetDate,
          source_date: sourceDate,
          source_mode: sourceMode,
          domain,
          item_key: itemKey,
          kind: kind || null,
          label,
          detail: detail || null,
          item_snapshot: snapshot,
          timing_relation: timingRelation,
          checked_at: new Date().toISOString(),
        }, { onConflict: "user_id,target_date,source_mode,item_key" });
      if (written.error) {
        if (isMissingRecordsSchemaError(written.error)) {
          return NextResponse.json({ error: "ケア記録用DBが未適用です", code: "care_actions_schema_required" }, { status: 503 });
        }
        throw written.error;
      }
    }

    const result = await listActions(user.id, targetDate);
    return NextResponse.json({ data: { date: targetDate, actions: result.actions, schema_ready: result.schemaReady } });
  } catch (error) {
    console.error("/api/radar/care-actions POST error:", error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const targetDate = normalizeDate(body?.target_date);
    const timingRelation = SAME_DAY_TIMING_VALUES.has(body?.timing_relation)
      ? body.timing_relation
      : "";
    if (!targetDate || !timingRelation) {
      return NextResponse.json({ error: "timing invalid" }, { status: 400 });
    }

    const updated = await supabaseServer
      .from("radar_care_actions")
      .update({ timing_relation: timingRelation })
      .eq("user_id", user.id)
      .eq("target_date", targetDate)
      .eq("source_mode", "today");
    if (updated.error) {
      if (isMissingRecordsSchemaError(updated.error)) {
        return NextResponse.json({ error: "ケア記録用DBが未適用です", code: "care_actions_schema_required" }, { status: 503 });
      }
      throw updated.error;
    }

    const result = await listActions(user.id, targetDate);
    return NextResponse.json({ data: { date: targetDate, actions: result.actions, schema_ready: result.schemaReady } });
  } catch (error) {
    console.error("/api/radar/care-actions PATCH error:", error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
