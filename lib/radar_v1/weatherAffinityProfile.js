const EXACT_WEATHER_KEYS = [
  "pressure_down",
  "pressure_up",
  "cold",
  "heat",
  "damp",
  "dry",
];

export { EXACT_WEATHER_KEYS };

export const EXACT_WEATHER_LABELS = {
  pressure_down: "気圧低下",
  pressure_up: "気圧上昇",
  cold: "冷え",
  heat: "暑さ",
  damp: "湿",
  dry: "乾燥",
};

const DEFAULT_EXACT_AFFINITY = {
  pressure_down: 0.45,
  pressure_up: 0.45,
  cold: 0.45,
  heat: 0.45,
  damp: 0.45,
  dry: 0.45,
};

export const CORE_EXACT_AFFINITY = {
  accel_batt_small: {
    pressure_down: 0.62,
    pressure_up: 0.92,
    cold: 0.48,
    heat: 0.92,
    damp: 0.28,
    dry: 0.9,
  },
  accel_batt_standard: {
    pressure_down: 0.65,
    pressure_up: 0.9,
    cold: 0.55,
    heat: 0.85,
    damp: 0.35,
    dry: 0.78,
  },
  accel_batt_large: {
    pressure_down: 0.52,
    pressure_up: 0.76,
    cold: 0.46,
    heat: 0.72,
    damp: 0.3,
    dry: 0.66,
  },
  brake_batt_small: {
    pressure_down: 0.85,
    pressure_up: 0.3,
    cold: 0.9,
    heat: 0.34,
    damp: 1.0,
    dry: 0.45,
  },
  brake_batt_standard: {
    pressure_down: 0.78,
    pressure_up: 0.28,
    cold: 0.82,
    heat: 0.32,
    damp: 0.92,
    dry: 0.38,
  },
  brake_batt_large: {
    pressure_down: 0.7,
    pressure_up: 0.25,
    cold: 0.75,
    heat: 0.3,
    damp: 0.85,
    dry: 0.34,
  },
};

export const SUB_EXACT_AFFINITY = {
  qi_stagnation: {
    pressure_down: 0.55,
    pressure_up: 0.85,
    cold: 0.45,
    heat: 0.8,
    damp: 0.35,
    dry: 0.4,
  },
  qi_deficiency: {
    pressure_down: 0.7,
    pressure_up: 0.25,
    cold: 0.9,
    heat: 0.35,
    damp: 0.7,
    dry: 0.45,
  },
  blood_deficiency: {
    pressure_down: 0.3,
    pressure_up: 0.55,
    cold: 0.3,
    heat: 0.75,
    damp: 0.25,
    dry: 0.9,
  },
  blood_stasis: {
    pressure_down: 0.5,
    pressure_up: 0.72,
    cold: 0.85,
    heat: 0.35,
    damp: 0.42,
    dry: 0.45,
  },
  fluid_damp: {
    pressure_down: 0.75,
    pressure_up: 0.3,
    cold: 0.55,
    heat: 0.25,
    damp: 0.95,
    dry: 0.15,
  },
  fluid_deficiency: {
    pressure_down: 0.35,
    pressure_up: 0.5,
    cold: 0.2,
    heat: 0.8,
    damp: 0.15,
    dry: 0.95,
  },
};

const CORE_BLEND = 0.55;
const SUB_BLEND = [0.28, 0.17];

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function normalizeAffinityShape(source) {
  const base = { ...DEFAULT_EXACT_AFFINITY };
  for (const key of EXACT_WEATHER_KEYS) {
    if (source && source[key] != null) {
      base[key] = clamp01(source[key]);
    }
  }
  return base;
}

export function getBatteryTier(coreType) {
  const code = String(coreType || "");
  if (code.includes("batt_small")) return "small";
  if (code.includes("batt_large")) return "large";
  return "standard";
}

export function getBatteryScalar(coreType) {
  const tier = getBatteryTier(coreType);
  if (tier === "small") return 1.12;
  if (tier === "large") return 0.9;
  return 1.0;
}

export function getCoreExactAffinity(coreType) {
  return normalizeAffinityShape(CORE_EXACT_AFFINITY[coreType]);
}

export function extractOrderedSubCodes(subRiskWeights) {
  if (!Array.isArray(subRiskWeights)) return [];

  return subRiskWeights
    .map((entry, index) => {
      if (typeof entry === "string") {
        return { label: entry, weight: Math.max(0, 100 - index) };
      }
      return {
        label: String(entry?.label || "").trim(),
        weight: Number(entry?.weight ?? 0),
      };
    })
    .filter((entry) => entry.label)
    .sort((a, b) => b.weight - a.weight)
    .map((entry) => entry.label);
}

export function buildExactWeatherAffinity({ coreType, subRiskWeights } = {}) {
  const core = getCoreExactAffinity(coreType);
  const subCodes = extractOrderedSubCodes(subRiskWeights).slice(0, 2);

  const weights = {};
  for (const key of EXACT_WEATHER_KEYS) {
    let value = core[key] * CORE_BLEND;
    subCodes.forEach((code, index) => {
      const sub = normalizeAffinityShape(SUB_EXACT_AFFINITY[code]);
      value += sub[key] * (SUB_BLEND[index] || 0);
    });
    weights[key] = clamp01(Number(value.toFixed(4)));
  }

  return {
    weights,
    core,
    subCodes,
    batteryTier: getBatteryTier(coreType),
    batteryScalar: getBatteryScalar(coreType),
  };
}

export function rankExactWeatherAffinity(weights) {
  const safe = normalizeAffinityShape(weights);
  return Object.entries(safe)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => ({
      key,
      value,
      label: EXACT_WEATHER_LABELS[key] || key,
    }));
}


const ENV_VECTOR_BONUS = {
  pressure_shift: { pressure_down: 0.06, pressure_up: 0.06 },
  temp_swing: { cold: 0.08, heat: 0.08 },
  humidity_up: { damp: 0.08 },
  dryness_up: { dry: 0.08 },
  wind_strong: { pressure_up: 0.05, pressure_down: 0.03 },
};

const REVIEW_TAG_BONUS = {
  pressure: { pressure_down: 0.1, pressure_up: 0.08 },
  temp: { cold: 0.08, heat: 0.08 },
  humidity: { damp: 0.08, dry: 0.06 },
};

function sensitivityDelta(level) {
  const key = String(level || "normal").toLowerCase();
  if (key === "high") return 0.08;
  if (key === "low") return -0.05;
  return 0;
}

function addDelta(target, source) {
  if (!source) return;
  for (const key of EXACT_WEATHER_KEYS) {
    if (source[key] == null) continue;
    target[key] = clamp01((target[key] || 0) + Number(source[key] || 0));
  }
}

export function buildPersonalWeatherAffinityProfile({
  coreType,
  subRiskWeights,
  envVectors = [],
  sensitivity = "normal",
  worseTags = [],
} = {}) {
  const base = buildExactWeatherAffinity({ coreType, subRiskWeights });
  const weights = { ...base.weights };

  const delta = sensitivityDelta(sensitivity);
  if (delta !== 0) {
    for (const key of EXACT_WEATHER_KEYS) {
      weights[key] = clamp01((weights[key] || 0) + delta);
    }
  }

  const vectorList = Array.isArray(envVectors) ? envVectors : [];
  vectorList.forEach((vector) => addDelta(weights, ENV_VECTOR_BONUS[String(vector || "").trim()]));

  const tagList = Array.isArray(worseTags) ? worseTags : [];
  tagList.forEach((tag) => addDelta(weights, REVIEW_TAG_BONUS[String(tag || "").trim()]));

  for (const key of EXACT_WEATHER_KEYS) {
    weights[key] = Number(weights[key].toFixed(4));
  }

  return {
    ...base,
    weights,
  };
}
