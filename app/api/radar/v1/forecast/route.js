import { createClient } from "@supabase/supabase-js";

import {
  decideTargetDateJST,
  nowJstParts,
  toJstISODate,
} from "@/lib/radar_v1/timeJST";
import { buildFastRadarBundle } from "@/lib/radar_v1/buildFastRadarBundle";
import {
  getPrimaryRadarLocation,
  upsertPrimaryRadarLocation,
  getForecastBundle,
  saveForecast,
  saveCarePlan,
} from "@/lib/radar_v1/radarRepo";
import { resolveRadarLocationMeta } from "@/lib/radar_v1/reverseGeocode";

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

function getRelativeTargetMode(targetDate) {
  const { isoDate: today } = nowJstParts(new Date());

  const [y, m, d] = today.split("-").map(Number);
  const tomorrowDate = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0));
  const tomorrow = toJstISODate(tomorrowDate);

  if (targetDate === today) return "today";
  if (targetDate === tomorrow) return "tomorrow";
  return "explicit";
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

async function enrichAndSaveLocation({ userId, lat, lon, timezone, labelHint }) {
  const meta = await resolveRadarLocationMeta({ lat, lon, labelHint });
  return upsertPrimaryRadarLocation({
    userId,
    lat,
    lon,
    timezone,
    label: meta.label || labelHint || "primary",
    displayName: meta.display_name,
    regionName: meta.region_name,
  });
}

function hasCompletedGpt(bundle) {
  return Boolean(String(bundle?.forecast?.gpt_summary || "").trim());
}

export async function GET(req) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user?.id) {
      return jsonUtf8({ ok: false, error: "Unauthorized" }, 401);
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const latParam = searchParams.get("lat");
    const lonParam = searchParams.get("lon");

    const lat = latParam !== null ? Number(latParam) : null;
    const lon = lonParam !== null ? Number(lonParam) : null;

    const { targetDate, mode } = decideTargetDateJST({ date: date || null });
    const relativeTargetMode = getRelativeTargetMode(targetDate);

    let location = null;

    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      location = await enrichAndSaveLocation({
        userId: user.id,
        lat,
        lon,
        timezone: "Asia/Tokyo",
        labelHint: "primary",
      });
    } else {
      location = await getPrimaryRadarLocation({ userId: user.id });

      if (location && (!location.display_name || !location.region_name)) {
        location = await enrichAndSaveLocation({
          userId: user.id,
          lat: Number(location.lat),
          lon: Number(location.lon),
          timezone: location.timezone || "Asia/Tokyo",
          labelHint: location.label || "primary",
        });
      }
    }

    if (!location) {
      return jsonUtf8(
        {
          ok: false,
          error:
            "No radar location found. Pass lat/lon once to set a primary location.",
        },
        400
      );
    }

    const existing = await getForecastBundle({
      userId: user.id,
      targetDate,
    });

    if (existing?.forecast && existing?.care_plan) {
      return jsonUtf8({
        ok: true,
        cached: true,
        gpt_pending: !hasCompletedGpt(existing),
        target_date: targetDate,
        target_mode: mode,
        relative_target_mode: relativeTargetMode,
        location: serializeLocation(location),
        forecast: existing.forecast,
        care_plan: existing.care_plan,
      });
    }

    const { radarPlan, vendorMeta, normalized } = await buildFastRadarBundle({
      userId: user.id,
      targetDate,
      location,
    });

    const forecast = await saveForecast({
      userId: user.id,
      targetDate,
      locationId: location.id,
      radarPlan,
      vendor: "metno",
      vendorMeta,
    });

    const carePlan = await saveCarePlan({
      forecastId: forecast.id,
      radarPlan,
    });

    return jsonUtf8({
      ok: true,
      cached: false,
      gpt_pending: true,
      target_date: targetDate,
      target_mode: mode,
      relative_target_mode: relativeTargetMode,
      location: serializeLocation(location),
      forecast,
      care_plan: carePlan,
      debug: {
        point_count: normalized.points.length,
        partial_day: normalized.points.length < 24,
        from_cache: false,
      },
    });
  } catch (error) {
    console.error("/api/radar/v1/forecast GET error:", error);
    return jsonUtf8({ ok: false, error: String(error) }, 500);
  }
}
