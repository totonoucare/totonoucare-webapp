import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const url = new URL(req.url);
    const year = Number(url.searchParams.get("year"));
    const month = Number(url.searchParams.get("month"));

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json({ error: "invalid year/month" }, { status: 400 });
    }

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDateObj = new Date(year, month, 0);
    const endDate = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, "0")}-${String(
      endDateObj.getDate()
    ).padStart(2, "0")}`;

    const [{ data: reviews, error: reviewErr }, { data: forecasts, error: forecastErr }] =
      await Promise.all([
        supabaseServer
          .from("radar_reviews")
          .select("target_date, condition_level, prevent_level, note, action_tags, created_at")
          .eq("user_id", user.id)
          .gte("target_date", startDate)
          .lte("target_date", endDate),
        supabaseServer
          .from("radar_forecasts")
          .select("target_date, score_0_10, signal, main_trigger, trigger_dir, why_short")
          .eq("user_id", user.id)
          .gte("target_date", startDate)
          .lte("target_date", endDate),
      ]);

    if (reviewErr) throw reviewErr;
    if (forecastErr) throw forecastErr;

    const map = new Map();

    for (const row of forecasts || []) {
      const date = String(row.target_date);
      const base = map.get(date) || { date, review: null, forecast: null };
      base.forecast = {
        score_0_10: row.score_0_10 ?? null,
        signal: row.signal ?? null,
        main_trigger: row.main_trigger || null,
        trigger_dir: row.trigger_dir || null,
        why_short: row.why_short || "",
      };
      map.set(date, base);
    }

    for (const row of reviews || []) {
      const date = String(row.target_date);
      const base = map.get(date) || { date, review: null, forecast: null };
      if (!base.review || String(row.created_at) > String(base.review.created_at || "")) {
        base.review = {
          condition_level: row.condition_level ?? null,
          prevent_level: row.prevent_level ?? null,
          note: row.note || "",
          action_tags: row.action_tags || [],
          created_at: row.created_at,
        };
      }
      map.set(date, base);
    }

    const data = Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
    return NextResponse.json({ data });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "unknown error" }, { status: 500 });
  }
}
