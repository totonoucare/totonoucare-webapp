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
      .select("id, created_at, symptom_focus, answers, computed, version, user_id")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const answers = data.answers || {};

    // computed が古い/欠けてるケースに備えて、常に answers から再計算して返す
    // （DBのcomputedは保持していても、返却は最新v2のshapeに寄せる）
    const computed = scoreDiagnosis(answers);

    const safe = {
      id: data.id,
      created_at: data.created_at,
      symptom_focus: computed.symptom_focus || data.symptom_focus || "fatigue",
      answers,
      computed,
      version: data.version || "v2",
      is_attached: !!data.user_id,
    };

    return NextResponse.json({ data: safe });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
