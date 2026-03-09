// app/api/radar/v1/debug/weather-stress/route.js
import { fetchMetnoLocationForecast } from "@/lib/radar_v1/metnoClient";
import { decideTargetDateJST } from "@/lib/radar_v1/timeJST";
import { normalizeMetnoForTargetDate } from "@/lib/radar_v1/metnoNormalize";
import { buildWeatherStress } from "@/lib/radar_v1/weatherStress";

export const runtime = "nodejs";

export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const lat = Number(searchParams.get("lat") ?? "35.681236");
  const lon = Number(searchParams.get("lon") ?? "139.767125");
  const date = searchParams.get("date");

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

    const stress = buildWeatherStress({ points: normalized.points });

    return Response.json({
      ok: true,
      target_date: targetDate,
      target_mode: mode,
      location: { lat, lon },
      fetched_meta: meta,
      point_count: normalized.points.length,
      weather_stress: stress,
      sample_points: normalized.points.slice(0, 6),
    });
  } catch (e) {
    return Response.json(
      { ok: false, error: String(e) },
      { status: 500 }
    );
  }
}
