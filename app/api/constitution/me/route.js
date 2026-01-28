// app/api/constitution/me/route.js
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
        "user_id, symptom_focus, qi, blood, fluid, cold_heat, resilience, primary_meridian, secondary_meridian, answers, computed, version, created_at, updated_at"
      )
      .eq("user_id", user.id)
      .single();

    if (e1) {
      // まだ診断してないユーザーは "no rows" になりがち
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({ data });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
