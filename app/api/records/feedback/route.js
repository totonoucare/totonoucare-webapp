import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireUser";
import { supabaseServer } from "@/lib/supabaseServer";
import { logRecordsAiEvent } from "@/lib/records/aiEvents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const REASONS = new Set(["too_general", "not_grounded", "hard_to_understand", "felt_unsafe", "too_cold", "too_many_safety_questions", "other"]);

export async function POST(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const requestId = String(body?.request_id || "").trim().slice(0, 120);
    const feedback = Number(body?.feedback);
    const reason = REASONS.has(body?.reason) ? body.reason : null;
    if (!requestId || ![-1, 1].includes(feedback)) {
      return NextResponse.json({ error: "invalid feedback" }, { status: 400 });
    }

    const { data: sourceEvent, error: lookupError } = await supabaseServer
      .from("records_ai_events")
      .select("event_type,period_key,model")
      .eq("user_id", user.id)
      .eq("request_id", requestId)
      .in("event_type", ["analysis_response", "chat_response", "safety_response"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!sourceEvent) {
      return NextResponse.json({ error: "評価対象が見つかりません" }, { status: 404 });
    }

    try {
      await logRecordsAiEvent({
        userId: user.id,
        eventType: "feedback",
        requestId,
        periodKey: sourceEvent.period_key,
        source: sourceEvent.event_type,
        model: sourceEvent.model,
        feedback,
        feedbackReason: reason,
        metadata: { surface: body?.surface === "analysis" ? "records_analysis" : body?.surface === "live_support" ? "live_support" : "records_chat" },
      });
    } catch (saveError) {
      if (saveError?.code !== "23505" && !String(saveError?.message || "").includes("duplicate")) throw saveError;
    }
    return NextResponse.json({ data: { saved: true } });
  } catch (error) {
    console.error("/api/records/feedback POST error:", error);
    return NextResponse.json({ error: error?.message || "feedback failed" }, { status: 500 });
  }
}
