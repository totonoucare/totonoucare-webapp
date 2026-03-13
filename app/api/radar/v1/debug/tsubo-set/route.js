// app/api/radar/v1/debug/tsubo-set/route.js
import { fetchMetnoLocationForecast } from "@/lib/radar_v1/metnoClient";
import { decideTargetDateJST } from "@/lib/radar_v1/timeJST";
import { normalizeMetnoForTargetDate } from "@/lib/radar_v1/metnoNormalize";
import { buildWeatherStress } from "@/lib/radar_v1/weatherStress";
import { getRadarConstitutionProfile } from "@/lib/radar_v1/profileRepo";
import { differentiateForTcm } from "@/lib/radar_v1/differentiation";
import { pickTcmPoints } from "@/lib/radar_v1/pickTcmPoints";
import { selectMtestLine } from "@/lib/radar_v1/selectMtestLine";
import { selectMotherChild } from "@/lib/radar_v1/selectMotherChild";
import { selectMtestPoint } from "@/lib/radar_v1/selectMtestPoint";
import { composeTsuboSet } from "@/lib/radar_v1/composeTsuboSet";

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

    // TCM
    const differentiation = differentiateForTcm({
      core_code: profile.core_code,
      sub_labels: profile.sub_labels,
      weatherStress,
    });

    const tcmPoints = await pickTcmPoints({
      differentiation,
    });

    // M-test
    const selectedLine = selectMtestLine({
      primary_meridian: profile.primary_meridian,
      secondary_meridian: profile.secondary_meridian,
      weatherStress,
    });

    const motherChild = selectMotherChild({
      weatherStress,
      core_code: profile.core_code,
      sub_labels: profile.sub_labels,
    });

    const mtestPoint = await selectMtestPoint({
      selectedLine: selectedLine.selected_line,
      motherChild,
      weatherStress,
      previousPointCode: previousPointCode || null,
    });

    // Final set
    const tsuboSet = composeTsuboSet({
      tcmPoints,
      mtestPoint,
    });

    return Response.json({
      ok: true,
      user_id: userId,
      target_date: targetDate,
      target_mode: mode,
      location: { lat, lon },

      profile_debug: {
        core_code: profile.core_code,
        sub_labels: profile.sub_labels,
        primary_meridian: profile.primary_meridian,
        secondary_meridian: profile.secondary_meridian,
        symptom_focus: profile.symptom_focus,
        env: profile.env,
      },

      weather_stress: weatherStress,
      differentiation,
      tcm_points: tcmPoints,
      selected_line: selectedLine,
      mother_child: motherChild,
      mtest_point: mtestPoint,
      tsubo_set: tsuboSet,

      fetched_meta: meta,
    });
  } catch (e) {
    return Response.json(
      { ok: false, error: String(e) },
      { status: 500 }
    );
  }
}
