import { fetchMetnoLocationForecast } from "@/lib/radar_v1/metnoClient";
import { normalizeMetnoForTargetDate } from "@/lib/radar_v1/metnoNormalize";
import { buildWeatherStress } from "@/lib/radar_v1/weatherStress";
import {
  buildWeatherStressV2,
  RADAR_WEATHER_MODEL_VERSION,
} from "@/lib/radar_v1/weatherStressV2";
import { getRadarConstitutionProfile } from "@/lib/radar_v1/profileRepo";
import { getReviewFeedback } from "@/lib/radar_v1/reviewFeedback";
import { buildRiskContext } from "@/lib/radar_v1/buildRiskContext";
import { pickTcmPoints } from "@/lib/radar_v1/pickTcmPoints";
import { selectMtestPoint } from "@/lib/radar_v1/selectMtestPoint";
import { buildRadarPlan } from "@/lib/radar_v1/buildRadarPlan";
import { getPreviousMtestPointCode } from "@/lib/radar_v1/radarRepo";
import { nowJstParts, toJstISODate } from "@/lib/radar_v1/timeJST";

const REVIEW_FEEDBACK_ENABLED = process.env.RADAR_REVIEW_FEEDBACK_ENABLED === "true";
const FORECAST_MODEL_SETTING = String(process.env.RADAR_FORECAST_MODEL_VERSION || "v2").toLowerCase();

export async function buildFastRadarBundle({
  userId,
  targetDate,
  location,
  generationSlot = "on_demand",
}) {
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

  const useV2 = FORECAST_MODEL_SETTING !== "v1";
  const weatherStress = useV2
    ? buildWeatherStressV2({
        points: normalized.points,
        previousNightBridgePoints: includePreviousNightBridge
          ? normalized.previousNightBridgePoints
          : null,
      })
    : buildWeatherStress({
        points: normalized.points,
        previousNightBridgePoints: includePreviousNightBridge
          ? normalized.previousNightBridgePoints
          : null,
      });

  const riskContext = buildRiskContext({
    profile: profileWithFeedback,
    weatherStress,
    forecastModelVersion: useV2 ? "v2" : "v1",
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
    targetDate,
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
    forecast_model_setting: useV2 ? "v2" : "v1",
    forecast_model_version:
      riskContext?.meta?.personalized_meta?.forecast_model_version ||
      (useV2 ? "radar_forecast_v2_2026-07-23_pressure_response_integrated" : "radar_forecast_v1"),
    radar_weather_extraction_version: useV2
      ? RADAR_WEATHER_MODEL_VERSION
      : "radar_v1_weather_day_only_plus_tomorrow_night_bridge_2026-05-06",
    snapshot_generation_slot: generationSlot,
    profile_fingerprint: buildProfileFingerprint(profile),
    location_fingerprint: `${Number(location.lat).toFixed(4)},${Number(location.lon).toFixed(4)}`,
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

function buildProfileFingerprint(profile) {
  const payload = JSON.stringify({
    core_code: profile?.core_code || null,
    sub_labels: profile?.sub_labels || [],
    symptom_focus: profile?.symptom_focus || null,
    env: profile?.env || null,
    axes: profile?.axes || null,
    split_scores: profile?.split_scores || null,
  });
  let hash = 2166136261;
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `pf_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}


function isTomorrowTargetDate(targetDate) {
  const { isoDate: today } = nowJstParts(new Date());
  const [y, m, d] = today.split("-").map(Number);
  const tomorrowDate = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0));
  const tomorrow = toJstISODate(tomorrowDate);
  return targetDate === tomorrow;
}
