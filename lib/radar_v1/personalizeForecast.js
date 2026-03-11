// lib/radar_v1/personalizeForecast.js

/**
 * Convert weather-only stress into a personalized forecast score.
 *
 * Philosophy:
 * - weatherStress = external burden
 * - sub_labels / core_code / env = internal susceptibility
 * - final score is not purely "weather severity", but "weather × constitution"
 */

/**
 * @typedef {{
 *   pressure_down_strength: number,
 *   cold_strength: number,
 *   damp_strength: number,
 *   main_trigger: 'pressure'|'temp'|'humidity',
 *   trigger_dir: 'up'|'down'|'none',
 *   peak_start: string,
 *   peak_end: string,
 *   meta?: any
 * }} WeatherStress
 */

/**
 * @typedef {{
 *   core_code?: string | null,
 *   sub_labels?: string[] | null,
 *   env?: {
 *     sensitivity?: number,
 *     vectors?: string[]
 *   } | null
 * }} ConstitutionInput
 */

/**
 * @param {{
 *   weatherStress: WeatherStress,
 *   constitution: ConstitutionInput
 * }} args
 */
export function personalizeForecast({ weatherStress, constitution }) {
  if (!weatherStress) {
    throw new Error("personalizeForecast: weatherStress is required");
  }

  const subLabels = Array.isArray(constitution?.sub_labels)
    ? constitution.sub_labels
    : [];

  const coreCode = constitution?.core_code || "";
  const env = constitution?.env || {};

  const baseWeatherScore = computeBaseWeatherScore(weatherStress);
  const subMultiplier = computeSubLabelMultiplier({
    subLabels,
    weatherStress,
  });

  const coreMultiplier = computeCoreMultiplier({
    coreCode,
    weatherStress,
  });

  const envMultiplier = computeEnvMultiplier({
    env,
    weatherStress,
  });

  const raw =
    baseWeatherScore *
    subMultiplier *
    coreMultiplier *
    envMultiplier;

  const score_0_10 = clampInt(Math.round(raw), 0, 10);
  const signal = toSignal(score_0_10);

  return {
    score_0_10,
    signal,

    main_trigger: weatherStress.main_trigger,
    trigger_dir: weatherStress.trigger_dir,
    peak_start: weatherStress.peak_start,
    peak_end: weatherStress.peak_end,

    meta: {
      base_weather_score: round3(baseWeatherScore),
      sub_multiplier: round3(subMultiplier),
      core_multiplier: round3(coreMultiplier),
      env_multiplier: round3(envMultiplier),
      raw_score: round3(raw),
      sub_labels: subLabels,
      core_code: coreCode || null,
      weather_meta: weatherStress.meta || null,
    },
  };
}

/**
 * External burden only.
 * Roughly 0..10 before constitution weighting.
 */
function computeBaseWeatherScore(ws) {
  const pressure = ws.pressure_down_strength ?? 0;
  const cold = ws.cold_strength ?? 0;
  const damp = ws.damp_strength ?? 0;

  // Weather-only burden: weighted sum
  // pressure tends to be strong in your product concept, so slightly higher weight
  const value =
    pressure * 4.0 +
    cold * 3.0 +
    damp * 3.0;

  return clamp(value, 0, 10);
}

/**
 * Constitution by sub_labels:
 * sub_labels are the main TCM axis, so they should strongly affect the result.
 */
function computeSubLabelMultiplier({ subLabels, weatherStress }) {
  if (!subLabels.length) return 1.0;

  let m = 1.0;

  const main = weatherStress.main_trigger;
  const dir = weatherStress.trigger_dir;

  for (const label of subLabels) {
    switch (label) {
      case "qi_stagnation":
        // pressure↓ / temp swing tends to irritate "stuck" patterns
        if (main === "pressure" && dir === "down") m += 0.18;
        if (main === "temp") m += 0.08;
        break;

      case "qi_deficiency":
        // low pressure and cold tend to feel draining
        if (main === "pressure" && dir === "down") m += 0.16;
        if (main === "temp" && dir === "down") m += 0.14;
        if (main === "humidity") m += 0.08;
        break;

      case "blood_deficiency":
        // cold / pressure changes often feel more pronounced
        if (main === "pressure" && dir === "down") m += 0.12;
        if (main === "temp" && dir === "down") m += 0.12;
        break;

      case "blood_stasis":
        // pressure↓ and cold can worsen fixed tightness/heaviness
        if (main === "pressure" && dir === "down") m += 0.14;
        if (main === "temp" && dir === "down") m += 0.12;
        if (main === "humidity") m += 0.06;
        break;

      case "fluid_damp":
        // humidity is the obvious amplifier
        if (main === "humidity" && dir === "up") m += 0.20;
        if (main === "temp" && dir === "down") m += 0.08; // cold-damp feel
        break;

      case "fluid_deficiency":
        // heat/up or dryness would be stronger ideally,
        // but MVP only has humidity↑ as direct damp axis and temp as hot/cold.
        if (main === "temp" && dir === "up") m += 0.16;
        if (main === "pressure" && dir === "down") m += 0.06;
        break;

      default:
        break;
    }
  }

  return clamp(m, 1.0, 1.6);
}

/**
 * core_code is a nuance/strength corrector, not the main pattern.
 */
function computeCoreMultiplier({ coreCode, weatherStress }) {
  if (!coreCode) return 1.0;

  let m = 1.0;

  const isBattSmall = coreCode.includes("batt_small");
  const isBattLarge = coreCode.includes("batt_large");
  const isAccel = coreCode.startsWith("accel");
  const isBrake = coreCode.startsWith("brake");

  // batt_small = reacts more easily / less reserve
  if (isBattSmall) m += 0.18;
  if (isBattLarge) m -= 0.06;

  // accel = reacts more to pressure/temp fluctuation
  if (isAccel && weatherStress.main_trigger === "pressure") m += 0.08;
  if (isAccel && weatherStress.main_trigger === "temp") m += 0.06;

  // brake = reacts more to damp/cold heaviness
  if (isBrake && weatherStress.main_trigger === "humidity") m += 0.10;
  if (isBrake && weatherStress.main_trigger === "temp" && weatherStress.trigger_dir === "down") {
    m += 0.08;
  }

  return clamp(m, 0.9, 1.4);
}

/**
 * env_sensitivity and env_vectors come from diagnosis questions.
 * Keep this mild; it's a self-reported modifier.
 */
function computeEnvMultiplier({ env, weatherStress }) {
  const sensitivity = Number(env?.sensitivity ?? 0);
  const vectors = Array.isArray(env?.vectors) ? env.vectors : [];

  let m = 1.0;

  // sensitivity: 0..3 in current design
  m += clamp(sensitivity, 0, 3) * 0.05;

  const trigger = weatherStress.main_trigger;
  const dir = weatherStress.trigger_dir;

  if (trigger === "pressure" && vectors.includes("pressure_shift")) m += 0.10;
  if (trigger === "temp" && vectors.includes("temp_swing")) m += 0.10;
  if (trigger === "humidity" && vectors.includes("humidity_up")) m += 0.10;
  if (trigger === "temp" && dir === "up" && vectors.includes("dryness_up")) m += 0.06;
  if (vectors.includes("wind_strong")) m += 0.02; // very light for MVP

  return clamp(m, 1.0, 1.3);
}

function toSignal(score) {
  if (score >= 7) return 2; // red
  if (score >= 4) return 1; // yellow
  return 0; // green
}

function clamp(v, min, max) {
  if (!Number.isFinite(v)) return min;
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

function clampInt(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function round3(v) {
  return Math.round(v * 1000) / 1000;
}
