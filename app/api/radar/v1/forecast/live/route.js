import { createClient } from "@supabase/supabase-js";

import { nowJstParts } from "@/lib/radar_v1/timeJST";
import { buildFastRadarBundle } from "@/lib/radar_v1/buildFastRadarBundle";
import { getPrimaryRadarLocation } from "@/lib/radar_v1/radarRepo";

export const runtime = "nodejs";

function jsonUtf8(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function getAuthSupabase(authHeader) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false },
    global: authHeader
      ? {
          headers: {
            Authorization: authHeader,
          },
        }
      : undefined,
  });
}

async function getAuthenticatedUser(req) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;

  const supabase = getAuthSupabase(authHeader);
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(`Auth getUser failed: ${error.message}`);
  }

  return data?.user || null;
}

function serializeLocation(location) {
  if (!location) return null;
  return {
    id: location.id,
    lat: location.lat,
    lon: location.lon,
    timezone: location.timezone,
    label: location.label || null,
    display_name: location.display_name || null,
    region_name: location.region_name || null,
  };
}

export async function GET(req) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user?.id) {
      return jsonUtf8({ ok: false, error: "Unauthorized" }, 401);
    }

    const { isoDate: targetDate } = nowJstParts(new Date());
    const location = await getPrimaryRadarLocation({ userId: user.id });

    if (!location) {
      return jsonUtf8(
        {
          ok: false,
          error: "No radar location found. Open the forecast page once and set your region.",
        },
        400
      );
    }

    const { radarPlan, vendorMeta, normalized } = await buildFastRadarBundle({
      userId: user.id,
      targetDate,
      location,
    });

    return jsonUtf8({
      ok: true,
      cached: false,
      recomputed: true,
      live: true,
      gpt_pending: false,
      target_date: targetDate,
      target_mode: "today_live",
      relative_target_mode: "today",
      location: serializeLocation(location),
      forecast: radarPlan.forecast,
      debug: {
        from_cache: false,
        point_count: normalized.points.length,
        partial_day: normalized.points.length < 24,
        vendor_meta: vendorMeta,
      },
    });
  } catch (error) {
    console.error("/api/radar/v1/forecast/live GET error:", error);
    return jsonUtf8({ ok: false, error: String(error) }, 500);
  }
}

