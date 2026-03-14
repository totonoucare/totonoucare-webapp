// app/api/radar/v1/forecast/route.js
import { createClient } from "@supabase/supabase-js";

import { decideTargetDateJST } from "@/lib/radar_v1/timeJST";
import { fetchMetnoLocationForecast } from "@/lib/radar_v1/metnoClient";
import { normalizeMetnoForTargetDate } from "@/lib/radar_v1/metnoNormalize";
import { buildWeatherStress } from "@/lib/radar_v1/weatherStress";
import { getRadarConstitutionProfile } from "@/lib/radar_v1/profileRepo";
import { buildRiskContext } from "@/lib/radar_v1/buildRiskContext";
import { pickTcmPoints } from "@/lib/radar_v1/pickTcmPoints";
import { selectMtestPoint } from "@/lib/radar_v1/selectMtestPoint";
import { buildRadarPlan } from "@/lib/radar_v1/buildRadarPlan";
import {
  getPrimaryRadarLocation,
  upsertPrimaryRadarLocation,
  getForecastBundle,
  getPreviousMtestPointCode,
  saveForecast,
  saveCarePlan,
} from "@/lib/radar_v1/radarRepo";

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
    throw new Error("Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
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

    // 1) location
    let location = null;

    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      location = await upsertPrimaryRadarLocation({
        userId: user.id,
        lat,
        lon,
        timezone: "Asia/Tokyo",
      });
    } else {
      location = await getPrimaryRadarLocation({ userId: user.id });
    }

    if (!location) {
      return jsonUtf8(
        {
          ok: false,
          error: "No radar location found. Pass lat/lon once to set a primary location.",
        },
        400
      );
    }

    // 2) cached forecast
    const existing = await getForecastBundle({
      userId: user.id,
      targetDate,
    });

    if (existing?.forecast && existing?.care_plan) {
      return jsonUtf8({
        ok: true,
        cached: true,
        target_date: targetDate,
        target_mode: mode,
        location: {
          id: location.id,
          lat: location.lat,
          lon: location.lon,
          timezone: location.timezone,
        },
        forecast: existing.forecast,
        care_plan: existing.care_plan,
      });
    }

    // 3) profile
    const profile = await getRadarConstitutionProfile({ userId: user.id });
    if (!profile) {
      return jsonUtf8(
        { ok: false, error: "constitution_profile not found" },
        404
      );
    }

    // 4) weather
    const { data: metnoData, meta: metnoMeta } = await fetchMetnoLocationForecast({
      lat: location.lat,
      lon: location.lon,
    });

    const normalized = normalizeMetnoForTargetDate({
      metnoJson: metnoData,
      targetDate,
    });

    if (!normalized.points.length) {
      return jsonUtf8(
        {
          ok: false,
          error: "No forecast points for target_date",
          target_date: targetDate,
          target_mode: mode,
        },
        500
      );
    }

    const weatherStress = buildWeatherStress({ points: normalized.points });

    // 5) risk context
    const riskContext = buildRiskContext({
      profile,
      weatherStress,
    });

    // 6) point selection
    const tcmPoints = await pickTcmPoints({
      differentiation: riskContext.tcm_context,
    });

    const previousPointCode = await getPreviousMtestPointCode({
      userId: user.id,
      beforeDate: targetDate,
    });

    const mtestPoint = await selectMtestPoint({
      selectedLine: riskContext.mtest_context.selected_line,
      motherChild: { mode: riskContext.mtest_context.mode },
      weatherStress,
      previousPointCode,
    });

    // 7) full plan
    const radarPlan = buildRadarPlan({
      riskContext,
      tcmPoints,
      mtestPoint,
    });

    const vendorMeta = {
      metno: metnoMeta,
      point_count: normalized.points.length,
      partial_day: normalized.points.length < 24,
      previous_mtest_point_code: previousPointCode || null,
    };

    // 8) save
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
      target_date: targetDate,
      target_mode: mode,
      location: {
        id: location.id,
        lat: location.lat,
        lon: location.lon,
        timezone: location.timezone,
      },
      forecast,
      care_plan: carePlan,
      debug: {
        point_count: normalized.points.length,
        partial_day: normalized.points.length < 24,
      },
    });
  } catch (e) {
    return jsonUtf8({ ok: false, error: String(e) }, 500);
  }
}
