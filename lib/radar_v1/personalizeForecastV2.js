/**
 * Constitution-aware forecast model v2.
 *
 * Weather decides how strongly the body is shaken. Continuous constitution
 * axes decide vulnerability and likely reaction style. All six qi/blood/fluid
 * scores are retained as the manifestation profile instead of being reduced to
 * only two labels.
 */

export const RADAR_FORECAST_MODEL_VERSION = "radar_forecast_v2_2026-07-22_comfort_calibrated";

const UNIVERSAL_SHARE = 0.38;
const PERSONAL_SHARE = 0.62;
const PUBLIC_NEUTRAL_AFFINITY = 0.55;
const SECONDARY_MIN_LOAD = 0.24;
const SECONDARY_MIN_RATIO = 0.45;

const ACUTE_SCORE_WEIGHTS = [5.2, 1.5, 0.55];
const PERSONAL_ABSOLUTE_SCORE_MAX = 7.2;
const UNIVERSAL_EXTREME_FLOOR_BASE_MAX = 4.4;
const UNIVERSAL_EXTREME_RAMP_MAX = 2.3;
const RESERVE_MIN = 0.9;
const RESERVE_MAX = 1.1;
const AFFINITY_BASE = 0.32;
const AFFINITY_MIN = 0.25;
const AFFINITY_MAX = 0.95;

const WEATHER_EVENT_KEYS = [
  "pressure_shift",
  "temperature_shift",
  "cold",
  "heat",
  "damp",
  "dry",
];

const STATIC_WEATHER_COMPATIBILITY_KEYS = ["temp_shift", "cold", "heat", "damp", "dry"];

// The accelerator/brake axis is a summary of the reaction style, not a
// synonym for heat/cold or dry/damp. Its contribution therefore stays small.
// The six material scores and the user's direct answers carry the larger,
// weather-specific part of personal affinity.
const MATERIAL_AFFINITY_WEIGHTS = {
  heat: {
    qi_stagnation: 0.1,
    fluid_deficiency: 0.12,
    blood_deficiency: 0.07,
  },
  cold: {
    qi_deficiency: 0.1,
    blood_stasis: 0.08,
    fluid_damp: 0.07,
    blood_deficiency: 0.04,
  },
  damp: {
    fluid_damp: 0.17,
    qi_deficiency: 0.08,
  },
  dry: {
    fluid_deficiency: 0.18,
    blood_deficiency: 0.08,
    qi_stagnation: 0.03,
  },
};

const MATERIAL_KEYS = [
  "qi_deficiency",
  "qi_stagnation",
  "blood_deficiency",
  "blood_stasis",
  "fluid_deficiency",
  "fluid_damp",
];

export function personalizeForecastV2({ weatherStress, constitution }) {
  return buildForecastV2({ weatherStress, constitution, publicNeutral: false });
}

export function personalizePublicForecastV2({ weatherStress }) {
  return buildForecastV2({ weatherStress, constitution: {}, publicNeutral: true });
}

function buildForecastV2({ weatherStress, constitution, publicNeutral }) {
  if (!weatherStress) throw new Error("personalizeForecastV2: weatherStress is required");

  const profile = normalizeConstitution(constitution);
  const weather = normalizeWeatherEvents(weatherStress);
  const affinityProfile = publicNeutral
    ? buildNeutralAffinities(PUBLIC_NEUTRAL_AFFINITY)
    : buildAffinities(profile, weatherStress);
  const affinities = affinityProfile.weights;
  const eventLoads = buildEventLoads(weather, affinities);
  const reserveScalar = buildReserveScalar(profile);
  const grouped = addPersonalLoads(
    buildGroupedLoads({ eventLoads, weather, affinities, weatherStress }),
    reserveScalar,
    weatherStress
  );
  const rankedGroups = Object.values(grouped).sort((a, b) => b.effective_load - a.effective_load);
  const triggerFactors = buildTriggerFactors(rankedGroups, weatherStress);
  const primary = triggerFactors[0] || emptyTriggerFactor(weatherStress);
  const secondary = triggerFactors[1] || null;
  const scoreTrace = computeScore({
    rankedGroups,
    eventLoads,
    weather,
    affinities,
    reserveScalar,
    weatherStress,
  });
  const scorePrecise = scoreTrace.final_score_0_10;
  const score = clampInt(scorePrecise, 0, 10);
  const signal = forecastSignalFromScoreV2(scorePrecise);
  const compat = exactToCompat(primary.exact, primary.direction);
  const selectedPeak = getPeak(weatherStress, primary.exact);
  const manifestation = buildManifestationProfile(profile);

  return {
    model_version: RADAR_FORECAST_MODEL_VERSION,
    score_0_10: score,
    score_display_0_10: round1(scorePrecise),
    score_precise_0_10: round1(scorePrecise),
    signal,
    exact_main_trigger: primary.exact,
    personal_main_trigger_exact: primary.exact,
    personal_secondary_trigger_exact: secondary?.exact || null,
    trigger_factors: triggerFactors,
    main_trigger: compat.main_trigger,
    trigger_dir: compat.trigger_dir,
    active_peak_start: selectedPeak?.start || weatherStress?.active_peak_start || null,
    active_peak_end: selectedPeak?.end || weatherStress?.active_peak_end || null,
    full_day_peak_start: selectedPeak?.start || weatherStress?.full_day_peak_start || null,
    full_day_peak_end: selectedPeak?.end || weatherStress?.full_day_peak_end || null,
    meta: {
      forecast_model_version: RADAR_FORECAST_MODEL_VERSION,
      forecast_model: {
        weather_groups: ["pressure", "temperature", "moisture"],
        group_overlap_policy: "three_ui_groups_with_temperature_moisture_absolute_deduplication",
        universal_weather_share: UNIVERSAL_SHARE,
        personal_affinity_share: PERSONAL_SHARE,
        public_neutral_affinity: publicNeutral ? PUBLIC_NEUTRAL_AFFINITY : null,
        personalized: !publicNeutral,
        direction_role: "secondary_modifier_and_presentation",
        comfort_direction_policy: "away_from_band_primary_toward_band_transition_only",
        score_policy: "max_acute_change_or_absolute_environment_plus_small_concurrence",
        acute_score_weights: ACUTE_SCORE_WEIGHTS,
        extreme_environment_floor: true,
        signal_thresholds: { stable_max_exclusive: 4, care_max_exclusive: 7 },
      },
      normalized_constitution: profile,
      continuous_axes: profile.axes,
      material_scores: profile.material_scores,
      normalized_material_scores: profile.normalized_material_scores,
      manifestation,
      exact_affinity_weights: affinities,
      affinity_trace: affinityProfile.trace,
      weather_strengths: weather,
      event_effective_loads: eventLoads,
      effective_weather_groups: grouped,
      weather_load_groups: grouped,
      effective_channel_loads: buildLegacyEffectiveLoads(grouped),
      personal_channel_strengths: buildLegacyPersonalStrengths(weather, affinities, weatherStress),
      top_personal_channels: rankedGroups.slice(0, 3).map((item) => ({
        key: item.exact,
        event_key: item.event_key,
        value: item.effective_load,
      })),
      trigger_factors: triggerFactors,
      personal_secondary_trigger_exact: secondary?.exact || null,
      selected_channel_peak: selectedPeak,
      channel_peaks: weatherStress?.channel_peaks || null,
      reserve_scalar: scoreTrace.reserve_scalar_applied,
      score_trace: scoreTrace,
    },
  };
}

/**
 * Returns the same V2 constitution affinity used by the daily forecast, but
 * without depending on a particular day's weather. This is shared by the
 * constitution guide's "weather compatibility" section.
 */
export function buildConstitutionWeatherAffinityV2({ constitution } = {}) {
  const profile = normalizeConstitution(constitution);
  const steady = buildAffinities(profile, { pressure_direction: "steady" });
  const pressureDown = buildAffinities(profile, { pressure_direction: "down" });
  const pressureUp = buildAffinities(profile, { pressure_direction: "up" });

  return {
    model_version: RADAR_FORECAST_MODEL_VERSION,
    weights: {
      pressure_down: pressureDown.weights.pressure_shift,
      pressure_up: pressureUp.weights.pressure_shift,
      temp_shift: steady.weights.temperature_shift,
      cold: steady.weights.cold,
      heat: steady.weights.heat,
      damp: steady.weights.damp,
      dry: steady.weights.dry,
    },
    normalized_constitution: profile,
    trace: {
      pressure_down: pressureDown.trace.channels.pressure_shift,
      pressure_up: pressureUp.trace.channels.pressure_shift,
      temp_shift: steady.trace.channels.temperature_shift,
      cold: steady.trace.channels.cold,
      heat: steady.trace.channels.heat,
      damp: steady.trace.channels.damp,
      dry: steady.trace.channels.dry,
    },
  };
}

/**
 * Pressure is one kind of environmental shift in V2. Only the more relevant
 * presentation direction is shown, so rising and falling pressure cannot take
 * two of the three guide slots.
 */
export function rankConstitutionWeatherAffinityV2(weights = {}) {
  const pressureKey = finite(weights.pressure_up) > finite(weights.pressure_down)
    ? "pressure_up"
    : "pressure_down";
  return [pressureKey, ...STATIC_WEATHER_COMPATIBILITY_KEYS]
    .map((key) => ({ key, value: round3(clamp(weights[key], AFFINITY_MIN, AFFINITY_MAX)) }))
    .sort((a, b) => b.value - a.value);
}

function normalizeConstitution(constitution = {}) {
  const diagnosis = constitution?.diagnosis_result || {};
  const computed = constitution?.computed || constitution?.raw?.computed || diagnosis?.computed || {};
  const axes = computed?.axes || constitution?.axes || diagnosis?.axes || {};
  const split = computed?.split_scores || constitution?.split_scores || diagnosis?.split_scores || {};
  const env = computed?.env || constitution?.env || diagnosis?.env || {};
  const coreCode =
    diagnosis?.core_type || constitution?.core_code || constitution?.coreType || constitution?.core_type || null;
  const materialScores = {
    qi_deficiency: finite(split?.qi?.deficiency),
    qi_stagnation: finite(split?.qi?.stagnation),
    blood_deficiency: finite(split?.blood?.deficiency),
    blood_stasis: finite(split?.blood?.stasis),
    fluid_deficiency: finite(split?.fluid?.deficiency),
    fluid_damp: finite(split?.fluid?.damp),
  };

  const fallbackLabels = extractSubLabels(
    diagnosis?.sub_risk_weights || constitution?.sub_labels || constitution?.subRiskWeights || []
  );
  const hasMaterialScores = Object.values(materialScores).some((value) => value > 0);
  if (!hasMaterialScores) {
    fallbackLabels.forEach((label, index) => {
      if (MATERIAL_KEYS.includes(label)) materialScores[label] = index === 0 ? 2.2 : 1.4;
    });
  }

  const yinYang = finiteOrNull(axes?.yin_yang_score) ?? (
    coreCode ? (String(coreCode).startsWith("brake") ? -0.6 : 0.6) : 0
  );
  const drive = finiteOrNull(axes?.drive_score) ?? coreDriveFallback(coreCode);
  const obstruction = finiteOrNull(axes?.obstruction_score) ?? obstructionFallback(materialScores);
  const sensitivity = clamp(finite(env?.sensitivity), 0, 3);
  const vectors = Array.isArray(env?.vectors)
    ? env.vectors.map((value) => String(value || "").trim()).filter(Boolean)
    : Array.isArray(constitution?.env_vectors)
      ? constitution.env_vectors
      : [];

  return {
    core_code: coreCode,
    sub_labels: fallbackLabels,
    axes: {
      yin_yang_score: clamp(yinYang, -1, 1),
      drive_score: clamp(drive, -1, 1),
      obstruction_score: clamp(obstruction, 0, 1),
      thermo_answer: String(axes?.thermo_answer || "neutral"),
    },
    env: { sensitivity, vectors },
    material_scores: materialScores,
    normalized_material_scores: Object.fromEntries(
      MATERIAL_KEYS.map((key) => [key, round3(saturatingMaterialScore(materialScores[key]))])
    ),
  };
}

function normalizeWeatherEvents(weatherStress) {
  const events = weatherStress?.event_strengths || {};
  return {
    pressure_shift: clamp01(events.pressure_shift ?? weatherStress?.pressure_shift_strength ?? Math.max(
      finite(weatherStress?.pressure_down_strength),
      finite(weatherStress?.pressure_up_strength)
    )),
    temperature_shift: clamp01(events.temperature_shift ?? weatherStress?.temperature_shift_strength),
    cold: clamp01(events.cold ?? weatherStress?.cold_strength),
    heat: clamp01(events.heat ?? weatherStress?.heat_strength),
    damp: clamp01(events.damp ?? weatherStress?.damp_strength),
    dry: clamp01(events.dry ?? weatherStress?.dry_strength),
  };
}

function buildAffinities(profile, weatherStress) {
  const raw = Object.fromEntries(WEATHER_EVENT_KEYS.map((key) => [key, AFFINITY_BASE]));
  const trace = Object.fromEntries(
    WEATHER_EVENT_KEYS.map((key) => [key, { base: AFFINITY_BASE }])
  );
  const add = (key, source, value) => {
    const delta = Math.max(0, finite(value));
    if (!raw[key] || delta <= 0) return;
    raw[key] += delta;
    trace[key][source] = round3((trace[key][source] || 0) + delta);
  };

  // A direct answer that weather affects the user raises every channel
  // modestly. The selected trigger answers below remain channel-specific.
  const sensitivity = clamp(profile.env.sensitivity / 3, 0, 1);
  WEATHER_EVENT_KEYS.forEach((key) => add(key, "environment_sensitivity", sensitivity * 0.1));

  const vectors = new Set(profile.env.vectors);
  if (vectors.has("pressure_shift")) add("pressure_shift", "self_reported_trigger", 0.18);
  if (vectors.has("temp_swing")) add("temperature_shift", "self_reported_trigger", 0.16);
  if (vectors.has("humidity_up")) add("damp", "self_reported_trigger", 0.18);
  if (vectors.has("dryness_up")) add("dry", "self_reported_trigger", 0.18);
  if (vectors.has("wind_strong")) add("pressure_shift", "self_reported_wind", 0.05);

  // The user's explicit hot/cold answer is stronger than the summarized
  // accelerator/brake prior and is never cancelled by the core type.
  const thermo = profile.axes.thermo_answer;
  if (thermo === "cold") add("cold", "thermo_answer", 0.18);
  if (thermo === "heat") add("heat", "thermo_answer", 0.18);

  Object.entries(MATERIAL_AFFINITY_WEIGHTS).forEach(([weatherKey, materialWeights]) => {
    Object.entries(materialWeights).forEach(([materialKey, weight]) => {
      const normalized = clamp01(profile.normalized_material_scores[materialKey]);
      add(weatherKey, `material_${materialKey}`, normalized * weight);
    });
  });

  const yy = profile.axes.yin_yang_score;
  add("heat", "reaction_axis", Math.max(0, yy) * 0.05);
  add("dry", "reaction_axis", Math.max(0, yy) * 0.04);
  add("cold", "reaction_axis", Math.max(0, -yy) * 0.05);
  add("damp", "reaction_axis", Math.max(0, -yy) * 0.04);

  // Pressure direction remains secondary. The opposite direction is not
  // penalized, so both reaction styles still respond to a large shift.
  const pressureDirection = weatherStress?.pressure_direction;
  if (pressureDirection === "up") add("pressure_shift", "pressure_direction_match", Math.max(0, yy) * 0.06);
  else if (pressureDirection === "down") add("pressure_shift", "pressure_direction_match", Math.max(0, -yy) * 0.06);
  else if (pressureDirection === "mixed") add("pressure_shift", "pressure_direction_match", Math.abs(yy) * 0.03);

  const weights = Object.fromEntries(
    WEATHER_EVENT_KEYS.map((key) => {
      const finalValue = round3(clamp(raw[key], AFFINITY_MIN, AFFINITY_MAX));
      trace[key].raw_total = round3(raw[key]);
      trace[key].final_weight = finalValue;
      return [key, finalValue];
    })
  );

  return {
    weights,
    trace: {
      hierarchy: ["direct_answers", "six_material_scores", "reaction_axis_secondary"],
      channels: trace,
    },
  };
}

function buildNeutralAffinities(value) {
  const weight = round3(clamp(value, AFFINITY_MIN, AFFINITY_MAX));
  const channels = Object.fromEntries(WEATHER_EVENT_KEYS.map((key) => [key, {
    base: weight,
    public_neutral_reference: weight,
    raw_total: weight,
    final_weight: weight,
  }]));
  return {
    weights: Object.fromEntries(WEATHER_EVENT_KEYS.map((key) => [key, weight])),
    trace: {
      hierarchy: ["public_neutral_reference"],
      channels,
    },
  };
}

function buildEventLoads(weather, affinities) {
  return Object.fromEntries(Object.keys(weather).map((key) => {
    const multiplier = UNIVERSAL_SHARE + PERSONAL_SHARE * clamp01(affinities[key]);
    return [key, round3(clamp01(weather[key] * multiplier))];
  }));
}

function buildGroupedLoads({ eventLoads, weather, affinities, weatherStress }) {
  const pressurePresentationDirection =
    weatherStress?.pressure_presentation_direction || weatherStress?.pressure_direction;
  const pressureExact = pressurePresentationDirection === "up" ? "pressure_up" : "pressure_down";
  const temperatureChoice = pickChoice(["temperature_shift", "cold", "heat"], eventLoads);
  const moistureChoice = pickChoice(["damp", "dry"], eventLoads);

  return {
    pressure: buildGroup({
      group: "pressure",
      eventKey: "pressure_shift",
      exact: pressureExact,
      direction: weatherStress?.pressure_direction || "steady",
      eventLoads,
      weather,
      affinities,
    }),
    temperature: buildGroup({
      group: "temperature",
      eventKey: temperatureChoice,
      exact: temperatureChoice === "temperature_shift" ? "temp_shift" : temperatureChoice,
      direction: temperatureChoice === "temperature_shift"
        ? weatherStress?.temperature_direction || "change"
        : temperatureChoice === "cold" ? "down" : "up",
      eventLoads,
      weather,
      affinities,
    }),
    moisture: buildGroup({
      group: "moisture",
      eventKey: moistureChoice,
      exact: moistureChoice,
      direction: moistureChoice === "dry" ? "down" : "up",
      eventLoads,
      weather,
      affinities,
    }),
  };
}

function buildGroup({ group, eventKey, exact, direction, eventLoads, weather, affinities }) {
  return {
    group,
    event_key: eventKey,
    exact,
    direction,
    effective_load: round3(eventLoads[eventKey] || 0),
    weather_strength: round3(weather[eventKey] || 0),
    affinity_weight: round3(affinities[eventKey] || 0),
  };
}

function addPersonalLoads(grouped, reserveScalar, weatherStress) {
  return Object.fromEntries(Object.entries(grouped).map(([key, group]) => {
    const personalLoad = clamp01(Number(group?.effective_load || 0) * clamp(reserveScalar, RESERVE_MIN, RESERVE_MAX));
    const peak = getPeak(weatherStress, group?.exact);
    return [key, {
      ...group,
      personal_load: round3(personalLoad),
      display_load: round3(personalLoad),
      reserve_scalar: round3(clamp(reserveScalar, RESERVE_MIN, RESERVE_MAX)),
      peak_start: peak?.start || null,
      peak_end: peak?.end || null,
    }];
  }));
}

function buildTriggerFactors(rankedGroups, weatherStress) {
  const top = rankedGroups[0];
  if (!top || top.effective_load <= 0.05) return [];
  const factors = [decorateFactor(top, "primary", weatherStress)];
  const second = rankedGroups[1];
  if (
    second &&
    second.effective_load >= SECONDARY_MIN_LOAD &&
    second.effective_load >= top.effective_load * SECONDARY_MIN_RATIO
  ) {
    factors.push(decorateFactor(second, "secondary", weatherStress));
  }
  return factors;
}

function decorateFactor(group, role, weatherStress) {
  const compat = exactToCompat(group.exact, group.direction);
  const peak = getPeak(weatherStress, group.exact);
  return {
    key: group.exact,
    exact: group.exact,
    event_key: group.event_key,
    weather_group: group.group,
    role,
    direction: group.direction,
    main_trigger: compat.main_trigger,
    trigger_dir: compat.trigger_dir,
    effective_load: round2(group.effective_load),
    weather_strength: round2(group.weather_strength),
    affinity_weight: round2(group.affinity_weight),
    peak_start: peak?.start || null,
    peak_end: peak?.end || null,
    peakStart: peak?.start || null,
    peakEnd: peak?.end || null,
  };
}

function computeScore({ rankedGroups, eventLoads, weather, affinities, reserveScalar, weatherStress }) {
  const appliedReserve = clamp(reserveScalar, RESERVE_MIN, RESERVE_MAX);
  const moistureDirection = weatherStress?.moisture_direction || weatherStress?.meta?.moisture?.direction || "steady";
  const moistureAffinityKey = moistureDirection === "down" ? "dry" : "damp";
  const moistureShiftLoad = buildSingleEventLoad(
    weatherStress?.moisture_shift_strength,
    affinities?.[moistureAffinityKey]
  );

  const acuteLoads = [
    {
      group: "pressure",
      event_key: "pressure_shift",
      load: eventLoads.pressure_shift || 0,
      raw_strength: weather.pressure_shift || 0,
    },
    {
      group: "temperature",
      event_key: "temperature_shift",
      load: eventLoads.temperature_shift || 0,
      raw_strength: weather.temperature_shift || 0,
    },
    {
      group: "moisture",
      event_key: "moisture_shift",
      load: moistureShiftLoad,
      raw_strength: clamp01(weatherStress?.moisture_shift_strength),
    },
  ].sort((a, b) => b.load - a.load);

  const groupDetails = Object.fromEntries(rankedGroups.map((entry) => [entry.group, entry]));
  const contributions = acuteLoads.map((entry, index) => {
    const baseWeight = ACUTE_SCORE_WEIGHTS[index] || 0;
    return {
      ...(groupDetails[entry.group] || {}),
      group: entry.group,
      score_event_key: entry.event_key,
      score_load: round3(entry.load),
      raw_change_strength: round3(entry.raw_strength),
      rank: index + 1,
      base_weight: baseWeight,
      contribution: round2(entry.load * baseWeight),
    };
  });
  const acuteBase = acuteLoads.reduce(
    (sum, entry, index) => sum + entry.load * (ACUTE_SCORE_WEIGHTS[index] || 0),
    0
  );
  const acuteAfterReserve = acuteBase * appliedReserve;
  const strongAcuteBonus = (acuteLoads[0]?.raw_strength || 0) >= 0.9 ? 0.25 : 0;
  const secondAcuteBonus = (acuteLoads[1]?.load || 0) >= 0.55 ? 0.4 : 0;
  const thirdAcuteBonus = (acuteLoads[2]?.load || 0) >= 0.5 ? 0.2 : 0;
  const acuteScore = acuteAfterReserve + strongAcuteBonus + secondAcuteBonus + thirdAcuteBonus;

  const personalTemperatureAbsolute = Math.max(eventLoads.heat || 0, eventLoads.cold || 0);
  const personalMoistureAbsolute = Math.max(eventLoads.damp || 0, eventLoads.dry || 0);
  const rawTemperatureAbsolute = Math.max(weather.heat || 0, weather.cold || 0);
  const rawMoistureAbsolute = Math.max(weather.damp || 0, weather.dry || 0);
  const personalAbsoluteLoad = combineThermalEnvironmentLoad(
    personalTemperatureAbsolute,
    personalMoistureAbsolute
  );
  const rawAbsoluteLoad = combineThermalEnvironmentLoad(
    rawTemperatureAbsolute,
    rawMoistureAbsolute
  );
  const personalAbsoluteScore = PERSONAL_ABSOLUTE_SCORE_MAX
    * Math.pow(personalAbsoluteLoad, 1.4)
    * appliedReserve;
  const universalExtremeFloor = buildUniversalExtremeFloor(rawAbsoluteLoad);
  const criticalExtremeBonus = buildCriticalExtremeBonus(weather);
  const absoluteScore = Math.max(personalAbsoluteScore, universalExtremeFloor) + criticalExtremeBonus;

  const concurrenceBonus = acuteScore >= 3 && absoluteScore >= 3
    ? Math.min(0.65, 0.18 + Math.min(acuteScore, absoluteScore) / 12)
    : 0;
  const final = clamp(Math.max(acuteScore, absoluteScore) + concurrenceBonus, 0, 10);

  return {
    final_score_0_10: round1(final),
    base_score_before_reserve: round2(acuteBase),
    reserve_scalar_applied: round3(appliedReserve),
    score_after_reserve: round2(acuteAfterReserve),
    weather_group_contributions: contributions,
    score_components: {
      acute_change_score: round2(acuteScore),
      absolute_environment_score: round2(absoluteScore),
      personal_absolute_environment_score: round2(personalAbsoluteScore),
      universal_extreme_floor: round2(universalExtremeFloor),
      personal_absolute_environment_load: round3(personalAbsoluteLoad),
      raw_absolute_environment_load: round3(rawAbsoluteLoad),
      moisture_shift_load: round3(moistureShiftLoad),
      concurrence_bonus: round2(concurrenceBonus),
      final_policy: "max_acute_or_absolute_plus_small_concurrence",
    },
    bonuses: {
      strong_acute_change: strongAcuteBonus,
      second_acute_change: secondAcuteBonus,
      third_acute_change: thirdAcuteBonus,
      critical_extreme_environment: criticalExtremeBonus,
      acute_absolute_concurrence: round2(concurrenceBonus),
    },
  };
}

function buildSingleEventLoad(strength, affinity) {
  const multiplier = UNIVERSAL_SHARE + PERSONAL_SHARE * clamp01(affinity);
  return round3(clamp01(clamp01(strength) * multiplier));
}

function combineThermalEnvironmentLoad(temperatureLoad, moistureLoad) {
  const temperature = clamp01(temperatureLoad);
  const moisture = clamp01(moistureLoad);
  return clamp01(Math.max(temperature, moisture * 0.65) + Math.min(temperature, moisture) * 0.12);
}

function buildUniversalExtremeFloor(rawAbsoluteLoad) {
  const load = clamp01(rawAbsoluteLoad);
  const base = UNIVERSAL_EXTREME_FLOOR_BASE_MAX * Math.pow(load, 3);
  const extremeRamp = UNIVERSAL_EXTREME_RAMP_MAX * clamp01((load - 0.92) / 0.08);
  return base + extremeRamp;
}

function buildCriticalExtremeBonus(weather) {
  const heat = clamp01(weather?.heat);
  const cold = clamp01(weather?.cold);
  const damp = clamp01(weather?.damp);
  const dry = clamp01(weather?.dry);
  if (heat >= 0.98 || cold >= 0.98) return 0.3;
  if ((heat >= 0.9 && damp >= 0.85) || (cold >= 0.9 && dry >= 0.85)) return 0.25;
  return 0;
}

function buildReserveScalar(profile) {
  return 1 - profile.axes.drive_score * 0.1;
}

function buildManifestationProfile(profile) {
  const yy = profile.axes.yin_yang_score;
  const reactionDirection = yy > 0.18 ? "accel" : yy < -0.18 ? "brake" : "balanced";
  const ranked = Object.entries(profile.normalized_material_scores)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value);
  return {
    reaction_direction: reactionDirection,
    reaction_axis_score: round3(yy),
    obstruction_score: round3(profile.axes.obstruction_score),
    reserve_score: round3(profile.axes.drive_score),
    material_ranking: ranked,
    material_scores: profile.normalized_material_scores,
  };
}

function buildLegacyEffectiveLoads(grouped) {
  const out = { pressure_down: 0, pressure_up: 0, cold: 0, heat: 0, damp: 0, dry: 0, temp_shift: 0 };
  Object.values(grouped).forEach((group) => {
    if (out[group.exact] != null) out[group.exact] = group.effective_load;
  });
  return out;
}

function buildLegacyPersonalStrengths(weather, affinities, weatherStress) {
  const pressure = round2(weather.pressure_shift * affinities.pressure_shift);
  const pressureUp = (
    weatherStress?.pressure_presentation_direction || weatherStress?.pressure_direction
  ) === "up" ? pressure : 0;
  const pressureDown = pressureUp ? 0 : pressure;
  return {
    pressure_down: pressureDown,
    pressure_up: pressureUp,
    temp_shift: round2(weather.temperature_shift * affinities.temperature_shift),
    cold: round2(weather.cold * affinities.cold),
    heat: round2(weather.heat * affinities.heat),
    damp: round2(weather.damp * affinities.damp),
    dry: round2(weather.dry * affinities.dry),
  };
}

function pickChoice(keys, values) {
  return keys.slice().sort((a, b) => Number(values?.[b] || 0) - Number(values?.[a] || 0))[0];
}

function getPeak(weatherStress, exact) {
  if (exact === "pressure_down" || exact === "pressure_up") {
    return weatherStress?.channel_peaks?.[exact] || weatherStress?.channel_peaks?.pressure_shift || null;
  }
  return weatherStress?.channel_peaks?.[exact] || null;
}

function emptyTriggerFactor(weatherStress) {
  return {
    exact: (
      weatherStress?.pressure_presentation_direction || weatherStress?.pressure_direction
    ) === "up" ? "pressure_up" : "pressure_down",
    direction: weatherStress?.pressure_direction || "steady",
  };
}

function exactToCompat(exact, direction) {
  if (exact === "pressure_down") return { main_trigger: "pressure", trigger_dir: "down" };
  if (exact === "pressure_up") return { main_trigger: "pressure", trigger_dir: "up" };
  if (exact === "temp_shift") return { main_trigger: "temp", trigger_dir: "change" };
  if (exact === "cold") return { main_trigger: "temp", trigger_dir: "down" };
  if (exact === "heat") return { main_trigger: "temp", trigger_dir: "up" };
  if (exact === "damp") return { main_trigger: "humidity", trigger_dir: "up" };
  if (exact === "dry") return { main_trigger: "humidity", trigger_dir: "down" };
  return { main_trigger: "weather", trigger_dir: "none" };
}

function extractSubLabels(source) {
  if (!Array.isArray(source)) return [];
  return source
    .map((entry, index) => typeof entry === "string"
      ? { label: entry, weight: 100 - index }
      : { label: String(entry?.label || "").trim(), weight: finite(entry?.weight) })
    .filter((entry) => entry.label)
    .sort((a, b) => b.weight - a.weight)
    .map((entry) => entry.label);
}

function coreDriveFallback(coreCode) {
  const code = String(coreCode || "");
  if (code.includes("batt_small")) return -0.6;
  if (code.includes("batt_large")) return 0.6;
  return 0;
}

function obstructionFallback(materialScores) {
  const total = finite(materialScores.qi_stagnation) + finite(materialScores.blood_stasis) + finite(materialScores.fluid_damp);
  return clamp(total / (total + 3), 0, 1);
}

function saturatingMaterialScore(value) {
  const score = Math.max(0, finite(value));
  return score / (score + 2.5);
}

export function forecastSignalFromScoreV2(score) {
  if (Number(score) >= 7) return 2;
  if (Number(score) >= 4) return 1;
  return 0;
}

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function clampInt(value, min, max) {
  return Math.round(clamp(value, min, max));
}

function round1(value) {
  return Math.round(finite(value) * 10) / 10;
}

function round2(value) {
  return Math.round(finite(value) * 100) / 100;
}

function round3(value) {
  return Math.round(finite(value) * 1000) / 1000;
}
