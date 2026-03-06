// app/api/radar/v1/_debug/metno/route.js
import { fetchMetnoLocationForecast } from "@/lib/radar_v1/metnoClient";

export const runtime = "nodejs";

export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const lat = Number(searchParams.get("lat") ?? "35.681236");
  const lon = Number(searchParams.get("lon") ?? "139.767125");

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return Response.json(
      { ok: false, error: "lat/lon must be numbers" },
      { status: 400 }
    );
  }

  try {
    const { data, meta } = await fetchMetnoLocationForecast({ lat, lon });

    // timeseriesが大きいので、確認しやすいように先頭だけ返す
    const timeseries = data?.properties?.timeseries ?? [];
    const sample = timeseries.slice(0, 3);

    return Response.json({
      ok: true,
      meta,
      location: { lat, lon },
      sample_count: sample.length,
      sample,
      total_timeseries_count: timeseries.length,
    });
  } catch (e) {
    return Response.json(
      { ok: false, error: String(e) },
      { status: 500 }
    );
  }
}
