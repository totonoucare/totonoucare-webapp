// app/api/diagnosis/v2/events/[id]/route.js
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { scoreDiagnosis } from "@/lib/diagnosis/v2/scoring";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_req, { params }) {
  try {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { data, error } = await supabaseServer
      .from("diagnosis_events")
      .select(
        [
          "id",
          "created_at",
          "symptom_focus",
          "answers",
          "computed",
          "version",
          "user_id",
          "ai_explain_text",
          "ai_explain_model",
          "ai_explain_created_at",
        ].join(",")
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const answers = data.answers || {};
    const computed = scoreDiagnosis(answers); // always recompute from answers

    const safe = {
      id: data.id,
      created_at: data.created_at,
      symptom_focus: computed.symptom_focus || data.symptom_focus || "fatigue",
      answers,
      computed,
      version: data.version || "v2",
      is_attached: !!data.user_id,

      ai_explain_text: data.ai_explain_text || null,
      ai_explain_model: data.ai_explain_model || null,
      ai_explain_created_at: data.ai_explain_created_at || null,
    };

    return NextResponse.json({ data: safe });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
