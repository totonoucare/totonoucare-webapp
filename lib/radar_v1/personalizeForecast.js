import { exactTriggerToCompat } from "@/lib/radar_v1/weatherStress";
import {
  EXACT_WEATHER_KEYS,
  buildPersonalWeatherAffinityProfile,
  getBatteryScalar,
} from "@/lib/radar_v1/weatherAffinityProfile";

const CHANNEL_IMPORTANCE = {
  pressure_down: 1.05,
  pressure_up: 0.96,
  cold: 0.98,
  heat: 0.94,
  damp: 1.02,
  dry: 0.92,
};

const UNIVERSAL_WEATHER_SHARE = 0.35;
const PERSONAL_AFFINITY_SHARE = 0.75;
const EFFECTIVE_LOAD_CAP = 1.08;

function clamp01(value) {
  const num = Number(value) || 0;
  return Math.max(0, Math.min(1, num));
}

function clamp(value, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.max(min, Math.min(max, num));
}

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function clampInt(value, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.max(min, Math.min(max, Math.round(num)));
}

function emptyChannelMap() {
  return Object.fromEntries(EXACT_WEATHER_KEYS.map((key) => [key, 0]));
}

function normalizePerChannelBonus(src) {
  const out = emptyChannelMap();
  for (const key of EXACT_WEATHER_KEYS) {
    out[key] = clamp(Number(src?.[key] ?? 0), 0, 0.16);
  }
  return out;
}

function buildReviewSummary(reviewFeedback) {
  // Current getReviewFeedback() shape.
  if (reviewFeedback && !Array.isArray(reviewFeedback)) {
    const perChannelBonus = normalizePerChannelBonus(reviewFeedback.per_channel_bonus);
    const topChannels = Array.isArray(reviewFeedback.top_channels)
      ? reviewFeedback.top_channels.slice(0, 3)
      : [];

    return {
      observed_review_days: Number(reviewFeedback.observed_review_days ?? 0),
      bad_reviewed_days: Number(reviewFeedback.bad_reviewed_days ?? 0),
      baseline_bad_ratio: Number(reviewFeedback.baseline_bad_ratio ?? 0),
      top_channels: topChannels,
      per_channel_bonus: perChannelBonus,
      applied: Object.values(perChannelBonus).some((value) => value > 0),
      worse_tags: [],
    };
  }

  // Legacy / experimental shape.
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
    per_channel_bonus: emptyChannelMap(),
    applied: tags.size > 0,
  };
}

function normalizeEnvInput(constitution = {}, diagnosis = {}) {
  const env =
    diagnosis?.env && typeof diagnosis.env === "object"
      ? diagnosis.env
      : constitution?.env && typeof constitution.env === "object" && !Array.isArray(constitution.env)
        ? constitution.env
        : {};

  const envVectors =
    Array.isArray(diagnosis?.env_vectors) && diagnosis.env_vectors.length
      ? diagnosis.env_vectors
      : Array.isArray(env?.vectors)
        ? env.vectors
        : Array.isArray(constitution?.env)
          ? constitution.env
          : Array.isArray(constitution?.envVectors)
            ? constitution.envVectors
            : [];

  const sensitivity =
    diagnosis?.sensitivity ??
    diagnosis?.env_sensitivity ??
    env?.sensitivity ??
    constitution?.sensitivity ??
    "normal";

  return {
    envVectors,
    sensitivity,
  };
}

function normalizeConstitutionInput(constitution = {}) {
  const diagnosis = constitution?.diagnosis_result || {};
  const env = normalizeEnvInput(constitution, diagnosis);

  const subRiskWeights =
    Array.isArray(diagnosis?.sub_risk_weights) && diagnosis.sub_risk_weights.length
      ? diagnosis.sub_risk_weights
      : Array.isArray(constitution?.sub_labels)
        ? constitution.sub_labels
        : Array.isArray(constitution?.subRiskWeights)
          ? constitution.subRiskWeights
          : [];

  return {
    coreType:
      diagnosis?.core_type ||
      constitution?.core_code ||
      constitution?.coreType ||
      constitution?.core_type ||
      null,
    subRiskWeights,
    envVectors: env.envVectors,
    sensitivity: env.sensitivity,
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
    reviewChannelBonus: reviewSummary?.per_channel_bonus || null,
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
    normalized,
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

function buildEffectiveChannelLoads(weatherStrengths, affinityWeights) {
  const result = {};
  for (const key of EXACT_WEATHER_KEYS) {
    const weather = weatherStrengths[key] || 0;
    const affinity = affinityWeights[key] || 0;
    const load = weather * (UNIVERSAL_WEATHER_SHARE + PERSONAL_AFFINITY_SHARE * affinity);
    result[key] = round2(clamp(load, 0, EFFECTIVE_LOAD_CAP));
  }
  return result;
}

function pickExactMainTrigger(channelLoads) {
  const [key, value] =
    EXACT_WEATHER_KEYS
      .map((name) => [name, Number(channelLoads?.[name] || 0)])
      .sort((a, b) => b[1] - a[1])[0] || [];

  return value > 0.05 ? key : "none";
}

function computeScore({ effectiveLoads, weatherStrengths, affinityWeights, batteryScalar }) {
  const entries = EXACT_WEATHER_KEYS
    .map((key) => ({
      key,
      load: Number(effectiveLoads?.[key] || 0),
      weather: Number(weatherStrengths?.[key] || 0),
      affinity: Number(affinityWeights?.[key] || 0),
    }))
    .sort((a, b) => b.load - a.load);

  const [top = {}, second = {}, third = {}] = entries;

  let score =
    (top.load || 0) * 5.2 * (CHANNEL_IMPORTANCE[top.key] || 1) +
    (second.load || 0) * 2.0 * (CHANNEL_IMPORTANCE[second.key] || 1) +
    (third.load || 0) * 1.0 * (CHANNEL_IMPORTANCE[third.key] || 1);

  // Battery should shift vulnerability, but not dominate the weather signal.
  const scalar = Number(batteryScalar || 1);
  score *= clamp(scalar, 0.92, 1.1);

  if ((top.weather || 0) >= 0.85 && (top.affinity || 0) >= 0.7) score += 0.8;
  else if ((top.weather || 0) >= 0.85) score += 0.35;

  if ((second.load || 0) >= 0.5) score += 0.45;
  if (entries.filter((entry) => entry.load >= 0.32).length >= 3) score += 0.35;

  return clampInt(score, 0, 10);
}

function toSignal(score) {
  if (score >= 6) return 2;
  if (score >= 4) return 1;
  return 0;
}

function getTopChannels(channels, limit = 3) {
  return Object.entries(channels)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, value]) => ({ key, value }));
}

export function personalizeForecast({
  weatherStress,
  constitution,
  reviewFeedback = null,
}) {
  const reviewSource =
    reviewFeedback ??
    constitution?.review_feedback ??
    constitution?.reviewFeedback ??
    null;

  const reviewSummary = buildReviewSummary(reviewSource);
  const affinity = buildExactAffinity(constitution, reviewSummary);
  const weatherStrengths = getWeatherExactStrengths(weatherStress);
  const personalChannels = buildPersonalChannelStrengths(weatherStrengths, affinity.weights);
  const effectiveLoads = buildEffectiveChannelLoads(weatherStrengths, affinity.weights);
  const exactMainTrigger = pickExactMainTrigger(effectiveLoads);
  const compat = exactTriggerToCompat(exactMainTrigger);
  const score = computeScore({
    effectiveLoads,
    weatherStrengths,
    affinityWeights: affinity.weights,
    batteryScalar: affinity.batteryScalar,
  });
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
      normalized_constitution: affinity.normalized,
      battery_tier: affinity.batteryTier,
      battery_scalar: affinity.batteryScalar,
      weather_strengths: weatherStrengths,
      personal_channel_strengths: personalChannels,
      effective_channel_loads: effectiveLoads,
      top_personal_channels: getTopChannels(effectiveLoads, 3),
      review_feedback: reviewSummary,
    },
  };
}
