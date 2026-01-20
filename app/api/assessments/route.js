import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// GET /api/assessments?user_id=xxx  または  GET /api/assessments （全件は返さない）
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const user_id = url.searchParams.get("user_id");

    // user_id が無い状態で全件を返すのは危険なので空配列にする（プロトタイプ安全策）
    if (!user_id) {
      return NextResponse.json({ data: [] });
    }

    const { data, error } = await supabaseServer
      .from("assessments")
      .select("id, created_at, user_id, result_type, symptom, payload")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message || String(e) },
      { status: 500 }
    );
  }
}

// POST /api/assessments
export async function POST(req) {
  try {
    const body = await req.json();

    // check/page.js から送られてくる想定：
    // { answers: {...}, type: "...", explanation: "...", user_id?: "..." }
    const payload = body || {};

    const result_type = payload.type || null;
    const symptom = payload?.answers?.symptom || null;
    const user_id = payload.user_id || null;

    const { data, error } = await supabaseServer
      .from("assessments")
      .insert([{ result_type, symptom, user_id, payload }])
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
