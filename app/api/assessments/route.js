import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req) {
  try {
    const body = await req.json();

    // check/page.js から送られてくる想定：
    // { answers: {...}, type: "...", explanation: "...", user_id?: "uuid" }
    const payload = body || {};

    const result_type = payload.type || null;
    const symptom = payload?.answers?.symptom || null;

    // ✅ ログイン中なら user_id が入ってくる（任意）
    const user_id = payload.user_id || null;

    const insertRow = { result_type, symptom, payload };
    if (user_id) insertRow.user_id = user_id;

    const { data, error } = await supabaseServer
      .from("assessments")
      .insert([insertRow])
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
