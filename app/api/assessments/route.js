import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// ✅ 一覧取得（履歴/ガイド/トップなどが GET で叩いても 405 にならないように）
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    // 任意：/api/assessments?user_id=xxx のように絞りたい場合に使える
    const user_id = searchParams.get("user_id");
    const limit = Number(searchParams.get("limit") || 20);

    let q = supabaseServer
      .from("assessments")
      .select("id, created_at, user_id, result_type, symptom, payload")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (user_id) q = q.eq("user_id", user_id);

    const { data, error } = await q;
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

// ✅ 既存：結果保存
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
