import { createClient } from "@supabase/supabase-js";

import {
  decideTargetDateJST,
  nowJstParts,
  toJstISODate,
} from "@/lib/radar_v1/timeJST";
import {
  getPrimaryRadarLocation,
  getForecastBundle,
} from "@/lib/radar_v1/radarRepo";
import { getGptCompletionStatus, shouldAutoEnrich } from "@/lib/radar_v1/gptCompletion";
import { enrichForecastGpt } from "@/lib/radar_v1/enrichForecastGpt";

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

function shouldAllowGenerate(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

export async function GET(req) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user?.id) {
      return jsonUtf8({ ok: false, error: "Unauthorized" }, 401);
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const allowGenerate = shouldAllowGenerate(
      searchParams.get("generate") || searchParams.get("allow_generate")
    );
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

    const basePayload = {
      ok: true,
      target_date: targetDate,
      target_mode: mode,
      relative_target_mode: relativeTargetMode,
      location: serializeLocation(location),
      forecast: existing?.forecast || null,
      care_plan: existing?.care_plan || null,
    };

    if (!existing?.forecast || !existing?.care_plan) {
      return jsonUtf8({
        ...basePayload,
        cached: Boolean(existing?.forecast),
        gpt_pending: false,
        skipped_generation: true,
        debug: {
          reason: existing?.forecast ? "missing_care_plan" : "missing_forecast",
          no_weather_recompute_in_enrich: true,
        },
      });
    }

    const completionBefore = getGptCompletionStatus(existing);

    if (!shouldAutoEnrich(existing)) {
      return jsonUtf8({
        ...basePayload,
        cached: true,
        gpt_pending: false,
        debug: { gpt_completion_before: completionBefore },
      });
    }

    if (!allowGenerate) {
      return jsonUtf8({
        ...basePayload,
        cached: true,
        gpt_pending: true,
        skipped_generation: true,
        debug: { gpt_completion_before: completionBefore },
      });
    }

    const enrichment = await enrichForecastGpt({
      userId: user.id,
      targetDate,
      location,
      existing,
      relativeTargetMode,
    });

    const persisted = enrichment.persisted || existing;

    return jsonUtf8({
      ok: true,
      cached: true,
      gpt_pending: enrichment.gpt_pending,
      target_date: targetDate,
      target_mode: mode,
      relative_target_mode: relativeTargetMode,
      location: serializeLocation(location),
      forecast: persisted?.forecast || null,
      care_plan: persisted?.care_plan || null,
      debug: enrichment.debug,
    });
  } catch (error) {
    console.error("/api/radar/v1/forecast/enrich GET error:", error);
    return jsonUtf8({ ok: false, error: String(error) }, 500);
  }
}

