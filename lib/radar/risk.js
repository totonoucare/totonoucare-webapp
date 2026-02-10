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
  return cur - prev;
}

function absDelta(arr, idx, back) {
  const d = signedDelta(arr, idx, back);
  return d == null ? null : Math.abs(d);
}

/**
 * 風（=変化ストレス）スコア：0..3
 * - 気圧主軸（単独で3まで行ける）
 * - 気温/湿度は追い打ち
 */
export function computeWindScore({ dPAbs, dTAbs, dHAbs }) {
  // 3時間変化の閾値（敏感寄り、運用で調整前提）
  const p = scoreByAbsDelta(dPAbs, 1.5, 3.0, 5.0); // hPa
  const t = scoreByAbsDelta(dTAbs, 3.0, 5.0, 8.0); // ℃
  const h = scoreByAbsDelta(dHAbs, 15, 25, 40);    // %

  // 希釈しない（平均化しない）
  const raw = 1.0 * p + 0.5 * t + 0.2 * h;
  const wind_score = clamp(Math.round(raw), 0, 3);

  // 表示用：主因
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
 * - 安定は上げない（不安煽り回避）
 * - 注意は「受けやすい(2)」なら要警戒へ
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
    pressure_shift: "気圧",
    temp_swing: "気温",
    humidity_swing: "湿度",
  };
  return map[trigger] || "変化";
}

export function levelJa(level2) {
  return ["安定", "注意", "要警戒"][level2] ?? "—";
}

/**
 * hourly から 24h 先までの windows を作る
 * - level判定は「3h差（不足なら1h差）」で作る
 * - 表示は常に「1h差（符号付き）」を持つ
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
    // 3h差分（なければ1h）で「評価用Δ」を作る
    const backEval = idx - 3 >= 0 ? 3 : idx - 1 >= 0 ? 1 : null;

    const dPAbsEval = backEval ? absDelta(pressure, idx, backEval) : null;
    const dTAbsEval = backEval ? absDelta(temp, idx, backEval) : null;
    const dHAbsEval = backEval ? absDelta(humidity, idx, backEval) : null;

    const { wind_score, parts, trigger } = computeWindScore({
      dPAbs: dPAbsEval,
      dTAbs: dTAbsEval,
      dHAbs: dHAbsEval,
    });

    const baseLevel = baseLevelFromWind(wind_score);
    const level2 = applyConstitutionBoost(baseLevel, susceptibility);

    // 表示用：常に1h差（符号付き）
    const dP1h = idx - 1 >= 0 ? signedDelta(pressure, idx, 1) : null;
    const dT1h = idx - 1 >= 0 ? signedDelta(temp, idx, 1) : null;
    const dH1h = idx - 1 >= 0 ? signedDelta(humidity, idx, 1) : null;

    windows.push({
      time: time[idx],

      level2,
      baseLevel,
      wind_score,

      trigger,
      top_sixin: wind_score >= 2 ? ["wind"] : [],

      // UI: 1hの符号付き変化量（ユーザーが見る）
      delta_1h: { p: dP1h, t: dT1h, h: dH1h },

      // Debug/説明材料: 評価に使った3h(or1h)のabs
      eval_back_hours: backEval, // 3 or 1
      eval_abs: { p: dPAbsEval, t: dTAbsEval, h: dHAbsEval },

      parts, // p/t/h 0..3
    });
  }

  return windows;
}
