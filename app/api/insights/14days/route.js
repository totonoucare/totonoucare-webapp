import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";
import { jstDateString } from "@/lib/dateJST";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PREMIUM_PRODUCT = "radar_subscription";

function isPremiumActive(entitlement) {
  if (!entitlement) return false;

  const now = Date.now();
  const startsAt = entitlement.starts_at ? Date.parse(entitlement.starts_at) : null;
  const endsAt = entitlement.ends_at ? Date.parse(entitlement.ends_at) : null;

  if (Number.isFinite(startsAt) && startsAt > now) return false;
  if (Number.isFinite(endsAt) && endsAt < now) return false;

  return entitlement.status === "active";
}

async function hasRadarPremium(userId) {
  const { data, error } = await supabaseServer
    .from("entitlements")
    .select("status, starts_at, ends_at, created_at")
    .eq("user_id", userId)
    .eq("product", PREMIUM_PRODUCT)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).some(isPremiumActive);
}

export const runtime = "nodejs";

function addDays(ymd, delta) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function getPreviousClosedWeekRangeJst() {
  const today = jstDateString(new Date());
  const [y, m, d] = today.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay(); // 0=Sun ... 6=Sat

  const diffToCurrentMonday = day === 0 ? -6 : 1 - day;
  const currentMonday = addDays(today, diffToCurrentMonday);

  const start = addDays(currentMonday, -7); // previous Monday
  const end = addDays(currentMonday, -1); // previous Sunday

  return { start, end, days: 7 };
}

function mostFrequent(values) {
  const counts = new Map();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function topItems(values, limit = 3) {
  const counts = new Map();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

function triggerLabel(mainTrigger) {
  if (mainTrigger === "pressure") return "気圧";
  if (mainTrigger === "temp") return "気温";
  if (mainTrigger === "humidity") return "湿度";
  return null;
}

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const premium = await hasRadarPremium(user.id);
    if (!premium) {
      return NextResponse.json(
        { error: "プレミアム登録が必要です", code: "premium_required" },
        { status: 402 }
      );
    }

    const url = new URL(req.url);
    const weekStartParam = url.searchParams.get("week_start");

    let range;
    if (weekStartParam && /^\d{4}-\d{2}-\d{2}$/.test(weekStartParam)) {
      range = {
        start: weekStartParam,
        end: addDays(weekStartParam, 6),
        days: 7,
      };
    } else {
      range = getPreviousClosedWeekRangeJst();
    }

    const { start, end, days } = range;

    const [{ data: forecasts, error: forecastErr }, { data: reviews, error: reviewErr }] =
      await Promise.all([
        supabaseServer
          .from("radar_forecasts")
          .select("target_date, score_0_10, signal, main_trigger, trigger_dir, why_short")
          .eq("user_id", user.id)
          .gte("target_date", start)
          .lte("target_date", end),
        supabaseServer
          .from("radar_reviews")
          .select("target_date, condition_level, prevent_level, action_tags, note, created_at")
          .eq("user_id", user.id)
          .gte("target_date", start)
          .lte("target_date", end),
      ]);

    if (forecastErr) throw forecastErr;
    if (reviewErr) throw reviewErr;

    const forecastMap = new Map((forecasts || []).map((row) => [String(row.target_date), row]));
    const reviewMap = new Map();

    for (const row of reviews || []) {
      const date = String(row.target_date);
      const prev = reviewMap.get(date);
      if (!prev || String(row.created_at) > String(prev.created_at || "")) {
        reviewMap.set(date, row);
      }
    }

    const rows = [];
    for (let i = 0; i < days; i += 1) {
      const date = addDays(start, i);
      const forecast = forecastMap.get(date) || null;
      const review = reviewMap.get(date) || null;

      rows.push({
        date,
        forecast: forecast
          ? {
              score_0_10: forecast.score_0_10 ?? null,
              signal: forecast.signal ?? null,
              main_trigger: forecast.main_trigger || null,
              trigger_dir: forecast.trigger_dir || null,
              why_short: forecast.why_short || "",
            }
          : null,
        review: review
          ? {
              condition_level: review.condition_level ?? null,
              prevent_level: review.prevent_level ?? null,
              action_tags: review.action_tags || [],
              note: review.note || "",
            }
          : null,
      });
    }

    const recordedRows = rows.filter((row) => row.review);
    const scoredRows = rows.filter((row) => row.forecast?.score_0_10 != null);
    const badRows = recordedRows.filter(
      (row) => row.review?.condition_level === 0 || row.review?.condition_level === 1
    );

    const topTriggerOnBadDays = mostFrequent(
      badRows.map((row) => row.forecast?.main_trigger || null)
    );

    const topActionTags = topItems(
      recordedRows.flatMap((row) => row.review?.action_tags || []),
      3
    );

    const avgScore =
      scoredRows.length > 0
        ? scoredRows.reduce((sum, row) => sum + row.forecast.score_0_10, 0) / scoredRows.length
        : 0;

    const summary = {
      recorded_days: recordedRows.length,
      total_days: days,

      hard_days: recordedRows.filter((row) => row.review?.condition_level === 0).length,
      mild_bad_days: recordedRows.filter((row) => row.review?.condition_level === 1).length,
      good_days: recordedRows.filter((row) => row.review?.condition_level === 2).length,

      care_done_days: recordedRows.filter((row) => (row.review?.prevent_level ?? 0) >= 1).length,
      full_care_days: recordedRows.filter((row) => row.review?.prevent_level === 2).length,
      attention_forecast_days: rows.filter((row) => (row.forecast?.signal ?? 0) >= 1).length,

      avg_score: avgScore,

      top_trigger_on_bad_days: topTriggerOnBadDays,
      top_trigger_on_bad_days_label: triggerLabel(topTriggerOnBadDays),

      top_action_tags: topActionTags,
    };

    return NextResponse.json({ data: { start, end, days, rows, summary } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
