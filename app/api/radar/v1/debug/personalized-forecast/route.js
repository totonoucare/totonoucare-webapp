// app/api/radar/v1/debug/personalized-forecast/route.js
import { fetchMetnoLocationForecast } from "@/lib/radar_v1/metnoClient";
import { decideTargetDateJST } from "@/lib/radar_v1/timeJST";
import { normalizeMetnoForTargetDate } from "@/lib/radar_v1/metnoNormalize";
import { buildWeatherStress } from "@/lib/radar_v1/weatherStress";
import { personalizeForecast } from "@/lib/radar_v1/personalizeForecast";

export const runtime = "nodejs";

export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const lat = Number(searchParams.get("lat") ?? "35.681236");
  const lon = Number(searchParams.get("lon") ?? "139.767125");
  const date = searchParams.get("date");

  const core_code = searchParams.get("core_code") ?? "steady_batt_standard";
  const sub_labels = (searchParams.get("sub_labels") ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  const env_sensitivity = Number(searchParams.get("env_sensitivity") ?? "0");
  const env_vectors = (searchParams.get("env_vectors") ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return Response.json(
      { ok: false, error: "lat/lon must be numbers" },
      { status: 400 }
    );
  }

  try {
    const { targetDate, mode } = decideTargetDateJST({ date: date || null });

    const { data, meta } = await fetchMetnoLocationForecast({ lat, lon });

    const normalized = normalizeMetnoForTargetDate({
      metnoJson: data,
      targetDate,
    });

    if (!normalized.points.length) {
      return Response.json({
        ok: false,
        error: "normalized.points is empty",
        debug: {
          target_date: targetDate,
          target_mode: mode,
          location: { lat, lon },
          total_timeseries_count: data?.properties?.timeseries?.length ?? 0,
          first_times: (data?.properties?.timeseries ?? []).slice(0, 8).map((x) => x.time),
          last_times: (data?.properties?.timeseries ?? []).slice(-8).map((x) => x.time),
          normalized_point_count: normalized.points.length,
        },
      }, { status: 500 });
    }

    const weatherStress = buildWeatherStress({ points: normalized.points });

    const personalized = personalizeForecast({
      weatherStress,
      constitution: {
        core_code,
        sub_labels,
        env: {
          sensitivity: Number.isFinite(env_sensitivity) ? env_sensitivity : 0,
          vectors: env_vectors,
        },
      },
    });

    return Response.json({
      ok: true,
      target_date: targetDate,
      target_mode: mode,
      location: { lat, lon },

      constitution_debug: {
        core_code,
        sub_labels,
        env: {
          sensitivity: env_sensitivity,
          vectors: env_vectors,
        },
      },

      normalized_point_count: normalized.points.length,
      weather_stress: weatherStress,
      personalized_forecast: personalized,
      fetched_meta: meta,
    });
  } catch (e) {
    return Response.json(
      { ok: false, error: String(e) },
      { status: 500 }
    );
  }
}
