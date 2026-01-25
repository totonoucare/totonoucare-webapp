import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET: primary location
export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const { data, error: e } = await supabaseServer
      .from("user_locations")
      .select("id, label, lat, lon, is_primary, created_at")
      .eq("user_id", user.id)
      .eq("is_primary", true)
      .limit(1)
      .maybeSingle();

    if (e) throw e;

    return NextResponse.json({ data: data || null });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

// POST: set/replace primary location
export async function POST(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const body = await req.json();
    const lat = Number(body?.lat);
    const lon = Number(body?.lon);
    const label = String(body?.label || "primary");

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json({ error: "lat/lon required" }, { status: 400 });
    }

    // 既存primaryをfalseに
    const { error: e1 } = await supabaseServer
      .from("user_locations")
      .update({ is_primary: false })
      .eq("user_id", user.id)
      .eq("is_primary", true);
    if (e1) throw e1;

    // 新しいprimaryを作る（または同一lat/lonがあるならupdateでもOKだが簡略）
    const { data, error: e2 } = await supabaseServer
      .from("user_locations")
      .insert([{ user_id: user.id, label, lat, lon, is_primary: true }])
      .select("id, label, lat, lon, is_primary, created_at")
      .single();
    if (e2) throw e2;

    return NextResponse.json({ data });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
