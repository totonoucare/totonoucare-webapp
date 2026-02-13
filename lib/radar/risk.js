// lib/radar/risk.js
// 外因（気象の変化量）× 内因（体質）で「変化ストレス(安定/注意/要警戒)」
// ＋ 内因×最近2週間平均との差で「影響の受けやすさ(受けにくい/通常/受けやすい)」を作る
//
// - タイムライン表示は1時間刻み（今日0:00〜23:00をroute側で切り出す）
// - 変化ストレス計算は「直近3時間Δ（不足時は1時間Δ）」
// - “オオカミ少年防止”の3段ゲート（凪/小/中大）
// - 影響の受けやすさ：最近2週間平均との差（P/T/H）×体質（def_ex / yin_yang / fluid系）
//   ※「受けやすい/通常/受けにくい」の表示用。変化ストレスの警戒計算とは独立。

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function safeNum(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function fmtSigned(v, digits = 1) {
  const n = safeNum(v);
  if (n == null) return null;
  const s = n >= 0 ? "+" : "";
  return `${s}${n.toFixed(digits)}`;
}

// abs delta -> 0..3 (閾値)
function scoreByAbsDelta(absValue, a, b, c) {
  const x = safeNum(absValue);
  if (x == null) return 0;
  if (x < a) return 0;
  if (x < b) return 1;
  if (x < c) return 2;
  return 3;
}

function signedDelta(arr, idx, back) {
  if (!Array.isArray(arr)) return null;
  const cur = safeNum(arr[idx]);
  const prev = safeNum(arr[idx - back]);
  if (cur == null || prev == null) return null;
  return cur - prev;
}

/** -----------------------------
 * 変化ストレス（外因）: 0..3
 * ------------------------------ */
export function computeExternalChangeScore({ dP3hAbs, dT3hAbs, dH3hAbs }) {
  const p = scoreByAbsDelta(dP3hAbs, 2, 5, 10);
  const t = scoreByAbsDelta(dT3hAbs, 3, 6, 10);
  const h = scoreByAbsDelta(dH3hAbs, 10, 20, 30);

  const raw = 1.0 * p + 0.5 * t + 0.2 * h;
  const change_score = clamp(Math.round(raw), 0, 3);

  // 主因（同点は 気圧 > 気温 > 湿度）
  const max = Math.max(p, t, h);
  let trigger = "pressure";
  if (max === h) trigger = "humidity";
  if (max === t) trigger = "temp";
  if (max === p) trigger = "pressure";

  return { change_score, parts: { p, t, h }, trigger };
}

/** -----------------------------
 * 体質（内因）: vulnerability 0..2
 * ------------------------------ */
export function computeVulnerability(profile) {
  const computed = profile?.computed || {};
  const env = computed?.env || {};
  const axes = computed?.axes || {};

  const envSensitivity = safeNum(env?.sensitivity) ?? 0; // 0..3
  const recoveryScore = safeNum(axes?.recovery_score);   // -1..+1
  const defExScore = safeNum(axes?.def_ex_score);        // -1..+1

  const sub = Array.isArray(profile?.sub_labels)
    ? profile.sub_labels
    : Array.isArray(computed?.sub_labels)
      ? computed.sub_labels
      : [];
  const weakCount = sub?.length || 0;

  let v = 0;

  if (envSensitivity >= 3) v += 2;
  else if (envSensitivity >= 2) v += 1;

  if (recoveryScore != null && recoveryScore < 0) v += 1;

  // 虚でも実でも「偏りが強い」＝変化に弱い一般項
  if (defExScore != null && Math.abs(defExScore) >= 0.55) v += 1;

  if (weakCount >= 2) v += 1;

  return clamp(v, 0, 2);
}

/** -----------------------------
 * 変化ストレス level: 0..2
 * ------------------------------ */
export function level3FromCombined(combined0to5) {
  const x = clamp(Number(combined0to5 ?? 0), 0, 5);
  if (x <= 1) return 0;
  if (x <= 3) return 1;
  return 2;
}

/** -----------------------------
 * 影響の受けやすさ（最近2週間平均との差 × 体質）
 * - 表示用 3段階: 0=受けにくい / 1=通常 / 2=受けやすい
 * - ここは「変化ストレス」と切り離す（通知のうるささを増やさない）
 * ------------------------------ */
function hasSubLabel(profile, code) {
  const sub = Array.isArray(profile?.sub_labels)
    ? profile.sub_labels
    : Array.isArray(profile?.computed?.sub_labels)
      ? profile.computed.sub_labels
      : [];
  return sub.includes(code);
}

function coreCodeFromProfile(profile) {
  return profile?.core_code ?? profile?.computed?.core_code ?? null;
}

function tempBurdenDirection(yinYangLabel) {
  if (yinYangLabel === "cold") return "low";
  if (yinYangLabel === "heat") return "high";
  return "none";
}

function humidityBurdenDirection(profile) {
  if (hasSubLabel(profile, "fluid_damp")) return "high";
  if (hasSubLabel(profile, "fluid_deficiency")) return "low";
  return "none";
}

function pressureBurdenDirection(defExScore) {
  const dx = safeNum(defExScore);
  if (dx == null) return "none";
  if (dx >= 0.22) return "high";
  if (dx <= -0.22) return "low";
  return "none";
}

function scoreByAbsAnomaly(absValue, a, b) {
  const x = safeNum(absValue);
  if (x == null) return 0;
  if (x < a) return 0;
  if (x < b) return 1;
  return 2;
}

function signedComponentPenalty({ anomaly, burdenDir, a, b }) {
  const x = safeNum(anomaly);
  if (x == null) return 0;

  const mag = scoreByAbsAnomaly(Math.abs(x), a, b);
  if (mag === 0) return 0;

  if (burdenDir === "high") return x >= 0 ? +mag : -mag;
  if (burdenDir === "low") return x <= 0 ? +mag : -mag;

  return 0;
}

export function computeInfluenceFromBaselines({ current, baseline, profile }) {
  const P = safeNum(current?.pressure);
  const T = safeNum(current?.temp);
  const H = safeNum(current?.humidity);

  const bP = safeNum(baseline?.pressure);
  const bT = safeNum(baseline?.temp);
  const bH = safeNum(baseline?.humidity);

  const axes = profile?.computed?.axes || {};
  const defEx = safeNum(axes?.def_ex_score);
  const yy = axes?.yin_yang_label_internal || null;

  const aP = P != null && bP != null ? (P - bP) : null;
  const aT = T != null && bT != null ? (T - bT) : null;
  const aH = H != null && bH != null ? (H - bH) : null;

  const pDir = pressureBurdenDirection(defEx);
  const tDir = tempBurdenDirection(yy);
  const hDir = humidityBurdenDirection(profile);

  // 閾値（運用で調整）
  const pSigned = signedComponentPenalty({ anomaly: aP, burdenDir: pDir, a: 3.0, b: 6.0 });
  const tSigned = signedComponentPenalty({ anomaly: aT, burdenDir: tDir, a: 3.0, b: 6.0 });
  const hSigned = signedComponentPenalty({ anomaly: aH, burdenDir: hDir, a: 10.0, b: 20.0 });

  // 合成（主軸=気圧、補助=気温/湿度）
  const rawSigned = 1.0 * pSigned + 0.4 * tSigned + 0.3 * hSigned;

  let level = 1; // 通常
  if (rawSigned <= -0.8) level = 0;
  else if (rawSigned >= 1.0) level = 2;

  const absW = [
    { key: "pressure", v: Math.abs(1.0 * pSigned) },
    { key: "temp", v: Math.abs(0.4 * tSigned) },
    { key: "humidity", v: Math.abs(0.3 * hSigned) },
  ].sort((a, b) => b.v - a.v);

  const main = absW[0]?.key || "pressure";

  return {
    level, // 0..2
    raw_signed: safeNum(rawSigned),
    main_factor: main,
    anomalies: { pressure: aP, temp: aT, humidity: aH },
    signed_parts: { pressure: pSigned, temp: tSigned, humidity: hSigned },
    baseline: { pressure: bP, temp: bT, humidity: bH },
    current: { pressure: P, temp: T, humidity: H },
    constitution: {
      core_code: coreCodeFromProfile(profile),
      yin_yang_label_internal: yy,
      def_ex_score: defEx,
      pressure_dir: pDir,
      temp_dir: tDir,
      humidity_dir: hDir,
    },
  };
}

export function influenceLabelJa(level) {
  if (level === 2) return "受けやすい";
  if (level === 0) return "受けにくい";
  return "通常";
}

export function triggerLabelJa(trigger) {
  if (trigger === "temp") return "気温の揺れ";
  if (trigger === "humidity") return "湿度の揺れ";
  return "気圧の揺れ";
}

export function levelLabelJa(level3) {
  if (level3 === 2) return "要警戒";
  if (level3 === 1) return "注意";
  return "安定";
}

/** -----------------------------
 * タイムライン（変化ストレス）: 指定区間で作る
 * - 計算は3hΔ（不足時は1hΔ）
 * - オオカミ少年防止の3段ゲート
 * - ※ influence は混ぜない（自己理解用）
 * ------------------------------ */
export function buildTimeWindowsFromHourlyRange(hourly, startIdx, endIdx, profile) {
  const pressure = hourly?.pressure_msl || [];
  const temp = hourly?.temperature_2m || [];
  const humidity = hourly?.relative_humidity_2m || [];
  const times = hourly?.time || [];

  const vulnerability = computeVulnerability(profile); // 0..2

  const windows = [];
  const start = Math.max(0, startIdx ?? 0);
  const end = Math.min(times.length - 1, endIdx ?? (times.length - 1));

  for (let i = start; i <= end; i++) {
    const back = i >= 3 ? 3 : i >= 1 ? 1 : 0;

    const dP = back ? signedDelta(pressure, i, back) : null;
    const dT = back ? signedDelta(temp, i, back) : null;
    const dH = back ? signedDelta(humidity, i, back) : null;

    const dPAbs = dP == null ? null : Math.abs(dP);
    const dTAbs = dT == null ? null : Math.abs(dT);
    const dHAbs = dH == null ? null : Math.abs(dH);

    const ext = computeExternalChangeScore({
      dP3hAbs: dPAbs,
      dT3hAbs: dTAbs,
      dH3hAbs: dHAbs,
    });

    // ★ 3段ゲート（凪・小・中大）
    let finalScore = 0;

    if (ext.change_score <= 0) {
      finalScore = 0; // 凪
    } else if (ext.change_score === 1) {
      finalScore = ext.change_score + Math.min(vulnerability, 1); // 小変化は抑制
    } else {
      finalScore = ext.change_score + vulnerability; // 中〜大はフル
    }

    const combined = clamp(finalScore, 0, 5);
    const level3 = level3FromCombined(combined);

    windows.push({
      time: times[i],
      level3,
      trigger: ext.trigger,

      combined,
      deltas: { dp: dP, dt: dT, dh: dH },
      parts: ext.parts,

      gate: {
        ext_change_score: ext.change_score,
        vulnerability,
      },
    });
  }

  return { windows, vulnerability };
}

/** -----------------------------
 * 今日のサマリー（変化ストレス）
 * ------------------------------ */
export function summarizeToday({ windows }) {
  const maxLevel = windows.reduce((m, w) => Math.max(m, w.level3 ?? 0), 0);

  const triggers = windows
    .filter((w) => (w.level3 ?? 0) === maxLevel)
    .map((w) => w.trigger);

  const freq = {};
  for (const t of triggers) freq[t] = (freq[t] || 0) + 1;

  const prio = { pressure: 3, temp: 2, humidity: 1 };
  const mainTrigger =
    Object.entries(freq)
      .sort((a, b) => (b[1] - a[1]) || ((prio[b[0]] || 0) - (prio[a[0]] || 0)))
      .map((x) => x[0])[0] || "pressure";

  return { level3: maxLevel, mainTrigger };
}

/** ピーク時間帯（連続区間） */
export function peakWindowFromWindows(windows = []) {
  if (!Array.isArray(windows) || windows.length === 0) {
    return { maxLevel: 0, start: null, end: null, startIdx: -1, endIdx: -1 };
  }

  const maxLevel = windows.reduce((m, w) => Math.max(m, w.level3 ?? 0), 0);
  if (maxLevel <= 0) {
    return { maxLevel, start: null, end: null, startIdx: -1, endIdx: -1 };
  }

  let best = null;
  let cur = null;

  for (let i = 0; i < windows.length; i++) {
    const lv = windows[i]?.level3 ?? 0;
    if (lv === maxLevel) {
      if (!cur) cur = { startIdx: i, endIdx: i };
      else cur.endIdx = i;
    } else if (cur) {
      const len = cur.endIdx - cur.startIdx + 1;
      if (!best || len > (best.endIdx - best.startIdx + 1)) best = cur;
      cur = null;
    }
  }
  if (cur) {
    const len = cur.endIdx - cur.startIdx + 1;
    if (!best || len > (best.endIdx - best.startIdx + 1)) best = cur;
  }
  if (!best) return { maxLevel, start: null, end: null, startIdx: -1, endIdx: -1 };

  return {
    maxLevel,
    start: windows[best.startIdx]?.time ?? null,
    end: windows[best.endIdx]?.time ?? null,
    startIdx: best.startIdx,
    endIdx: best.endIdx,
  };
}

/** 次の山（now以降でmaxLevelが出る最初） */
export function nextPeakFromWindows(windows = [], nowTimeISO = null) {
  if (!Array.isArray(windows) || windows.length === 0) return null;

  const maxLevel = windows.reduce((m, w) => Math.max(m, w.level3 ?? 0), 0);
  if (maxLevel <= 0) return null;

  const nowT = typeof nowTimeISO === "string" ? nowTimeISO : null;
  for (const w of windows) {
    if ((w?.level3 ?? 0) !== maxLevel) continue;
    if (!nowT || (typeof w?.time === "string" && w.time >= nowT)) {
      return { time: w.time, level3: w.level3, trigger: w.trigger };
    }
  }
  return null;
}

/** UI用：詳細短文（注意/警戒のときだけ） */
export function buildWindowHintJa({ window, influenceLevel }) {
  const lv = window?.level3 ?? 0;
  if (lv <= 0) return null;

  const trig = triggerLabelJa(window?.trigger || "pressure");
  if (influenceLevel === 2) {
    return `今日は影響を受けやすい側。ここは「${trig}」が主因なので、詰めすぎ注意。`;
  }
  if (influenceLevel === 0) {
    return `今日は比較的受けにくい側。とはいえ「${trig}」が出ている時間は無理しないでOK。`;
  }
  return `ここは「${trig}」が出ている時間。ペース配分すると安定しやすい。`;
}

/** UI用：平均との差の表示文字列 */
export function buildAnomalyRowJa(anoms) {
  const p = fmtSigned(anoms?.pressure, 1);
  const t = fmtSigned(anoms?.temp, 1);
  const h = fmtSigned(anoms?.humidity, 0);
  if (p == null && t == null && h == null) return null;
  return {
    pressure: p,
    temp: t,
    humidity: h,
  };
}

// -----------------------------
// Backward-compatible exports
// (for /api/radar/today/explain)
// -----------------------------

function isoDatePart(iso) {
  if (!iso || typeof iso !== "string") return null;
  return iso.slice(0, 10);
}

/**
 * Legacy: computeTimeWindowsNext24h
 * 互換のため名前は残すが、方針として「今日(0-23)」を返す。
 */
export function computeTimeWindowsNext24h(hourly, nowIdx, profile, jstDateStr) {
  const times = hourly?.time || [];
  const date = jstDateStr || (nowIdx != null ? isoDatePart(times?.[nowIdx]) : null);

  if (!date) {
    // fallback: nowIdx中心の24hっぽい範囲
    const start = Math.max(0, (nowIdx ?? 0) - 12);
    const end = Math.min(times.length - 1, start + 24);
    return buildTimeWindowsFromHourlyRange(hourly, start, end, profile);
  }

  const todayIdxs = [];
  for (let i = 0; i < times.length; i++) {
    if (isoDatePart(times[i]) === date) todayIdxs.push(i);
  }

  if (!todayIdxs.length) {
    const start = Math.max(0, (nowIdx ?? 0) - 12);
    const end = Math.min(times.length - 1, start + 24);
    return buildTimeWindowsFromHourlyRange(hourly, start, end, profile);
  }

  return buildTimeWindowsFromHourlyRange(hourly, todayIdxs[0], todayIdxs[todayIdxs.length - 1], profile);
}

/**
 * Legacy: computeRisk
 * explain ルートが使う想定の “まとめ計算” を返す。
 */
export function computeRisk({ hourly, nowIdx, profile, jstDateStr }) {
  const times = hourly?.time || [];
  const nowTimeISO = nowIdx != null ? times?.[nowIdx] : null;

  const { windows, vulnerability } = computeTimeWindowsNext24h(hourly, nowIdx, profile, jstDateStr);

  const summary = summarizeToday({ windows });
  const peak = peakWindowFromWindows(windows);
  const nextPeak = nextPeakFromWindows(windows, nowTimeISO);

  return {
    windows,
    vulnerability,
    summary,
    peak,
    nextPeak,
  };
}
