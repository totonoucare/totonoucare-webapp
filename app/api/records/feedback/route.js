import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireUser";
import { logRecordsAiEvent } from "@/lib/records/aiEvents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const REASONS = new Set([
  "too_general",
  "not_grounded",
  "hard_to_understand",
  "felt_unsafe",
  "other",
]);

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

    const saved = await logRecordsAiEvent({
      userId: user.id,
      eventType: "feedback",
      requestId,
      feedback,
      feedbackReason: reason,
      metadata: { surface: "records_chat" },
    });

    return NextResponse.json({ data: { saved } });
  } catch (error) {
    console.error("/api/records/feedback POST error:", error);
    return NextResponse.json({ error: error?.message || "feedback failed" }, { status: 500 });
  }
}
