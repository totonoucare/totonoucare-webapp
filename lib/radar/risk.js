// lib/radar/risk.js
// Phase1c: 「人（体質/主訴）が主語」+ 気象変化は符号付き入力
// - S_user を 6方向で持つ: {P_high,P_low,T_hot,T_cold,H_wet,H_dry}
// - 各時刻 t で pos/neg ショックを計算し、寄与 E_* を合成
// - ピーク帯は th=max(p90, 0.85*max) の連続帯（max<1.2ならピーク無し）
// - 主因はピーク帯の寄与合計（個人化）
// - 出力: prob(0..1), intensity(0..10), peak, main_trigger, confidence, one_liner

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function safeNum(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
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
  if (!Array.isArray(arr) || back <= 0) return null;
  const cur = safeNum(arr[idx]);
  const prev = safeNum(arr[idx - back]);
  if (cur == null || prev == null) return null;
  return cur - prev;
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

/** 今日だけのindex範囲（hourly.time は JST "YYYY-MM-DDTHH:00" 前提） */
export function getTodayRangeIdx(hourly, dateStrJST) {
  const times = hourly?.time || [];
  if (!Array.isArray(times) || times.length === 0) return { startIdx: null, endIdx: null };

  const startKey = `${dateStrJST}T00:00`;
  const endKey = `${dateStrJST}T23:00`;

  const startIdx = times.findIndex((t) => typeof t === "string" && t.startsWith(startKey));
  const endIdx = (() => {
    const i = times.findIndex((t) => typeof t === "string" && t.startsWith(endKey));
    if (i !== -1) return i;

    // fallback: dateStrの最終index
    let last = -1;
    for (let k = 0; k < times.length; k++) {
      if (typeof times[k] === "string" && times[k].startsWith(dateStrJST)) last = k;
    }
    return last !== -1 ? last : null;
  })();

  return { startIdx: startIdx !== -1 ? startIdx : null, endIdx };
}

function symptomFocusJa(sf) {
  const map = {
    fatigue: "だるさ",
    sleep: "睡眠",
    mood: "気分",
    neck_shoulder: "首肩",
    low_back_pain: "腰",
    swelling: "むくみ",
    headache: "頭痛",
    dizziness: "めまい",
  };
  return map[sf] || "不調";
}

/** -----------------------------
 * 外因ショック（符号付き）を作る
 * ------------------------------ */
function computeDirectionalShocks({ dP, dT, dH }) {
  const dp = safeNum(dP);
  const dt = safeNum(dT);
  const dh = safeNum(dH);

  const magP = scoreByAbsDelta(dp == null ? null : Math.abs(dp), 2, 5, 10);
  const magT = scoreByAbsDelta(dt == null ? null : Math.abs(dt), 3, 6, 10);
  const magH = scoreByAbsDelta(dh == null ? null : Math.abs(dh), 10, 20, 30);

  const posP = dp != null && dp > 0 ? magP : 0;
  const negP = dp != null && dp < 0 ? magP : 0;

  const posT = dt != null && dt > 0 ? magT : 0;
  const negT = dt != null && dt < 0 ? magT : 0;

  const posH = dh != null && dh > 0 ? magH : 0;
  const negH = dh != null && dh < 0 ? magH : 0;

  // gate用（表示は使わないが互換的に返す）
  const rawGate = 1.0 * magP + 0.5 * magT + 0.2 * magH;
  const change_score = clamp(Math.round(rawGate), 0, 3);

  // “気象だけ”の最大トリガー（初期値）
  const max = Math.max(magP, magT, magH);
  let trigger = "pressure";
  if (max === magH) trigger = "humidity";
  if (max === magT) trigger = "temp";
  if (max === magP) trigger = "pressure";

  return {
    change_score,
    trigger,
    parts: { p: magP, t: magT, h: magH }, // 0..3
    dir: { posP, negP, posT, negT, posH, negH },
  };
}

/** 互換：従来の署名（abs）でも動くように残す */
export function computeExternalChangeScore({ dP3hAbs, dT3hAbs, dH3hAbs }) {
  const p = scoreByAbsDelta(dP3hAbs, 2, 5, 10);
  const t = scoreByAbsDelta(dT3hAbs, 3, 6, 10);
  const h = scoreByAbsDelta(dH3hAbs, 10, 20, 30);

  const rawGate = 1.0 * p + 0.5 * t + 0.2 * h;
  const change_score = clamp(Math.round(rawGate), 0, 3);

  const max = Math.max(p, t, h);
  let trigger = "pressure";
  if (max === h) trigger = "humidity";
  if (max === t) trigger = "temp";
  if (max === p) trigger = "pressure";

  return { change_score, parts: { p, t, h }, trigger };
}

/** -----------------------------
 * Vulnerability (0..2) → amp
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

  if (defExScore != null && Math.abs(defExScore) >= 0.55) v += 1;

  if (weakCount >= 2) v += 1;

  return clamp(v, 0, 2);
}

function ampFromVulnerability(v) {
  return 1.0 + 0.25 * clamp(v ?? 0, 0, 2);
}

/** -----------------------------
 * BurdenDir（説明用）
 * ------------------------------ */
function hasSubLabel(profile, code) {
  const sub = Array.isArray(profile?.sub_labels)
    ? profile.sub_labels
    : Array.isArray(profile?.computed?.sub_labels)
      ? profile.computed.sub_labels
      : [];
  return sub.includes(code);
}

function pressureBurdenDirection(defExScore) {
  const dx = safeNum(defExScore);
  if (dx == null) return "none";
  if (dx >= 0.22) return "high";
  if (dx <= -0.22) return "low";
  return "none";
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

/** -----------------------------
 * 主訴テーブル（軸の強さ）
 * ------------------------------ */
function focusWeights(symptom_focus) {
  const base = { pressure: 1.05, temp: 1.0, humidity: 1.0 };
  const table = {
    headache:      { pressure: 1.30, temp: 0.90, humidity: 1.00 },
    dizziness:     { pressure: 1.25, temp: 0.95, humidity: 0.90 },
    swelling:      { pressure: 1.10, temp: 0.80, humidity: 1.25 },
    sleep:         { pressure: 1.00, temp: 1.20, humidity: 1.05 },
    fatigue:       { pressure: 1.15, temp: 0.95, humidity: 1.00 },
    mood:          { pressure: 1.05, temp: 1.00, humidity: 1.00 },
    neck_shoulder: { pressure: 1.10, temp: 1.15, humidity: 0.85 },
    low_back_pain: { pressure: 1.05, temp: 1.20, humidity: 0.85 },
  };
  return table[symptom_focus] || base;
}

/** -----------------------------
 * S_user（6方向）の組み立て
 * ------------------------------ */
function buildUserSensitivity6(profile) {
  const symptom_focus = profile?.symptom_focus || "fatigue";
  const fw = focusWeights(symptom_focus);

  // まずは主訴で“軸の強さ”を入れる（方向はまだ同じ）
  let P_high = fw.pressure;
  let P_low  = fw.pressure;
  let T_hot  = fw.temp;
  let T_cold = fw.temp;
  let H_wet  = fw.humidity;
  let H_dry  = fw.humidity;

  const computed = profile?.computed || {};
  const axes = computed?.axes || {};

  const defEx = safeNum(axes?.def_ex_score);
  const yy = axes?.yin_yang_label_internal || null;

  // --- 方向を決める（ここが差を作る） ---
  // 気圧：虚→低気圧側、実→高気圧側、それ以外は薄く両方
  if (defEx != null) {
    if (defEx <= -0.22) P_low += 0.20;
    else if (defEx >= 0.22) P_high += 0.20;
    else { P_low += 0.05; P_high += 0.05; }
  } else {
    P_low += 0.03; P_high += 0.03;
  }

  // 気温：cold→冷え、heat→暑さ、mixed→両方
  if (yy === "cold") T_cold += 0.20;
  else if (yy === "heat") T_hot += 0.20;
  else if (yy === "mixed") { T_hot += 0.10; T_cold += 0.10; }
  else { T_hot += 0.05; T_cold += 0.05; }

  // 湿度：痰湿→多湿、津液不足→乾燥（真逆に分ける）
  if (hasSubLabel(profile, "fluid_damp")) H_wet += 0.25;
  if (hasSubLabel(profile, "fluid_deficiency")) H_dry += 0.25;

  // --- サブラベルの追加補正（小さく） ---
  if (hasSubLabel(profile, "qi_stagnation")) { P_low += 0.08; P_high += 0.08; }
  if (hasSubLabel(profile, "qi_deficiency")) { P_low += 0.12; }
  if (hasSubLabel(profile, "blood_stasis"))  { P_low += 0.06; P_high += 0.06; T_cold += 0.06; }
  if (hasSubLabel(profile, "blood_deficiency")) { T_cold += 0.12; }

  // core_code補正（薄く）
  const core = profile?.core_code ?? computed?.core_code ?? "";
  if (typeof core === "string") {
    if (core.startsWith("cold_")) T_cold += 0.08;
    if (core.startsWith("heat_")) T_hot += 0.08;
    if (core.startsWith("mixed_")) { P_low += 0.04; P_high += 0.04; T_hot += 0.04; T_cold += 0.04; }
  }

  // clamp（6方向なので上限少し広め）
  const clampW = (x) => clamp(x, 0.7, 1.8);
  P_high = clampW(P_high);
  P_low  = clampW(P_low);
  T_hot  = clampW(T_hot);
  T_cold = clampW(T_cold);
  H_wet  = clampW(H_wet);
  H_dry  = clampW(H_dry);

  const v = computeVulnerability(profile);
  const amp = ampFromVulnerability(v);

  const burden = {
    pressure: pressureBurdenDirection(defEx),
    temp: tempBurdenDirection(yy),
    humidity: humidityBurdenDirection(profile),
  };

  return {
    symptom_focus,
    weights6: { P_high, P_low, T_hot, T_cold, H_wet, H_dry },
    vulnerability: v,
    amp,
    burden,
    axes: {
      def_ex_score: defEx,
      yin_yang_label_internal: yy,
      recovery_score: safeNum(axes?.recovery_score),
    },
  };
}

/** -----------------------------
 * Interaction（方向ベース）
 * ------------------------------ */
function computeInteractions({ profile, symptom_focus, shocks, deltas, pressureArr, idx }) {
  const dp = safeNum(deltas?.dp);
  const dt = safeNum(deltas?.dt);

  const { posP, negP, posT, negT, posH } = shocks?.dir || {};

  let bonus = 0;
  const hits = [];

  // I1) 低気圧低下 × 多湿（むくみ/めまい系）
  if ((negP ?? 0) >= 2 && (posH ?? 0) >= 2) {
    const b = (symptom_focus === "swelling" || symptom_focus === "dizziness") ? 0.8 : 0.6;
    bonus += b;
    hits.push({ key: "lowP_x_highH", label: "低気圧×多湿", bonus: b });
  }

  // I2) 冷え込み × 気圧変動（冷えで崩れる）
  if ((negT ?? 0) >= 2 && (((negP ?? 0) >= 1) || ((posP ?? 0) >= 1))) {
    const core = profile?.core_code ?? "";
    const coldish = typeof core === "string" && core.startsWith("cold_");
    const focusCold = (symptom_focus === "sleep" || symptom_focus === "neck_shoulder" || symptom_focus === "low_back_pain");
    const b = (coldish || focusCold) ? 0.7 : 0.5;
    bonus += b;
    hits.push({ key: "dropT_x_moveP", label: "冷え込み×気圧変動", bonus: b });
  }

  // I3) 二段落ち（気圧連続低下）
  const dp3 = signedDelta(pressureArr, idx, idx >= 3 ? 3 : 0);
  const dp6 = signedDelta(pressureArr, idx, idx >= 6 ? 6 : 0);
  if (dp3 != null && dp6 != null) {
    if (dp6 <= -8 && dp3 <= -3) {
      const b = (symptom_focus === "headache" || symptom_focus === "dizziness") ? 0.9 : 0.7;
      bonus += b;
      hits.push({ key: "double_drop", label: "二段落ち", bonus: b });
    }
  }

  return { bonus, hits };
}

/** 3段階（UI用） */
function level3FromRisk(r) {
  if (r <= 1.2) return 0;
  if (r <= 3.0) return 1;
  return 2;
}

function buildHint({ level3, main_trigger, symptom_focus, confidence }) {
  if (level3 <= 0) return null;
  const trig = triggerLabelJa(main_trigger);
  const focus = symptomFocusJa(symptom_focus);
  const confTxt = confidence === "low" ? "（精度低め）" : "";
  if (level3 === 2) return `${focus}が動きやすい時間。主因は「${trig}」。詰めすぎ注意${confTxt}`;
  return `${focus}が出やすいなら、ここは「${trig}」を前提に余裕を持って${confTxt}`;
}

/** 今日のタイムライン */
export function computeRiskTimelineToday({ hourly, dateStrJST, profile, confidence }) {
  const pressure = hourly?.pressure_msl || [];
  const temp = hourly?.temperature_2m || [];
  const humidity = hourly?.relative_humidity_2m || [];
  const times = hourly?.time || [];

  const { startIdx, endIdx } = getTodayRangeIdx(hourly, dateStrJST);
  if (startIdx == null || endIdx == null || endIdx < startIdx) {
    return { items: [], meta: { startIdx, endIdx } };
  }

  const S = buildUserSensitivity6(profile);

  const items = [];
  for (let i = startIdx; i <= endIdx; i++) {
    const back = i >= 3 ? 3 : i >= 1 ? 1 : 0;

    const dP = back ? signedDelta(pressure, i, back) : null;
    const dT = back ? signedDelta(temp, i, back) : null;
    const dH = back ? signedDelta(humidity, i, back) : null;

    const shocks = computeDirectionalShocks({ dP, dT, dH });

    // gate（凪なら0）
    const magSum = (shocks.parts.p ?? 0) + (shocks.parts.t ?? 0) + (shocks.parts.h ?? 0);

    // 方向別寄与
    const w = S.weights6;
    const dir = shocks.dir;

    const E_P =
      (w.P_high * (dir.posP ?? 0)) +
      (w.P_low  * (dir.negP ?? 0));
    const E_T =
      (w.T_hot  * (dir.posT ?? 0)) +
      (w.T_cold * (dir.negT ?? 0));
    const E_H =
      (w.H_wet  * (dir.posH ?? 0)) +
      (w.H_dry  * (dir.negH ?? 0));

    let risk = 0;
    let interaction = { bonus: 0, hits: [] };

    if (magSum > 0) {
      interaction = computeInteractions({
        profile,
        symptom_focus: S.symptom_focus,
        shocks,
        deltas: { dp: dP, dt: dT, dh: dH },
        pressureArr: pressure,
        idx: i,
      });

      const base = E_P + E_T + E_H;
      risk = S.amp * base + interaction.bonus;
    }

    // bonusを主因に割り当て（シンプル）
    let addP = 0, addT = 0, addH = 0;
    for (const ev of interaction.hits) {
      if (ev.key === "lowP_x_highH") { addP += ev.bonus * 0.5; addH += ev.bonus * 0.5; }
      if (ev.key === "dropT_x_moveP") { addT += ev.bonus * 0.6; addP += ev.bonus * 0.4; }
      if (ev.key === "double_drop") { addP += ev.bonus; }
    }

    const contrib = {
      pressure: E_P + addP,
      temp: E_T + addT,
      humidity: E_H + addH,
    };

    const main_trigger =
      Object.entries(contrib).sort((a, b) => (b[1] - a[1]))[0]?.[0] || "pressure";

    const level3 = level3FromRisk(risk);

    items.push({
      time: times[i],
      risk: Number.isFinite(risk) ? Number(risk.toFixed(2)) : 0,
      level3,

      // 個人化の根拠（寄与）
      contrib: {
        pressure: Number((contrib.pressure ?? 0).toFixed(2)),
        temp: Number((contrib.temp ?? 0).toFixed(2)),
        humidity: Number((contrib.humidity ?? 0).toFixed(2)),
      },
      main_trigger,

      // 気象の材料
      parts: shocks.parts,                 // 0..3
      dir_parts: shocks.dir,               // pos/neg (0..3)
      deltas: { dp: dP, dt: dT, dh: dH },  // signed
      events: interaction.hits,
      hint_text: buildHint({
        level3,
        main_trigger,
        symptom_focus: S.symptom_focus,
        confidence,
      }),
    });
  }

  return { items, meta: { startIdx, endIdx, S } };
}

/** パーセンタイル */
function percentile(values, q) {
  const xs = (values || [])
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  if (xs.length === 0) return 0;
  const pos = clamp(q, 0, 1) * (xs.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return xs[lo];
  const t = pos - lo;
  return xs[lo] * (1 - t) + xs[hi] * t;
}

/** ピーク帯：th=max(p90, 0.85*max) の連続区間（max<1.2ならピーク無し） */
export function peakBandFromTimeline(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return { start: null, end: null, startIdx: -1, endIdx: -1, threshold: 0 };
  }

  const risks = items.map((it) => safeNum(it?.risk) ?? 0);
  const rMax = risks.length ? Math.max(...risks) : 0;

  // 安定日：ピーク無し
  if (rMax < 1.2) {
    return { start: null, end: null, startIdx: -1, endIdx: -1, threshold: 0 };
  }

  const p90 = percentile(risks, 0.90);
  const th = Math.max(p90, 0.85 * rMax);

  let best = null;
  let cur = null;

  const scoreBand = (band) => {
    const slice = items.slice(band.startIdx, band.endIdx + 1);
    const avg =
      slice.reduce((s, x) => s + (safeNum(x?.risk) ?? 0), 0) / Math.max(1, slice.length);
    const len = band.endIdx - band.startIdx + 1;
    return { avg, len };
  };

  for (let i = 0; i < items.length; i++) {
    const r = safeNum(items[i]?.risk) ?? 0;
    if (r >= th) {
      if (!cur) cur = { startIdx: i, endIdx: i };
      else cur.endIdx = i;
    } else if (cur) {
      const a = scoreBand(cur);
      if (!best) best = cur;
      else {
        const b = scoreBand(best);
        if (a.avg > b.avg || (a.avg === b.avg && a.len > b.len)) best = cur;
      }
      cur = null;
    }
  }
  if (cur) {
    const a = scoreBand(cur);
    if (!best) best = cur;
    else {
      const b = scoreBand(best);
      if (a.avg > b.avg || (a.avg === b.avg && a.len > b.len)) best = cur;
    }
  }

  if (!best) return { start: null, end: null, startIdx: -1, endIdx: -1, threshold: th };

  return {
    start: items[best.startIdx]?.time ?? null,
    end: items[best.endIdx]?.time ?? null,
    startIdx: best.startIdx,
    endIdx: best.endIdx,
    threshold: Number(th.toFixed(3)),
  };
}

export function fmtHourRange(startISO, endISO) {
  const hour = (iso) => {
    if (!iso || typeof iso !== "string") return null;
    const m = iso.match(/T(\d{2}):/);
    if (!m) return null;
    return String(Number(m[1]));
  };
  const s = hour(startISO);
  const e = hour(endISO);
  if (s == null) return null;
  if (e == null) return `${s}時`;
  if (s === e) return `${s}時`;
  return `${s}–${e}時`;
}

/** intensity/prob の安定化（sigmoidレンジ） */
function intensityFromRaw(raw) {
  // 0..10。暴れにくい（Phase2で校正）
  const B = 4.0;
  const S = 1.6;
  const x = 10 * sigmoid((raw - B) / S);
  return clamp(Math.round(x), 0, 10);
}
function probFromRaw(raw) {
  const B = 3.6;
  const S = 1.4;
  return clamp(sigmoid((raw - B) / S), 0, 1);
}

/** 今日まとめ */
export function summarizeHeroFromTimeline({ items, profile, confidence }) {
  const risks = (items || []).map((x) => safeNum(x?.risk) ?? 0);
  const rMax = risks.length ? Math.max(...risks) : 0;
  const rP90 = percentile(risks, 0.90);

  const raw = 0.7 * rMax + 0.3 * rP90;

  const intensity = intensityFromRaw(raw);
  const prob = probFromRaw(raw);

  const band = peakBandFromTimeline(items);
  const peakRangeText = band?.start && band?.end ? fmtHourRange(band.start, band.end) : null;

  // 主因：ピーク帯の寄与合計（個人化）
  let sumP = 0, sumT = 0, sumH = 0;
  if (band.startIdx >= 0) {
    for (let i = band.startIdx; i <= band.endIdx; i++) {
      const c = items[i]?.contrib || {};
      sumP += safeNum(c.pressure) ?? 0;
      sumT += safeNum(c.temp) ?? 0;
      sumH += safeNum(c.humidity) ?? 0;
    }
  } else {
    // ピーク帯が無い（安定日）なら max時刻で決める
    const idx = items.reduce((best, it, i) => {
      const r = safeNum(it?.risk) ?? 0;
      const br = best != null ? (safeNum(items[best]?.risk) ?? 0) : -1;
      return r > br ? i : best;
    }, null);
    if (idx != null) {
      const c = items[idx]?.contrib || {};
      sumP = safeNum(c.pressure) ?? 0;
      sumT = safeNum(c.temp) ?? 0;
      sumH = safeNum(c.humidity) ?? 0;
    }
  }

  const main_trigger =
    Object.entries({ pressure: sumP, temp: sumT, humidity: sumH })
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "pressure";

  const focus = symptomFocusJa(profile?.symptom_focus || "fatigue");
  const one_liner =
    `今日 ${Math.round(prob * 100)}% / ${intensity}/10。` +
    (peakRangeText ? `ピーク ${peakRangeText}。` : "") +
    `主因は${triggerLabelJa(main_trigger)}。`;

  return {
    prob,
    intensity,
    main_trigger,
    peak: {
      start: band?.start ?? null,
      end: band?.end ?? null,
      range_text: peakRangeText,
      start_idx: band?.startIdx ?? -1,
      end_idx: band?.endIdx ?? -1,
      threshold: band?.threshold ?? 0,
    },
    confidence,
    one_liner,
    focus_label: focus,
    // debug用
    raw: Number(raw.toFixed(3)),
    r_max: Number(rMax.toFixed(3)),
    r_p90: Number(rP90.toFixed(3)),
  };
}

/** 信頼度（low/mid/high） */
export function computeConfidenceLabel({ baselineDays, coverage, maxChangePart, profile }) {
  let c = "low";
  if (baselineDays >= 2 && coverage >= 0.7) c = "mid";
  if (baselineDays >= 7 && coverage >= 0.85) c = "high";

  // 変化が大きい日は外れにくい（+1段）
  if (maxChangePart >= 2) {
    if (c === "low") c = "mid";
    else if (c === "mid") c = "high";
  }

  // 個人化の根拠が薄い場合は1段落とす（体質情報欠損）
  const axes = profile?.computed?.axes;
  const hasAxes = axes && (safeNum(axes?.def_ex_score) != null || axes?.yin_yang_label_internal);
  const sub = Array.isArray(profile?.sub_labels) ? profile.sub_labels : Array.isArray(profile?.computed?.sub_labels) ? profile.computed.sub_labels : [];
  const hasSub = Array.isArray(sub) && sub.length > 0;

  if (!hasAxes && !hasSub) {
    if (c === "high") c = "mid";
    else if (c === "mid") c = "low";
  }

  return c;
}

/** 今日の最大parts（0..3） */
function maxPartFromTimeline(items = []) {
  let m = 0;
  for (const it of items) {
    const parts = it?.parts || {};
    const p = safeNum(parts?.p) ?? 0;
    const t = safeNum(parts?.t) ?? 0;
    const h = safeNum(parts?.h) ?? 0;
    m = Math.max(m, p, t, h);
  }
  return clamp(m, 0, 3);
}

/** 今日のriskパッケージ（today/explain共通） */
export function computeTodayRiskPackage({ hourly, dateStrJST, profile, baselineDays }) {
  const { startIdx, endIdx } = getTodayRangeIdx(hourly, dateStrJST);
  const expected = 24;
  const have = (startIdx != null && endIdx != null && endIdx >= startIdx) ? (endIdx - startIdx + 1) : 0;
  const coverage = expected ? clamp(have / expected, 0, 1) : 0;

  // provisional（confidence計算用）
  const provisional = computeRiskTimelineToday({ hourly, dateStrJST, profile, confidence: "mid" });
  const maxPart = maxPartFromTimeline(provisional.items);

  const confidence = computeConfidenceLabel({
    baselineDays,
    coverage,
    maxChangePart: maxPart,
    profile,
  });

  // confidence確定後に作り直し（hint整合）
  const timeline = computeRiskTimelineToday({ hourly, dateStrJST, profile, confidence });
  const hero = summarizeHeroFromTimeline({ items: timeline.items, profile, confidence });

  // 短い納得（内部語を隠して翻訳）
  const S = timeline.meta?.S || buildUserSensitivity6(profile);
  const why_short = (() => {
    const f = symptomFocusJa(S.symptom_focus);
    const bP = S.burden?.pressure;
    const bT = S.burden?.temp;
    const bH = S.burden?.humidity;

    const pTxt = bP === "low" ? "低気圧側" : bP === "high" ? "高気圧側" : "気圧の揺れ";
    const tTxt = bT === "low" ? "冷え込み" : bT === "high" ? "暑さ" : "寒暖差";
    const hTxt = bH === "high" ? "多湿" : bH === "low" ? "乾燥" : "湿度の揺れ";

    return `主訴「${f}」に対して、あなたの体質の“刺さりやすい要因”（${pTxt}/${tTxt}/${hTxt}）を重みにして時間帯リスクを作っています。`;
  })();

  return {
    hero,
    timeline: timeline.items,
    explain: { why_short },
    debug: {
      coverage,
      baselineDays,
      confidence,
      S: timeline.meta?.S || null,
      hero_raw: { raw: hero.raw, r_max: hero.r_max, r_p90: hero.r_p90 },
    },
  };
}

/** 互換export（過去参照でビルド落ちないように） */
export function computeRisk() {
  throw new Error("computeRisk is deprecated. Use computeTodayRiskPackage().");
}
export function computeTimeWindowsNext24h() {
  throw new Error("computeTimeWindowsNext24h is deprecated. Use computeRiskTimelineToday() with today range.");
}
