// app/api/diagnosis/v2/events/list/route.js
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireUser";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || 30), 100);

    // ✅ 履歴は constitution_events を唯一のソースにする
    const { data, error: e1 } = await supabaseServer
      .from("constitution_events")
      .select(
        "id, created_at, symptom_focus, core_code, sub_labels, primary_meridian, secondary_meridian, notes, engine_version"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (e1) throw e1;

    // resultへ戻る用の source_event_id（diagnosis_events.id）を抽出して返す
    const rows =
      (data || []).map((r) => ({
        ...r,
        source_event_id:
          r?.notes && typeof r.notes === "object" ? r.notes.source_event_id : null,
      })) || [];

    return NextResponse.json({ data: rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
