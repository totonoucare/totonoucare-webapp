import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getOptionalUser } from "@/lib/requireUser";
import { enforcePublicApiRateLimit } from "@/lib/publicApiRateLimit";
import { cleanV126Metric } from "@/lib/experienceFunnelV126Policy";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req) {
  const reply = (ok, status = 200) => NextResponse.json({ ok }, { status, headers: { "Cache-Control": "no-store" } });
  try {
    const limited = await enforcePublicApiRateLimit(req, { route: "experience_v126", limit: 120, windowSeconds: 60 });
    if (limited) return limited;
    const raw = await req.text(); if (raw.length > 1024) return reply(false, 413);
    const metric = cleanV126Metric(JSON.parse(raw)); if (!metric) return reply(false, 400);
    const { user } = await getOptionalUser(req);
    const deployment = new URL(req.url).hostname === "mibyo-radar.totonoucare.com" ? "production" : "preview";
    const saved = await supabaseServer.from("experience_funnel_v126").upsert({ ...metric, user_id: user?.id || null, deployment }, { onConflict: "event_id", ignoreDuplicates: true });
    return reply(!saved.error, saved.error ? 503 : 200);
  } catch { return reply(false, 400); }
}
