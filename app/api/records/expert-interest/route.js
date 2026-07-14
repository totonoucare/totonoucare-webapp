import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireUser";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const FEATURE_KEY = "expert_consultation";

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });
    const { data, error: loadError } = await supabaseServer
      .from("records_feature_interests")
      .select("status,created_at,updated_at")
      .eq("user_id", user.id)
      .eq("feature_key", FEATURE_KEY)
      .maybeSingle();
    if (loadError) throw loadError;
    return NextResponse.json({ data: { interested: data?.status === "interested" } });
  } catch (error) {
    console.error("/api/records/expert-interest GET error:", error);
    return NextResponse.json({ error: "お知らせ希望を読み込めませんでした" }, { status: 503 });
  }
}

export async function POST(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const interested = body?.interested !== false;
    const now = new Date().toISOString();
    const metadata = {
      preferred_format: ["online_video", "single_session", "follow_up"],
      service_positioning: "licensed_professional_self_care_consultation",
      source: "records_online_consultation_preview",
    };
    const { error: saveError } = await supabaseServer
      .from("records_feature_interests")
      .upsert({
        user_id: user.id,
        feature_key: FEATURE_KEY,
        status: interested ? "interested" : "not_interested",
        metadata,
        updated_at: now,
      }, { onConflict: "user_id,feature_key" });
    if (saveError) throw saveError;
    if (interested) {
      const { error: eventError } = await supabaseServer.from("records_feature_events").insert({
        user_id: user.id,
        event_type: "expert_interest",
        metadata,
      });
      if (eventError) console.warn("expert interest event skipped:", eventError.message);
    }
    return NextResponse.json({ data: { interested } });
  } catch (error) {
    console.error("/api/records/expert-interest POST error:", error);
    return NextResponse.json({ error: "希望を保存できませんでした" }, { status: 503 });
  }
}
