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
    const card_id = body?.card_id || null;
    const kind = body?.kind; // breathing/tsubo/stretch/food/...
    const done_level = Number(body?.done_level ?? 0); // 0/1/2
    const done_at = body?.done_at || new Date().toISOString();

    if (!kind) return NextResponse.json({ error: "kind required" }, { status: 400 });

    const { data, error: e } = await supabaseServer
      .from("daily_care_logs")
      .upsert(
        [{ user_id: user.id, date, card_id, kind, done_level, done_at }],
        { onConflict: "user_id,date,kind,card_id" }
      )
      .select("id, user_id, date, card_id, kind, done_level, done_at, created_at")
      .single();

    if (e) throw e;

    return NextResponse.json({ data });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
