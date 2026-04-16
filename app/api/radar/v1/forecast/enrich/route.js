import { createClient } from "@supabase/supabase-js";

import {
  decideTargetDateJST,
  nowJstParts,
  toJstISODate,
} from "@/lib/radar_v1/timeJST";
import { buildFastRadarBundle } from "@/lib/radar_v1/buildFastRadarBundle";
import {
  generateRadarSummary,
  generateTomorrowFood,
} from "@/lib/radar_v1/gptRadar";
import {
  getPrimaryRadarLocation,
  getForecastBundle,
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
    const dateParam = url.searchParams.get("date");
    const targetDate = dateParam || decideTargetDateJST();
    const relativeTargetMode = getRelativeTargetMode(targetDate);

    const location = await getPrimaryRadarLocation({ userId: user.id });
    if (!location) {
      return jsonUtf8(
        {
          error: "No radar location found. Save a location first.",
        },
        400
      );
    }

    const existing = await getForecastBundle({ userId: user.id, targetDate });
    if (existing && hasCompletedGpt(existing)) {
      return jsonUtf8({
        ...existing,
        target_date: targetDate,
        relative_target_mode: relativeTargetMode,
        now_jst: nowJstParts(new Date()),
        location: serializeLocation(location),
        cached: true,
        gpt_pending: false,
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

    const promptContext = {
      date_mode: relativeTargetMode,
      target_date: targetDate,
      timezone: location.timezone || "Asia/Tokyo",
      weather: radarPlan.forecast.weather,
      forecast: radarPlan.forecast,
      care_plan: radarPlan.care_plan,
      risk_context: radarPlan.forecast.computed?.radar_plan_meta?.risk_context || null,
    };

    let gptSummary = String(existing?.forecast?.gpt_summary || "").trim() || null;

    if (!gptSummary) {
      try {
        gptSummary = await generateRadarSummary({
          radarPlan,
          relativeTargetMode,
        });
      } catch (error) {
        console.error("forecast enrich summary generation failed:", error);
      }
    }

    let tomorrowFood = radarPlan.care_plan?.tomorrow_food_context || null;
    try {
      tomorrowFood = await generateTomorrowFood({
        promptContext,
        fallback: radarPlan.care_plan?.tomorrow_food_context || null,
      });
    } catch (error) {
      console.error("forecast enrich food generation failed:", error);
    }

    if (gptSummary) {
      radarPlan.forecast.gpt_summary = gptSummary;
    }

    if (tomorrowFood) {
      radarPlan.care_plan.tomorrow_food_context = tomorrowFood;
    }

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

    const freshBundle = await getForecastBundle({ userId: user.id, targetDate });

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
      gpt_pending: !gptSummary,
    });
  } catch (error) {
    console.error("/api/radar/v1/forecast/enrich GET error:", error);
    return jsonUtf8(
      {
        error: error?.message || "Unknown error",
      },
      500
    );
  }
}
