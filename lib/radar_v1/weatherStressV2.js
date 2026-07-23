/**
 * Radar forecast weather model v2.
 *
 * The score is built from independent weather events instead of adding six
 * directions together:
 *   1. pressure change (direction is presentation/secondary context)
 *   2. temperature change and absolute heat/cold
 *   3. moisture environment based mainly on dew point / absolute humidity
 *
 * The returned legacy fields are intentionally kept so the existing care and
 * UI layers can continue to render old and new snapshots side by side.
 */

export const RADAR_WEATHER_MODEL_VERSION = "radar_weather_v2_2026-07-23_extreme_caution";

const HOUR_MS = 60 * 60 * 1000;

const PRESSURE_WINDOWS = [
  { hours: 3, threshold: 3.25, weight: 1 },
  { hours: 6, threshold: 5.25, weight: 1 },
  { hours: 12, threshold: 7.5, weight: 0.92 },
  { hours: 24, threshold: 10.5, weight: 0.82 },
];

const PRESSURE_TIMELINE_WINDOWS = PRESSURE_WINDOWS.slice(0, 3);

const TEMPERATURE_WINDOWS = [
  { hours: 3, threshold: 3.5, weight: 1 },
  { hours: 6, threshold: 5.5, weight: 0.96 },
  { hours: 12, threshold: 8, weight: 0.86 },
  { hours: 24, threshold: 10, weight: 0.76 },
];

const TEMPERATURE_TIMELINE_WINDOWS = TEMPERATURE_WINDOWS.slice(0, 3);

const TEMPERATURE_COMFORT_WINDOWS = [
  { hours: 3, threshold: 0.34, weight: 1 },
  { hours: 6, threshold: 0.48, weight: 0.96 },
  { hours: 12, threshold: 0.68, weight: 0.88 },
  { hours: 24, threshold: 0.86, weight: 0.8 },
];

const TEMPERATURE_COMFORT_TIMELINE_WINDOWS = TEMPERATURE_COMFORT_WINDOWS.slice(0, 3);

const MOISTURE_WINDOWS = [
  { hours: 6, threshold: 3.2, weight: 1 },
  { hours: 12, threshold: 4.5, weight: 0.9 },
  { hours: 24, threshold: 6, weight: 0.8 },
];

const MOISTURE_COMFORT_WINDOWS = [
  { hours: 6, threshold: 0.34, weight: 1 },
  { hours: 12, threshold: 0.5, weight: 0.9 },
  { hours: 24, threshold: 0.7, weight: 0.8 },
];

const TEMPERATURE_NEUTRAL_MIN_C = 18;
const TEMPERATURE_NEUTRAL_MAX_C = 27;
const RELIEF_TRANSITION_SHARE = 0.22;
const MOISTURE_RELIEF_TRANSITION_SHARE = 0.2;

const EVENT_KEYS = ["pressure_shift", "temperature_shift", "cold", "heat", "damp", "dry"];

export function buildWeatherStressV2({ points, previousNightBridgePoints = null }) {
  const dayPoints = preparePoints(points);
  if (!dayPoints.length) throw new Error("buildWeatherStressV2: points is empty");

  const bridgePoints = preparePoints(previousNightBridgePoints);
  const timelineContext = bridgePoints.length
    ? mergeByTimestamp([...bridgePoints, ...dayPoints])
    : dayPoints;

  const day = analyzeDataset(dayPoints);
  const bridge = bridgePoints.length >= 2 ? analyzeDataset(bridgePoints) : null;
  const eventStrengths = mergeBridgeStrengths(day.event_strengths, bridge?.event_strengths);
  const moistureShiftStrength = mergeSingleStrength(
    day.moisture.shift_strength,
    bridge?.moisture?.shift_strength
  );

  const pressureDirection = pickMergedDirection({
    dayDirection: day.pressure.direction,
    dayStrength: day.event_strengths.pressure_shift,
    bridgeDirection: bridge?.pressure?.direction,
    bridgeStrength: bridge?.event_strengths?.pressure_shift,
  });
  const pressurePresentationDirection = pressureDirection === "mixed"
    ? pickMergedDominantDirection({
        dayDominant: day.pressure.dominant_direction,
        dayStrength: day.event_strengths.pressure_shift,
        bridgeDominant: bridge?.pressure?.dominant_direction,
        bridgeStrength: bridge?.event_strengths?.pressure_shift,
      })
    : pressureDirection;
  const temperatureDirection = pickMergedDirection({
    dayDirection: day.temperature.direction,
    dayStrength: day.event_strengths.temperature_shift,
    bridgeDirection: bridge?.temperature?.direction,
    bridgeStrength: bridge?.event_strengths?.temperature_shift,
  });
  const moistureDirection = pickMergedDirection({
    dayDirection: day.moisture.direction,
    dayStrength: day.moisture.shift_strength,
    bridgeDirection: bridge?.moisture?.direction,
    bridgeStrength: bridge?.moisture?.shift_strength,
  });

  const timeline = dayPoints.map((point) => buildTimelineRow(point, timelineContext));
  const fullDayPeak = findPeakWindow(timeline);
  const activePeak = findPeakWindow(
    timeline.filter((row) => {
      const hour = jstHour(row.ts);
      return hour >= 6 && hour < 22;
    }),
    fullDayPeak
  );
  const channelPeaks = buildChannelPeaks(timeline, activePeak);
  const environmentalCautions = buildEnvironmentalCautions(day.temperature);

  const pressureExact = pressurePresentationDirection === "up" ? "pressure_up" : "pressure_down";
  const weatherMainEvent = pickTopEvent(eventStrengths);
  const weatherMainExact = eventToPresentationExact({
    eventKey: weatherMainEvent,
    pressureDirection: pressurePresentationDirection,
    temperatureDirection,
    eventStrengths,
  });
  const compat = exactToCompat(weatherMainExact, {
    pressureDirection,
    temperatureDirection,
  });

  // Legacy directional fields show the direction but never duplicate the same
  // pressure event. Mixed days use the larger observed direction for display.
  const pressureDownStrength = pressureExact === "pressure_down" ? eventStrengths.pressure_shift : 0;
  const pressureUpStrength = pressureExact === "pressure_up" ? eventStrengths.pressure_shift : 0;
  const channelStrengths = {
    pressure_down: round3(pressureDownStrength),
    pressure_up: round3(pressureUpStrength),
    cold: round3(eventStrengths.cold),
    heat: round3(eventStrengths.heat),
    damp: round3(eventStrengths.damp),
    dry: round3(eventStrengths.dry),
    temp_shift: round3(eventStrengths.temperature_shift),
  };

  return {
    model_version: RADAR_WEATHER_MODEL_VERSION,
    pressure_shift_strength: round3(eventStrengths.pressure_shift),
    pressure_direction: pressureDirection,
    pressure_presentation_direction: pressurePresentationDirection,
    pressure_reversal: Boolean(day.pressure.reversal || bridge?.pressure?.reversal),
    temperature_shift_strength: round3(eventStrengths.temperature_shift),
    temperature_direction: temperatureDirection,
    moisture_shift_strength: round3(moistureShiftStrength),
    moisture_direction: moistureDirection,
    environmental_cautions: environmentalCautions,
    pressure_down_strength: round3(pressureDownStrength),
    pressure_up_strength: round3(pressureUpStrength),
    cold_strength: round3(eventStrengths.cold),
    heat_strength: round3(eventStrengths.heat),
    damp_strength: round3(eventStrengths.damp),
    dry_strength: round3(eventStrengths.dry),
    event_strengths: roundMap(eventStrengths),
    channel_strengths: channelStrengths,
    channel_peaks: channelPeaks,
    weather_main_event: weatherMainEvent,
    weather_main_trigger_exact: weatherMainExact,
    main_trigger_exact: weatherMainExact,
    main_trigger: compat.main_trigger,
    trigger_dir: compat.trigger_dir,
    full_day_peak_start: fullDayPeak.start,
    full_day_peak_end: fullDayPeak.end,
    active_peak_start: activePeak.start,
    active_peak_end: activePeak.end,
    peak_start: activePeak.start,
    peak_end: activePeak.end,
    timeline,
    meta: {
      extraction_version: RADAR_WEATHER_MODEL_VERSION,
      event_group_policy: "pressure_once_temperature_max_moisture_max",
      point_count: dayPoints.length,
      context_point_count: timelineContext.length,
      pressure: day.pressure,
      temperature: day.temperature,
      moisture: day.moisture,
      event_strengths: roundMap(eventStrengths),
      day_only_event_strengths: roundMap(day.event_strengths),
      night_bridge: {
        applied: Boolean(bridge),
        point_count: bridgePoints.length,
        event_strengths: roundMap(bridge?.event_strengths || emptyEvents()),
        moisture_shift_strength: round3(bridge?.moisture?.shift_strength || 0),
      },
      full_day_peak: fullDayPeak,
      active_peak: activePeak,
      channel_peaks: channelPeaks,
      extreme_environment: {
        independent_from_yuragi_score: true,
        official_alert: false,
        source: "radar_absolute_temperature_v1",
        cautions: environmentalCautions,
      },
      timeline_sample: timeline.slice(0, 6),
    },
  };
}

function buildEnvironmentalCautions(temperature = {}) {
  const maxTemp = Number(temperature?.max_c);
  const minTemp = Number(temperature?.min_c);
  const cautions = [];

  if (Number.isFinite(maxTemp) && maxTemp >= 40) {
    cautions.push({
      key: "extreme_heat_40",
      level: "critical",
      label: "酷暑への注意",
      detail: "最高気温40℃以上の予測です。体質別のゆらぎ度とは別に、暑さを避ける安全対策を優先してください。",
      metric: "daily_max_temperature_c",
      value: round3(maxTemp),
      threshold: 40,
      official_alert: false,
      source: "radar_absolute_temperature_v1",
    });
  } else if (Number.isFinite(maxTemp) && maxTemp >= 35) {
    cautions.push({
      key: "extreme_heat_35",
      level: "high",
      label: "猛暑への注意",
      detail: "最高気温35℃以上の予測です。体質別のゆらぎ度とは別に、涼しい場所と水分を早めに確保してください。",
      metric: "daily_max_temperature_c",
      value: round3(maxTemp),
      threshold: 35,
      official_alert: false,
      source: "radar_absolute_temperature_v1",
    });
  }

  if (
    Number.isFinite(maxTemp)
    && Number.isFinite(minTemp)
    && (maxTemp < 0 || minTemp <= -5)
  ) {
    cautions.push({
      key: "extreme_cold",
      level: "high",
      label: "厳しい寒さへの注意",
      detail: "一日を通した氷点下、または氷点下5℃以下の予測です。体質別のゆらぎ度とは別に、防寒と移動時の安全を優先してください。",
      metric: maxTemp < 0 ? "daily_max_temperature_c" : "daily_min_temperature_c",
      value: round3(maxTemp < 0 ? maxTemp : minTemp),
      threshold: maxTemp < 0 ? 0 : -5,
      official_alert: false,
      source: "radar_absolute_temperature_v1",
    });
  }

  return cautions;
}

function analyzeDataset(points) {
  const pressurePoints = points.filter((point) => isNumber(point.pressure_hpa));
  const temperaturePoints = points.filter((point) => isNumber(point.temp_c));
  const moisturePoints = points.filter((point) => isNumber(point.absolute_humidity_gm3));

  const pressureUp = rollingDirection(pressurePoints, "pressure_hpa", "up", PRESSURE_WINDOWS);
  const pressureDown = rollingDirection(pressurePoints, "pressure_hpa", "down", PRESSURE_WINDOWS);
  const pressure = summarizeDirectionalChange(pressureUp, pressureDown);

  const temperatureUp = rollingDirection(
    temperaturePoints,
    "temp_c",
    "up",
    TEMPERATURE_WINDOWS,
    { discountExpectedDiurnal: true }
  );
  const temperatureDown = rollingDirection(
    temperaturePoints,
    "temp_c",
    "down",
    TEMPERATURE_WINDOWS,
    { discountExpectedDiurnal: true }
  );
  const temperature = summarizeDirectionalChange(temperatureUp, temperatureDown);
  const temperatureComfortTransition = rollingComfortDeparture(
    temperaturePoints,
    signedTemperatureComfortDistance,
    TEMPERATURE_COMFORT_WINDOWS,
    { discountExpectedDiurnal: true }
  );
  const temperatureShiftStrength = Math.max(
    temperatureComfortTransition.strength,
    temperature.strength * RELIEF_TRANSITION_SHARE
  );

  const moistureUp = rollingDirection(moisturePoints, "absolute_humidity_gm3", "up", MOISTURE_WINDOWS);
  const moistureDown = rollingDirection(moisturePoints, "absolute_humidity_gm3", "down", MOISTURE_WINDOWS);
  const moistureDirection = summarizeDirectionalChange(moistureUp, moistureDown);
  const moistureComfortTransition = rollingComfortDeparture(
    moisturePoints,
    signedMoistureComfortDistance,
    MOISTURE_COMFORT_WINDOWS
  );
  const moistureShiftStrength = Math.max(
    moistureComfortTransition.strength,
    moistureDirection.strength * MOISTURE_RELIEF_TRANSITION_SHARE
  );
  const cold = computeColdLevel(temperaturePoints);
  const heat = computeHeatLevel(temperaturePoints);
  const damp = computeDampLevel(moisturePoints, moistureUp.strength);
  const dry = computeDryLevel(moisturePoints, moistureDown.strength);

  return {
    pressure: {
      ...pressure,
      min_hpa: minOf(pressurePoints, "pressure_hpa"),
      max_hpa: maxOf(pressurePoints, "pressure_hpa"),
      up_max_delta: round3(pressureUp.max_delta),
      down_max_delta: round3(pressureDown.max_delta),
      up_window_hours: pressureUp.window_hours,
      down_window_hours: pressureDown.window_hours,
    },
    temperature: {
      ...temperature,
      raw_shift_strength: round3(temperature.strength),
      comfort_departure_strength: round3(temperatureComfortTransition.strength),
      comfort_relief_strength: round3(temperatureComfortTransition.relief_strength),
      scored_shift_strength: round3(temperatureShiftStrength),
      comfort_band_c: [TEMPERATURE_NEUTRAL_MIN_C, TEMPERATURE_NEUTRAL_MAX_C],
      min_c: minOf(temperaturePoints, "temp_c"),
      max_c: maxOf(temperaturePoints, "temp_c"),
      range_c: round3(rangeOf(temperaturePoints, "temp_c")),
      up_max_delta: round3(temperatureUp.max_delta),
      down_max_delta: round3(temperatureDown.max_delta),
      diurnal_change_discounted: true,
    },
    moisture: {
      direction: moistureDirection.direction,
      dominant_direction: moistureDirection.dominant_direction,
      raw_shift_strength: round3(moistureDirection.strength),
      comfort_departure_strength: round3(moistureComfortTransition.strength),
      comfort_relief_strength: round3(moistureComfortTransition.relief_strength),
      shift_strength: round3(moistureShiftStrength),
      min_dew_point_c: minOf(points, "dew_point_c"),
      max_dew_point_c: maxOf(points, "dew_point_c"),
      min_absolute_humidity_gm3: minOf(moisturePoints, "absolute_humidity_gm3"),
      max_absolute_humidity_gm3: maxOf(moisturePoints, "absolute_humidity_gm3"),
      absolute_humidity_up_strength: round3(moistureUp.strength),
      absolute_humidity_down_strength: round3(moistureDown.strength),
      relative_humidity_used_as_secondary: true,
    },
    event_strengths: {
      pressure_shift: round3(pressure.strength),
      temperature_shift: round3(temperatureShiftStrength),
      cold: round3(cold),
      heat: round3(heat),
      damp: round3(damp),
      dry: round3(dry),
    },
  };
}

function buildTimelineRow(point, context) {
  const pressureUp = pointRollingDirection(context, point, "pressure_hpa", "up", PRESSURE_TIMELINE_WINDOWS);
  const pressureDown = pointRollingDirection(context, point, "pressure_hpa", "down", PRESSURE_TIMELINE_WINDOWS);
  const pressureShift = Math.max(pressureUp, pressureDown);
  const tempUp = pointRollingDirection(
    context,
    point,
    "temp_c",
    "up",
    TEMPERATURE_TIMELINE_WINDOWS,
    { discountExpectedDiurnal: true }
  );
  const tempDown = pointRollingDirection(
    context,
    point,
    "temp_c",
    "down",
    TEMPERATURE_TIMELINE_WINDOWS,
    { discountExpectedDiurnal: true }
  );
  const rawTempShift = Math.max(tempUp, tempDown);
  const comfortDeparture = pointRollingComfortDeparture(
    context,
    point,
    signedTemperatureComfortDistance,
    TEMPERATURE_COMFORT_TIMELINE_WINDOWS,
    { discountExpectedDiurnal: true }
  );
  const tempShift = Math.max(comfortDeparture, rawTempShift * RELIEF_TRANSITION_SHARE);
  const cold = isNumber(point.temp_c) ? clamp01((12 - point.temp_c) / 12) : 0;
  const heat = isNumber(point.temp_c) ? clamp01((point.temp_c - 28) / 8) : 0;
  const damp = pointDampDistance(point);
  const dry = pointDryDistance(point);
  const total = pressureShift + Math.max(tempShift, cold, heat) * 0.9 + Math.max(damp, dry) * 0.85;

  return {
    ts: point.ts,
    pressure_shift: round3(pressureShift),
    pressure_down: round3(pressureDown),
    pressure_up: round3(pressureUp),
    temp_shift: round3(tempShift),
    cold: round3(cold),
    heat: round3(heat),
    damp: round3(damp),
    dry: round3(dry),
    total: round3(total),
  };
}

function signedTemperatureComfortDistance(point) {
  const temperature = Number(point?.temp_c);
  if (!Number.isFinite(temperature)) return 0;
  if (temperature < TEMPERATURE_NEUTRAL_MIN_C) {
    return -clamp01((TEMPERATURE_NEUTRAL_MIN_C - temperature) / 12);
  }
  if (temperature > TEMPERATURE_NEUTRAL_MAX_C) {
    return clamp01((temperature - TEMPERATURE_NEUTRAL_MAX_C) / 10);
  }
  return 0;
}

function pointDampDistance(point) {
  const absoluteHumidity = Number(point?.absolute_humidity_gm3);
  const temperature = Number(point?.temp_c);
  const relativeHumidity = Number(point?.humidity_pct);
  if (!Number.isFinite(absoluteHumidity)) return 0;

  const vaporExcess = clamp01((absoluteHumidity - 14) / 8);
  const heatCoupling = Number.isFinite(temperature)
    ? clamp01((temperature - 22) / 10)
    : 0.4;
  const relativeAssist = Number.isFinite(relativeHumidity)
    ? clamp01((relativeHumidity - 75) / 25) * 0.12
    : 0;
  return clamp01(vaporExcess * (0.25 + heatCoupling * 0.75) + relativeAssist);
}

function pointDryDistance(point) {
  const absoluteHumidity = Number(point?.absolute_humidity_gm3);
  const relativeHumidity = Number(point?.humidity_pct);
  if (!Number.isFinite(absoluteHumidity)) return 0;

  const vaporDeficit = clamp01((8 - absoluteHumidity) / 6);
  const relativeAssist = Number.isFinite(relativeHumidity)
    ? clamp01((35 - relativeHumidity) / 25) * 0.15
    : 0;
  return clamp01(vaporDeficit + relativeAssist);
}

function signedMoistureComfortDistance(point) {
  const absoluteHumidity = Number(point?.absolute_humidity_gm3);
  if (!Number.isFinite(absoluteHumidity)) return 0;
  if (absoluteHumidity < 8) return -clamp01((8 - absoluteHumidity) / 6);
  if (absoluteHumidity > 14) return clamp01((absoluteHumidity - 14) / 8);
  return 0;
}

function comfortTransition(startSigned, endSigned) {
  const start = Number(startSigned) || 0;
  const end = Number(endSigned) || 0;
  const startDistance = Math.abs(start);
  const endDistance = Math.abs(end);
  const crossesComfortBand = start * end < 0;
  if (crossesComfortBand) {
    return { worsening: endDistance, relief: startDistance };
  }
  return {
    worsening: Math.max(0, endDistance - startDistance),
    relief: Math.max(0, startDistance - endDistance),
  };
}

function rollingComfortDeparture(points, distanceFn, windows, options = {}) {
  let best = { strength: 0, relief_strength: 0, start: null, end: null, window_hours: null };
  if (points.length < 2) return best;

  for (const window of windows) {
    const maxMs = window.hours * HOUR_MS;
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const start = points[i];
        const end = points[j];
        const elapsed = toMs(end.ts) - toMs(start.ts);
        if (elapsed <= 0) continue;
        if (elapsed > maxMs) break;
        const transition = comfortTransition(distanceFn(start), distanceFn(end));
        const diurnalFactor = options.discountExpectedDiurnal
          ? expectedDiurnalFactor(start.ts, end.ts, Number(end?.temp_c) >= Number(start?.temp_c) ? "up" : "down", elapsed)
          : 1;
        const strength = clamp01((transition.worsening / window.threshold) * window.weight * diurnalFactor);
        const reliefStrength = clamp01((transition.relief / window.threshold) * window.weight * diurnalFactor);
        if (strength > best.strength) {
          best = {
            ...best,
            strength,
            start: start.ts,
            end: end.ts,
            window_hours: window.hours,
          };
        }
        best.relief_strength = Math.max(best.relief_strength, reliefStrength);
      }
    }
  }

  return best;
}

function pointRollingComfortDeparture(points, current, distanceFn, windows, options = {}) {
  const currentMs = toMs(current?.ts);
  if (!Number.isFinite(currentMs)) return 0;
  let best = 0;
  for (const window of windows) {
    const maxMs = window.hours * HOUR_MS;
    for (const previous of points) {
      const elapsed = currentMs - toMs(previous?.ts);
      if (elapsed <= 0 || elapsed > maxMs) continue;
      const transition = comfortTransition(distanceFn(previous), distanceFn(current));
      const diurnalFactor = options.discountExpectedDiurnal
        ? expectedDiurnalFactor(previous.ts, current.ts, Number(current?.temp_c) >= Number(previous?.temp_c) ? "up" : "down", elapsed)
        : 1;
      best = Math.max(
        best,
        clamp01((transition.worsening / window.threshold) * window.weight * diurnalFactor)
      );
    }
  }
  return best;
}

function rollingDirection(points, field, mode, windows, options = {}) {
  let best = { strength: 0, max_delta: 0, window_hours: null, start: null, end: null };
  if (points.length < 2) return best;

  for (const window of windows) {
    const maxMs = window.hours * HOUR_MS;
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const a = points[i];
        const b = points[j];
        const elapsed = toMs(b.ts) - toMs(a.ts);
        if (elapsed <= 0) continue;
        if (elapsed > maxMs) break;
        if (!isNumber(a[field]) || !isNumber(b[field])) continue;
        const delta = mode === "down" ? a[field] - b[field] : b[field] - a[field];
        if (delta <= 0) continue;
        const diurnalFactor = options.discountExpectedDiurnal
          ? expectedDiurnalFactor(a.ts, b.ts, mode, elapsed)
          : 1;
        const strength = clamp01((delta / window.threshold) * window.weight * diurnalFactor);
        if (strength > best.strength) {
          best = {
            strength,
            max_delta: delta,
            window_hours: window.hours,
            start: a.ts,
            end: b.ts,
          };
        }
      }
    }
  }

  return best;
}

function pointRollingDirection(points, current, field, mode, windows, options = {}) {
  if (!isNumber(current?.[field])) return 0;
  const currentMs = toMs(current.ts);
  let best = 0;
  for (const window of windows) {
    const maxMs = window.hours * HOUR_MS;
    for (const previous of points) {
      if (!isNumber(previous?.[field])) continue;
      const elapsed = currentMs - toMs(previous.ts);
      if (elapsed <= 0 || elapsed > maxMs) continue;
      const delta = mode === "down"
        ? previous[field] - current[field]
        : current[field] - previous[field];
      if (delta <= 0) continue;
      const diurnalFactor = options.discountExpectedDiurnal
        ? expectedDiurnalFactor(previous.ts, current.ts, mode, elapsed)
        : 1;
      best = Math.max(best, clamp01((delta / window.threshold) * window.weight * diurnalFactor));
    }
  }
  return best;
}

function expectedDiurnalFactor(startTs, endTs, mode, elapsedMs) {
  // Morning warming and evening cooling are discounted because their direction
  // is part of an ordinary day. A truly sharp change can still score highly
  // after the discount because its delta/rate is large.
  void startTs;
  void elapsedMs;
  const endHour = jstHour(endTs);
  const expectedRise = mode === "up" && endHour >= 7 && endHour <= 15;
  const expectedFall = mode === "down" && (endHour >= 16 || endHour <= 5);
  return expectedRise || expectedFall ? 0.55 : 1;
}

function summarizeDirectionalChange(up, down) {
  const upStrength = clamp01(up?.strength || 0);
  const downStrength = clamp01(down?.strength || 0);
  const strength = Math.max(upStrength, downStrength);
  const lower = Math.min(upStrength, downStrength);
  const reversal = lower >= 0.3 && lower >= strength * 0.5;
  let direction = "steady";
  if (strength >= 0.08) direction = reversal ? "mixed" : upStrength > downStrength ? "up" : "down";
  const dominantDirection = upStrength > downStrength ? "up" : "down";
  return {
    strength: round3(strength),
    direction,
    dominant_direction: dominantDirection,
    reversal,
    up_strength: round3(upStrength),
    down_strength: round3(downStrength),
  };
}

function computeColdLevel(points) {
  if (!points.length) return 0;
  const values = points.map((point) => point.temp_c);
  const min = Math.min(...values);
  const coldRatio = values.filter((value) => value <= 12).length / values.length;
  const severeRatio = values.filter((value) => value <= 5).length / values.length;
  const intensity = clamp01((12 - min) / 12);
  return clamp01(coldRatio * 0.3 + severeRatio * 0.12 + intensity * 0.58);
}

function computeHeatLevel(points) {
  if (!points.length) return 0;
  const values = points.map((point) => point.temp_c);
  const max = Math.max(...values);
  const heatRatio = values.filter((value) => value >= 28).length / values.length;
  const severeRatio = values.filter((value) => value >= 33).length / values.length;
  const intensity = clamp01((max - 28) / 8);
  return clamp01(heatRatio * 0.28 + severeRatio * 0.12 + intensity * 0.6);
}

function computeDampLevel(points, moistureRiseStrength) {
  if (!points.length) return 0;
  const values = points.map(pointDampDistance);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const highRatio = values.filter((value) => value >= 0.35).length / values.length;
  const severeRatio = values.filter((value) => value >= 0.7).length / values.length;
  const max = Math.max(...values);
  return clamp01(
    average * 0.38 + highRatio * 0.2 + severeRatio * 0.15 + max * 0.27 + clamp01(moistureRiseStrength) * 0.08
  );
}

function computeDryLevel(points, moistureDropStrength) {
  if (!points.length) return 0;
  const values = points.map(pointDryDistance);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const lowRatio = values.filter((value) => value >= 0.35).length / values.length;
  const severeRatio = values.filter((value) => value >= 0.7).length / values.length;
  const max = Math.max(...values);
  return clamp01(
    average * 0.38 + lowRatio * 0.2 + severeRatio * 0.15 + max * 0.27 + clamp01(moistureDropStrength) * 0.08
  );
}

function mergeSingleStrength(day, bridge) {
  const base = clamp01(day || 0);
  const overnight = clamp01(bridge || 0);
  return round3(overnight < 0.12 ? base : Math.max(base, base * 0.82 + overnight * 0.28));
}

function mergeBridgeStrengths(day, bridge) {
  const out = {};
  for (const key of EVENT_KEYS) {
    const base = clamp01(day?.[key] || 0);
    const overnight = clamp01(bridge?.[key] || 0);
    out[key] = round3(overnight < 0.12 ? base : Math.max(base, base * 0.82 + overnight * 0.28));
  }
  return out;
}

function pickMergedDirection({ dayDirection, dayStrength, bridgeDirection, bridgeStrength }) {
  if (Number(bridgeStrength || 0) > Number(dayStrength || 0) * 1.25 && bridgeDirection) return bridgeDirection;
  return dayDirection || bridgeDirection || "steady";
}

function pickMergedDominantDirection({ dayDominant, dayStrength, bridgeDominant, bridgeStrength }) {
  if (Number(bridgeStrength || 0) > Number(dayStrength || 0) * 1.25 && bridgeDominant) {
    return bridgeDominant;
  }
  return dayDominant || bridgeDominant || "down";
}

function eventToPresentationExact({ eventKey, pressureDirection, temperatureDirection, eventStrengths }) {
  if (eventKey === "pressure_shift") return pressureDirection === "up" ? "pressure_up" : "pressure_down";
  if (eventKey === "temperature_shift") return "temp_shift";
  if (eventKey === "cold" || eventKey === "heat" || eventKey === "damp" || eventKey === "dry") return eventKey;
  if (Math.max(eventStrengths?.cold || 0, eventStrengths?.heat || 0) > 0.05) {
    return temperatureDirection === "down" ? "cold" : "heat";
  }
  return "none";
}

function exactToCompat(exact, directions = {}) {
  if (exact === "pressure_down") return { main_trigger: "pressure", trigger_dir: "down" };
  if (exact === "pressure_up") return { main_trigger: "pressure", trigger_dir: "up" };
  if (exact === "temp_shift") return { main_trigger: "temp", trigger_dir: "change" };
  if (exact === "cold") return { main_trigger: "temp", trigger_dir: "down" };
  if (exact === "heat") return { main_trigger: "temp", trigger_dir: "up" };
  if (exact === "damp") return { main_trigger: "humidity", trigger_dir: "up" };
  if (exact === "dry") return { main_trigger: "humidity", trigger_dir: "down" };
  return { main_trigger: "weather", trigger_dir: "none" };
}

function pickTopEvent(eventStrengths) {
  const entries = Object.entries(eventStrengths || {}).sort((a, b) => Number(b[1]) - Number(a[1]));
  return Number(entries[0]?.[1] || 0) > 0.05 ? entries[0][0] : "none";
}

function buildChannelPeaks(timeline, fallback) {
  const keys = ["pressure_down", "pressure_up", "temp_shift", "cold", "heat", "damp", "dry"];
  return Object.fromEntries(keys.map((key) => [key, findChannelPeak(timeline, key, fallback)]));
}

function findChannelPeak(timeline, key, fallback) {
  return findPeakWindow(timeline.map((row) => ({ ...row, total: Number(row?.[key] || 0) })), fallback);
}

function findPeakWindow(rows, fallback = { start: "09:00", end: "12:00" }) {
  if (!Array.isArray(rows) || !rows.length) return fallback;
  let best = { sum: -1, startIndex: 0, endIndex: 0 };
  for (let i = 0; i < rows.length; i += 1) {
    let sum = 0;
    let endIndex = i;
    for (let j = i; j < Math.min(rows.length, i + 3); j += 1) {
      sum += Number(rows[j]?.total || 0);
      endIndex = j;
    }
    if (sum > best.sum) best = { sum, startIndex: i, endIndex };
  }
  return {
    start: timeLabel(rows[best.startIndex]?.ts) || fallback.start,
    end: timeLabel(rows[best.endIndex]?.ts, 1) || fallback.end,
  };
}

function preparePoints(points) {
  if (!Array.isArray(points)) return [];
  return points
    .map((point) => {
      const temp = numberOrNull(point?.temp_c);
      const humidity = numberOrNull(point?.humidity_pct);
      const suppliedDewPoint = numberOrNull(point?.dew_point_c);
      const dewPoint = suppliedDewPoint ?? calculateDewPoint(temp, humidity);
      return {
        ts: point?.ts || null,
        pressure_hpa: numberOrNull(point?.pressure_hpa),
        temp_c: temp,
        humidity_pct: humidity,
        dew_point_c: dewPoint,
        absolute_humidity_gm3: calculateAbsoluteHumidity(temp, dewPoint),
      };
    })
    .filter((point) => point.ts && Number.isFinite(toMs(point.ts)))
    .sort((a, b) => toMs(a.ts) - toMs(b.ts));
}

function calculateDewPoint(temp, humidity) {
  if (!isNumber(temp) || !isNumber(humidity) || humidity <= 0) return null;
  const a = 17.625;
  const b = 243.04;
  const gamma = Math.log(clamp(humidity, 1, 100) / 100) + (a * temp) / (b + temp);
  return round3((b * gamma) / (a - gamma));
}

function calculateAbsoluteHumidity(temp, dewPoint) {
  if (!isNumber(temp) || !isNumber(dewPoint)) return null;
  const vaporPressure = 6.112 * Math.exp((17.67 * dewPoint) / (dewPoint + 243.5));
  return round3((216.7 * vaporPressure) / (temp + 273.15));
}

function mergeByTimestamp(points) {
  return [...new Map(points.map((point) => [point.ts, point])).values()].sort((a, b) => toMs(a.ts) - toMs(b.ts));
}

function minOf(points, field) {
  const values = points.map((point) => point?.[field]).filter(isNumber);
  return values.length ? round3(Math.min(...values)) : null;
}

function maxOf(points, field) {
  const values = points.map((point) => point?.[field]).filter(isNumber);
  return values.length ? round3(Math.max(...values)) : null;
}

function rangeOf(points, field) {
  const min = minOf(points, field);
  const max = maxOf(points, field);
  return isNumber(min) && isNumber(max) ? max - min : 0;
}

function timeLabel(ts, addHours = 0) {
  const ms = toMs(ts);
  if (!Number.isFinite(ms)) return null;
  const date = new Date(ms + addHours * HOUR_MS);
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function jstHour(ts) {
  const ms = toMs(ts);
  if (!Number.isFinite(ms)) return 0;
  return Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    hour: "numeric",
    hourCycle: "h23",
  }).format(new Date(ms)));
}

function emptyEvents() {
  return Object.fromEntries(EVENT_KEYS.map((key) => [key, 0]));
}

function roundMap(source) {
  return Object.fromEntries(EVENT_KEYS.map((key) => [key, round3(source?.[key] || 0)]));
}

function toMs(value) {
  return new Date(value).getTime();
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function isNumber(value) {
  if (value === null || value === undefined || value === "") return false;
  return Number.isFinite(Number(value));
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function round3(value) {
  return Math.round((Number(value) || 0) * 1000) / 1000;
}
