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
    const requestedLimit = Number(url.searchParams.get("limit") || 50);
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(Math.trunc(requestedLimit), 200)) : 50;
    const onlyCurrent = url.searchParams.get("current") === "1";
    const { data: profile, error: profileError } = await supabaseServer
      .from("constitution_profiles").select("latest_event_id").eq("user_id", user.id).maybeSingle();
    if (profileError) throw profileError;
    const currentEventId = profile?.latest_event_id || null;
    if (onlyCurrent && !currentEventId) return NextResponse.json({ data: [], current_event_id: null });

    let query = supabaseServer
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
      .eq("user_id", user.id);
    // An older result may be active. Never substitute the newest saved result.
    if (onlyCurrent) query = query.eq("id", currentEventId);
    const { data, error: e1 } = await query.order("created_at", { ascending: false }).limit(limit);

    if (e1) throw e1;

    // fallback: if source_event_id missing (old rows), read from notes
    const mapped =
      (data || []).map((r) => ({
        ...r,
        is_current: r.id === currentEventId,
        source_event_id: r.source_event_id || (r.notes && r.notes.source_event_id) || null,
      })) || [];

    return NextResponse.json({ data: mapped, current_event_id: currentEventId });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
