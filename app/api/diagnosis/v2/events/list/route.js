// app/api/diagnosis/v2/events/list/route.js
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);

    const { data, error: e1 } = await supabaseServer
      .from("constitution_events")
      .select(
        [
          "id",
          "created_at",
          "user_id",
          "symptom_focus",
          "core_code",         // 9 types
          "sub_labels",
          "thermo",            // yin_yang tri
          "resilience",        // drive tri
          "is_mixed",          // false
          "qi",
          "blood",
          "fluid",
          "primary_meridian",
          "secondary_meridian",
          "source_event_id",
          "notes",
        ].join(",")
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (e1) throw e1;

    // fallback: if source_event_id missing (old rows), read from notes
    const mapped =
      (data || []).map((r) => ({
        ...r,
        source_event_id: r.source_event_id || (r.notes && r.notes.source_event_id) || null,
      })) || [];

    return NextResponse.json({ data: mapped });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
