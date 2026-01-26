import { createClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

function ymd(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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

    const supabase = createClient();

    // Bearer tokenでユーザー特定（既存APIと同じ前提）
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) {
      return new Response(JSON.stringify({ error: "missing bearer token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // 月の範囲（UTCで扱う簡易版）
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));

    // carelogs: created_at を日付に丸めて集計
    const { data: carelogs, error: careErr } = await supabase
      .from("carelogs")
      .select("created_at, kind, done_level")
      .eq("user_id", userId)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());

    if (careErr) throw careErr;

    // checkins: date（または created_at）で集計
    const { data: checkins, error: chkErr } = await supabase
      .from("checkins")
      .select("date, created_at, condition_am, condition_pm")
      .eq("user_id", userId)
      .or(`date.gte.${ymd(start)},date.lte.${ymd(end)}`);

    // checkins側が date列を持っていない場合があるので、失敗しても続行できるようにする
    const checkinRows = chkErr ? [] : (checkins || []);

    // date => summary
    const map = new Map();

    for (const r of carelogs || []) {
      const d = ymd(new Date(r.created_at));
      const s = map.get(d) || { date: d, main_done: false, food_done_level: null, condition_am: null, condition_pm: null };
      if (r.kind !== "food" && r.done_level >= 2) s.main_done = true;
      if (r.kind === "food") s.food_done_level = r.done_level;
      map.set(d, s);
    }

    for (const r of checkinRows) {
      const d = r.date ? String(r.date) : ymd(new Date(r.created_at));
      const s = map.get(d) || { date: d, main_done: false, food_done_level: null, condition_am: null, condition_pm: null };
      if (r.condition_am != null) s.condition_am = r.condition_am;
      if (r.condition_pm != null) s.condition_pm = r.condition_pm;
      map.set(d, s);
    }

    // 配列化して日付順
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
