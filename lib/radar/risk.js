// lib/radar/risk.js

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function safeNum(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function scoreByAbsDelta(absValue, t1, t2, t3) {
  const x = safeNum(absValue);
  if (x == null) return 0;
  if (x < t1) return 0;
  if (x < t2) return 1;
  if (x < t3) return 2;
  return 3;
}

function signedDelta(arr, idx, back) {
  const cur = safeNum(arr?.[idx]);
  const prev = safeNum(arr?.[idx - back]);
  if (cur == null || prev == null) return null;
  return cur - prev; // 符号付き
}

function absDelta(arr, idx, back) {
  const d = signedDelta(arr, idx, back);
  return d == null ? null : Math.abs(d);
}

/**
 * 風（変化ストレス）スコア：0..3
 * - 気圧を主軸（単独で3に到達できる）
 * - 気温・湿度は追い打ち
 *
 * threshold は運用で調整前提（まずは天気痛寄りに敏感に）
 */
export function computeWindScore({ dPAbs, dTAbs, dHAbs }) {
  // 3時間変化の閾値（敏感寄り）
  const p = scoreByAbsDelta(dPAbs, 1.5, 3.0, 5.0); // hPa
  const t = scoreByAbsDelta(dTAbs, 3.0, 5.0, 8.0); // ℃
  const h = scoreByAbsDelta(dHAbs, 15, 25, 40);    // %

  // 平均化しない（希釈しない）
  const raw = 1.0 * p + 0.5 * t + 0.2 * h;
  const wind_score = clamp(Math.round(raw), 0, 3);

  // trigger（表示用）
  const max = Math.max(p, t, h);
  let trigger = "pressure_shift";
  if (max === t) trigger = "temp_swing";
  if (max === h) trigger = "humidity_swing";

  return { wind_score, parts: { p, t, h }, trigger };
}

/**
 * 3段階レベル（0..2）
 * - 0: 安定（wind 0..1）
 * - 1: 注意（wind 2）
 * - 2: 要警戒（wind 3）
 */
export function baseLevelFromWind(wind_score) {
  if ((wind_score ?? 0) >= 3) return 2;
  if ((wind_score ?? 0) >= 2) return 1;
  return 0;
}

/**
 * 内因（susceptibility 0..2）で補正
 * - 安定(0) は上げない（不安煽り防止）
 * - 注意(1) は「受けやすい(2)」なら 2 に格上げ
 */
export function applyConstitutionBoost(baseLevel, susceptibility) {
  const b = Number(baseLevel ?? 0);
  const s = Number(susceptibility ?? 0);

  if (b <= 0) return 0;
  if (b === 1 && s >= 2) return 2;
  return clamp(b, 0, 2);
}

export function triggerJa(trigger) {
  const map = {
    pressure_shift: "気圧の変化",
    temp_swing: "気温の変化",
    humidity_swing: "湿度の変化",
  };
  return map[trigger] || "変化";
}

export function levelJa(level2) {
  return ["安定", "注意", "要警戒"][level2] ?? "—";
}

/**
 * hourly から 24h 先までの time windows を作る
 * - nowIdx 起点で、今〜+24h（25点）
 * - 各点で「3h前との差分」を基本に、足りなければ「1h前」を代替
 */
export function buildTimeWindowsFromHourly(hourly, nowIdx, hoursAhead = 24, susceptibility = 0) {
  const time = hourly?.time || [];
  const pressure = hourly?.pressure_msl || [];
  const temp = hourly?.temperature_2m || [];
  const humidity = hourly?.relative_humidity_2m || [];

  const windows = [];
  if (!Array.isArray(time) || nowIdx == null || nowIdx < 0) return windows;

  const end = Math.min(nowIdx + hoursAhead, time.length - 1);

  for (let idx = nowIdx; idx <= end; idx++) {
    // 3h差分が取れないときは1hで代替
    const back = idx - 3 >= 0 ? 3 : idx - 1 >= 0 ? 1 : null;

    const dPAbs = back ? absDelta(pressure, idx, back) : null;
    const dTAbs = back ? absDelta(temp, idx, back) : null;
    const dHAbs = back ? absDelta(humidity, idx, back) : null;

    const dPRaw = back ? signedDelta(pressure, idx, back) : null;
    const dTRaw = back ? signedDelta(temp, idx, back) : null;
    const dHRaw = back ? signedDelta(humidity, idx, back) : null;

    const { wind_score, parts, trigger } = computeWindScore({ dPAbs, dTAbs, dHAbs });
    const baseLevel = baseLevelFromWind(wind_score);
    const level2 = applyConstitutionBoost(baseLevel, susceptibility);

    windows.push({
      time: time[idx],
      back_hours: back, // 3 or 1
      wind_score,
      baseLevel,
      level2,

      trigger,
      top_sixin: wind_score >= 2 ? ["wind"] : [],

      // 変化量（UI用）
      delta: {
        p: dPRaw, // hPa（符号つき）
        t: dTRaw, // ℃
        h: dHRaw, // %
      },
      abs: {
        p: dPAbs,
        t: dTAbs,
        h: dHAbs,
      },
      parts, // {p,t,h} each 0..3
    });
  }

  return windows;
}

/**
 * 「見せる山」を必ず作る
 * - 注意以上(>=1)があれば、それを優先して最大3つ
 * - 無ければ wind_score が高い順に最大3つ（安定でも2〜3個出す）
 */
export function pickHighlightWindows(windows, maxN = 3) {
  const arr = Array.isArray(windows) ? windows : [];
  if (!arr.length) return [];

  const warn = arr
    .filter((w) => (w.level2 ?? 0) >= 1)
    .sort((a, b) => {
      if ((b.level2 ?? 0) !== (a.level2 ?? 0)) return (b.level2 ?? 0) - (a.level2 ?? 0);
      return (b.wind_score ?? 0) - (a.wind_score ?? 0);
    })
    .slice(0, maxN);

  if (warn.length) return warn;

  return arr
    .slice()
    .sort((a, b) => (b.wind_score ?? 0) - (a.wind_score ?? 0))
    .slice(0, maxN);
}
