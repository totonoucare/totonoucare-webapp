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
      return jsonUtf8({ error: "Unauthorized" }, 401);
    }

    const url = new URL(req.url);
    const latParam = url.searchParams.get("lat");
    const lonParam = url.searchParams.get("lon");
    const dateParam = url.searchParams.get("date");

    const overrideLat = latParam != null && latParam !== "" ? Number(latParam) : null;
    const overrideLon = lonParam != null && lonParam !== "" ? Number(lonParam) : null;

    if (
      (overrideLat != null && Number.isNaN(overrideLat)) ||
      (overrideLon != null && Number.isNaN(overrideLon))
    ) {
      return jsonUtf8({ error: "lat/lon must be numbers" }, 400);
    }

    const targetDate = dateParam || decideTargetDateJST();
    const relativeTargetMode = getRelativeTargetMode(targetDate);

    let location = null;

    if (overrideLat != null && overrideLon != null) {
      location = await enrichAndSaveLocation({
        userId: user.id,
        lat: overrideLat,
        lon: overrideLon,
        timezone: "Asia/Tokyo",
        labelHint: "primary",
      });
    } else {
      location = await getPrimaryRadarLocation(user.id);
    }

    if (!location) {
      return jsonUtf8(
        {
          error: "No radar location found. Save a location first.",
        },
        400
      );
    }

    const existing = await getForecastBundle(user.id, targetDate);
    if (existing) {
      return jsonUtf8({
        ...existing,
        target_date: targetDate,
        relative_target_mode: relativeTargetMode,
        now_jst: nowJstParts(new Date()),
        location: serializeLocation(location),
        cached: true,
        gpt_pending: !hasCompletedGpt(existing),
      });
    }

    const { radarPlan } = await buildFastRadarBundle({
      userId: user.id,
      targetDate,
      lat: location.lat,
      lon: location.lon,
      timezone: location.timezone || "Asia/Tokyo",
      relativeTargetMode,
    });

    await saveForecast({
      userId: user.id,
      targetDate,
      forecastPayload: radarPlan.forecast,
    });

    await saveCarePlan({
      userId: user.id,
      targetDate,
      carePlanPayload: radarPlan.care_plan,
    });

    const freshBundle = await getForecastBundle(user.id, targetDate);

    return jsonUtf8({
      ...(freshBundle || {
        target_date: targetDate,
        forecast: radarPlan.forecast,
        care_plan: radarPlan.care_plan,
      }),
      target_date: targetDate,
      relative_target_mode: relativeTargetMode,
      now_jst: nowJstParts(new Date()),
      location: serializeLocation(location),
      cached: false,
      gpt_pending: true,
    });
  } catch (error) {
    console.error("/api/radar/v1/forecast GET error:", error);
    return jsonUtf8(
      {
        error: error?.message || "Unknown error",
      },
      500
    );
  }
}
