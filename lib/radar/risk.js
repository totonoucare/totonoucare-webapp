// lib/radar/risk.js
// 外因（変化量）× 内因（体質）で「3段階（安定/注意/要警戒）」を作る決定版

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function safeNum(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
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

/**
 * 外因：直近3時間の変化量から「変化ストレス」(0..3)を算出
 * - 気圧を主軸（単独でも3まで行けるように）
 * - 気温/湿度は追い打ち
 */
export function computeExternalChangeScore({ dP3hAbs, dT3hAbs, dH3hAbs }) {
  // ✅ ここは「敏感寄り」初期値（運用で調整）
  // 3hで 3hPa は体感的に十分しんどい層がいる想定
  const p = scoreByAbsDelta(dP3hAbs, 1.5, 3.0, 5.0);
  const t = scoreByAbsDelta(dT3hAbs, 3.0, 5.0, 8.0);
  const h = scoreByAbsDelta(dH3hAbs, 15, 25, 40);

  // ✅ 平均化せず積算（気圧が単独で3に到達できる）
  const raw = 1.0 * p + 0.5 * t + 0.2 * h;
  const change_score = clamp(Math.round(raw), 0, 3);

  // 主因（UIアイコン用）：優先順位は 気圧 > 気温 > 湿度
  let trigger = "pressure";
  if (p >= t && p >= h) trigger = "pressure";
  else if (t >= h) trigger = "temp";
  else trigger = "humidity";

  return { change_score, parts: { p, t, h }, trigger };
}

/**
 * 内因：体質（constitution_profiles.computed）から vulnerability(0..2)
 * 目的：同じ天気でも “崩れやすさ” に差を出す
 */
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

  // 1) 環境感受性
  if (envSensitivity >= 3) v += 2;
  else if (envSensitivity >= 2) v += 1;

  // 2) 立て直し力（回復がマイナスなら+1）
  if (recoveryScore != null && recoveryScore < 0) v += 1;

  // 3) 偏りの強さ（|def_ex|大なら+1）
  if (defExScore != null && Math.abs(defExScore) >= 0.55) v += 1;

  // 4) 複合弱点
  if (weakCount >= 2) v += 1;

  // 0..2に圧縮（強すぎると毎日赤になる）
  return clamp(v, 0, 2);
}

/**
 * 3段階マッピング：
 * 0: 安定 (combined 0~1)
 * 1: 注意 (combined 2~3)
 * 2: 要警戒 (combined 4~5)
 */
export function level3FromCombined(combined0to5) {
  const x = clamp(Number(combined0to5 ?? 0), 0, 5);
  if (x <= 1) return 0; // 安定
  if (x <= 3) return 1; // 注意
  return 2;             // 要警戒
}

/**
 * 24時間分のリスクレベルを計算（タイムライン用）
 * - 3段ゲート：
 *   - 外因0(凪) → 内因を無視して必ず安定（オオカミ少年防止）
 *   - 外因1(小) → 内因は最大+1まで（鳴りすぎ抑制）
 *   - 外因2..3 → 内因フル加算（内因×外因を効かせる）
 */
export function buildTimeWindowsFromHourly(hourly, nowIdx, hoursForward, profile) {
  const pressure = hourly?.pressure_msl || [];
  const temp = hourly?.temperature_2m || [];
  const humidity = hourly?.relative_humidity_2m || [];
  const times = hourly?.time || [];

  const vulnerability = computeVulnerability(profile); // 0..2

  const windows = [];
  const start = Math.max(0, nowIdx);
  const end = Math.min(times.length - 1, start + Math.max(1, hoursForward));

  for (let i = start; i <= end; i++) {
    // 3h差分（不足時は1hで代用）
    const dP = i >= 3 ? signedDelta(pressure, i, 3) : i >= 1 ? signedDelta(pressure, i, 1) : null;
    const dT = i >= 3 ? signedDelta(temp, i, 3) : i >= 1 ? signedDelta(temp, i, 1) : null;
    const dH = i >= 3 ? signedDelta(humidity, i, 3) : i >= 1 ? signedDelta(humidity, i, 1) : null;

    const dPAbs = dP == null ? null : Math.abs(dP);
    const dTAbs = dT == null ? null : Math.abs(dT);
    const dHAbs = dH == null ? null : Math.abs(dH);

    // 外因スコア (0..3)
    const ext = computeExternalChangeScore({
      dP3hAbs: dPAbs,
      dT3hAbs: dTAbs,
      dH3hAbs: dHAbs,
    });

    // ✅ 3段ゲート（オオカミ少年防止）
    let finalScore = 0;

    if (ext.change_score <= 0) {
      finalScore = 0; // 凪なら必ず安定（内因無視）
    } else if (ext.change_score === 1) {
      finalScore = ext.change_score + Math.min(vulnerability, 1); // 小変化は内因を抑制
    } else {
      finalScore = ext.change_score + vulnerability; // 中〜大変化は内因フル
    }

    const combined = clamp(finalScore, 0, 5);
    const level3 = level3FromCombined(combined);

    windows.push({
      time: times[i],
      level3,                 // 0..2
      trigger: ext.trigger,   // pressure/temp/humidity
      combined,               // 0..5（デバッグ/説明用）
      deltas: { dp: dP, dt: dT, dh: dH }, // 符号つき（UI詳細用）
      parts: ext.parts,       // p/t/h 各0..3（UI用）
      ext_change_score: ext.change_score, // 0..3（UIチューニング用）
      vulnerability,          // 0..2（UIチューニング用）
    });
  }

  return { windows, vulnerability };
}

/**
 * 今日のサマリー生成
 * - 1日の最大レベル（ピーク）を採用
 * - そのピーク帯で最頻の要因を「今日の主因」とする
 */
export function summarizeToday({ windows }) {
  const maxLevel = (windows || []).reduce((m, w) => Math.max(m, w.level3 ?? 0), 0);

  const triggers = (windows || [])
    .filter((w) => (w.level3 ?? 0) === maxLevel)
    .map((w) => w.trigger);

  const freq = {};
  for (const t of triggers) freq[t] = (freq[t] || 0) + 1;

  // 同率なら優先順位：気圧 > 気温 > 湿度
  const order = { pressure: 3, temp: 2, humidity: 1 };
  const mainTrigger =
    Object.entries(freq)
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return (order[b[0]] || 0) - (order[a[0]] || 0);
      })[0]?.[0] || "pressure";

  return { level3: maxLevel, mainTrigger };
}
