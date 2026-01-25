import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";
import { jstDateString } from "@/lib/dateJST";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const body = await req.json();
    const date = body?.date || jstDateString(new Date());
    const condition_am = body?.condition_am ?? null; // 0/1/2
    const condition_pm = body?.condition_pm ?? null; // 0/1/2
    const note = body?.note ?? null;

    // upsert
    const { data, error: e } = await supabaseServer
      .from("daily_checkins")
      .upsert(
        [{ user_id: user.id, date, condition_am, condition_pm, note }],
        { onConflict: "user_id,date" }
      )
      .select("id, user_id, date, condition_am, condition_pm, note, created_at")
      .single();

    if (e) throw e;

    return NextResponse.json({ data });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
