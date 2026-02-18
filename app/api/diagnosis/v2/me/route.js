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
        [
          "user_id",
          "symptom_focus",
          "qi",
          "blood",
          "fluid",

          // repurposed:
          "cold_heat",   // yin_yang tri (kept column name)
          "resilience",  // drive tri

          "thermo",      // yin_yang tri (duplicate cache; ok)
          "is_mixed",    // false
          "core_code",   // 9 types
          "sub_labels",
          "engine_version",

          "primary_meridian",
          "secondary_meridian",
          "organs",
          "answers",
          "computed",
          "latest_event_id",
          "version",
          "updated_at",
          "created_at",
        ].join(",")
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (e1) throw e1;

    return NextResponse.json({ data: data || null });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
