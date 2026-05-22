import { buildFastRadarBundle } from "@/lib/radar_v1/buildFastRadarBundle";
import { getRadarConstitutionProfile } from "@/lib/radar_v1/profileRepo";
import {
  getForecastBundle,
  saveForecast,
  saveCarePlan,
} from "@/lib/radar_v1/radarRepo";

function hasForecastAndCarePlan(bundle) {
  return Boolean(bundle?.forecast && bundle?.care_plan);
}

function getCachedSymptomFocus(bundle) {
  const riskContext = bundle?.forecast?.computed?.radar_plan_meta?.risk_context || null;
  return (
    riskContext?.constitution_context?.symptom_focus ||
    bundle?.care_plan?.tomorrow_food_context?.symptom_focus ||
    bundle?.forecast?.computed?.forecast_snapshot?.symptom_focus ||
    null
  );
}

function getCachedCoreCode(bundle) {
  const riskContext = bundle?.forecast?.computed?.radar_plan_meta?.risk_context || null;
  return (
    riskContext?.constitution_context?.core_code ||
    bundle?.forecast?.computed?.forecast_snapshot?.core_code ||
    null
  );
}

function buildProfileCacheState({ bundle, profile }) {
  const cachedSymptomFocus = getCachedSymptomFocus(bundle);
  const activeSymptomFocus = profile?.symptom_focus || null;
  const cachedCoreCode = getCachedCoreCode(bundle);
  const activeCoreCode = profile?.core_code || null;

  return {
    cached_symptom_focus: cachedSymptomFocus,
    active_symptom_focus: activeSymptomFocus,
    cached_core_code: cachedCoreCode,
    active_core_code: activeCoreCode,
    stale_active_symptom: Boolean(activeSymptomFocus && cachedSymptomFocus !== activeSymptomFocus),
    stale_core_code: Boolean(activeCoreCode && cachedCoreCode && cachedCoreCode !== activeCoreCode),
  };
}

function shouldInvalidateCachedBundle(profileCacheState) {
  return Boolean(profileCacheState?.stale_active_symptom || profileCacheState?.stale_core_code);
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

  let cacheInvalidation = null;

  if (!force) {
    const existing = await getForecastBundle({ userId, targetDate });

    if (existing?.forecast) {
      const activeProfile = await getRadarConstitutionProfile({ userId });
      const profileCacheState = buildProfileCacheState({
        bundle: existing,
        profile: activeProfile,
      });

      if (shouldInvalidateCachedBundle(profileCacheState)) {
        cacheInvalidation = profileCacheState;
      } else if (hasForecastAndCarePlan(existing)) {
        return {
          cached: true,
          partial: false,
          forecast: existing.forecast,
          care_plan: existing.care_plan,
          debug: {
            from_cache: true,
            point_count: null,
            partial_day: null,
            profile_cache_state: profileCacheState,
          },
        };
      } else {
        // 予報行が保存済みなら、表示取得ではMET Norwayへ再取得しない。
        // care_plan欠損はデータ不整合としてpartial返却し、明示更新(force=1)だけが再計算を行う。
        return {
          cached: true,
          partial: true,
          forecast: existing.forecast,
          care_plan: existing.care_plan || null,
          debug: {
            from_cache: true,
            partial_bundle: true,
            missing_care_plan: !existing.care_plan,
            point_count: null,
            partial_day: null,
            profile_cache_state: profileCacheState,
          },
        };
      }
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
      cache_invalidation: cacheInvalidation,
    },
  };
}


