// lib/radar_v1/weatherStress.js

/**
 * Radar v1: weather-only stress extraction
 *
 * Input:
 *   points = [
 *     { ts, pressure_hpa, temp_c, humidity_pct },
 *     ...
 *   ]
 *
 * Output:
 *   {
 *     pressure_down_strength, // 0..1
 *     cold_strength,          // 0..1
 *     damp_strength,          // 0..1
 *     main_trigger,           // 'pressure' | 'temp' | 'humidity'
 *     trigger_dir,            // 'down' | 'up' | 'none'
 *     peak_start,             // 'HH:MM'
 *     peak_end,               // 'HH:MM'
 *     meta: { ...debug info... }
 *   }
 *
 * Notes:
 * - This does NOT produce the final 0-10 risk score.
 * - It only summarizes tomorrow's external weather stress.
 */

/**
 * @typedef {{
 *   ts: string,
 *   pressure_hpa: number|null,
 *   temp_c: number|null,
 *   humidity_pct: number|null
 * }} WeatherPoint
 */

/**
 * @param {{ points: WeatherPoint[] }} args
 */
export function buildWeatherStress({ points }) {
  if (!Array.isArray(points) || points.length === 0) {
    throw new Error("buildWeatherStress: points is empty");
  }

  const validPressure = points.filter((p) => isNum(p.pressure_hpa));
  const validTemp = points.filter((p) => isNum(p.temp_c));
  const validHumidity = points.filter((p) => isNum(p.humidity_pct));

  const pressureDownStrength = computePressureDownStrength(validPressure);
  const tempTrend = computeTempTrend(validTemp);
  const coldStrength = computeColdStrength(validTemp, tempTrend);
  const dampStrength = computeDampStrength(validHumidity);

  // Peak is based on combined weather-only burden
  const timeline = points.map((p) => {
    const pressureBurden = pointPressureBurden(points, p.ts);
    const coldBurden = pointColdBurden(p.temp_c, validTemp);
    const dampBurden = pointDampBurden(p.humidity_pct);

    const total =
      pressureBurden * 1.0 +
      coldBurden * 0.8 +
      dampBurden * 0.8;

    return {
      ts: p.ts,
      pressureBurden,
      coldBurden,
      dampBurden,
      total,
    };
  });

  const peakWindow = findPeakWindow(timeline);

  // main trigger: strongest normalized burden
  const candidates = [
    { key: "pressure", value: pressureDownStrength, dir: "down" },
    { key: "temp", value: coldStrength, dir: tempTrend.dir }, // 'down' or 'up'
    { key: "humidity", value: dampStrength, dir: "up" },
  ].sort((a, b) => b.value - a.value);

  const main = candidates[0] || { key: "pressure", value: 0, dir: "none" };

  return {
    pressure_down_strength: round3(pressureDownStrength),
    cold_strength: round3(coldStrength),
    damp_strength: round3(dampStrength),

    main_trigger: main.key,
    trigger_dir: main.value <= 0.05 ? "none" : main.dir || "none",

    peak_start: peakWindow.start,
    peak_end: peakWindow.end,

    meta: {
      pressure_min: minNum(validPressure.map((p) => p.pressure_hpa)),
      pressure_max: maxNum(validPressure.map((p) => p.pressure_hpa)),
      temp_min: minNum(validTemp.map((p) => p.temp_c)),
      temp_max: maxNum(validTemp.map((p) => p.temp_c)),
      humidity_min: minNum(validHumidity.map((p) => p.humidity_pct)),
      humidity_max: maxNum(validHumidity.map((p) => p.humidity_pct)),
      temp_dir: tempTrend.dir,
      temp_delta_day: round3(tempTrend.delta),
      timeline_sample: timeline.slice(0, 6),
    },
  };
}

/**
 * Pressure↓ burden:
 * - looks at max drop over tomorrow within the extracted points
 * - normalized roughly over 0..12 hPa
 */
function computePressureDownStrength(points) {
  if (!points.length) return 0;

  let maxDrop = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i].pressure_hpa;
    for (let j = i + 1; j < points.length; j++) {
      const b = points[j].pressure_hpa;
      const drop = a - b;
      if (drop > maxDrop) maxDrop = drop;
    }
  }

  // 12 hPa drop in a day is already quite meaningful
  return clamp01(maxDrop / 12);
}

/**
 * Temperature trend for the day: compare early vs late averages.
 * dir:
 * - 'down' if later is colder
 * - 'up' if later is warmer
 */
function computeTempTrend(points) {
  if (!points.length) return { dir: "none", delta: 0 };

  const n = points.length;
  const first = points.slice(0, Math.max(1, Math.floor(n / 3))).map((p) => p.temp_c);
  const last = points.slice(Math.max(0, n - Math.max(1, Math.floor(n / 3)))).map((p) => p.temp_c);

  const firstAvg = avg(first);
  const lastAvg = avg(last);
  const delta = lastAvg - firstAvg;

  if (delta <= -0.5) return { dir: "down", delta };
  if (delta >= 0.5) return { dir: "up", delta };
  return { dir: "none", delta };
}

/**
 * Cold burden:
 * - stronger if min temp is low
 * - stronger if the day trends colder
 * - normalized 0..1
 */
function computeColdStrength(points, tempTrend) {
  if (!points.length) return 0;

  const minT = minNum(points.map((p) => p.temp_c));
  const lowTempComponent = clamp01((12 - minT) / 15); // 12°C以下で意識し始める雑な係数
  const trendComponent =
    tempTrend.dir === "down" ? clamp01(Math.abs(tempTrend.delta) / 6) : 0;

  return clamp01(lowTempComponent * 0.65 + trendComponent * 0.35);
}

/**
 * Damp burden:
 * - based on sustained humidity
 * - 75%超が多いと上がる
 */
function computeDampStrength(points) {
  if (!points.length) return 0;

  const humidHours = points.filter((p) => p.humidity_pct >= 75).length;
  const ratio = humidHours / points.length;

  const maxH = maxNum(points.map((p) => p.humidity_pct));
  const intensity = clamp01((maxH - 75) / 20);

  return clamp01(ratio * 0.7 + intensity * 0.3);
}

function pointPressureBurden(allPoints, ts) {
  const idx = allPoints.findIndex((p) => p.ts === ts);
  if (idx <= 0) return 0;

  const prev = allPoints[idx - 1]?.pressure_hpa;
  const curr = allPoints[idx]?.pressure_hpa;
  if (!isNum(prev) || !isNum(curr)) return 0;

  const drop = prev - curr;
  return clamp01(drop / 3); // 1時間で3hPa低下ならかなり強い
}

function pointColdBurden(temp, validTempPoints) {
  if (!isNum(temp) || !validTempPoints.length) return 0;

  const minT = minNum(validTempPoints.map((p) => p.temp_c));
  const maxT = maxNum(validTempPoints.map((p) => p.temp_c));
  const range = Math.max(1, maxT - minT);

  // lower temp => higher burden
  return clamp01((maxT - temp) / range);
}

function pointDampBurden(humidity) {
  if (!isNum(humidity)) return 0;
  return clamp01((humidity - 65) / 25);
}

/**
 * Find 3-hour peak window by max summed total burden.
 * Returns HH:MM strings in JST.
 */
function findPeakWindow(timeline) {
  if (!timeline.length) return { start: "12:00", end: "15:00" };

  let best = { sum: -1, startIdx: 0, endIdx: 0 };

  for (let i = 0; i < timeline.length; i++) {
    let sum = 0;
    let endIdx = i;

    for (let j = i; j < Math.min(i + 3, timeline.length); j++) {
      sum += timeline[j].total;
      endIdx = j;
    }

    if (sum > best.sum) {
      best = { sum, startIdx: i, endIdx };
    }
  }

  return {
    start: toJstHHMM(timeline[best.startIdx].ts),
    end: toJstHHMM(timeline[best.endIdx].ts),
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

function avg(arr) {
  const nums = arr.filter(isNum);
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function minNum(arr) {
  const nums = arr.filter(isNum);
  return nums.length ? Math.min(...nums) : null;
}

function maxNum(arr) {
  const nums = arr.filter(isNum);
  return nums.length ? Math.max(...nums) : null;
}

function isNum(v) {
  return typeof v === "number" && Number.isFinite(v);
}

function clamp01(v) {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function round3(v) {
  return Math.round(v * 1000) / 1000;
}
