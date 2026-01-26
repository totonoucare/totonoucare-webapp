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

    const body = await req.json().catch(() => ({}));
    const date = body?.date || jstDateString(new Date());

    // 重要：undefined（未送信）は「更新しない」、null（明示）は「nullにする」
    const hasAm = Object.prototype.hasOwnProperty.call(body, "condition_am");
    const hasPm = Object.prototype.hasOwnProperty.call(body, "condition_pm");
    const hasNote = Object.prototype.hasOwnProperty.call(body, "note");

    // 既存行を取得（部分更新のため）
    const { data: existing, error: selErr } = await supabaseServer
      .from("daily_checkins")
      .select("id, user_id, date, condition_am, condition_pm, note, created_at")
      .eq("user_id", user.id)
      .eq("date", date)
      .maybeSingle();

    if (selErr) throw selErr;

    const payload = {
      user_id: user.id,
      date,
      condition_am: hasAm ? body.condition_am : existing?.condition_am ?? null,
      condition_pm: hasPm ? body.condition_pm : existing?.condition_pm ?? null,
      note: hasNote ? body.note : existing?.note ?? null,
    };

    const { data, error: upErr } = await supabaseServer
      .from("daily_checkins")
      .upsert([payload], { onConflict: "user_id,date" })
      .select("id, user_id, date, condition_am, condition_pm, note, created_at")
      .single();

    if (upErr) throw upErr;

    return NextResponse.json({ data });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
