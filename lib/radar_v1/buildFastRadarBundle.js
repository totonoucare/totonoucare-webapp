import { fetchMetnoLocationForecast } from "@/lib/radar_v1/metnoClient";
import { normalizeMetnoForTargetDate } from "@/lib/radar_v1/metnoNormalize";
import { buildWeatherStress } from "@/lib/radar_v1/weatherStress";
import { getRadarConstitutionProfile } from "@/lib/radar_v1/profileRepo";
import { getReviewFeedback } from "@/lib/radar_v1/reviewFeedback";
import { buildRiskContext } from "@/lib/radar_v1/buildRiskContext";
import { pickTcmPoints } from "@/lib/radar_v1/pickTcmPoints";
import { selectMtestPoint } from "@/lib/radar_v1/selectMtestPoint";
import { buildRadarPlan } from "@/lib/radar_v1/buildRadarPlan";
import { getPreviousMtestPointCode } from "@/lib/radar_v1/radarRepo";

export async function buildFastRadarBundle({ userId, targetDate, location }) {
  const profile = await getRadarConstitutionProfile({ userId });
  if (!profile) {
    throw new Error("constitution_profile not found");
  }

  const reviewFeedback = await getReviewFeedback({
    userId,
    beforeDate: targetDate,
  });

  const profileWithFeedback = {
    ...profile,
    review_feedback: reviewFeedback,
  };

  const { data: metnoData, meta: metnoMeta } = await fetchMetnoLocationForecast({
    lat: location.lat,
    lon: location.lon,
  });

  const normalized = normalizeMetnoForTargetDate({
    metnoJson: metnoData,
    targetDate,
  });

  if (!normalized.points.length) {
    throw new Error("No forecast points for target_date");
  }

  const weatherStress = buildWeatherStress({
    points: normalized.points,
  });

  const riskContext = buildRiskContext({
    profile: profileWithFeedback,
    weatherStress,
  });

  const tcmPoints = await pickTcmPoints({
    differentiation: riskContext.tcm_context,
    riskContext,
  });

  const previousPointCode = await getPreviousMtestPointCode({
    userId,
    beforeDate: targetDate,
  });

  const mtestPoint = await selectMtestPoint({
    selectedLine: riskContext.mtest_context.selected_line,
    motherChild: { mode: riskContext.mtest_context.mode },
    weatherStress: {
      main_trigger: riskContext.summary.main_trigger,
      trigger_dir: riskContext.summary.trigger_dir,
      pressure_down_strength: riskContext.weather_context.pressure_down_strength,
      cold_strength: riskContext.weather_context.cold_strength,
      damp_strength: riskContext.weather_context.damp_strength,
    },
    previousPointCode,
  });

  const radarPlan = buildRadarPlan({
    riskContext,
    tcmPoints,
    mtestPoint,
  });

  const vendorMeta = {
    metno: metnoMeta,
    point_count: normalized.points.length,
    partial_day: normalized.points.length < 24,
    previous_mtest_point_code: previousPointCode || null,
    review_feedback: reviewFeedback,
    radar_weather_extraction_version: "radar_v1_weather_day_only_rolling_2026-04-24",
  };

  return {
    profile,
    reviewFeedback,
    normalized,
    riskContext,
    radarPlan,
    vendorMeta,
  };
}
