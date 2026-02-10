// lib/radar/risk.js
//
// Wind-only risk model (change-stress only)
// - Uses hourly pressure/temp/humidity
// - Computes 3h delta at each hour: |x(t) - x(t-3h)|
// - Discretizes each delta into 0..3 with thresholds
// - Combines into wind_score 0..3 (pressure weighted heavier)
// - Converts wind_score -> level3 (0..2): 0 stable, 1 caution, 2 alert
//
// This file intentionally ignores "state" (cold/heat/damp/dry) for alerting.
// The product value is "surprising change" rather than "it's cold today".

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function scoreByAbsDelta(absDelta, t1, t2, t3) {
  // returns 0..3
  const x = Math.abs(Number(absDelta ?? 0));
  if (!Number.isFinite(x)) return 0;
  if (x < t1) return 0;
  if (x < t2) return 1;
  if (x < t3) return 2;
  return 3;
}

export function computeWindScore({ dP3h, dT3h, dH3h }) {
  // thresholds: (small / mid / large)
  const p = scoreByAbsDelta(dP3h, 2, 5, 10);      // hPa
  const t = scoreByAbsDelta(dT3h, 3, 6, 10);      // ℃
  const h = scoreByAbsDelta(dH3h, 10, 20, 30);    // %

  // weighted combine (pressure heavier)
  const raw = 0.5 * p + 0.3 * t + 0.2 * h;
  const wind_score = clamp(Math.round(raw), 0, 3);

  // “何が揺れたか”のトリガー（UI用）
  // ※ あくまで「変化の内訳」。状態判定には使わない。
  const max = Math.max(p, t, h);
  let trigger = "pressure_shift";
  if (max === t) trigger = "temp_swing";
  if (max === h) trigger = "humidity_swing";
  if (max === p) trigger = "pressure_shift";

  return { wind_score, parts: { p, t, h }, trigger };
}

export function level3FromWindScore(wind_score) {
  // 3段階：0=安定, 1=注意, 2=要警戒
  // - wind_score 0..1 => 0
  // - wind_score 2 => 1
  // - wind_score 3 => 2
  if ((wind_score ?? 0) >= 3) return 2;
  if ((wind_score ?? 0) >= 2) return 1;
  return 0;
}

function safeNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function pickDelta3h(arr, idx) {
  // Prefer 3h diff, but if idx<3 fallback to 1h diff (still "recent change")
  const cur = safeNum(arr?.[idx]);
  if (cur == null) return { delta: null, baseHours: null };

  const j = idx >= 3 ? idx - 3 : idx >= 1 ? idx - 1 : null;
  if (j == null) return { delta: null, baseHours: null };

  const prev = safeNum(arr?.[j]);
  if (prev == null) return { delta: null, baseHours: null };

  return { delta: cur - prev, baseHours: idx >= 3 ? 3 : 1 };
}

export function buildTimeWindowsFromHourly({
  hourly,
  nowIdx,
  hours = 24,
  timezone = "Asia/Tokyo",
}) {
  const times = hourly?.time || [];
  const pressure = hourly?.pressure_msl || [];
  const temp = hourly?.temperature_2m || [];
  const humidity = hourly?.relative_humidity_2m || [];

  const out = [];
  const start = Math.max(0, nowIdx);
  const end = Math.min(times.length, start + hours);

  for (let i = start; i < end; i++) {
    const time = times[i];

    const { delta: dPraw, baseHours: pBase } = pickDelta3h(pressure, i);
    const { delta: dTraw, baseHours: tBase } = pickDelta3h(temp, i);
    const { delta: dHraw, baseHours: hBase } = pickDelta3h(humidity, i);

    // scale 1h fallback to “3h equivalent” so thresholds stay meaningful
    const scale = (d, base) => {
      if (!Number.isFinite(d) || !base) return null;
      if (base === 3) return d;
      // 1h -> 3h equiv (rough). Overestimation is acceptable for caution.
      return d * 3;
    };

    const dP3h = scale(dPraw, pBase);
    const dT3h = scale(dTraw, tBase);
    const dH3h = scale(dHraw, hBase);

    const { wind_score, parts, trigger } = computeWindScore({ dP3h, dT3h, dH3h });
    const level3 = level3FromWindScore(wind_score);

    const top_sixin = [];
    if (level3 >= 1) {
      top_sixin.push("wind"); // always wind-only timeline
      // include one trigger for readability (still “change”, not state)
      top_sixin.push(trigger);
    }

    out.push({
      time,
      level3,
      wind_score,
      top_sixin,
      // optional debug numbers (can be hidden in UI)
      deltas3h: {
        dP3h,
        dT3h,
        dH3h,
      },
      parts, // discrete 0..3 per axis
      timezone,
    });
  }

  return out;
}

export function summarizeDayFromWindows(time_windows) {
  // Daily level3: strongest hour wins (product value: "worst upcoming window")
  const maxWind = (time_windows || []).reduce(
    (m, w) => Math.max(m, w?.wind_score ?? 0),
    0
  );
  const level3 = level3FromWindScore(maxWind);

  // Reason: short, user-readable, no internal jargon
  let reason_short = "大きな変化は少なめです。";
  if (level3 === 1) reason_short = "気圧・気温・湿度の変化が出ています（注意）。";
  if (level3 === 2) reason_short = "気圧・気温・湿度の変化が強めです（要警戒）。";

  // Collect top trigger counts (pressure/temp/humidity)
  const counts = { pressure_shift: 0, temp_swing: 0, humidity_swing: 0 };
  for (const w of time_windows || []) {
    const ts = Array.isArray(w?.top_sixin) ? w.top_sixin : [];
    for (const k of ts) {
      if (k in counts) counts[k] += 1;
    }
  }
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return { level3, maxWind, reason_short, dominant_trigger: dominant };
}
