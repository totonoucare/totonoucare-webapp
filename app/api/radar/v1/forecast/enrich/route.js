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
  generateTsuboSelectionReasons,
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
      return jsonUtf8({ ok: false, error: "Unauthorized" }, 401);
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const { targetDate, mode } = decideTargetDateJST({ date: date || null });
    const relativeTargetMode = getRelativeTargetMode(targetDate);

    const location = await getPrimaryRadarLocation({ userId: user.id });
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

    if (existing?.forecast && existing?.care_plan && hasCompletedGpt(existing)) {
      return jsonUtf8({
        ok: true,
        cached: true,
        gpt_pending: false,
        target_date: targetDate,
        target_mode: mode,
        relative_target_mode: relativeTargetMode,
        location: serializeLocation(location),
        forecast: existing.forecast,
        care_plan: existing.care_plan,
      });
    }

    let { radarPlan, vendorMeta, normalized, riskContext } = await buildFastRadarBundle({
      userId: user.id,
      targetDate,
      location,
    });

    let gptSummaryText = "";

    try {
      const summary = await generateRadarSummary({
        riskContext,
        radarPlan,
        targetDate,
        relativeTargetMode,
      });

      if (summary?.text) {
        gptSummaryText = summary.text;
        radarPlan = {
          ...radarPlan,
          forecast: {
            ...radarPlan.forecast,
            gpt_summary: summary.text,
            gpt_model: summary.model || null,
            gpt_generated_at: summary.generated_at || new Date().toISOString(),
          },
        };
      }
    } catch (error) {
      console.error("generateRadarSummary failed:", error);
    }

    try {
      const generatedFood = await generateTomorrowFood({
        riskContext,
        radarPlan,
        targetDate,
        relativeTargetMode,
      });

      if (generatedFood?.food) {
        radarPlan = {
          ...radarPlan,
          tomorrow_food: {
            ...radarPlan.tomorrow_food,
            ...generatedFood.food,
          },
        };
      }
    } catch (error) {
      console.error("generateTomorrowFood failed:", error);
    }

    try {
      const generatedTsuboReasons = await generateTsuboSelectionReasons({
        riskContext,
        radarPlan,
        targetDate,
        relativeTargetMode,
        section: "tonight",
      });

      if (generatedTsuboReasons?.tsubo_set) {
        radarPlan = {
          ...radarPlan,
          tonight: {
            ...radarPlan.tonight,
            tsubo_set: generatedTsuboReasons.tsubo_set,
            note: generatedTsuboReasons.overall_reason
              ? {
                  ...radarPlan.tonight?.note,
                  body: generatedTsuboReasons.overall_reason,
                }
              : radarPlan.tonight?.note,
          },
        };
      }
    } catch (error) {
      console.error("generateTsuboSelectionReasons failed:", error);
    }

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
      gpt_pending: !gptSummaryText,
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
    console.error("/api/radar/v1/forecast/enrich GET error:", error);
    return jsonUtf8({ ok: false, error: String(error) }, 500);
  }
}
