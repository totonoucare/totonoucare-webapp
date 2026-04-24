import { exactTriggerToCompat } from "@/lib/radar_v1/weatherStress";
import {
  EXACT_WEATHER_KEYS,
  buildPersonalWeatherAffinityProfile,
  getBatteryScalar,
} from "@/lib/radar_v1/weatherAffinityProfile";

const CHANNEL_IMPORTANCE = {
  pressure_down: 3.1,
  pressure_up: 2.7,
  cold: 2.7,
  heat: 2.5,
  damp: 3.0,
  dry: 2.6,
};

function clamp01(value) {
  const num = Number(value) || 0;
  return Math.max(0, Math.min(1, num));
}

function round1(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function clampInt(value, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.max(min, Math.min(max, Math.round(num)));
}

function buildReviewSummary(reviewFeedback) {
  const entries = Array.isArray(reviewFeedback) ? reviewFeedback : [];
  const tags = new Set();

  for (const entry of entries) {
    if (!entry || entry.better_or_worse !== "worse") continue;
    const rawTags = Array.isArray(entry.weather_tags) ? entry.weather_tags : [];
    rawTags.forEach((tag) => {
      const value = String(tag || "").trim();
      if (value) tags.add(value);
    });
  }

  return {
    worse_tags: [...tags],
    applied: tags.size > 0,
  };
}

function normalizeConstitutionInput(constitution = {}) {
  const diagnosis = constitution?.diagnosis_result || {};

  const subRiskWeights = Array.isArray(diagnosis?.sub_risk_weights) && diagnosis.sub_risk_weights.length
    ? diagnosis.sub_risk_weights
    : Array.isArray(constitution?.sub_labels)
      ? constitution.sub_labels
      : Array.isArray(constitution?.subRiskWeights)
        ? constitution.subRiskWeights
        : [];

  const envVectors = Array.isArray(diagnosis?.env_vectors) && diagnosis.env_vectors.length
    ? diagnosis.env_vectors
    : Array.isArray(constitution?.env)
      ? constitution.env
      : Array.isArray(constitution?.envVectors)
        ? constitution.envVectors
        : [];

  return {
    coreType:
      diagnosis?.core_type ||
      constitution?.core_code ||
      constitution?.coreType ||
      constitution?.core_type ||
      null,
    subRiskWeights,
    envVectors,
    sensitivity: diagnosis?.sensitivity || constitution?.sensitivity || "normal",
  };
}

function buildExactAffinity(constitution, reviewSummary) {
  const normalized = normalizeConstitutionInput(constitution);
  const profile = buildPersonalWeatherAffinityProfile({
    coreType: normalized.coreType,
    subRiskWeights: normalized.subRiskWeights,
    envVectors: normalized.envVectors,
    sensitivity: normalized.sensitivity,
    worseTags: reviewSummary?.worse_tags || [],
  });

  const weights = {};
  for (const key of EXACT_WEATHER_KEYS) {
    weights[key] = round2(profile.weights[key] || 0);
  }

  return {
    weights,
    batteryScalar: getBatteryScalar(normalized.coreType),
    batteryTier: profile.batteryTier,
    core_weights: profile.core,
    sub_codes: profile.subCodes,
  };
}

function getWeatherExactStrengths(weatherStress) {
  return {
    pressure_down: clamp01(weatherStress?.pressure_down_strength ?? 0),
    pressure_up: clamp01(weatherStress?.pressure_up_strength ?? 0),
    cold: clamp01(weatherStress?.cold_strength ?? 0),
    heat: clamp01(weatherStress?.heat_strength ?? 0),
    damp: clamp01(weatherStress?.damp_strength ?? 0),
    dry: clamp01(weatherStress?.dry_strength ?? 0),
  };
}

function buildPersonalChannelStrengths(weatherStrengths, affinityWeights) {
  const result = {};
  for (const key of EXACT_WEATHER_KEYS) {
    result[key] = round2((weatherStrengths[key] || 0) * (affinityWeights[key] || 0));
  }
  return result;
}

function pickExactMainTrigger(personalChannels) {
  return EXACT_WEATHER_KEYS
    .map((key) => [key, Number(personalChannels?.[key] || 0)])
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function computeScore(personalChannels, batteryScalar) {
  const ranked = EXACT_WEATHER_KEYS
    .map((key) => Number(personalChannels?.[key] || 0))
    .sort((a, b) => b - a);

  let score = EXACT_WEATHER_KEYS.reduce((sum, key) => {
    return sum + (personalChannels?.[key] || 0) * (CHANNEL_IMPORTANCE[key] || 0);
  }, 0);

  score *= Number(batteryScalar || 1);

  if ((ranked[0] || 0) >= 0.55) score += 0.8;
  if ((ranked[1] || 0) >= 0.32) score += 0.5;
  if (ranked.filter((value) => value >= 0.18).length >= 3) score += 0.3;

  return clampInt(score, 0, 10);
}

function toSignal(score) {
  if (score >= 6.2) return 2;
  if (score >= 3.2) return 1;
  return 0;
}

function getTopChannels(personalChannels, limit = 3) {
  return Object.entries(personalChannels)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, value]) => ({ key, value }));
}

export function personalizeForecast({ weatherStress, constitution, reviewFeedback = [] }) {
  const reviewSummary = buildReviewSummary(reviewFeedback);
  const affinity = buildExactAffinity(constitution, reviewSummary);
  const weatherStrengths = getWeatherExactStrengths(weatherStress);
  const personalChannels = buildPersonalChannelStrengths(weatherStrengths, affinity.weights);
  const exactMainTrigger = pickExactMainTrigger(personalChannels);
  const compat = exactTriggerToCompat(exactMainTrigger);
  const score = computeScore(personalChannels, affinity.batteryScalar);
  const signal = toSignal(score);

  return {
    score_0_10: score,
    signal,
    exact_main_trigger: exactMainTrigger,
    personal_main_trigger_exact: exactMainTrigger,
    main_trigger: compat?.main_trigger || null,
    trigger_dir: compat?.trigger_dir || null,
    active_peak_start: weatherStress?.active_peak_start || null,
    active_peak_end: weatherStress?.active_peak_end || null,
    full_day_peak_start:
      weatherStress?.full_day_peak_start || weatherStress?.active_peak_start || null,
    full_day_peak_end:
      weatherStress?.full_day_peak_end || weatherStress?.active_peak_end || null,
    meta: {
      exact_affinity_weights: affinity.weights,
      core_weather_weights: affinity.core_weights,
      sub_codes: affinity.sub_codes,
      battery_tier: affinity.batteryTier,
      battery_scalar: affinity.batteryScalar,
      weather_strengths: weatherStrengths,
      personal_channel_strengths: personalChannels,
      top_personal_channels: getTopChannels(personalChannels, 3),
      review_feedback: reviewSummary,
    },
  };
}
