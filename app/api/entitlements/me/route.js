import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const { data, error: e } = await supabaseServer
      .from("entitlements")
      .select("id, product, status, starts_at, ends_at, source, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (e) throw e;

    const now = Date.now();
    const active = (data || []).filter((x) => {
      if (x.status !== "active") return false;
      if (!x.ends_at) return true;
      return new Date(x.ends_at).getTime() > now;
    });

    return NextResponse.json({ data: active });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
