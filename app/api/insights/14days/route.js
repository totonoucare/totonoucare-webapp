import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";
import { jstDateString } from "@/lib/dateJST";

export const dynamic = "force-dynamic";
export const revalidate = 0;
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

function buildWeeklyComment(summary) {
  if (summary.recorded_days === 0) {
    return "まずは1日でも記録してみると、自分の崩れ方が見えやすくなります。";
  }

  if (summary.top_trigger_label && summary.hard_days >= 2) {
    return `今週は${summary.top_trigger_label}が重なった日に崩れやすい傾向がありました。`;
  }

  if (
    summary.strong_forecast_days > 0 &&
    summary.well_prevented_days >= Math.ceil(summary.strong_forecast_days / 2)
  ) {
    return "警戒日があっても、先回りできた日は軽く済みやすい週でした。";
  }

  if (summary.recorded_days >= 3 && summary.hard_days === 0) {
    return "今週は大きく崩れずに過ごせた日が多めでした。";
  }

  return "今週の記録から、崩れやすい日と耐えやすい日の差が少しずつ見えてきています。";
}

function buildNextTip(summary) {
  if (summary.top_trigger_label) {
    return `${summary.top_trigger_label}が強い日は、早めにケアを入れる意識が合いそうです。`;
  }
  if (summary.top_action_tags?.length) {
    return "続けやすかった対策から先に使うと、記録も続けやすくなります。";
  }
  return "まずはつらかった日だけでも記録すると、次の週次レポートが濃くなります。";
}

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const url = new URL(req.url);
    const days = Math.min(Math.max(Number(url.searchParams.get("days") || 7), 7), 28);

    const end = jstDateString(new Date());
    const start = addDays(end, -(days - 1));

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
    const topTrigger = mostFrequent(rows.map((row) => row.forecast?.main_trigger || null));
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
      stable_days: recordedRows.filter((row) => row.review?.condition_level === 2).length,
      well_prevented_days: recordedRows.filter((row) => row.review?.prevent_level === 2).length,
      strong_forecast_days: rows.filter((row) => (row.forecast?.signal ?? 0) >= 2).length,
      avg_score: avgScore,
      top_trigger: topTrigger,
      top_trigger_label: triggerLabel(topTrigger),
      top_action_tags: topActionTags,
    };

    summary.weekly_comment = buildWeeklyComment(summary);
    summary.next_tip = buildNextTip(summary);

    return NextResponse.json({ data: { start, end, days, rows, summary } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
