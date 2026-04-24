/**
 * Radar v1 weather extraction (6-channel version)
 *
 * channels:
 * - pressure_down
 * - pressure_up
 * - cold
 * - heat
 * - damp
 * - dry
 *
 * v1.1 policy:
 * - points: targetDate 00:00〜23:59 JST. UI / peak time display.
 * - contextPoints: 前日18:00〜翌日03:00 JST. 日付またぎの変化検出。
 * - pressure/temp/humidity all use rolling windows, not only full-day max/min.
 */

/**
 * @typedef {{
 * ts: string,
 * pressure_hpa: number|null,
 * temp_c: number|null,
 * humidity_pct: number|null
 * }} WeatherPoint
 */

const HOUR_MS = 60 * 60 * 1000;

const PRESSURE_DOWN_WINDOWS = [
  { hours: 3, threshold: 3.0, weight: 1.0 },
  { hours: 6, threshold: 5.0, weight: 1.0 },
  { hours: 12, threshold: 7.0, weight: 0.95 },
  { hours: 24, threshold: 10.0, weight: 0.85 },
];

const PRESSURE_UP_WINDOWS = [
  { hours: 3, threshold: 3.5, weight: 0.95 },
  { hours: 6, threshold: 5.5, weight: 0.95 },
  { hours: 12, threshold: 8.0, weight: 0.9 },
  { hours: 24, threshold: 11.0, weight: 0.8 },
];

const TEMP_WINDOWS = [
  { hours: 6, threshold: 5.0, weight: 1.0 },
  { hours: 12, threshold: 7.0, weight: 0.95 },
  { hours: 24, threshold: 9.0, weight: 0.85 },
];

const HUMIDITY_WINDOWS = [
  { hours: 6, threshold: 18.0, weight: 1.0 },
  { hours: 12, threshold: 25.0, weight: 0.95 },
  { hours: 24, threshold: 35.0, weight: 0.85 },
];

/**
 * @param {{ points: WeatherPoint[], contextPoints?: WeatherPoint[] }} args
 */
export function buildWeatherStress({ points, contextPoints = null }) {
  if (!Array.isArray(points) || points.length === 0) {
    throw new Error("buildWeatherStress: points is empty");
  }

  const dayPoints = sortPoints(points);
  const context = sortPoints(
    Array.isArray(contextPoints) && contextPoints.length ? contextPoints : points
  );

  const validPressure = context.filter((p) => isNum(p.pressure_hpa));
  const validTempContext = context.filter((p) => isNum(p.temp_c));
  const validHumidity = context.filter((p) => isNum(p.humidity_pct));
  const validTempDay = dayPoints.filter((p) => isNum(p.temp_c));

  const dayRange = computeDayTempRange(validTempDay);
  const tempTrend = computeTempTrendByRolling(validTempContext);

  const pressureDown = computeRollingDeltaStrength({
    points: validPressure,
    field: "pressure_hpa",
    mode: "down",
    windows: PRESSURE_DOWN_WINDOWS,
  });

  const pressureUp = computeRollingDeltaStrength({
    points: validPressure,
    field: "pressure_hpa",
    mode: "up",
    windows: PRESSURE_UP_WINDOWS,
  });

  const tempRise = computeRollingDeltaStrength({
    points: validTempContext,
    field: "temp_c",
    mode: "up",
    windows: TEMP_WINDOWS,
  });

  const tempFall = computeRollingDeltaStrength({
    points: validTempContext,
    field: "temp_c",
    mode: "down",
    windows: TEMP_WINDOWS,
  });

  const humidityRise = computeRollingDeltaStrength({
    points: validHumidity,
    field: "humidity_pct",
    mode: "up",
    windows: HUMIDITY_WINDOWS,
  });

  const humidityDrop = computeRollingDeltaStrength({
    points: validHumidity,
    field: "humidity_pct",
    mode: "down",
    windows: HUMIDITY_WINDOWS,
  });

  const pressureDownStrength = pressureDown.strength;
  const pressureUpStrength = pressureUp.strength;

  const coldStrength = computeColdStrength({
    dayTempPoints: validTempDay,
    dayRange,
    tempFallStrength: tempFall.strength,
  });

  const heatStrength = computeHeatStrength({
    dayTempPoints: validTempDay,
    dayRange,
    tempRiseStrength: tempRise.strength,
  });

  const dampStrength = computeDampStrength({
    humidityPoints: validHumidity,
    humidityRiseStrength: humidityRise.strength,
  });

  const dryStrength = computeDryStrength({
    humidityPoints: validHumidity,
    humidityDropStrength: humidityDrop.strength,
  });

  const timeline = dayPoints.map((p) => {
    const pressureDownBurden = pointRollingDeltaBurden({
      points: validPressure,
      currentPoint: p,
      field: "pressure_hpa",
      mode: "down",
      windows: PRESSURE_DOWN_WINDOWS,
    });

    const pressureUpBurden = pointRollingDeltaBurden({
      points: validPressure,
      currentPoint: p,
      field: "pressure_hpa",
      mode: "up",
      windows: PRESSURE_UP_WINDOWS,
    });

    const coldBurden = pointColdBurden({
      currentPoint: p,
      dayTempPoints: validTempDay,
      contextTempPoints: validTempContext,
      dayRange,
    });

    const heatBurden = pointHeatBurden({
      currentPoint: p,
      dayTempPoints: validTempDay,
      contextTempPoints: validTempContext,
      dayRange,
    });

    const dampBurden = pointDampBurden({
      currentPoint: p,
      humidityPoints: validHumidity,
    });

    const dryBurden = pointDryBurden({
      currentPoint: p,
      humidityPoints: validHumidity,
    });

    const total =
      pressureDownBurden * 1.0 +
      pressureUpBurden * 0.75 +
      coldBurden * 0.9 +
      heatBurden * 0.85 +
      dampBurden * 0.9 +
      dryBurden * 0.75;

    return {
      ts: p.ts,
      pressure_down: round3(pressureDownBurden),
      pressure_up: round3(pressureUpBurden),
      cold: round3(coldBurden),
      heat: round3(heatBurden),
      damp: round3(dampBurden),
      dry: round3(dryBurden),
      total: round3(total),
    };
  });

  const fullDayPeak = findPeakWindow(timeline);
  const activePeak = findPeakWindow(
    timeline.filter((row) => {
      const hh = toJstHour(row.ts);
      return hh >= 6 && hh < 22;
    }),
    fullDayPeak
  );

  const channelStrengths = {
    pressure_down: round3(pressureDownStrength),
    pressure_up: round3(pressureUpStrength),
    cold: round3(coldStrength),
    heat: round3(heatStrength),
    damp: round3(dampStrength),
    dry: round3(dryStrength),
  };

  const weatherMainExact = pickTopChannel(channelStrengths);
  const compat = exactTriggerToCompat(weatherMainExact);

  return {
    // backward-compatible
    pressure_down_strength: channelStrengths.pressure_down,
    cold_strength: channelStrengths.cold,
    damp_strength: channelStrengths.damp,

    // new detailed channels
    pressure_up_strength: channelStrengths.pressure_up,
    heat_strength: channelStrengths.heat,
    dry_strength: channelStrengths.dry,

    channel_strengths: channelStrengths,

    weather_main_trigger_exact: weatherMainExact,
    main_trigger_exact: weatherMainExact,
    main_trigger: compat.main_trigger,
    trigger_dir: compat.trigger_dir,

    full_day_peak_start: fullDayPeak.start,
    full_day_peak_end: fullDayPeak.end,
    active_peak_start: activePeak.start,
    active_peak_end: activePeak.end,

    // backward-compatible UI peak (activity peak)
    peak_start: activePeak.start,
    peak_end: activePeak.end,

    timeline,

    meta: {
      extraction_version: "radar_v1_weather_context_rolling_2026-04-24",
      point_count: dayPoints.length,
      context_point_count: context.length,

      pressure_min: minNum(validPressure.map((p) => p.pressure_hpa)),
      pressure_max: maxNum(validPressure.map((p) => p.pressure_hpa)),
      pressure_down_max_delta: round3(pressureDown.maxDelta),
      pressure_down_window_hours: pressureDown.windowHours,
      pressure_up_max_delta: round3(pressureUp.maxDelta),
      pressure_up_window_hours: pressureUp.windowHours,

      temp_min: minNum(validTempDay.map((p) => p.temp_c)),
      temp_max: maxNum(validTempDay.map((p) => p.temp_c)),
      temp_context_min: minNum(validTempContext.map((p) => p.temp_c)),
      temp_context_max: maxNum(validTempContext.map((p) => p.temp_c)),
      temp_dir: tempTrend.dir,
      temp_delta_day: round3(tempTrend.delta),
      temp_rise_max_delta: round3(tempRise.maxDelta),
      temp_rise_window_hours: tempRise.windowHours,
      temp_fall_max_delta: round3(tempFall.maxDelta),
      temp_fall_window_hours: tempFall.windowHours,
      day_temp_range: round3(dayRange),
      day_temp_range_strength: round3(clamp01((dayRange - 5) / 10)),

      humidity_min: minNum(validHumidity.map((p) => p.humidity_pct)),
      humidity_max: maxNum(validHumidity.map((p) => p.humidity_pct)),
      humidity_rise_max_delta: round3(humidityRise.maxDelta),
      humidity_rise_window_hours: humidityRise.windowHours,
      humidity_drop_max_delta: round3(humidityDrop.maxDelta),
      humidity_drop_window_hours: humidityDrop.windowHours,

      timeline_sample: timeline.slice(0, 6),
      full_day_peak: fullDayPeak,
      active_peak: activePeak,
    },
  };
}

function computeRollingDeltaStrength({ points, field, mode, windows }) {
  const sorted = sortPoints(points).filter((p) => isNum(p[field]));
  if (sorted.length < 2) {
    return { strength: 0, maxDelta: 0, windowHours: null, samples: [] };
  }

  let best = { strength: 0, maxDelta: 0, windowHours: null, samples: [] };

  for (const window of windows) {
    const maxDelta = maxDeltaWithinWindow({
      points: sorted,
      field,
      mode,
      hours: window.hours,
    });
    const strength = clamp01((maxDelta / window.threshold) * window.weight);

    const sample = {
      hours: window.hours,
      threshold: window.threshold,
      weight: window.weight,
      max_delta: round3(maxDelta),
      strength: round3(strength),
    };

    if (strength > best.strength) {
      best = {
        strength,
        maxDelta,
        windowHours: window.hours,
        samples: [],
      };
    }

    best.samples.push(sample);
  }

  return best;
}

function maxDeltaWithinWindow({ points, field, mode, hours }) {
  const maxMs = hours * HOUR_MS;
  let maxDelta = 0;

  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const aMs = toMs(a.ts);
    const aVal = a[field];
    if (!Number.isFinite(aMs) || !isNum(aVal)) continue;

    for (let j = i + 1; j < points.length; j++) {
      const b = points[j];
      const bMs = toMs(b.ts);
      const bVal = b[field];
      if (!Number.isFinite(bMs) || !isNum(bVal)) continue;

      const elapsed = bMs - aMs;
      if (elapsed <= 0) continue;
      if (elapsed > maxMs) break;

      const delta = mode === "down" ? aVal - bVal : bVal - aVal;
      if (delta > maxDelta) maxDelta = delta;
    }
  }

  return maxDelta;
}

function pointRollingDeltaBurden({ points, currentPoint, field, mode, windows }) {
  if (!currentPoint || !isNum(currentPoint[field])) return 0;

  const currMs = toMs(currentPoint.ts);
  const currVal = currentPoint[field];
  if (!Number.isFinite(currMs) || !isNum(currVal)) return 0;

  let best = 0;
  for (const window of windows) {
    let maxDelta = 0;
    const maxMs = window.hours * HOUR_MS;

    for (const p of points) {
      const pMs = toMs(p.ts);
      const pVal = p[field];
      if (!Number.isFinite(pMs) || !isNum(pVal)) continue;
      const elapsed = currMs - pMs;
      if (elapsed <= 0 || elapsed > maxMs) continue;

      const delta = mode === "down" ? pVal - currVal : currVal - pVal;
      if (delta > maxDelta) maxDelta = delta;
    }

    const strength = clamp01((maxDelta / window.threshold) * window.weight);
    if (strength > best) best = strength;
  }

  return best;
}

function computeTempTrendByRolling(points) {
  const rise = computeRollingDeltaStrength({
    points,
    field: "temp_c",
    mode: "up",
    windows: TEMP_WINDOWS,
  });
  const fall = computeRollingDeltaStrength({
    points,
    field: "temp_c",
    mode: "down",
    windows: TEMP_WINDOWS,
  });

  if (rise.strength < 0.08 && fall.strength < 0.08) return { dir: "none", delta: 0 };
  if (rise.strength >= fall.strength) return { dir: "up", delta: rise.maxDelta };
  return { dir: "down", delta: -fall.maxDelta };
}

function computeDayTempRange(points) {
  if (!points.length) return 0;
  const temps = points.map((p) => p.temp_c);
  const minT = minNum(temps);
  const maxT = maxNum(temps);
  if (!isNum(minT) || !isNum(maxT)) return 0;
  return maxT - minT;
}

function computeColdStrength({ dayTempPoints, dayRange, tempFallStrength }) {
  if (!dayTempPoints.length) return 0;

  const temps = dayTempPoints.map((p) => p.temp_c);
  const minT = minNum(temps);

  const lowTempComponent = clamp01((12 - minT) / 12);
  const rangeComponent = clamp01((dayRange - 5) / 10);
  const coolingShift = clamp01(tempFallStrength);

  const shiftScore =
    coolingShift * 0.55 +
    rangeComponent * 0.25 +
    lowTempComponent * 0.25;

  const absoluteScore = lowTempComponent * 0.65;

  return clamp01(Math.max(shiftScore, absoluteScore));
}

function computeHeatStrength({ dayTempPoints, dayRange, tempRiseStrength }) {
  if (!dayTempPoints.length) return 0;

  const temps = dayTempPoints.map((p) => p.temp_c);
  const maxT = maxNum(temps);

  const highTempComponent = clamp01((maxT - 24) / 10);
  const rangeComponent = clamp01((dayRange - 5) / 10);
  const warmingShift = clamp01(tempRiseStrength);

  const shiftScore =
    warmingShift * 0.55 +
    rangeComponent * 0.25 +
    highTempComponent * 0.25;

  const absoluteScore = highTempComponent * 0.65;

  return clamp01(Math.max(shiftScore, absoluteScore));
}

function computeDampStrength({ humidityPoints, humidityRiseStrength }) {
  if (!humidityPoints.length) return 0;

  const humid75Ratio = humidityPoints.filter((p) => p.humidity_pct >= 75).length / humidityPoints.length;
  const humid70Ratio = humidityPoints.filter((p) => p.humidity_pct >= 70).length / humidityPoints.length;
  const values = humidityPoints.map((p) => p.humidity_pct);
  const maxH = maxNum(values);

  const maxIntensity = clamp01((maxH - 75) / 20);
  const avgExcess70 = avg(values.map((h) => Math.max(0, h - 70)));
  const avgExcessStrength = clamp01(avgExcess70 / 18);
  const riseStrength = clamp01(humidityRiseStrength);

  return clamp01(
    humid75Ratio * 0.35 +
      humid70Ratio * 0.15 +
      maxIntensity * 0.22 +
      avgExcessStrength * 0.12 +
      riseStrength * 0.22
  );
}

function computeDryStrength({ humidityPoints, humidityDropStrength }) {
  if (!humidityPoints.length) return 0;

  const dry45Ratio = humidityPoints.filter((p) => p.humidity_pct <= 45).length / humidityPoints.length;
  const dry50Ratio = humidityPoints.filter((p) => p.humidity_pct <= 50).length / humidityPoints.length;
  const values = humidityPoints.map((p) => p.humidity_pct);
  const minH = minNum(values);

  const minIntensity = clamp01((45 - minH) / 20);
  const avgDeficit50 = avg(values.map((h) => Math.max(0, 50 - h)));
  const avgDeficitStrength = clamp01(avgDeficit50 / 18);
  const dropStrength = clamp01(humidityDropStrength);

  return clamp01(
    dry45Ratio * 0.35 +
      dry50Ratio * 0.15 +
      minIntensity * 0.22 +
      avgDeficitStrength * 0.12 +
      dropStrength * 0.22
  );
}

function pointColdBurden({ currentPoint, dayTempPoints, contextTempPoints, dayRange }) {
  const temp = currentPoint?.temp_c;
  if (!isNum(temp) || !dayTempPoints.length) return 0;

  const dayTemps = dayTempPoints.map((p) => p.temp_c);
  const minT = minNum(dayTemps);
  const maxT = maxNum(dayTemps);
  const range = Math.max(1, maxT - minT);

  const relative = clamp01((maxT - temp) / range);
  const absolute = clamp01((12 - temp) / 12);
  const rangeBase = clamp01((dayRange - 5) / 10);
  const fall = pointRollingDeltaBurden({
    points: contextTempPoints,
    currentPoint,
    field: "temp_c",
    mode: "down",
    windows: TEMP_WINDOWS,
  });

  return clamp01(
    fall * 0.45 +
      absolute * 0.35 +
      relative * 0.15 +
      rangeBase * relative * 0.15
  );
}

function pointHeatBurden({ currentPoint, dayTempPoints, contextTempPoints, dayRange }) {
  const temp = currentPoint?.temp_c;
  if (!isNum(temp) || !dayTempPoints.length) return 0;

  const dayTemps = dayTempPoints.map((p) => p.temp_c);
  const minT = minNum(dayTemps);
  const maxT = maxNum(dayTemps);
  const range = Math.max(1, maxT - minT);

  const relative = clamp01((temp - minT) / range);
  const absolute = clamp01((temp - 26) / 10);
  const rangeBase = clamp01((dayRange - 5) / 10);
  const rise = pointRollingDeltaBurden({
    points: contextTempPoints,
    currentPoint,
    field: "temp_c",
    mode: "up",
    windows: TEMP_WINDOWS,
  });

  return clamp01(
    rise * 0.45 +
      absolute * 0.35 +
      relative * 0.15 +
      rangeBase * relative * 0.15
  );
}

function pointDampBurden({ currentPoint, humidityPoints }) {
  const humidity = currentPoint?.humidity_pct;
  if (!isNum(humidity)) return 0;

  const currentIntensity = clamp01((humidity - 65) / 25);
  const rise = pointRollingDeltaBurden({
    points: humidityPoints,
    currentPoint,
    field: "humidity_pct",
    mode: "up",
    windows: HUMIDITY_WINDOWS,
  });

  return clamp01(currentIntensity * 0.7 + rise * 0.3);
}

function pointDryBurden({ currentPoint, humidityPoints }) {
  const humidity = currentPoint?.humidity_pct;
  if (!isNum(humidity)) return 0;

  const currentIntensity = clamp01((55 - humidity) / 25);
  const drop = pointRollingDeltaBurden({
    points: humidityPoints,
    currentPoint,
    field: "humidity_pct",
    mode: "down",
    windows: HUMIDITY_WINDOWS,
  });

  return clamp01(currentIntensity * 0.7 + drop * 0.3);
}

function pickTopChannel(channelStrengths) {
  const entries = Object.entries(channelStrengths).sort((a, b) => b[1] - a[1]);
  const [key, value] = entries[0] || ["pressure_down", 0];
  return value <= 0.05 ? "none" : key;
}

export function exactTriggerToCompat(exact) {
  switch (exact) {
    case "pressure_down":
      return { main_trigger: "pressure", trigger_dir: "down" };
    case "pressure_up":
      return { main_trigger: "pressure", trigger_dir: "up" };
    case "cold":
      return { main_trigger: "temp", trigger_dir: "down" };
    case "heat":
      return { main_trigger: "temp", trigger_dir: "up" };
    case "damp":
      return { main_trigger: "humidity", trigger_dir: "up" };
    case "dry":
      return { main_trigger: "humidity", trigger_dir: "down" };
    default:
      return { main_trigger: "pressure", trigger_dir: "none" };
  }
}

function findPeakWindow(rows, fallback = { start: "09:00", end: "12:00" }) {
  if (!Array.isArray(rows) || rows.length === 0) return fallback;

  let best = { sum: -1, startIdx: 0, endIdx: 0 };

  for (let i = 0; i < rows.length; i++) {
    let sum = 0;
    let endIdx = i;

    for (let j = i; j < Math.min(i + 3, rows.length); j++) {
      sum += rows[j].total;
      endIdx = j;
    }

    if (sum > best.sum) {
      best = { sum, startIdx: i, endIdx };
    }
  }

  return {
    start: toJstHHMM(rows[best.startIdx].ts),
    end: toJstHHMM(rows[best.endIdx].ts),
  };
}

function toJstHHMM(isoTs) {
  const d = new Date(isoTs);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const hh = parts.find((p) => p.type === "hour")?.value ?? "00";
  const mm = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hh}:${mm}`;
}

function toJstHour(isoTs) {
  const d = new Date(isoTs);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(d);
  return Number(parts.find((p) => p.type === "hour")?.value ?? "0");
}

function sortPoints(points) {
  return [...(Array.isArray(points) ? points : [])]
    .filter((p) => p?.ts)
    .sort((a, b) => toMs(a.ts) - toMs(b.ts));
}

function toMs(isoTs) {
  const ms = new Date(isoTs).getTime();
  return Number.isFinite(ms) ? ms : NaN;
}

function avg(arr) {
  const vals = arr.filter(isNum);
  if (!vals.length) return 0;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

function minNum(arr) {
  const vals = arr.filter(isNum);
  return vals.length ? Math.min(...vals) : null;
}

function maxNum(arr) {
  const vals = arr.filter(isNum);
  return vals.length ? Math.max(...vals) : null;
}

function isNum(v) {
  return Number.isFinite(v);
}

function clamp01(v) {
  if (!Number.isFinite(v)) return 0;
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  return v;
}

function round3(v) {
  return Math.round((Number(v) || 0) * 1000) / 1000;
}
