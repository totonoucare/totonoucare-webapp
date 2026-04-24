import {
  buildPersonalWeatherAffinityProfile,
  getBatteryTier,
} from "./weatherAffinityProfile";
import { exactTriggerToCompat } from "./weatherStress";

const EXACT_WEATHER_KEYS = [
  "pressure_down",
  "pressure_up",
  "cold",
  "heat",
  "damp",
  "dry",
];

const BRAKE_WEATHER_KEYS = ["pressure_down", "cold", "damp"];
const ACCEL_WEATHER_KEYS = ["pressure_up", "heat", "dry"];

function clampScore(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, Math.round(n)));
}

function clampWeatherStrength(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1.4, n));
}

function topEntries(record, limit = 3) {
  return Object.entries(record || {})
    .map(([key, value]) => [key, Number(value || 0)])
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function getCoreTrack(coreType) {
  const code = String(coreType || "");
  if (code.startsWith("brake_")) return "brake";
  if (code.startsWith("accelerator_")) return "accelerator";
  return "balanced";
}

function getDominantWeatherTrack(weatherStrengths) {
  const brakeLoad = BRAKE_WEATHER_KEYS.reduce(
    (sum, key) => sum + Number(weatherStrengths?.[key] || 0),
    0
  );
  const accelLoad = ACCEL_WEATHER_KEYS.reduce(
    (sum, key) => sum + Number(weatherStrengths?.[key] || 0),
    0
  );

  if (brakeLoad >= accelLoad + 0.18) return "brake";
  if (accelLoad >= brakeLoad + 0.18) return "accelerator";
  return "mixed";
}

function getScoreBatteryScalar(coreType) {
  const tier = getBatteryTier(coreType);
  if (tier === "small") return 1.06;
  if (tier === "large") return 0.88;
  return 1.0;
}

function getAlignmentScalar(coreType, weatherTrack) {
  const coreTrack = getCoreTrack(coreType);
  if (coreTrack === "balanced" || weatherTrack === "mixed") return 1.0;
  return coreTrack === weatherTrack ? 1.05 : 0.9;
}

function getTopChannelBonus(personalChannels, weatherStrengths) {
  const topWeather = topEntries(weatherStrengths, 2);
  const topPersonal = topEntries(personalChannels, 3).map(([key]) => key);

  let bonus = 0;
  for (const [key] of topWeather) {
    const idx = topPersonal.indexOf(key);
    if (idx === 0) bonus += 0.3;
    else if (idx === 1) bonus += 0.2;
    else if (idx === 2) bonus += 0.12;
  }

  return Math.min(0.5, bonus);
}

function getSymptomWeatherBonus(symptomFocus, weatherStrengths) {
  const symptom = String(symptomFocus || "");
  const downLoad =
    Number(weatherStrengths?.pressure_down || 0) +
    Number(weatherStrengths?.damp || 0) +
    Number(weatherStrengths?.cold || 0);
  const upLoad =
    Number(weatherStrengths?.pressure_up || 0) +
    Number(weatherStrengths?.heat || 0) +
    Number(weatherStrengths?.dry || 0);

  switch (symptom) {
    case "low_back_pain":
      if (downLoad >= 1.7) return 0.45;
      if (downLoad >= 1.1) return 0.25;
      return 0;
    case "fatigue":
    case "swelling":
      if (downLoad >= 1.6) return 0.4;
      if (downLoad >= 1.0) return 0.22;
      return 0;
    case "headache":
    case "dizziness": {
      const mixedLoad = Math.max(downLoad, upLoad);
      if (mixedLoad >= 1.7) return 0.35;
      if (mixedLoad >= 1.1) return 0.18;
      return 0;
    }
    case "mood":
    case "sleep":
      if (upLoad >= 1.5) return 0.35;
      if (upLoad >= 0.9) return 0.18;
      return 0;
    case "neck_shoulder":
      if (upLoad >= 1.4) return 0.28;
      if (upLoad >= 0.9) return 0.15;
      return 0;
    default:
      return 0;
  }
}

function getWeatherStrengths(weatherBundle) {
  const exactScores = weatherBundle?.exact_scores || {};
  return Object.fromEntries(
    EXACT_WEATHER_KEYS.map((key) => [key, clampWeatherStrength(exactScores[key])])
  );
}

function getPersonalChannels(constitution) {
  const diagnosis = constitution?.diagnosis_result || {};
  const profile = buildPersonalWeatherAffinityProfile({
    coreType: diagnosis.core_type,
    subRiskWeights: diagnosis.sub_labels,
    reviewPenalty: diagnosis.review_penalty,
    driveScore: diagnosis.drive_score,
  });

  return {
    exact: profile.weights,
    compat: profile.compat_weights,
    meta: profile.meta,
  };
}

function detectMainExactTrigger(weatherBundle, weatherStrengths) {
  const exact = String(weatherBundle?.main_exact_trigger || "").trim();
  if (exact) return exact;
  return topEntries(weatherStrengths, 1)[0]?.[0] || null;
}

function computeScore({ constitution, weatherBundle, weatherStrengths, personalChannels }) {
  const weightedSum = EXACT_WEATHER_KEYS.reduce((sum, key) => {
    const weather = Number(weatherStrengths[key] || 0);
    const affinity = Number(personalChannels.exact[key] || 0);
    const importance = Number(personalChannels.meta?.importance?.[key] || 1);
    return sum + weather * affinity * importance;
  }, 0);

  const diagnosis = constitution?.diagnosis_result || {};
  const batteryScalar = getScoreBatteryScalar(diagnosis.core_type);
  const weatherTrack = getDominantWeatherTrack(weatherStrengths);
  const alignmentScalar = getAlignmentScalar(diagnosis.core_type, weatherTrack);
  const topChannelBonus = getTopChannelBonus(personalChannels.exact, weatherStrengths);
  const symptomBonus = getSymptomWeatherBonus(diagnosis.symptom_focus, weatherStrengths);

  const scoreMultiplier = 2.25;
  const raw = weightedSum * scoreMultiplier * batteryScalar * alignmentScalar + topChannelBonus + symptomBonus;

  return {
    score: clampScore(raw),
    raw,
    breakdown: {
      weighted_sum: Number(weightedSum.toFixed(3)),
      score_multiplier: 2.25,
      battery_scalar: Number(batteryScalar.toFixed(3)),
      alignment_scalar: Number(alignmentScalar.toFixed(3)),
      weather_track: weatherTrack,
      top_channel_bonus: Number(topChannelBonus.toFixed(3)),
      symptom_bonus: Number(symptomBonus.toFixed(3)),
    },
  };
}

function buildWhyShort({ weatherBundle, mainExactTrigger, score }) {
  const label =
    weatherBundle?.exact_risk_factors?.find((item) => item.key === mainExactTrigger)?.label ||
    weatherBundle?.risk_factors?.[0]?.label ||
    "天気変化";

  if (score >= 7) return `${label}の影響がかなり強く出やすい日です`;
  if (score >= 4) return `${label}の影響に少し注意したい日です`;
  return `${label}の影響は比較的軽めです`;
}

export function personalizeForecast({ constitution, weatherBundle }) {
  const weatherStrengths = getWeatherStrengths(weatherBundle);
  const personalChannels = getPersonalChannels(constitution);
  const { score, breakdown } = computeScore({
    constitution,
    weatherBundle,
    weatherStrengths,
    personalChannels,
  });

  const mainExactTrigger = detectMainExactTrigger(weatherBundle, weatherStrengths);
  const compat = exactTriggerToCompat(mainExactTrigger);
  const compatScore = Number(weatherBundle?.compat_scores?.[compat.main_trigger] || 0);

  return {
    score_0_10: score,
    signal: score >= 7 ? 2 : score >= 4 ? 1 : 0,
    main_trigger: compat.main_trigger,
    trigger_dir: compat.trigger_dir,
    weather_score: compatScore,
    weather_main_trigger_exact: mainExactTrigger,
    risk_factors: weatherBundle?.exact_risk_factors || [],
    peak_start: weatherBundle?.peak_start || null,
    peak_end: weatherBundle?.peak_end || null,
    why_short: buildWhyShort({ weatherBundle, mainExactTrigger, score }),
    vendor_meta: {
      weather_exact_scores: weatherStrengths,
      channel_affinity: personalChannels.exact,
      compat_channel_affinity: personalChannels.compat,
      personalization: {
        weather_track: breakdown.weather_track,
        score_breakdown: breakdown,
        main_exact_trigger: mainExactTrigger,
      },
    },
    generated_at: new Date().toISOString(),
  };
}
