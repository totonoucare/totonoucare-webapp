import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireUser";
import { supabaseServer } from "@/lib/supabaseServer";
import { isValidYmd } from "@/lib/records/server";
import { replyToFollowUpFromMetadata } from "@/lib/records/replyContext";
import { chronologicalFromNewest } from "@/lib/records/messageWindow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function publicMessage(row) {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    request_id: row.request_id || "",
    mood: row.mood || "",
    suggested_questions: Array.isArray(row.suggested_questions) ? row.suggested_questions : [],
    follow_up: row.follow_up && typeof row.follow_up === "object" ? row.follow_up : null,
    reply_to_follow_up: replyToFollowUpFromMetadata(row.metadata),
    safety_level: row.safety_level || "routine",
    created_at: row.created_at,
  };
}

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });
    const url = new URL(req.url);
    const periodKey = String(url.searchParams.get("period_key") || "30d").slice(0, 30);
    const start = String(url.searchParams.get("start") || "");
    const end = String(url.searchParams.get("end") || "");
    if (!isValidYmd(start) || !isValidYmd(end)) {
      return NextResponse.json({ error: "invalid start/end" }, { status: 400 });
    }

    const { data: threads, error: threadError } = await supabaseServer
      .from("records_ai_threads")
      .select("id,period_key,range_start,range_end,title,status,created_at,updated_at")
      .eq("user_id", user.id)
      .eq("thread_kind", "period_review")
      .eq("period_key", periodKey)
      .eq("range_start", start)
      .eq("range_end", end)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1);
    if (threadError) throw threadError;
    const thread = threads?.[0] || null;
    if (!thread) return NextResponse.json({ data: { thread: null, messages: [] } });

    const { data: messages, error: messageError } = await supabaseServer
      .from("records_ai_messages")
      .select("id,role,content,request_id,mood,suggested_questions,follow_up,safety_level,metadata,created_at")
      .eq("user_id", user.id)
      .eq("thread_id", thread.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (messageError) throw messageError;
    return NextResponse.json({
      data: { thread, messages: chronologicalFromNewest(messages || [], 100).map(publicMessage) },
    });
  } catch (error) {
    console.error("/api/records/threads GET error:", error);
    return NextResponse.json(
      { error: "AI会話を読み込めませんでした", code: "records_ai_schema_required" },
      { status: 503 }
    );
  }
}

export async function DELETE(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const threadId = String(body?.thread_id || "");
    if (!threadId) return NextResponse.json({ error: "thread_id is required" }, { status: 400 });
    const { data: deleted, error: deleteError } = await supabaseServer
      .from("records_ai_threads")
      .delete()
      .eq("id", threadId)
      .eq("user_id", user.id)
      .eq("thread_kind", "period_review")
      .select("id")
      .maybeSingle();
    if (deleteError) throw deleteError;
    if (!deleted) return NextResponse.json({ error: "会話が見つかりません" }, { status: 404 });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("/api/records/threads DELETE error:", error);
    return NextResponse.json({ error: "会話を削除できませんでした" }, { status: 500 });
  }
}
