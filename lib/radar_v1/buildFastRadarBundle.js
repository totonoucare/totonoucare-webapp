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

export async function buildFastRadarBundle({
  userId,
  targetDate,
  lat,
  lon,
  timezone = "Asia/Tokyo",
  relativeTargetMode = "explicit",
}) {
  const profile = await getRadarConstitutionProfile(userId);
  if (!profile) {
    throw new Error("No constitution profile found. Run diagnosis first.");
  }

  const metnoRaw = await fetchMetnoLocationForecast({ lat, lon });
  const weatherSnapshot = normalizeMetnoForTargetDate(metnoRaw, targetDate);

  if (!weatherSnapshot) {
    throw new Error(`No weather snapshot for target date: ${targetDate}`);
  }

  const weatherStress = buildWeatherStress(weatherSnapshot);
  const reviewFeedback = await getReviewFeedback({ userId, targetDate });

  const riskContext = buildRiskContext({
    profile,
    weatherStress,
    targetDate,
    reviewFeedback,
  });

  const previousMtestPointCode = await getPreviousMtestPointCode({
    userId,
    beforeDate: targetDate,
  });

  const tcmPoints = await pickTcmPoints({
    differentiation: riskContext.tcm_differentiation,
  });

  const mtestPoint = await selectMtestPoint({
    selectedLine: riskContext.selected_mtest_line,
    motherChild: riskContext.mother_child,
    previousPointCode: previousMtestPointCode,
    triggerType: riskContext.trigger_type,
    triggerDir: riskContext.trigger_dir,
  });

  const radarPlan = buildRadarPlan({
    targetDate,
    relativeTargetMode,
    timezone,
    weatherSnapshot,
    riskContext,
    tcmPoints,
    mtestPoint,
  });

  return {
    profile,
    metnoRaw,
    weatherSnapshot,
    weatherStress,
    reviewFeedback,
    riskContext,
    tcmPoints,
    mtestPoint,
    radarPlan,
  };
}
