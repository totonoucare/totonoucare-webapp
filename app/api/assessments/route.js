import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req) {
  try {
    const body = await req.json();

    // check/page.js から送られてくる想定：
    // { answers: {...}, type: "...", explanation: "..." }
    const payload = body || {};

    const result_type = payload.type || null;
    const symptom = payload?.answers?.symptom || null;

    const { data, error } = await supabaseServer
      .from("assessments")
      .insert([{ result_type, symptom, payload }])
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ id: data.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
