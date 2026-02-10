// lib/radar/risk.js
// 外因（変化量）× 内因（体質）で「3段階（安定/注意/要警戒）」を作る

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function safeNum(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

// abs delta -> 0..3
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

/**
 * 外因：直近3時間の変化量から「変化ストレス」(0..3)を算出
 * - 気圧を主軸（単独でも3まで行ける）
 * - 気温/湿度は追い打ち
 */
export function computeExternalChangeScore({ dP3hAbs, dT3hAbs, dH3hAbs }) {
  // 閾値（まずは“そこそこ敏感”寄り。運用で調整）
  const p = scoreByAbsDelta(dP3hAbs, 2, 5, 10);
  const t = scoreByAbsDelta(dT3hAbs, 3, 6, 10);
  const h = scoreByAbsDelta(dH3hAbs, 10, 20, 30);

  const raw = 1.0 * p + 0.5 * t + 0.2 * h;
  const change_score = clamp(Math.round(raw), 0, 3);

  // 主因（UIのアイコン用）
  const max = Math.max(p, t, h);
  let trigger = "pressure";
  if (max === t) trigger = "temp";
  if (max === h) trigger = "humidity";
  // 同点なら気圧優先
  if (p === max) trigger = "pressure";

  return { change_score, parts: { p, t, h }, trigger };
}

/**
 * 内因：体質（constitution_profiles.computed）から vulnerability(0..2)
 * 目的：同じ天気でも “崩れやすさ” を差を出す
 */
export function computeVulnerability(profile) {
  const computed = profile?.computed || {};
  const env = computed?.env || {};
  const axes = computed?.axes || {};

  const envSensitivity = safeNum(env?.sensitivity) ?? 0; // 0..3想定
  const recoveryScore = safeNum(axes?.recovery_score);    // -1..+1
  const defExScore = safeNum(axes?.def_ex_score);         // -1..+1

  const sub = Array.isArray(profile?.sub_labels) ? profile.sub_labels : (Array.isArray(computed?.sub_labels) ? computed.sub_labels : []);
  const weakCount = sub?.length || 0;

  let v = 0;

  // 環境影響（強いほど上げる）
  if (envSensitivity >= 3) v += 2;
  else if (envSensitivity >= 2) v += 1;

  // 立て直しが苦手（回復スコアがマイナスなら +1）
  if (recoveryScore != null && recoveryScore < 0) v += 1;

  // 偏りが強い（|def_ex|が大きいなら +1）
  if (defExScore != null && Math.abs(defExScore) >= 0.55) v += 1;

  // 弱点が複数（sub_labelsが2つ以上なら +1）
  if (weakCount >= 2) v += 1;

  // 0..2に圧縮（効きすぎると“全部警戒”になる）
  return clamp(v, 0, 2);
}

/**
 * 3段階：0=安定 1=注意 2=要警戒
 */
export function level3FromCombined(combined0to5) {
  const x = clamp(Number(combined0to5 ?? 0), 0, 5);
  if (x <= 1) return 0;
  if (x <= 3) return 1;
  return 2;
}

export function buildTimeWindowsFromHourly(hourly, nowIdx, hoursForward, profile) {
  const pressure = hourly?.pressure_msl || [];
  const temp = hourly?.temperature_2m || [];
  const humidity = hourly?.relative_humidity_2m || [];
  const times = hourly?.time || [];

  const vulnerability = computeVulnerability(profile);

  const windows = [];
  const start = Math.max(0, nowIdx);
  const end = Math.min(times.length - 1, start + Math.max(1, hoursForward));

  for (let i = start; i <= end; i++) {
    // 基本は3h差分。足りない場合は1h差分（序盤の欠損を減らす）
    const dP = i >= 3 ? signedDelta(pressure, i, 3) : i >= 1 ? signedDelta(pressure, i, 1) : null;
    const dT = i >= 3 ? signedDelta(temp, i, 3) : i >= 1 ? signedDelta(temp, i, 1) : null;
    const dH = i >= 3 ? signedDelta(humidity, i, 3) : i >= 1 ? signedDelta(humidity, i, 1) : null;

    const dPAbs = dP == null ? null : Math.abs(dP);
    const dTAbs = dT == null ? null : Math.abs(dT);
    const dHAbs = dH == null ? null : Math.abs(dH);

    const ext = computeExternalChangeScore({
      dP3hAbs: dPAbs,
      dT3hAbs: dTAbs,
      dH3hAbs: dHAbs,
    });

    const combined = clamp(ext.change_score + vulnerability, 0, 5);
    const level3 = level3FromCombined(combined);

    windows.push({
      time: times[i],         // "YYYY-MM-DDTHH:00"
      level3,                 // 0..2
      trigger: ext.trigger,   // pressure/temp/humidity
      combined,               // 0..5（デバッグ用。UIには出さなくてOK）
      deltas: { dp: dP, dt: dT, dh: dH }, // 符号つき（UIで±表示）
      parts: ext.parts,       // 0..3（UIに出すならバー化）
    });
  }

  return { windows, vulnerability };
}

export function summarizeToday({ windows }) {
  // 24hの最大レベルを「今日の変化ストレス」とする
  const maxLevel = windows.reduce((m, w) => Math.max(m, w.level3 ?? 0), 0);

  // 主因は「最大レベル帯で最頻のtrigger」
  const triggers = windows.filter(w => (w.level3 ?? 0) === maxLevel).map(w => w.trigger);
  const freq = {};
  for (const t of triggers) freq[t] = (freq[t] || 0) + 1;
  const mainTrigger = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || "pressure";

  return { level3: maxLevel, mainTrigger };
}
