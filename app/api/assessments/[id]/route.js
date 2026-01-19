import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(_req, { params }) {
  try {
    const { id } = params;

    const { data, error } = await supabaseServer
      .from("assessments")
      .select("id, created_at, user_id, result_type, symptom, payload")
      .eq("id", id)
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
