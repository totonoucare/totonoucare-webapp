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
import { nowJstParts, toJstISODate } from "@/lib/radar_v1/timeJST";

const REVIEW_FEEDBACK_ENABLED = process.env.RADAR_REVIEW_FEEDBACK_ENABLED === "true";

export async function buildFastRadarBundle({ userId, targetDate, location }) {
  const profile = await getRadarConstitutionProfile({ userId });
  if (!profile) {
    throw new Error("constitution_profile not found");
  }

  // 記録は分析には使うが、現行運用では予報ロジックへ戻さない。
  // 明示的に環境変数を有効化した検証環境だけ、旧レビュー補正を使用できる。
  const reviewFeedback = REVIEW_FEEDBACK_ENABLED
    ? await getReviewFeedback({
        userId,
        beforeDate: targetDate,
      })
    : null;

  const profileWithFeedback = {
    ...profile,
    review_feedback: reviewFeedback,
  };

  const { data: metnoData, meta: metnoMeta } = await fetchMetnoLocationForecast({
    lat: location.lat,
    lon: location.lon,
  });

  const includePreviousNightBridge = isTomorrowTargetDate(targetDate);

  const normalized = normalizeMetnoForTargetDate({
    metnoJson: metnoData,
    targetDate,
    includePreviousNightBridge,
  });

  if (!normalized.points.length) {
    throw new Error("No forecast points for target_date");
  }

  const weatherStress = buildWeatherStress({
    points: normalized.points,
    previousNightBridgePoints: includePreviousNightBridge
      ? normalized.previousNightBridgePoints
      : null,
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
    previous_night_bridge_point_count:
      normalized.previousNightBridgePoints?.length || 0,
    previous_night_bridge_applied:
      Boolean(weatherStress?.meta?.night_bridge?.applied),
    partial_day: normalized.points.length < 24,
    previous_mtest_point_code: previousPointCode || null,
    review_feedback_enabled: REVIEW_FEEDBACK_ENABLED,
    review_feedback: reviewFeedback,
    radar_weather_extraction_version: "radar_v1_weather_day_only_plus_tomorrow_night_bridge_2026-05-06",
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


function isTomorrowTargetDate(targetDate) {
  const { isoDate: today } = nowJstParts(new Date());
  const [y, m, d] = today.split("-").map(Number);
  const tomorrowDate = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0));
  const tomorrow = toJstISODate(tomorrowDate);
  return targetDate === tomorrow;
}



