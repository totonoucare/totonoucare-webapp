import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireUser";
import { supabaseServer } from "@/lib/supabaseServer";
import { sanitizeJourneyEvent, JOURNEY_MAX_DAILY_EVENTS } from "@/lib/journeyEvents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(req) {
  try {
    const { user } = await requireUser(req);
    if (!user) return reply({ ok: false }, 401);
    const raw = await req.text();
    if (raw.length > 1024) return reply({ ok: false }, 400);
    let body;
    try { body = JSON.parse(raw); } catch { return reply({ ok: false }, 400); }
    const clean = sanitizeJourneyEvent(body);
    if (!clean) return reply({ ok: false }, 400);
    const since = new Date(Date.now() - 86400000).toISOString();
    const count = await supabaseServer.from("app_experience_events")
      .select("event_key", { count: "exact", head: true }).eq("user_id", user.id)
      .like("event_key", "journey:%").gte("created_at", since);
    if (count.error) return reply({ ok: false }, 503);
    if (count.count >= JOURNEY_MAX_DAILY_EVENTS) return reply({ ok: false }, 429);
    const { error } = await supabaseServer.from("app_experience_events").upsert({
      user_id: user.id,
      event_key: `journey:${clean.event}:${clean.event_id}`,
      payload: clean.payload,
    }, { onConflict: "user_id,event_key", ignoreDuplicates: true });
    return error ? reply({ ok: false }, 503) : reply({ ok: true });
  } catch { return reply({ ok: false }, 503); }
}
