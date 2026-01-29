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

    const limitRaw = req.nextUrl.searchParams.get("limit") || "30";
    const limit = Math.min(parseInt(limitRaw, 10) || 30, 100);

    const { data, error: e1 } = await supabaseServer
      .from("diagnosis_events")
      .select("id, created_at, symptom_focus, computed, version")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (e1) throw e1;

    return NextResponse.json({ data: data || [] }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
