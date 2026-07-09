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

const UNIVERSAL_WEATHER_SHARE = 0.3;
const PERSONAL_AFFINITY_SHARE = 0.68;
const EFFECTIVE_LOAD_CAP = 1.0;
const SECONDARY_TRIGGER_MIN_LOAD = 0.2;
const SECONDARY_TRIGGER_MIN_RATIO = 0.45;

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
  const top = rankEffectiveChannels(channelLoads)[0] || null;
  return top && top.value > 0.05 ? top.key : "none";
}

function rankEffectiveChannels(channelLoads) {
  return EXACT_WEATHER_KEYS
    .map((key) => ({ key, value: round2(Number(channelLoads?.[key] || 0)) }))
    .sort((a, b) => b.value - a.value);
}

function buildTriggerFactors({ effectiveLoads, weatherStrengths, affinityWeights, channelPeaks }) {
  const ranked = rankEffectiveChannels(effectiveLoads);
  const top = ranked[0] || null;

  if (!top || top.value <= 0.05) return [];

  const out = [
    buildTriggerFactor({
      key: top.key,
      role: "primary",
      effectiveLoads,
      weatherStrengths,
      affinityWeights,
      channelPeaks,
    }),
  ];

  const second = ranked.find((item) => item.key !== top.key) || null;
  const secondIsMeaningful =
    second &&
    second.value >= SECONDARY_TRIGGER_MIN_LOAD &&
    second.value >= top.value * SECONDARY_TRIGGER_MIN_RATIO;

  if (secondIsMeaningful) {
    out.push(
      buildTriggerFactor({
        key: second.key,
        role: "secondary",
        effectiveLoads,
        weatherStrengths,
        affinityWeights,
        channelPeaks,
      })
    );
  }

  return out;
}

function buildTriggerFactor({ key, role, effectiveLoads, weatherStrengths, affinityWeights, channelPeaks }) {
  const compat = exactTriggerToCompat(key);
  const peak = channelPeaks?.[key] || null;

  return {
    key,
    exact: key,
    role,
    main_trigger: compat?.main_trigger || null,
    trigger_dir: compat?.trigger_dir || null,
    effective_load: round2(effectiveLoads?.[key] || 0),
    weather_strength: round2(weatherStrengths?.[key] || 0),
    affinity_weight: round2(affinityWeights?.[key] || 0),
    peak_start: peak?.start || null,
    peak_end: peak?.end || null,
    peakStart: peak?.start || null,
    peakEnd: peak?.end || null,
  };
}

function computeScorePrecise({ effectiveLoads, weatherStrengths, affinityWeights, batteryScalar }) {
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
    (top.load || 0) * 4.65 * (CHANNEL_IMPORTANCE[top.key] || 1) +
    (second.load || 0) * 1.55 * (CHANNEL_IMPORTANCE[second.key] || 1) +
    (third.load || 0) * 0.65 * (CHANNEL_IMPORTANCE[third.key] || 1);

  // Battery should shift vulnerability, but not dominate the weather signal.
  const scalar = Number(batteryScalar || 1);
  score *= clamp(scalar, 0.94, 1.08);

  // 8〜10は「強い天気負担」と「体質親和性」が重なる日を中心にする。
  if ((top.weather || 0) >= 0.88 && (top.affinity || 0) >= 0.72) score += 0.55;
  else if ((top.weather || 0) >= 0.88) score += 0.2;

  if ((second.load || 0) >= 0.56) score += 0.25;
  if (entries.filter((entry) => entry.load >= 0.36).length >= 3) score += 0.2;

  return Math.round(clamp(score, 0, 10) * 10) / 10;
}

function toSignal(score) {
  if (score >= 7) return 2;
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
  const channelPeaks = weatherStress?.channel_peaks || weatherStress?.channelPeaks || null;
  const triggerFactors = buildTriggerFactors({
    effectiveLoads,
    weatherStrengths,
    affinityWeights: affinity.weights,
    channelPeaks,
  });
  const exactMainTrigger = triggerFactors[0]?.exact || pickExactMainTrigger(effectiveLoads);
  const secondaryTrigger = triggerFactors[1]?.exact || null;
  const compat = exactTriggerToCompat(exactMainTrigger);
  const scorePrecise = computeScorePrecise({
    effectiveLoads,
    weatherStrengths,
    affinityWeights: affinity.weights,
    batteryScalar: affinity.batteryScalar,
  });
  const score = clampInt(scorePrecise, 0, 10);
  const signal = toSignal(score);

  const selectedPeak =
    weatherStress?.channel_peaks?.[exactMainTrigger] ||
    weatherStress?.channelPeaks?.[exactMainTrigger] ||
    null;

  return {
    // score_0_10 はDB smallint保存用に整数を維持。
    // ゲージ/％表示だけ score_display_0_10 を使う。
    score_0_10: score,
    score_display_0_10: Math.round(clamp(scorePrecise, 0, 10) * 10) / 10,
    score_precise_0_10: Math.round(clamp(scorePrecise, 0, 10) * 10) / 10,
    signal,
    exact_main_trigger: exactMainTrigger,
    personal_main_trigger_exact: exactMainTrigger,
    personal_secondary_trigger_exact: secondaryTrigger,
    trigger_factors: triggerFactors,
    main_trigger: compat?.main_trigger || null,
    trigger_dir: compat?.trigger_dir || null,
    active_peak_start:
      selectedPeak?.start || weatherStress?.active_peak_start || null,
    active_peak_end:
      selectedPeak?.end || weatherStress?.active_peak_end || null,
    full_day_peak_start:
      selectedPeak?.start ||
      weatherStress?.full_day_peak_start ||
      weatherStress?.active_peak_start ||
      null,
    full_day_peak_end:
      selectedPeak?.end ||
      weatherStress?.full_day_peak_end ||
      weatherStress?.active_peak_end ||
      null,
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
      trigger_factors: triggerFactors,
      personal_secondary_trigger_exact: secondaryTrigger,
      selected_channel_peak: selectedPeak,
      channel_peaks: channelPeaks,
      review_feedback: reviewSummary,
    },
  };
}

