import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function hasGuideAccess(userId) {
  const { data, error } = await supabaseServer
    .from("entitlements")
    .select("id, status, ends_at")
    .eq("user_id", userId)
    .eq("product", "guide_all_access")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;

  const row = data?.[0];
  if (!row) return false;
  if (row.status !== "active") return false;
  if (!row.ends_at) return true;
  return new Date(row.ends_at).getTime() > Date.now();
}

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const ok = await hasGuideAccess(user.id);

    // 権利なし：サンプルだけ返す（本当は固定IDを指定してもOK）
    const limit = ok ? 500 : 8;

    const { data, error: e } = await supabaseServer
      .from("care_cards")
      .select(
        "id, kind, title, body_steps, illustration_url, cautions, tags_symptom, tags_flow, tags_organ, tags_sixin, priority_base, version"
      )
      .eq("is_active", true)
      .order("priority_base", { ascending: false })
      .limit(limit);

    if (e) throw e;

    return NextResponse.json({ data, guide_access: ok });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
