import { getRadarBodyTypeDisplay, getRadarSymptomDisplay } from "@/lib/diagnosis/v2/labels";

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function toNumber(n, fallback = 0) {
  return Number.isFinite(Number(n)) ? Number(n) : fallback;
}

function mapRiskFactorLabel(key) {
  switch (key) {
    case "pressure_down":
      return "気圧低下";
    case "pressure_up":
      return "気圧上昇";
    case "humidity_wet":
      return "湿気";
    case "humidity_dry":
      return "乾燥";
    case "temp_hot":
      return "暑さ";
    case "temp_cold":
      return "冷え";
    default:
      return key;
  }
}

function weatherTriggerCategory(factorKey) {
  if (factorKey === "pressure_down" || factorKey === "pressure_up") return "pressure";
  if (factorKey === "humidity_wet" || factorKey === "humidity_dry") return "humidity";
  if (factorKey === "temp_hot" || factorKey === "temp_cold") return "temp";
  return "pressure";
}

function weatherTriggerDirection(factorKey) {
  if (factorKey === "pressure_down") return "down";
  if (factorKey === "pressure_up") return "up";
  if (factorKey === "humidity_wet") return "up";
  if (factorKey === "humidity_dry") return "down";
  if (factorKey === "temp_hot") return "up";
  if (factorKey === "temp_cold") return "down";
  return "none";
}

function pickTopDrivers(adjustedFactors) {
  return Object.entries(adjustedFactors)
    .map(([exact, score]) => ({
      exact,
      label: mapRiskFactorLabel(exact),
      score: round1(score),
      category: weatherTriggerCategory(exact),
      direction: weatherTriggerDirection(exact),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
}

function riskFactorCategoryLabel(category, direction) {
  if (category === "pressure") {
    return direction === "up" ? "気圧上昇" : "気圧低下";
  }
  if (category === "humidity") {
    return direction === "down" ? "乾燥" : "湿気";
  }
  if (category === "temp") {
    return direction === "up" ? "暑さ" : "冷え";
  }
  return category || "";
}

const CANONICAL_KEYS = [
  "pressure_down",
  "pressure_up",
  "damp",
  "dry",
  "cold",
  "heat",
];

const CORE_WEATHER_PROFILES = {
  brake_batt_small: {
    pressure_down: 1.14,
    pressure_up: 0.9,
    damp: 1.28,
    dry: 0.94,
    cold: 1.24,
    heat: 0.9,
  },
  brake_batt_standard: {
    pressure_down: 1.1,
    pressure_up: 0.92,
    damp: 1.22,
    dry: 0.95,
    cold: 1.16,
    heat: 0.92,
  },
  brake_batt_large: {
    pressure_down: 1.06,
    pressure_up: 0.94,
    damp: 1.18,
    dry: 0.96,
    cold: 1.1,
    heat: 0.93,
  },
  accel_batt_small: {
    pressure_down: 0.98,
    pressure_up: 1.22,
    damp: 0.92,
    dry: 1.08,
    cold: 0.94,
    heat: 1.26,
  },
  accel_batt_standard: {
    pressure_down: 0.96,
    pressure_up: 1.18,
    damp: 0.94,
    dry: 1.02,
    cold: 0.96,
    heat: 1.2,
  },
  accel_batt_large: {
    pressure_down: 0.96,
    pressure_up: 1.12,
    damp: 0.95,
    dry: 1.0,
    cold: 0.97,
    heat: 1.14,
  },
};

const SUB_WEATHER_ADJUSTMENTS = {
  qi_deficiency: {
    pressure_down: 0.08,
    pressure_up: 0.0,
    damp: 0.12,
    dry: 0.02,
    cold: 0.1,
    heat: -0.02,
  },
  blood_deficiency: {
    pressure_down: 0.02,
    pressure_up: 0.05,
    damp: -0.02,
    dry: 0.06,
    cold: 0.08,
    heat: 0.04,
  },
  fluid_deficiency: {
    pressure_down: 0.0,
    pressure_up: 0.04,
    damp: -0.04,
    dry: 0.16,
    cold: -0.02,
    heat: 0.08,
  },
  qi_stagnation: {
    pressure_down: 0.04,
    pressure_up: 0.16,
    damp: 0.02,
    dry: 0.02,
    cold: 0.0,
    heat: 0.12,
  },
  blood_stasis: {
    pressure_down: 0.1,
    pressure_up: 0.04,
    damp: 0.02,
    dry: 0.0,
    cold: 0.08,
    heat: 0.03,
  },
  fluid_damp: {
    pressure_down: 0.08,
    pressure_up: -0.02,
    damp: 0.18,
    dry: -0.06,
    cold: 0.06,
    heat: -0.04,
  },
};

const RESERVE_SHAPE_FACTORS = {
  small: 1.25,
  standard: 1.0,
  large: 0.72,
};

const SCORE_RESERVE_FACTORS = {
  small: 1.12,
  standard: 1.0,
  large: 0.92,
};

const SECONDARY_SUB_WEIGHT = 0.55;

function zeroAffinityMap(base = 1) {
  return CANONICAL_KEYS.reduce((acc, key) => {
    acc[key] = base;
    return acc;
  }, {});
}

function normalizeCoreCode(coreCode) {
  const s = String(coreCode || "").trim();
  if (CORE_WEATHER_PROFILES[s]) return s;
  if (s.startsWith("brake_")) return "brake_batt_standard";
  if (s.startsWith("accel_")) return "accel_batt_standard";
  return "brake_batt_standard";
}

function getReserveBucket(coreCode) {
  const s = String(coreCode || "");
  if (s.endsWith("_small")) return "small";
  if (s.endsWith("_large")) return "large";
  return "standard";
}

function applyReserveShape(value, reserveBucket) {
  const factor = RESERVE_SHAPE_FACTORS[reserveBucket] || 1;
  return 1 + (value - 1) * factor;
}

function buildBaseAffinity(coreCode) {
  const normalizedCore = normalizeCoreCode(coreCode);
  return { ...CORE_WEATHER_PROFILES[normalizedCore] };
}

function addSubAdjustment(target, subCode, weight) {
  const delta = SUB_WEATHER_ADJUSTMENTS[subCode];
  if (!delta) return;
  for (const key of CANONICAL_KEYS) {
    target[key] = toNumber(target[key], 1) + toNumber(delta[key], 0) * weight;
  }
}

export function buildPersonalWeatherAffinities(profile) {
  const coreCode = String(profile?.constitution_core || "");
  const reserveBucket = getReserveBucket(coreCode);
  const base = buildBaseAffinity(coreCode);

  addSubAdjustment(base, profile?.sub_constitution_1, 1);
  addSubAdjustment(base, profile?.sub_constitution_2, SECONDARY_SUB_WEIGHT);

  const affinities = zeroAffinityMap();
  for (const key of CANONICAL_KEYS) {
    affinities[key] = round1(clamp(applyReserveShape(toNumber(base[key], 1), reserveBucket), 0.7, 1.7));
  }

  return {
    reserve_bucket: reserveBucket,
    score_reserve_factor: SCORE_RESERVE_FACTORS[reserveBucket] || 1,
    affinities,
  };
}

function toAdjustedFactors(baseFactors, affinityInfo) {
  const affinities = affinityInfo?.affinities || zeroAffinityMap();

  return {
    pressure_down: toNumber(baseFactors.pressure_down) * toNumber(affinities.pressure_down, 1),
    pressure_up: toNumber(baseFactors.pressure_up) * toNumber(affinities.pressure_up, 1),
    humidity_wet: toNumber(baseFactors.damp) * toNumber(affinities.damp, 1),
    humidity_dry: toNumber(baseFactors.dry) * toNumber(affinities.dry, 1),
    temp_cold: toNumber(baseFactors.cold) * toNumber(affinities.cold, 1),
    temp_hot: toNumber(baseFactors.heat) * toNumber(affinities.heat, 1),
  };
}

function averageSubScores(reviewSummary, category, kind) {
  const ratings = Array.isArray(reviewSummary?.ratings) ? reviewSummary.ratings : [];
  const targets = ratings
    .filter((item) => item?.category === category && item?.kind === kind)
    .map((item) => toNumber(item?.score, NaN))
    .filter((n) => Number.isFinite(n));

  if (!targets.length) return null;
  return targets.reduce((sum, n) => sum + n, 0) / targets.length;
}

function computeReviewTriggerBonus(reviewSummary) {
  if (!reviewSummary?.exists) {
    return {
      pressure: 1,
      humidity: 1,
      temp: 1,
    };
  }

  const pressure = averageSubScores(reviewSummary, "weather", "pressure");
  const humidity = averageSubScores(reviewSummary, "weather", "humidity");
  const temp = averageSubScores(reviewSummary, "weather", "temp");

  const toMultiplier = (avg) => {
    if (!Number.isFinite(avg)) return 1;
    if (avg >= 4.5) return 1.14;
    if (avg >= 3.5) return 1.08;
    if (avg >= 2.5) return 1.03;
    if (avg <= 1.5) return 0.96;
    return 1;
  };

  return {
    pressure: toMultiplier(pressure),
    humidity: toMultiplier(humidity),
    temp: toMultiplier(temp),
  };
}

export function personalizeForecast({ weatherStress, profile, reviewSummary = null }) {
  const weather = weatherStress || {};
  const affinityInfo = buildPersonalWeatherAffinities(profile);

  const baseFactors = {
    pressure_down: toNumber(weather?.pressure_down_score),
    pressure_up: toNumber(weather?.pressure_up_score),
    damp: toNumber(weather?.humidity_score),
    dry: toNumber(weather?.dryness_score),
    cold: toNumber(weather?.cold_score),
    heat: toNumber(weather?.heat_score),
  };

  const adjustedFactors = toAdjustedFactors(baseFactors, affinityInfo);
  const reviewBonus = computeReviewTriggerBonus(reviewSummary);

  adjustedFactors.pressure_down *= reviewBonus.pressure;
  adjustedFactors.pressure_up *= reviewBonus.pressure;
  adjustedFactors.humidity_wet *= reviewBonus.humidity;
  adjustedFactors.humidity_dry *= reviewBonus.humidity;
  adjustedFactors.temp_cold *= reviewBonus.temp;
  adjustedFactors.temp_hot *= reviewBonus.temp;

  const weightedWeather =
    adjustedFactors.pressure_down * 2.25 +
    adjustedFactors.pressure_up * 2.05 +
    adjustedFactors.humidity_wet * 2.15 +
    adjustedFactors.humidity_dry * 1.95 +
    adjustedFactors.temp_cold * 2.0 +
    adjustedFactors.temp_hot * 2.0;

  const sortedFactors = Object.entries(adjustedFactors)
    .map(([key, value]) => [key, toNumber(value)])
    .sort((a, b) => b[1] - a[1]);

  const dominant = sortedFactors[0]?.[1] || 0;
  const secondary = sortedFactors[1]?.[1] || 0;

  const weatherScoreRaw =
    (weightedWeather + dominant * 1.7 + secondary * 0.7) * toNumber(affinityInfo.score_reserve_factor, 1);

  const weatherScore = clamp(round1(weatherScoreRaw), 0, 10);

  const topExact = sortedFactors[0]?.[0] || "pressure_down";
  const mainTrigger = weatherTriggerCategory(topExact);
  const triggerDir = weatherTriggerDirection(topExact);
  const signal = weatherScore >= 6 ? 2 : weatherScore >= 3.5 ? 1 : 0;
  const topDrivers = pickTopDrivers(adjustedFactors);

  const rawContextExact = topDrivers[0]?.exact || null;
  const secondContextExact = topDrivers[1]?.exact || null;

  return {
    score_0_10: weatherScore,
    signal,
    main_trigger: mainTrigger,
    trigger_dir: triggerDir,
    why_short:
      topDrivers.length > 0
        ? topDrivers.map((driver) => driver.label).join(" / ")
        : riskFactorCategoryLabel(mainTrigger, triggerDir),
    vendor_meta: {
      base_score: round1(toNumber(weather?.base_score)),
      pressure_delta_hpa: weather?.pressure_delta_hpa,
      humidity_delta_pct: weather?.humidity_delta_pct,
      temp_delta_c: weather?.temp_delta_c,
      drivers: topDrivers,
      review_boost: reviewSummary?.exists
        ? {
            pressure: reviewBonus.pressure,
            humidity: reviewBonus.humidity,
            temp: reviewBonus.temp,
          }
        : null,
      personal_factors: {
        reserve_bucket: affinityInfo.reserve_bucket,
        affinities: affinityInfo.affinities,
      },
      context_exact: {
        primary: rawContextExact,
        secondary: secondContextExact,
      },
    },
    computed: {
      raw_weather_score: round1(weatherScoreRaw),
      adjusted_factors: Object.fromEntries(
        Object.entries(adjustedFactors).map(([k, v]) => [k, round1(v)])
      ),
      review_boost: reviewSummary?.exists
        ? {
            pressure: reviewBonus.pressure,
            humidity: reviewBonus.humidity,
            temp: reviewBonus.temp,
          }
        : null,
      top_drivers: topDrivers,
    },
  };
}

export function buildForecastSummary({ personalized, targetDate }) {
  if (!personalized) return "";
  const date = targetDate ? `${targetDate}は` : "今日は";
  const factors = personalized?.computed?.top_drivers || [];
  const labels = factors.map((x) => x.label).filter(Boolean);
  const uniqueLabels = Array.from(new Set(labels));

  if (!uniqueLabels.length) {
    return `${date}天気の揺れに少し注意したい日です。`;
  }

  if (uniqueLabels.length === 1) {
    return `${date}${uniqueLabels[0]}の影響を受けやすい日です。`;
  }

  return `${date}${uniqueLabels[0]}と${uniqueLabels[1]}の影響が重なりやすい日です。`;
}

export function buildResultPrimarySignal(profile) {
  const coreCode = String(profile?.constitution_core || "");
  const reserveBucket = getReserveBucket(coreCode);
  const coreLabel = getRadarBodyTypeDisplay(coreCode) || "未設定";
  const symptomLabel = getRadarSymptomDisplay(profile?.chief_complaint || "") || "不調";

  const reserveText =
    reserveBucket === "small"
      ? "余力が少なめで外の変化を受け止めにくい"
      : reserveBucket === "large"
        ? "余力が比較的あり崩れにくい"
        : "外の変化にほどほど影響されやすい";

  return `${coreLabel}タイプで、${symptomLabel}に注意。${reserveText}傾向があります。`;
}

