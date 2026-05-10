import { buildFastRadarBundle } from "@/lib/radar_v1/buildFastRadarBundle";
import {
  getForecastBundle,
  saveForecast,
  saveCarePlan,
} from "@/lib/radar_v1/radarRepo";

function hasForecastAndCarePlan(bundle) {
  return Boolean(bundle?.forecast && bundle?.care_plan);
}

/**
 * 予報表示API・通知Cronの両方から使う、radar_v1の共通生成処理。
 *
 * - 既存の forecast + care_plan があれば再利用する
 * - なければ buildFastRadarBundle → saveForecast → saveCarePlan まで行う
 * - GPT生成はここでは行わない。通知Cronでは構造化予報だけを使う
 */
export async function ensureForecastBundle({
  userId,
  targetDate,
  location,
  force = false,
}) {
  if (!userId) throw new Error("ensureForecastBundle: userId is required");
  if (!targetDate) throw new Error("ensureForecastBundle: targetDate is required");
  if (!location?.id) throw new Error("ensureForecastBundle: location.id is required");

  if (!force) {
    const existing = await getForecastBundle({ userId, targetDate });
    if (hasForecastAndCarePlan(existing)) {
      return {
        cached: true,
        forecast: existing.forecast,
        care_plan: existing.care_plan,
        debug: {
          from_cache: true,
          point_count: null,
          partial_day: null,
        },
      };
    }
  }

  const { radarPlan, vendorMeta, normalized } = await buildFastRadarBundle({
    userId,
    targetDate,
    location,
  });

  const forecast = await saveForecast({
    userId,
    targetDate,
    locationId: location.id,
    radarPlan,
    vendor: "metno",
    vendorMeta,
    preserveGptIfMissing: !force,
  });

  const carePlan = await saveCarePlan({
    forecastId: forecast.id,
    radarPlan,
    preserveGptIfMissing: !force,
  });

  return {
    cached: false,
    forecast,
    care_plan: carePlan,
    radarPlan,
    vendorMeta,
    normalized,
    debug: {
      from_cache: false,
      point_count: normalized.points.length,
      partial_day: normalized.points.length < 24,
    },
  };
}

