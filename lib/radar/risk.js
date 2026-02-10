// lib/radar/risk.js
// 外因（気象の変化量）× 内因（体質）で「3段階（安定/注意/要警戒）」を作る
// - 表示は1時間刻み
// - 計算は「直近3時間Δ（不足時は1時間Δ）」
// - “オオカミ少年防止”の3段ゲート（凪/小/中大）を採用
// - ベース気圧（直近数日平均との差）× 虚実(def_ex)で、同じ外因でも出し分け

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
 * - 気圧を主軸（単独でも3まで行ける）
 * - 気温/湿度は追い打ち
 */
export function computeExternalChangeScore({ dP3hAbs, dT3hAbs, dH3hAbs }) {
  // 初期値（運用でチューニング前提）
  const p = scoreByAbsDelta(dP3hAbs, 2, 5, 10);
  const t = scoreByAbsDelta(dT3hAbs, 3, 6, 10);
  const h = scoreByAbsDelta(dH3hAbs, 10, 20, 30);

  // “平均化”しない：気圧は単独でMAXまで到達できるように
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

/**
 * 内因：体質（constitution_profiles.computed）から vulnerability(0..2)
 * 目的：同じ天気でも “崩れやすさ” に差を出す（ただし強くしすぎない）
 */
export function computeVulnerability(profile) {
  const computed = profile?.computed || {};
  const env = computed?.env || {};
  const axes = computed?.axes || {};

  const envSensitivity = safeNum(env?.sensitivity) ?? 0; // 0..3（回答スケール）
  const recoveryScore = safeNum(axes?.recovery_score);   // -1..+1
  const defExScore = safeNum(axes?.def_ex_score);        // -1..+1

  const sub = Array.isArray(profile?.sub_labels)
    ? profile.sub_labels
    : Array.isArray(computed?.sub_labels)
      ? computed.sub_labels
      : [];
  const weakCount = sub?.length || 0;

  let v = 0;

  // 1) 環境感受性（強いほど上げる）
  if (envSensitivity >= 3) v += 2;
  else if (envSensitivity >= 2) v += 1;

  // 2) 立て直し力（回復スコアがマイナスなら +1）
  if (recoveryScore != null && recoveryScore < 0) v += 1;

  // 3) 偏りの強さ（虚でも実でも「偏りが強い」なら +1）
  //    ※ここは“変化に弱い”一般項として扱う
  if (defExScore != null && Math.abs(defExScore) >= 0.55) v += 1;

  // 4) 複合弱点（sub_labelsが2つ以上なら +1）
  if (weakCount >= 2) v += 1;

  // 0..2に圧縮（常時赤を防ぐ）
  return clamp(v, 0, 2);
}

/**
 * ベース気圧（平均との差）× 虚実(def_ex)で +0 or +1
 * - “悪化方向だけ” 加点する（楽方向で減点しない：設計が不安定になるため）
 */
export function computePressureBasePenalty({ pressureNow, pressureBaseline, def_ex_score }) {
  const P = safeNum(pressureNow);
  const base = safeNum(pressureBaseline);
  const dx = safeNum(def_ex_score);

  if (P == null || base == null || dx == null) {
    return {
      base_penalty: 0,
      base_state: "unknown",
      base_reason: null,
      pressure_anomaly: null,
    };
  }

  const anomaly = P - base; // +:高め / -:低め
  const A = 4.0;            // “高め/低め”判定の閾値（運用で調整）

  let state = "normal";
  if (anomaly >= A) state = "high";
  else if (anomaly <= -A) state = "low";

  // scoring.jsのラベル閾値に合わせる
  const isExcess = dx >= 0.22;
  const isDef = dx <= -0.22;

  let penalty = 0;
  // 実×高圧：張りやすい/詰まりやすい方向に負担
  if (state === "high" && isExcess) penalty = 1;
  // 虚×低圧：支えが弱く、だるさ方向に負担
  if (state === "low" && isDef) penalty = 1;

  let reason = null;
  if (penalty === 1) {
    if (state === "high" && isExcess) reason = "気圧が高めの日は、張りやすいタイプは負担が出やすい";
    if (state === "low" && isDef) reason = "気圧が低めの日は、支えが弱いタイプはだるさが出やすい";
  }

  return {
    base_penalty: penalty,         // 0 or 1
    base_state: state,             // high/low/normal/unknown
    base_reason: reason,           // UI/AI用（短文）
    pressure_anomaly: anomaly,     // now - baseline
  };
}

/**
 * 3段階マッピング：
 * 0: 安定 (combined 0~1)
 * 1: 注意 (combined 2~3)
 * 2: 要警戒 (combined 4~5)
 */
export function level3FromCombined(combined0to5) {
  const x = clamp(Number(combined0to5 ?? 0), 0, 5);
  if (x <= 1) return 0;
  if (x <= 3) return 1;
  return 2;
}

/**
 * 24時間分のリスクレベルを計算（タイムライン用）
 * - 計算は3hΔ（不足時は1hΔ）
 * - 表示は1h刻み（windowsの各要素が1時間分）
 */
export function buildTimeWindowsFromHourly(hourly, nowIdx, hoursForward, profile, pressureBaseline) {
  const pressure = hourly?.pressure_msl || [];
  const temp = hourly?.temperature_2m || [];
  const humidity = hourly?.relative_humidity_2m || [];
  const times = hourly?.time || [];

  const vulnerability = computeVulnerability(profile); // 0..2

  const axes = profile?.computed?.axes || {};
  const def_ex_score = safeNum(axes?.def_ex_score);

  const windows = [];
  const start = Math.max(0, nowIdx);
  const end = Math.min(times.length - 1, start + Math.max(1, hoursForward));

  for (let i = start; i <= end; i++) {
    // 3h差分（不足時は1hで代用）
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

    const pressureNow = safeNum(pressure?.[i]);
    const baseInfo = computePressureBasePenalty({
      pressureNow,
      pressureBaseline,
      def_ex_score,
    });

    // ★ 3段ゲート（凪・小・中大）
    let finalScore = 0;

    if (ext.change_score <= 0) {
      // 1) 凪なら必ず安定（内因・ベース無視）
      finalScore = 0;
    } else if (ext.change_score === 1) {
      // 2) 小変化：内因/ベースは抑制（最大+1ずつではなく、合算の上限を“軽く”する）
      //    - vulnは最大+1
      //    - baseも最大+1（ただし ext=1 のとき常時乗せると騒がしくなるので、base_penaltyのまま）
      finalScore = ext.change_score + Math.min(vulnerability, 1) + Math.min(baseInfo.base_penalty, 1);
    } else {
      // 3) 中〜大変化：内因/ベースをフル加算
      finalScore = ext.change_score + vulnerability + baseInfo.base_penalty;
    }

    const combined = clamp(finalScore, 0, 5);
    const level3 = level3FromCombined(combined);

    windows.push({
      time: times[i],               // "YYYY-MM-DDTHH:00"
      level3,                       // 0..2
      trigger: ext.trigger,         // pressure/temp/humidity

      // 詳細（タップ表示用）
      combined,                     // 0..5
      deltas: { dp: dP, dt: dT, dh: dH }, // 符号つき
      parts: ext.parts,             // 0..3

      base: {
        state: baseInfo.base_state,
        reason: baseInfo.base_reason,
        anomaly: baseInfo.pressure_anomaly,
        baseline: pressureBaseline ?? null,
        now: pressureNow ?? null,
      },
    });
  }

  return { windows, vulnerability };
}

/**
 * 今日のサマリー
 * - 1日の最大レベル（ピーク）を採用
 * - そのピーク帯の最頻トリガーを主因にする
 */
export function summarizeToday({ windows }) {
  const maxLevel = windows.reduce((m, w) => Math.max(m, w.level3 ?? 0), 0);

  const triggers = windows
    .filter((w) => (w.level3 ?? 0) === maxLevel)
    .map((w) => w.trigger);

  const freq = {};
  for (const t of triggers) freq[t] = (freq[t] || 0) + 1;

  // 同率時の優先：気圧 > 気温 > 湿度
  const prio = { pressure: 3, temp: 2, humidity: 1 };
  const mainTrigger =
    Object.entries(freq)
      .sort((a, b) => (b[1] - a[1]) || ((prio[b[0]] || 0) - (prio[a[0]] || 0)))
      .map((x) => x[0])[0] || "pressure";

  return { level3: maxLevel, mainTrigger };
}

/**
 * ピーク時間帯（連続区間）を作る
 * - maxLevelの連続区間を抽出し、最長を返す（同長なら先頭）
 */
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
    const w = windows[i];
    const lv = w?.level3 ?? 0;

    if (lv === maxLevel) {
      if (!cur) cur = { startIdx: i, endIdx: i };
      else cur.endIdx = i;
    } else {
      if (cur) {
        const len = cur.endIdx - cur.startIdx + 1;
        if (!best || len > (best.endIdx - best.startIdx + 1)) best = cur;
        cur = null;
      }
    }
  }

  if (cur) {
    const len = cur.endIdx - cur.startIdx + 1;
    if (!best || len > (best.endIdx - best.startIdx + 1)) best = cur;
  }

  if (!best) return { maxLevel, start: null, end: null, startIdx: -1, endIdx: -1 };

  const start = windows[best.startIdx]?.time ?? null;
  // endは「最後の要素の次の時間」を表現したいが、文字列処理が面倒なので endIdxのtimeを返す
  const end = windows[best.endIdx]?.time ?? null;

  return { maxLevel, start, end, startIdx: best.startIdx, endIdx: best.endIdx };
}

/**
 * “次の山”：
 * - now以降で maxLevel が出る最初の時刻を返す
 */
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

/**
 * UI用：日本語ラベル
 */
export function levelLabelJa(level3) {
  if (level3 === 2) return "要警戒";
  if (level3 === 1) return "注意";
  return "安定";
}

export function triggerLabelJa(trigger) {
  if (trigger === "temp") return "気温の揺れ";
  if (trigger === "humidity") return "湿度の揺れ";
  return "気圧の揺れ";
}
