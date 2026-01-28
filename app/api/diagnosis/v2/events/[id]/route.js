// app/api/diagnosis/v2/events/[id]/route.js
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

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

    // user_id は返してもいいが、不要なので伏せる（安全側）
    const safe = {
      id: data.id,
      created_at: data.created_at,
      symptom_focus: data.symptom_focus,
      answers: data.answers,
      computed: data.computed,
      version: data.version,
      is_attached: !!data.user_id,
    };

    return NextResponse.json({ data: safe });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
