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
 * 返すもの:
 * - weather_main_trigger_exact: 天気側で最も強いチャネル
 * - main_trigger / trigger_dir: 既存互換の3軸表現
 * - full_day_peak_start/end: 0-24時でのピーク
 * - active_peak_start/end: 活動時間帯(06:00-22:00)でのピーク
 *
 * 互換性のため、従来の
 * - pressure_down_strength
 * - cold_strength
 * - damp_strength
 * も残しています。
 */

/**
 * @typedef {{
 * ts: string,
 * pressure_hpa: number|null,
 * temp_c: number|null,
 * humidity_pct: number|null
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

  const tempTrend = computeTempTrend(validTemp);
  const dayRange = computeDayTempRange(validTemp);

  const pressureDownStrength = computePressureDownStrength(validPressure);
  const pressureUpStrength = computePressureUpStrength(validPressure);

  const coldStrength = computeColdStrength(validTemp, tempTrend, dayRange);
  const heatStrength = computeHeatStrength(validTemp, tempTrend, dayRange);

  const dampStrength = computeDampStrength(validHumidity);
  const dryStrength = computeDryStrength(validHumidity);

  const timeline = points.map((p, idx) => {
    const pressureDownBurden = pointPressureDownBurden(points, idx);
    const pressureUpBurden = pointPressureUpBurden(points, idx);

    const coldBurden = pointColdBurden(p.temp_c, validTemp, tempTrend, dayRange);
    const heatBurden = pointHeatBurden(p.temp_c, validTemp, tempTrend, dayRange);

    const dampBurden = pointDampBurden(p.humidity_pct);
    const dryBurden = pointDryBurden(p.humidity_pct);

    const total =
      pressureDownBurden * 1.0 +
      pressureUpBurden * 0.7 +
      coldBurden * 0.9 +
      heatBurden * 0.8 +
      dampBurden * 0.9 +
      dryBurden * 0.7;

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
    main_trigger_exact: weatherMainExact, // alias
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
      pressure_min: minNum(validPressure.map((p) => p.pressure_hpa)),
      pressure_max: maxNum(validPressure.map((p) => p.pressure_hpa)),
      temp_min: minNum(validTemp.map((p) => p.temp_c)),
      temp_max: maxNum(validTemp.map((p) => p.temp_c)),
      humidity_min: minNum(validHumidity.map((p) => p.humidity_pct)),
      humidity_max: maxNum(validHumidity.map((p) => p.humidity_pct)),
      temp_dir: tempTrend.dir,
      temp_delta_day: round3(tempTrend.delta),
      day_temp_range: round3(dayRange),
      day_temp_range_strength: round3(clamp01((dayRange - 5) / 10)),
      timeline_sample: timeline.slice(0, 6),
      full_day_peak: fullDayPeak,
      active_peak: activePeak,
    },
  };
}

/**
 * 気圧低下:
 * 以前よりやや敏感に反応させる。
 * 12hPa → 8hPa でMAX。
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

  return clamp01(maxDrop / 8);
}

/**
 * 気圧上昇:
 * 低下より体感寄与は少し弱めに扱うが、
 * 強度計算自体は同じ基準で取る。
 */
function computePressureUpStrength(points) {
  if (!points.length) return 0;

  let maxRise = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i].pressure_hpa;
    for (let j = i + 1; j < points.length; j++) {
      const b = points[j].pressure_hpa;
      const rise = b - a;
      if (rise > maxRise) maxRise = rise;
    }
  }

  return clamp01(maxRise / 8);
}

function computeTempTrend(points) {
  if (!points.length) return { dir: "none", delta: 0 };

  const n = points.length;
  const seg = Math.max(1, Math.floor(n / 3));

  const first = points.slice(0, seg).map((p) => p.temp_c);
  const last = points.slice(Math.max(0, n - seg)).map((p) => p.temp_c);

  const firstAvg = avg(first);
  const lastAvg = avg(last);
  const delta = lastAvg - firstAvg;

  if (delta <= -0.5) return { dir: "down", delta };
  if (delta >= 0.5) return { dir: "up", delta };
  return { dir: "none", delta };
}

function computeDayTempRange(points) {
  if (!points.length) return 0;
  const temps = points.map((p) => p.temp_c);
  const minT = minNum(temps);
  const maxT = maxNum(temps);
  if (!isNum(minT) || !isNum(maxT)) return 0;
  return maxT - minT;
}

/**
 * 寒さ:
 * - 絶対的な低温
 * - 下降トレンド
 * - 日較差
 *
 * ただし日較差は cold / heat に均等投入しすぎず、
 * 気温トレンドに応じて寄せる。
 */
function computeColdStrength(points, tempTrend, dayRange) {
  if (!points.length) return 0;

  const temps = points.map((p) => p.temp_c);
  const minT = minNum(temps);

  const lowTempComponent = clamp01((12 - minT) / 15);
  const trendComponent =
    tempTrend.dir === "down" ? clamp01(Math.abs(tempTrend.delta) / 6) : 0;
  const rangeComponent = clamp01((dayRange - 5) / 10);

  if (tempTrend.dir === "down") {
    return clamp01(
      lowTempComponent * 0.50 +
        trendComponent * 0.25 +
        rangeComponent * 0.25
    );
  }

  if (tempTrend.dir === "none") {
    return clamp01(
      lowTempComponent * 0.80 +
        rangeComponent * 0.20
    );
  }

  // 気温上昇日でも朝晩の冷えはあるのでゼロにはしない
  return clamp01(
    lowTempComponent * 0.85 +
      rangeComponent * 0.10
  );
}

/**
 * 暑さ:
 * - 絶対的な高温
 * - 上昇トレンド
 * - 日較差
 *
 * こちらも日較差は heat 側に寄せるが、
 * cold と同じだけは入れない。
 */
function computeHeatStrength(points, tempTrend, dayRange) {
  if (!points.length) return 0;

  const temps = points.map((p) => p.temp_c);
  const maxT = maxNum(temps);

  const highTempComponent = clamp01((maxT - 24) / 10);
  const trendComponent =
    tempTrend.dir === "up" ? clamp01(Math.abs(tempTrend.delta) / 6) : 0;
  const rangeComponent = clamp01((dayRange - 5) / 10);

  if (tempTrend.dir === "up") {
    return clamp01(
      highTempComponent * 0.50 +
        trendComponent * 0.25 +
        rangeComponent * 0.25
    );
  }

  if (tempTrend.dir === "none") {
    return clamp01(
      highTempComponent * 0.80 +
        rangeComponent * 0.20
    );
  }

  // 気温下降日でも日中高温なら多少は残す
  return clamp01(
    highTempComponent * 0.85 +
      rangeComponent * 0.10
  );
}

function computeDampStrength(points) {
  if (!points.length) return 0;

  const humidHours = points.filter((p) => p.humidity_pct >= 75).length;
  const ratio = humidHours / points.length;
  const maxH = maxNum(points.map((p) => p.humidity_pct));
  const intensity = clamp01((maxH - 75) / 20);

  return clamp01(ratio * 0.7 + intensity * 0.3);
}

function computeDryStrength(points) {
  if (!points.length) return 0;

  const dryHours = points.filter((p) => p.humidity_pct <= 45).length;
  const ratio = dryHours / points.length;
  const minH = minNum(points.map((p) => p.humidity_pct));
  const intensity = clamp01((45 - minH) / 20);

  return clamp01(ratio * 0.7 + intensity * 0.3);
}

function pointPressureDownBurden(allPoints, idx) {
  if (idx <= 0) return 0;
  const prev = allPoints[idx - 1]?.pressure_hpa;
  const curr = allPoints[idx]?.pressure_hpa;
  if (!isNum(prev) || !isNum(curr)) return 0;
  return clamp01((prev - curr) / 3);
}

function pointPressureUpBurden(allPoints, idx) {
  if (idx <= 0) return 0;
  const prev = allPoints[idx - 1]?.pressure_hpa;
  const curr = allPoints[idx]?.pressure_hpa;
  if (!isNum(prev) || !isNum(curr)) return 0;
  return clamp01((curr - prev) / 3);
}

/**
 * pointColdBurden / pointHeatBurden は、
 * 集計強度とピーク時間のズレを減らすために、
 * 日較差の影響も時間ごとに少し反映する。
 */
function pointColdBurden(temp, validTempPoints, tempTrend, dayRange) {
  if (!isNum(temp) || !validTempPoints.length) return 0;

  const temps = validTempPoints.map((p) => p.temp_c);
  const minT = minNum(temps);
  const maxT = maxNum(temps);
  const range = Math.max(1, maxT - minT);

  const relative = clamp01((maxT - temp) / range);
  const absolute = clamp01((12 - temp) / 12);

  const rangeBase = clamp01((dayRange - 5) / 10);
  const rangeContribution = rangeBase * relative;

  if (tempTrend.dir === "down") {
    return clamp01(
      relative * 0.35 +
        absolute * 0.45 +
        rangeContribution * 0.20
    );
  }

  if (tempTrend.dir === "none") {
    return clamp01(
      relative * 0.40 +
        absolute * 0.45 +
        rangeContribution * 0.15
    );
  }

  return clamp01(
    relative * 0.40 +
      absolute * 0.50 +
      rangeContribution * 0.10
  );
}

function pointHeatBurden(temp, validTempPoints, tempTrend, dayRange) {
  if (!isNum(temp) || !validTempPoints.length) return 0;

  const temps = validTempPoints.map((p) => p.temp_c);
  const minT = minNum(temps);
  const maxT = maxNum(temps);
  const range = Math.max(1, maxT - minT);

  const relative = clamp01((temp - minT) / range);
  const absolute = clamp01((temp - 26) / 10);

  const rangeBase = clamp01((dayRange - 5) / 10);
  const rangeContribution = rangeBase * relative;

  if (tempTrend.dir === "up") {
    return clamp01(
      relative * 0.35 +
        absolute * 0.45 +
        rangeContribution * 0.20
    );
  }

  if (tempTrend.dir === "none") {
    return clamp01(
      relative * 0.40 +
        absolute * 0.45 +
        rangeContribution * 0.15
    );
  }

  return clamp01(
    relative * 0.40 +
      absolute * 0.50 +
      rangeContribution * 0.10
  );
}

function pointDampBurden(humidity) {
  if (!isNum(humidity)) return 0;
  return clamp01((humidity - 65) / 25);
}

function pointDryBurden(humidity) {
  if (!isNum(humidity)) return 0;
  return clamp01((55 - humidity) / 25);
}

function pickTopChannel(channelStrengths) {
  const entries = Object.entries(channelStrengths).sort((a, b) => b[1] - a[1]);
  const [key, value] = entries[0] || ["pressure_down", 0];
  return value <= 0.05 ? "none" : key;
}

function exactTriggerToCompat(exact) {
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

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
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
  return Math.round(v * 1000) / 1000;
}
