import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function jstDateString(date = new Date()) {
  // JST(UTC+9) 기준 YYYY-MM-DD
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(ymd, delta) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return jstDateString(new Date(dt.getTime() - 9 * 60 * 60 * 1000)); // back to local date basis
}

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const url = new URL(req.url);
    const days = Math.min(Math.max(Number(url.searchParams.get("days") || 14), 7), 31);

    const end = jstDateString(new Date());
    const start = addDays(end, -(days - 1));

    // 1) daily_radar
    const { data: radars, error: rErr } = await supabaseServer
      .from("daily_radar")
      .select("date, level, top_sixin, reason_text")
      .eq("user_id", user.id)
      .gte("date", start)
      .lte("date", end);
    if (rErr) throw rErr;

    // 2) daily_checkins
    const { data: checkins, error: cErr } = await supabaseServer
      .from("daily_checkins")
      .select("date, condition_am, condition_pm")
      .eq("user_id", user.id)
      .gte("date", start)
      .lte("date", end);
    if (cErr) throw cErr;

    // 3) daily_care_logs
    const { data: carelogs, error: lErr } = await supabaseServer
      .from("daily_care_logs")
      .select("date, kind, done_level")
      .eq("user_id", user.id)
      .gte("date", start)
      .lte("date", end);
    if (lErr) throw lErr;

    // 4) daily_external_factors（ある範囲で取れるだけ）
    const { data: ext, error: eErr } = await supabaseServer
      .from("daily_external_factors")
      .select("date, d_pressure_24h, temp, humidity, top_sixin")
      .eq("user_id", user.id)
      .gte("date", start)
      .lte("date", end);
    if (eErr) throw eErr;

    const radarMap = new Map((radars || []).map((x) => [String(x.date), x]));
    const checkinMap = new Map((checkins || []).map((x) => [String(x.date), x]));
    const extMap = new Map((ext || []).map((x) => [String(x.date), x]));

    // carelogsは集約：main_done / food_level(max)
    const careMap = new Map();
    for (const r of carelogs || []) {
      const d = String(r.date);
      const s = careMap.get(d) || { main_done: false, food_level: null };
      if (r.kind === "food") {
        s.food_level = s.food_level == null ? r.done_level : Math.max(s.food_level, r.done_level);
      } else {
        if (r.done_level >= 2) s.main_done = true;
      }
      careMap.set(d, s);
    }

    // 日付を埋める
    const rows = [];
    for (let i = 0; i < days; i++) {
      const date = addDays(start, i);
      const radar = radarMap.get(date) || null;
      const checkin = checkinMap.get(date) || null;
      const care = careMap.get(date) || { main_done: false, food_level: null };
      const external = extMap.get(date) || null;

      rows.push({
        date,
        radar: radar
          ? {
              level: radar.level,
              top_sixin: radar.top_sixin || [],
              reason_text: radar.reason_text || "",
            }
          : null,
        external: external
          ? {
              d_pressure_24h: external.d_pressure_24h ?? null,
              temp: external.temp ?? null,
              humidity: external.humidity ?? null,
              top_sixin: external.top_sixin || [],
            }
          : null,
        checkin: checkin
          ? {
              condition_am: checkin.condition_am ?? null,
              condition_pm: checkin.condition_pm ?? null,
            }
          : { condition_am: null, condition_pm: null },
        care,
      });
    }

    return NextResponse.json({ data: { start, end, days, rows } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
