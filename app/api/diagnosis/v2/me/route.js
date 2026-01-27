// app/api/diagnosis/v2/me/route.js
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const { data, error: e1 } = await supabaseServer
      .from("constitution_profiles")
      .select(
        "user_id, symptom_focus, qi, blood, fluid, cold_heat, resilience, primary_meridian, secondary_meridian, organs, answers, computed, version, updated_at, created_at"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (e1) throw e1;

    return NextResponse.json({
      data: data || null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
