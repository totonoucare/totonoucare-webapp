import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireUser";
import { supabaseServer } from "@/lib/supabaseServer";
import { jstDateString } from "@/lib/dateJST";
import { addDaysYmd, buildActionTags } from "@/lib/records/analysis";
import { isMissingRecordsSchemaError } from "@/lib/records/server";
import {
  buildCareActionKey,
  canonicalCareActionKey,
  normalizeCareAction,
} from "@/lib/radar_v1/careActionItems";

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
const RECORD_TIMING_VALUES = new Set(["before_peak", "after_symptom", "mixed", "unknown"]);
const EDIT_LOOKBACK_DAYS = Math.max(1, Math.min(31, Number(process.env.RECORDS_EDIT_LOOKBACK_DAYS || 7)));
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
const REVIEW_SYNC_SELECT = [
  "id",
  "prevent_level",
  "care_domains",
  "care_timing",
  "manual_prevent_level",
  "manual_care_domains",
  "manual_care_timing",
  "action_tags",
  "context_factors",
  "record_version",
].join(",");

function normalizeDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value) : "";
}

function compact(value, limit) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, limit);
}

function withinEditWindow(targetDate) {
  const today = jstDateString(new Date());
  const earliest = addDaysYmd(today, -(EDIT_LOOKBACK_DAYS - 1));
  return targetDate >= earliest && targetDate <= today;
}

function cleanSnapshot(value, fallback) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const meta = input.meta && typeof input.meta === "object" && !Array.isArray(input.meta)
    ? input.meta
    : {};
  return {
    version: 3,
    identity_version: 3,
    canonical_key: fallback.canonicalKey,
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
      rule_id: compact(meta.rule_id, 80) || null,
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
      entry_origin: compact(meta.entry_origin || fallback.entryOrigin, 40) || null,
    },
  };
}

function allowedCardTargetDate(targetDate, sourceMode) {
  const today = jstDateString(new Date());
  const tomorrow = addDaysYmd(today, 1);
  return sourceMode === "today" ? targetDate === today : targetDate === tomorrow;
}

async function loadRawActions(userId, targetDate) {
  const result = await supabaseServer
    .from("radar_care_actions")
    .select(SELECT)
    .eq("user_id", userId)
    .eq("target_date", targetDate)
    .order("source_mode", { ascending: false })
    .order("checked_at", { ascending: true });
  if (result.error) {
    if (isMissingRecordsSchemaError(result.error)) return { rows: [], schemaReady: false };
    throw result.error;
  }
  return { rows: result.data || [], schemaReady: true };
}

async function listActions(userId, targetDate) {
  const result = await loadRawActions(userId, targetDate);
  return {
    actions: result.rows.map(normalizeCareAction).filter(Boolean),
    schemaReady: result.schemaReady,
    rows: result.rows,
  };
}

function structuredTiming(actions) {
  const items = Array.isArray(actions) ? actions : [];
  if (!items.length) return "";
  const hasPreviousNight = items.some((item) => item.source_mode === "tomorrow");
  const sameDay = items.filter((item) => item.source_mode === "today");
  if (!sameDay.length) return hasPreviousNight ? "before_peak" : "";
  const relations = new Set(sameDay.map((item) => item.timing_relation || "same_day_unknown"));
  if (relations.has("same_day_unknown")) return "unknown";
  if (relations.has("same_day_mixed")) return "mixed";
  const hasBefore = hasPreviousNight || relations.has("same_day_before");
  const hasAfter = relations.has("same_day_after");
  if (hasBefore && hasAfter) return "mixed";
  if (hasAfter) return "after_symptom";
  if (hasBefore) return "before_peak";
  return "unknown";
}

function combineTiming(manualTiming, actionTiming, manualLevel) {
  const manual = manualLevel > 0 && RECORD_TIMING_VALUES.has(manualTiming) ? manualTiming : "";
  if (!manual) return actionTiming || "";
  if (!actionTiming) return manual;
  if (manual === actionTiming) return manual;
  if (manual === "unknown" || actionTiming === "unknown") return "unknown";
  if (manual === "mixed" || actionTiming === "mixed") return "mixed";
  return "mixed";
}

async function syncReviewCareAggregate(userId, targetDate, actions) {
  const reviewResult = await supabaseServer
    .from("radar_reviews")
    .select(REVIEW_SYNC_SELECT)
    .eq("user_id", userId)
    .eq("target_date", targetDate)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (reviewResult.error) {
    if (isMissingRecordsSchemaError(reviewResult.error)) return { schemaReady: false, review: null };
    throw reviewResult.error;
  }
  const review = reviewResult.data?.[0];
  if (!review) return { schemaReady: true, review: null };

  const manualLevel = Number(review.manual_prevent_level || 0);
  const manualDomains = manualLevel > 0 && Array.isArray(review.manual_care_domains)
    ? review.manual_care_domains.filter((item) => DOMAIN_VALUES.has(item))
    : [];
  const actionDomains = Array.from(new Set(actions.map((item) => item.domain).filter((item) => DOMAIN_VALUES.has(item))));
  const aggregateLevel = actions.length ? Math.max(1, manualLevel) : manualLevel;
  const aggregateDomains = aggregateLevel > 0
    ? Array.from(new Set([...manualDomains, ...actionDomains])).slice(0, 3)
    : [];
  const aggregateTiming = aggregateLevel > 0
    ? combineTiming(review.manual_care_timing, structuredTiming(actions), manualLevel)
    : "";
  const actionTags = buildActionTags({
    domains: aggregateDomains,
    timing: aggregateTiming,
    factors: Array.isArray(review.context_factors) ? review.context_factors : [],
    existing: review.action_tags,
  });
  const update = await supabaseServer
    .from("radar_reviews")
    .update({
      prevent_level: aggregateLevel,
      care_domains: aggregateDomains,
      care_timing: aggregateTiming || null,
      action_tags: actionTags,
      record_version: Math.max(4, Number(review.record_version || 1)),
    })
    .eq("id", review.id)
    .eq("user_id", userId)
    .select(REVIEW_SYNC_SELECT)
    .single();
  if (update.error) throw update.error;
  return { schemaReady: true, review: update.data };
}

async function deleteCanonicalMatches(userId, targetDate, sourceMode, canonicalKey) {
  const loaded = await loadRawActions(userId, targetDate);
  if (!loaded.schemaReady) return { schemaReady: false, deleted: 0 };
  const ids = loaded.rows
    .filter((row) => row.source_mode === sourceMode && canonicalCareActionKey(row) === canonicalKey)
    .map((row) => row.id)
    .filter(Boolean);
  if (!ids.length) return { schemaReady: true, deleted: 0 };
  const removed = await supabaseServer
    .from("radar_care_actions")
    .delete()
    .eq("user_id", userId)
    .in("id", ids);
  if (removed.error) throw removed.error;
  return { schemaReady: true, deleted: ids.length };
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
    const kind = compact(body?.kind, 50);
    const label = compact(body?.label, 160);
    const detail = compact(body?.detail, 240);
    const checked = body?.checked !== false;
    const entryOrigin = body?.entry_origin === "record_page" ? "record_page" : "daily_care_card";
    const isRecordPageEntry = entryOrigin === "record_page";

    if (!targetDate || !sourceMode || !domain || !label) {
      return NextResponse.json({ error: "care action invalid" }, { status: 400 });
    }
    if (isRecordPageEntry) {
      if (sourceMode !== "today" || !withinEditWindow(targetDate)) {
        return NextResponse.json({ error: `具体的ケアを修正できるのは直近${EDIT_LOOKBACK_DAYS}日です` }, { status: 400 });
      }
    } else if (!allowedCardTargetDate(targetDate, sourceMode)) {
      return NextResponse.json({ error: "このカードのケアは今日または明日の対象日にだけ記録できます" }, { status: 400 });
    }

    const canonicalKey = canonicalCareActionKey({
      canonical_key: body?.canonical_key,
      item_key: body?.item_key,
      domain,
      kind: kind || (isRecordPageEntry ? "manual_care" : "item"),
      label,
      detail,
      item_snapshot: body?.item_snapshot,
    }) || buildCareActionKey({
      domain,
      kind: kind || (isRecordPageEntry ? "manual_care" : "item"),
      identity: `${label}|${detail}`,
    });

    if (!checked) {
      const removed = await deleteCanonicalMatches(user.id, targetDate, sourceMode, canonicalKey);
      if (!removed.schemaReady) {
        return NextResponse.json({ error: "ケア記録用DBが未適用です", code: "care_actions_schema_required" }, { status: 503 });
      }
    } else {
      const sourceDate = isRecordPageEntry ? targetDate : jstDateString(new Date());
      const timingRelation = sourceMode === "tomorrow"
        ? "previous_night"
        : SAME_DAY_TIMING_VALUES.has(body?.timing_relation)
          ? body.timing_relation
          : "same_day_unknown";
      const snapshot = cleanSnapshot(body?.item_snapshot, {
        label,
        detail,
        kind: kind || (isRecordPageEntry ? "manual_care" : "item"),
        domain,
        sourceMode,
        canonicalKey,
        entryOrigin,
      });

      // v7.71の表示順入り旧キーが残っていても、同じ意味のケアは1行へ統合する。
      const removed = await deleteCanonicalMatches(user.id, targetDate, sourceMode, canonicalKey);
      if (!removed.schemaReady) {
        return NextResponse.json({ error: "ケア記録用DBが未適用です", code: "care_actions_schema_required" }, { status: 503 });
      }
      const written = await supabaseServer
        .from("radar_care_actions")
        .upsert({
          user_id: user.id,
          target_date: targetDate,
          source_date: sourceDate,
          source_mode: sourceMode,
          domain,
          item_key: canonicalKey,
          kind: kind || (isRecordPageEntry ? "manual_care" : null),
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
    const sync = await syncReviewCareAggregate(user.id, targetDate, result.actions);
    return NextResponse.json({
      data: {
        date: targetDate,
        actions: result.actions,
        schema_ready: result.schemaReady,
        integrity_schema_ready: sync.schemaReady,
      },
    });
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
    if (!targetDate || !timingRelation || !withinEditWindow(targetDate)) {
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
    const sync = await syncReviewCareAggregate(user.id, targetDate, result.actions);
    return NextResponse.json({
      data: {
        date: targetDate,
        actions: result.actions,
        schema_ready: result.schemaReady,
        integrity_schema_ready: sync.schemaReady,
      },
    });
  } catch (error) {
    console.error("/api/radar/care-actions PATCH error:", error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const targetDate = normalizeDate(body?.target_date);
    const actionId = compact(body?.id, 80);
    if (!targetDate || !actionId || !withinEditWindow(targetDate)) {
      return NextResponse.json({ error: `具体的ケアを修正できるのは直近${EDIT_LOOKBACK_DAYS}日です` }, { status: 400 });
    }
    const loaded = await loadRawActions(user.id, targetDate);
    if (!loaded.schemaReady) {
      return NextResponse.json({ error: "ケア記録用DBが未適用です", code: "care_actions_schema_required" }, { status: 503 });
    }
    const selected = loaded.rows.find((row) => row.id === actionId);
    if (selected) {
      const canonicalKey = canonicalCareActionKey(selected);
      await deleteCanonicalMatches(user.id, targetDate, selected.source_mode, canonicalKey);
    } else {
      const removed = await supabaseServer
        .from("radar_care_actions")
        .delete()
        .eq("id", actionId)
        .eq("user_id", user.id)
        .eq("target_date", targetDate);
      if (removed.error) throw removed.error;
    }
    const result = await listActions(user.id, targetDate);
    const sync = await syncReviewCareAggregate(user.id, targetDate, result.actions);
    return NextResponse.json({
      data: {
        date: targetDate,
        actions: result.actions,
        schema_ready: result.schemaReady,
        integrity_schema_ready: sync.schemaReady,
      },
    });
  } catch (error) {
    console.error("/api/radar/care-actions DELETE error:", error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
