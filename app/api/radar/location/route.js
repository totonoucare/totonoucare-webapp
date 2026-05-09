import { requireUser } from "@/lib/requireUser";
import { createAdminClient } from "@/lib/supabaseAdmin";
import {
  getPrimaryRadarLocation,
  upsertPrimaryRadarLocation,
} from "@/lib/radar_v1/radarRepo";
import { resolveRadarLocationMeta } from "@/lib/radar_v1/reverseGeocode";
import {
  getSafeLocationLabelHint,
  serializeDisplayableRadarLocation,
} from "@/lib/radar_v1/locationDisplay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonUtf8(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}


async function enrichAndSaveLocation({ userId, lat, lon, timezone, labelHint }) {
  const meta = await resolveRadarLocationMeta({ lat, lon, labelHint });
  return upsertPrimaryRadarLocation({
    userId,
    lat,
    lon,
    timezone,
    label: meta.label || labelHint || "現在地付近",
    displayName: meta.display_name || labelHint || "現在地付近",
    regionName: meta.region_name,
  });
}

async function restoreLocationFromLatestForecast({ userId }) {
  const supabase = createAdminClient();

  const { data: forecast, error: forecastError } = await supabase
    .from("radar_forecasts")
    .select("location_id,target_date,updated_at,created_at")
    .eq("user_id", userId)
    .not("location_id", "is", null)
    .order("target_date", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (forecastError || !forecast?.location_id) return null;

  const { data: location, error: locationError } = await supabase
    .from("radar_locations")
    .select("*")
    .eq("id", forecast.location_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (locationError || !location) return null;

  const { data: restored, error: restoreError } = await supabase
    .from("radar_locations")
    .update({ is_primary: true, updated_at: new Date().toISOString() })
    .eq("id", location.id)
    .select("*")
    .single();

  return restoreError ? location : restored;
}

async function getDisplayablePrimaryLocation({ userId }) {
  let location = await getPrimaryRadarLocation({ userId });

  // 古いデータで primary フラグが拾えない場合、最新予報に紐づく地域を primary として復元する。
  if (!location) {
    location = await restoreLocationFromLatestForecast({ userId });
  }

  if (location && (!location.display_name || !location.region_name)) {
    location = await enrichAndSaveLocation({
      userId,
      lat: Number(location.lat),
      lon: Number(location.lon),
      timezone: location.timezone || "Asia/Tokyo",
      labelHint: getSafeLocationLabelHint(location, "現在地付近"),
    });
  }

  return location;
}

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user?.id) return jsonUtf8({ ok: false, error: error || "Unauthorized" }, 401);

    const location = await getDisplayablePrimaryLocation({ userId: user.id });
    return jsonUtf8({ ok: true, location: serializeDisplayableRadarLocation(location, "現在地付近") });
  } catch (error) {
    console.error("/api/radar/location GET error:", error);
    return jsonUtf8({ ok: false, error: String(error?.message || error) }, 500);
  }
}

export async function POST(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user?.id) return jsonUtf8({ ok: false, error: error || "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const lat = Number(body.lat);
    const lon = Number(body.lon);
    const labelHint = String(body.label || body.label_hint || "現在地付近").trim() || "現在地付近";

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return jsonUtf8({ ok: false, error: "Invalid lat/lon" }, 400);
    }

    const location = await enrichAndSaveLocation({
      userId: user.id,
      lat,
      lon,
      timezone: "Asia/Tokyo",
      labelHint,
    });

    return jsonUtf8({ ok: true, location: serializeDisplayableRadarLocation(location, "現在地付近") });
  } catch (error) {
    console.error("/api/radar/location POST error:", error);
    return jsonUtf8({ ok: false, error: String(error?.message || error) }, 500);
  }
}

