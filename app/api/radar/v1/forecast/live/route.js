import { createClient } from "@supabase/supabase-js";

import { nowJstParts } from "@/lib/radar_v1/timeJST";
import { buildFastRadarBundle } from "@/lib/radar_v1/buildFastRadarBundle";
import {
  getPrimaryRadarLocation,
  upsertPrimaryRadarLocation,
} from "@/lib/radar_v1/radarRepo";
import { resolveRadarLocationMeta } from "@/lib/radar_v1/reverseGeocode";
import {
  getSafeLocationLabelHint,
  isVisibleLocationLabel,
  serializeDisplayableRadarLocation,
} from "@/lib/radar_v1/locationDisplay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

async function ensureDisplayableLocation({ userId, location }) {
  if (!location) return null;

  const needsDisplayName = !String(location.display_name || "").trim();
  const labelHint = getSafeLocationLabelHint(location, "現在地付近");
  const hasHiddenLabel = !isVisibleLocationLabel(location.label);

  if (!needsDisplayName && !hasHiddenLabel) return location;

  const meta = await resolveRadarLocationMeta({
    lat: Number(location.lat),
    lon: Number(location.lon),
    labelHint,
  });

  return upsertPrimaryRadarLocation({
    userId,
    lat: Number(location.lat),
    lon: Number(location.lon),
    timezone: location.timezone || "Asia/Tokyo",
    label: meta.label || labelHint,
    displayName: meta.display_name || labelHint,
    regionName: meta.region_name,
  });
}

function buildLiveForecastPayload({ radarPlan, targetDate }) {
  return {
    ...radarPlan.forecast,
    target_date: targetDate,
    why_short: buildWhyShort(radarPlan),
    gpt_summary: "",
    gpt_generated_at: null,
    computed: {
      radar_plan_meta: radarPlan.meta || null,
      gpt_inputs: radarPlan.gpt_inputs || null,
      forecast_snapshot: radarPlan.forecast || null,
    },
  };
}

function buildWhyShort(radarPlan) {
  const factors = Array.isArray(radarPlan?.forecast?.trigger_factors)
    ? radarPlan.forecast.trigger_factors
    : [];
  const labels = factors.map((item) => item?.label).filter(Boolean).slice(0, 2);
  const trigger = labels.length
    ? labels.join("＋")
    : radarPlan?.forecast?.main_trigger_label || "気象変化";
  const peakStart = radarPlan?.forecast?.peak_start;
  const peakEnd = radarPlan?.forecast?.peak_end;

  if (peakStart && peakEnd) {
    return `${trigger}。このあと響きやすい時間帯は ${peakStart}〜${peakEnd}。`;
  }

  return `${trigger}。`;
}

export async function GET(req) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user?.id) {
      return jsonUtf8({ ok: false, error: "Unauthorized" }, 401);
    }

    const { isoDate: targetDate } = nowJstParts(new Date());
    let location = await getPrimaryRadarLocation({ userId: user.id });

    if (!location) {
      return jsonUtf8(
        {
          ok: false,
          error: "No radar location found. Open the forecast page once and set your region.",
        },
        400
      );
    }

    location = await ensureDisplayableLocation({ userId: user.id, location });

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
      location: serializeDisplayableRadarLocation(location, "現在地付近"),
      forecast: buildLiveForecastPayload({ radarPlan, targetDate }),
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
