import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireUser";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const EVENT_TYPES = new Set([
  "records_page_view",
  "analysis_opened",
  "analysis_period_selected",
]);

function safeMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 12)
      .map(([key, item]) => [String(key).slice(0, 40), String(item ?? "").slice(0, 160)])
  );
}

export async function POST(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const eventType = String(body?.event_type || "");
    if (!EVENT_TYPES.has(eventType)) {
      return NextResponse.json({ error: "invalid event_type" }, { status: 400 });
    }
    const { error: insertError } = await supabaseServer.from("records_feature_events").insert({
      user_id: user.id,
      event_type: eventType,
      metadata: safeMetadata(body?.metadata),
    });
    if (insertError) throw insertError;
    return NextResponse.json({ data: { saved: true } });
  } catch (error) {
    console.warn("/api/records/events POST skipped:", error?.message || error);
    return NextResponse.json({ data: { saved: false } });
  }
}
