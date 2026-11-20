import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireGuestExperience } from "@/lib/guestExperienceServer";
import { resolveRadarLocationMeta } from "@/lib/radar_v1/reverseGeocode";
import { enforcePublicApiRateLimit } from "@/lib/publicApiRateLimit";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(req) {
  try { const g = await requireGuestExperience(req); return reply({ ok: true, location: g.state.location }); }
  catch (e) { return reply({ error: e.status ? e.message : "地域を確認できませんでした。", code: e.code }, e.status || 503); }
}
export async function POST(req) {
  try {
    const g = await requireGuestExperience(req);
    const limited = await enforcePublicApiRateLimit(req, { route: "guest_location_v126", limit: 15, windowSeconds: 60 });
    if (limited) return limited;
    const raw = await req.text();
    if (raw.length > 512) return reply({ error: "地域を選び直してください。" }, 413);
    const body = JSON.parse(raw);
    const parse = v => (typeof v === "number" || typeof v === "string" && v.trim() !== "") ? Number(v) : NaN;
    const lat = parse(body.lat), lon = parse(body.lon);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) return reply({ error: "地域を選び直してください。" }, 400);
    const labelHint = typeof body.label === "string" ? body.label.slice(0, 80) : "現在地付近";
    const meta = await resolveRadarLocationMeta({ lat, lon, labelHint });
    const location = { id: g.id, lat, lon, timezone: "Asia/Tokyo", label: meta.label || labelHint,
      display_name: meta.display_name || meta.label || labelHint, region_name: meta.region_name || null };
    const saved = await supabaseServer.from("guest_experiences_v126").update({ location })
      .eq("result_id", g.id).is("claimed_by", null).gt("expires_at", new Date().toISOString())
      .select("location").maybeSingle();
    if (saved.error) throw saved.error;
    if (!saved.data?.location) {
      return reply({ error: "地域の保存を確認できませんでした。体質チェックからもう一度お試しください。", code: "guest_location_not_saved" }, 409);
    }
    return reply({ ok: true, location: saved.data.location });
  } catch (e) { return reply({ error: e.status ? e.message : "地域を保存できませんでした。", code: e.code }, e.status || 503); }
}
