// app/api/diagnosis/v2/submit/route.js
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { scoreDiagnosis } from "@/lib/diagnosis/v2/scoring";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const answers = body?.answers || {};

    const computed = scoreDiagnosis(answers);

    const { data, error } = await supabaseServer
      .from("diagnosis_events")
      .insert([
        {
          user_id: null,
          symptom_focus: computed.symptom_focus || "fatigue",
          answers,
          computed,
          version: "v3",
        },
      ])
      .select("id")
      .single();

    if (error) throw error;

    // ✅ 互換のために eventId も返す
    return NextResponse.json({
      data: {
        id: data.id,
        eventId: data.id,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
