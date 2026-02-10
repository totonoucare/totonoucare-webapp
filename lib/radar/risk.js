// lib/radar/risk.js
// Wind-only (change-stress) model
// - Hourly pressure/temp/humidity
// - For each hour t: compute 3h abs delta (fallback 1h) => for scoring
// - Additionally compute 1h signed delta for UI (↑↓表示)

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function scoreByAbsDelta(absDelta, t1, t2, t3) {
  const x = Math.abs(Number(absDelta ?? 0));
  if (!Number.isFinite(x)) return 0;
  if (x < t1) return 0;
  if (x < t2) return 1;
  if (x < t3) return 2;
  return 3;
}

export function computeWindScore({ dP3hAbs, dT3hAbs, dH3hAbs }) {
  const p = scoreByAbsDelta(dP3hAbs, 2, 5, 10);      // hPa
  const t = scoreByAbsDelta(dT3hAbs, 3, 6, 10);      // ℃
  const h = scoreByAbsDelta(dH3hAbs, 10, 20, 30);    // %

  const raw = 0.5 * p + 0.3 * t + 0.2 * h;
  const wind_score = clamp(Math.round(raw), 0, 3);

  // “変化の主因”ラベル（状態ではなく「揺れの種類」）
  const max = Math.max(p, t, h);
  let trigger = "pressure_shift";
  if (max === t) trigger = "temp_swing";
  if (max === h) trigger = "humidity_swing";
  if (max === p) trigger = "pressure_shift";

  return { wind_score, parts: { p, t, h }, trigger };
}

export function level3FromWindScore(wind_score) {
  if ((wind_score ?? 0) >= 3) return 2; // 要警戒
  if ((wind_score ?? 0) >= 2) return 1; // 注意
  return 0; // 安定
}

function safeNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function signedDelta(arr, idx, back) {
  const cur = safeNum(arr?.[idx]);
  const prev = safeNum(arr?.[idx - back]);
  if (cur == null || prev == null) return null;
  return cur - prev;
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

    // UI用：直近1hの符号付き差分（↑↓表示に使う）
    const dP1h = i >= 1 ? signedDelta(pressure, i, 1) : null;
    const dT1h = i >= 1 ? signedDelta(temp, i, 1) : null;
    const dH1h = i >= 1 ? signedDelta(humidity, i, 1) : null;

    // スコア用：3h abs delta（不足なら 1h を 3倍してラフに補完）
    const dP3hRaw = i >= 3 ? signedDelta(pressure, i, 3) : i >= 1 ? signedDelta(pressure, i, 1) : null;
    const dT3hRaw = i >= 3 ? signedDelta(temp, i, 3) : i >= 1 ? signedDelta(temp, i, 1) : null;
    const dH3hRaw = i >= 3 ? signedDelta(humidity, i, 3) : i >= 1 ? signedDelta(humidity, i, 1) : null;

    const scale3h = (d, used1h) => {
      if (!Number.isFinite(d)) return null;
      return used1h ? d * 3 : d;
    };

    const dP3h = scale3h(dP3hRaw, i < 3);
    const dT3h = scale3h(dT3hRaw, i < 3);
    const dH3h = scale3h(dH3hRaw, i < 3);

    const dP3hAbs = dP3h == null ? null : Math.abs(dP3h);
    const dT3hAbs = dT3h == null ? null : Math.abs(dT3h);
    const dH3hAbs = dH3h == null ? null : Math.abs(dH3h);

    const { wind_score, parts, trigger } = computeWindScore({ dP3hAbs, dT3hAbs, dH3hAbs });
    const level3 = level3FromWindScore(wind_score);

    out.push({
      time,
      level3,
      wind_score,
      trigger, // pressure_shift / temp_swing / humidity_swing
      // UI用
      delta_1h: { dP1h, dT1h, dH1h },
      // デバッグにも使える
      delta_3h_equiv: { dP3h, dT3h, dH3h },
      parts,
      timezone,
    });
  }

  return out;
}

export function summarizeDayFromWindows(time_windows) {
  const maxWind = (time_windows || []).reduce((m, w) => Math.max(m, w?.wind_score ?? 0), 0);
  const level3 = level3FromWindScore(maxWind);

  // 「風」ワード禁止。ユーザー向けは“変化”で統一。
  const reason_short =
    level3 === 2
      ? "今日は気圧・気温・湿度の変化が強めです（要警戒）。"
      : level3 === 1
      ? "今日は気圧・気温・湿度の変化が出ています（注意）。"
      : "今日は大きな変化は少なめです。";

  // どの変化が多いか（参考：UIの短文に使える）
  const counts = { pressure_shift: 0, temp_swing: 0, humidity_swing: 0 };
  for (const w of time_windows || []) counts[w?.trigger] = (counts[w?.trigger] || 0) + 1;
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return { level3, maxWind, reason_short, dominant_trigger: dominant };
}
