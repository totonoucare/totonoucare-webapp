import { createClient } from "@supabase/supabase-js";

import {
  decideTargetDateJST,
  nowJstParts,
  toJstISODate,
} from "@/lib/radar_v1/timeJST";
import { ensureForecastBundle } from "@/lib/radar_v1/ensureForecastBundle";
import {
  getForecastBundle,
  getPrimaryRadarLocation,
  upsertPrimaryRadarLocation,
} from "@/lib/radar_v1/radarRepo";
import { resolveRadarLocationMeta } from "@/lib/radar_v1/reverseGeocode";
import { hasCompletedGpt } from "@/lib/radar_v1/gptCompletion";
import {
  getSafeLocationLabelHint,
  isVisibleLocationLabel,
  serializeDisplayableRadarLocation,
} from "@/lib/radar_v1/locationDisplay";

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


async function enrichAndSaveLocation({ userId, lat, lon, timezone, labelHint }) {
  const meta = await resolveRadarLocationMeta({ lat, lon, labelHint });
  return upsertPrimaryRadarLocation({
    userId,
    lat,
    lon,
    timezone,
    label: meta.label || labelHint || "現在地付近",
    displayName: meta.display_name,
    regionName: meta.region_name,
  });
}

function parseCoordinateInput(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" && typeof value !== "string") return null;

  const normalized = typeof value === "string" ? value.trim() : value;
  if (normalized === "") return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function isValidLatLon(lat, lon) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

function shouldForceRecompute(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

function shouldUseCacheOnly(value) {
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
    const latParam = searchParams.get("lat");
    const lonParam = searchParams.get("lon");
    const labelParam = searchParams.get("label");
    const forceParam = searchParams.get("force");
    const cacheOnlyParam = searchParams.get("cache_only");

    const hasLocationParams = latParam !== null || lonParam !== null;
    const lat = parseCoordinateInput(latParam);
    const lon = parseCoordinateInput(lonParam);
    const hasLocationOverride = isValidLatLon(lat, lon);

    if (hasLocationParams && !hasLocationOverride) {
      return jsonUtf8({ ok: false, error: "Invalid lat/lon" }, 400);
    }

    const force = shouldForceRecompute(forceParam) || hasLocationOverride;
    const cacheOnly = shouldUseCacheOnly(cacheOnlyParam);

    const { targetDate, mode } = decideTargetDateJST({ date: date || null });
    const relativeTargetMode = getRelativeTargetMode(targetDate);

    if (cacheOnly) {
      const existing = await getForecastBundle({ userId: user.id, targetDate });
      const location = await getPrimaryRadarLocation({ userId: user.id });
      return jsonUtf8({
        ok: true,
        cached: Boolean(existing?.forecast && existing?.care_plan),
        recomputed: false,
        gpt_pending: Boolean(existing?.forecast && existing?.care_plan && !hasCompletedGpt(existing)),
        target_date: targetDate,
        target_mode: mode,
        relative_target_mode: relativeTargetMode,
        location: serializeDisplayableRadarLocation(location, "現在地付近"),
        forecast: existing?.forecast || null,
        care_plan: existing?.care_plan || null,
        debug: { from_cache_only: true },
      });
    }

    let location = null;

    if (hasLocationOverride) {
      location = await enrichAndSaveLocation({
        userId: user.id,
        lat,
        lon,
        timezone: "Asia/Tokyo",
        labelHint: String(labelParam || "現在地付近").trim() || "現在地付近",
      });
    } else {
      location = await getPrimaryRadarLocation({ userId: user.id });

      const hasHiddenLabel = location ? !isVisibleLocationLabel(location.label) : false;
      if (location && (hasHiddenLabel || !location.display_name || !location.region_name)) {
        location = await enrichAndSaveLocation({
          userId: user.id,
          lat: Number(location.lat),
          lon: Number(location.lon),
          timezone: location.timezone || "Asia/Tokyo",
          labelHint: getSafeLocationLabelHint(location, "現在地付近"),
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

    const bundle = await ensureForecastBundle({
      userId: user.id,
      targetDate,
      location,
      force,
    });

    return jsonUtf8({
      ok: true,
      cached: bundle.cached,
      recomputed: !bundle.cached,
      gpt_pending: !hasCompletedGpt(bundle),
      target_date: targetDate,
      target_mode: mode,
      relative_target_mode: relativeTargetMode,
      location: serializeDisplayableRadarLocation(location, "現在地付近"),
      forecast: bundle.forecast,
      care_plan: bundle.care_plan,
      debug: bundle.debug,
    });
  } catch (error) {
    console.error("/api/radar/v1/forecast GET error:", error);
    return jsonUtf8({ ok: false, error: String(error) }, 500);
  }
}

