import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const year = Number(url.searchParams.get("year"));
    const month = Number(url.searchParams.get("month"));

    if (!year || !month || month < 1 || month > 12) {
      return new Response(JSON.stringify({ error: "invalid year/month" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Bearer tokenでユーザー特定
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) {
      return new Response(JSON.stringify({ error: "missing bearer token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: userData, error: userErr } = await supabaseServer.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // date列で範囲指定（YYYY-MM-DD）
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDateObj = new Date(year, month, 0); // monthは1-based
    const endDate = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, "0")}-${String(
      endDateObj.getDate()
    ).padStart(2, "0")}`;

    // daily_checkins
    const { data: checkins, error: chkErr } = await supabaseServer
      .from("daily_checkins")
      .select("date, condition_am, condition_pm")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate);

    if (chkErr) throw chkErr;

    // daily_care_logs
    const { data: carelogs, error: careErr } = await supabaseServer
      .from("daily_care_logs")
      .select("date, kind, done_level")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate);

    if (careErr) throw careErr;

    // date => summary
    const map = new Map();

    // checkins（1日1行想定）
    for (const r of checkins || []) {
      const d = String(r.date);
      map.set(d, {
        date: d,
        main_done: false,
        food_done_level: null,
        condition_am: r.condition_am ?? null,
        condition_pm: r.condition_pm ?? null,
      });
    }

    // carelogs（同日複数あり得るので集約）
    for (const r of carelogs || []) {
      const d = String(r.date);
      const s =
        map.get(d) || {
          date: d,
          main_done: false,
          food_done_level: null,
          condition_am: null,
          condition_pm: null,
        };

      if (r.kind === "food") {
        const cur = s.food_done_level;
        const next = r.done_level;
        s.food_done_level = cur == null ? next : Math.max(cur, next); // ◎優先
      } else {
        if (r.done_level >= 2) s.main_done = true;
      }

      map.set(d, s);
    }

    const out = Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));

    return new Response(JSON.stringify({ data: out }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || "unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
