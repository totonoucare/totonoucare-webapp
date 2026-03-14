// app/api/radar/v1/debug/radar-plan/route.js
import { fetchMetnoLocationForecast } from "@/lib/radar_v1/metnoClient";
import { decideTargetDateJST } from "@/lib/radar_v1/timeJST";
import { normalizeMetnoForTargetDate } from "@/lib/radar_v1/metnoNormalize";
import { buildWeatherStress } from "@/lib/radar_v1/weatherStress";
import { getRadarConstitutionProfile } from "@/lib/radar_v1/profileRepo";
import { buildRiskContext } from "@/lib/radar_v1/buildRiskContext";
import { pickTcmPoints } from "@/lib/radar_v1/pickTcmPoints";
import { selectMtestPoint } from "@/lib/radar_v1/selectMtestPoint";
import { buildRadarPlan } from "@/lib/radar_v1/buildRadarPlan";

export const runtime = "nodejs";

export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const lat = Number(searchParams.get("lat") ?? "35.681236");
  const lon = Number(searchParams.get("lon") ?? "139.767125");
  const date = searchParams.get("date");
  const userId = searchParams.get("user_id");
  const previousPointCode = searchParams.get("previous_point_code");

  if (!userId) {
    return Response.json(
      { ok: false, error: "user_id is required" },
      { status: 400 }
    );
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return Response.json(
      { ok: false, error: "lat/lon must be numbers" },
      { status: 400 }
    );
  }

  try {
    const profile = await getRadarConstitutionProfile({ userId });

    if (!profile) {
      return Response.json(
        { ok: false, error: "constitution_profile not found for this user_id" },
        { status: 404 }
      );
    }

    const { targetDate, mode } = decideTargetDateJST({ date: date || null });

    const { data, meta } = await fetchMetnoLocationForecast({ lat, lon });
    const normalized = normalizeMetnoForTargetDate({
      metnoJson: data,
      targetDate,
    });

    if (!normalized.points.length) {
      return Response.json(
        {
          ok: false,
          error: "normalized.points is empty",
          debug: {
            target_date: targetDate,
            target_mode: mode,
            total_timeseries_count: data?.properties?.timeseries?.length ?? 0,
          },
        },
        { status: 500 }
      );
    }

    const weatherStress = buildWeatherStress({ points: normalized.points });

    const riskContext = buildRiskContext({
      profile,
      weatherStress,
    });

    const tcmPoints = await pickTcmPoints({
      differentiation: riskContext.tcm_context,
    });

    const mtestPoint = await selectMtestPoint({
      selectedLine: riskContext.mtest_context.selected_line,
      motherChild: { mode: riskContext.mtest_context.mode },
      weatherStress,
      previousPointCode: previousPointCode || null,
    });

    const radarPlan = buildRadarPlan({
      riskContext,
      tcmPoints,
      mtestPoint,
    });

    return Response.json({
      ok: true,
      user_id: userId,
      target_date: targetDate,
      target_mode: mode,
      location: { lat, lon },
      point_count: normalized.points.length,
      radar_plan: radarPlan,
      fetched_meta: meta,
    });
  } catch (e) {
    return Response.json(
      { ok: false, error: String(e) },
      { status: 500 }
    );
  }
}
