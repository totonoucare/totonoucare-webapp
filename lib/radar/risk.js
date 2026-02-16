// lib/radar/risk.js
// Phase1: 「イベント（変化）× 個人脆弱性（体質）= 時間帯リスク」
// - 今日(JST) 0:00-23:00 の timeline を作る（明日混入なし）
// - hero: prob(0..1), intensity(0..10), peak, main_trigger, confidence
// - explain: weights / 体質補正 / 主要イベント

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

/** 変化スコア（外因）: 0..3 */
export function computeExternalChangeScore({ dP3hAbs, dT3hAbs, dH3hAbs }) {
  const p = scoreByAbsDelta(dP3hAbs, 2, 5, 10);
  const t = scoreByAbsDelta(dT3hAbs, 3, 6, 10);
  const h = scoreByAbsDelta(dH3hAbs, 10, 20, 30);

  const raw = 1.0 * p + 0.5 * t + 0.2 * h;
  const change_score = clamp(Math.round(raw), 0, 3);

  const max = Math.max(p, t, h);
  let trigger = "pressure";
  if (max === h) trigger = "humidity";
  if (max === t) trigger = "temp";
  if (max === p) trigger = "pressure";

  return { change_score, parts: { p, t, h }, trigger };
}

/** 今日だけのindex範囲を作る（hourly.time は JST想定の "YYYY-MM-DDTHH:00" ） */
export function getTodayRangeIdx(hourly, dateStrJST) {
  const times = hourly?.time || [];
  if (!Array.isArray(times) || times.length === 0) return { startIdx: null, endIdx: null };

  const startKey = `${dateStrJST}T00:00`;
  const endKey = `${dateStrJST}T23:00`;

  const startIdx = times.findIndex((t) => typeof t === "string" && t.startsWith(startKey));
  const endIdx = (() => {
    const i = times.findIndex((t) => typeof t === "string" && t.startsWith(endKey));
    if (i !== -1) return i;

    // フォールバック：dateStrの最終index
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

/** 主訴→初期重み（Phase1の基礎テーブル） */
function baseWeightsByFocus(symptom_focus) {
  // 1.0が基準。気象トリガーの「刺さり」を主訴で変える。
  // 圧は天気病の主軸なので下駄を履かせる。
  const base = { pressure: 1.15, temp: 1.0, humidity: 1.0 };

  if (symptom_focus === "headache") {
    return { pressure: 1.25, temp: 0.95, humidity: 1.05 };
  }
  if (symptom_focus === "dizziness") {
    return { pressure: 1.20, temp: 0.95, humidity: 1.05 };
  }
  if (symptom_focus === "swelling") {
    return { pressure: 1.05, temp: 0.95, humidity: 1.25 };
  }
  if (symptom_focus === "sleep") {
    return { pressure: 1.10, temp: 1.10, humidity: 1.00 };
  }
  if (symptom_focus === "mood") {
    return { pressure: 1.10, temp: 1.00, humidity: 1.05 };
  }
  if (symptom_focus === "neck_shoulder") {
    return { pressure: 1.15, temp: 1.00, humidity: 1.00 };
  }
  if (symptom_focus === "low_back_pain") {
    return { pressure: 1.05, temp: 1.05, humidity: 1.00 };
  }
  return base;
}

function hasSubLabel(profile, code) {
  const sub = Array.isArray(profile?.sub_labels)
    ? profile.sub_labels
    : Array.isArray(profile?.computed?.sub_labels)
      ? profile.computed.sub_labels
      : [];
  return sub.includes(code);
}

/** 体質補正（Phase1：大きく振らないが「差」は必ず出す） */
function applyConstitutionAdjust(profile, w0) {
  const axes = profile?.computed?.axes || {};
  const defEx = safeNum(axes?.def_ex_score); // -1..+1
  const yy = axes?.yin_yang_label_internal || null; // cold/heat/neutral/mixed
  const rec = safeNum(axes?.recovery_score); // -1..+1

  let w = { ...w0 };

  // 1) 虚実：圧（高低のモード）に寄与しやすいので微増
  if (defEx != null) {
    const bias = clamp(Math.abs(defEx), 0, 1); // 0..1
    w.pressure *= 1.0 + 0.12 * bias; // 最大 +12%
  }

  // 2) 陰陽：寒熱に敏感な人は「気温の揺れ」を少し上げる
  if (yy === "cold" || yy === "heat") {
    w.temp *= 1.10;
  } else if (yy === "mixed") {
    w.temp *= 1.06;
  }

  // 3) 津液：湿度に刺さる人は湿度重み
  if (hasSubLabel(profile, "fluid_damp") || hasSubLabel(profile, "fluid_deficiency")) {
    w.humidity *= 1.12;
  }

  // 4) 立て直し：回復が低いほど全体増幅
  let amp = 1.0;
  if (rec != null) {
    if (rec < 0) amp = 1.12;
    if (rec < -0.4) amp = 1.18;
  }

  // 5) env_sensitivity（0..3）があれば amp を少し加算
  const envS = safeNum(profile?.computed?.env?.sensitivity ?? profile?.computed?.env?.sensitivity);
  if (envS != null) {
    if (envS >= 3) amp *= 1.10;
    else if (envS >= 2) amp *= 1.05;
  }

  return { weights: w, amp, axes: { defEx, yy, rec, envS } };
}

/** 交互作用（Phase1は“わかりやすいもの”だけ） */
function computeInteractions({ pressure, idx }) {
  // 二段落ち（例）：直近3hの落ち + その前も落ち（合計6hで落ち続け）
  // → 天気病で「一発より連続」が刺さるケースを拾う
  const dp3 = signedDelta(pressure, idx, idx >= 3 ? 3 : 0);
  const dp6 = signedDelta(pressure, idx, idx >= 6 ? 6 : 0);

  let bonus = 0;
  let hits = [];

  if (dp3 != null && dp6 != null) {
    // dp6が大きくマイナス、かつdp3もマイナス
    if (dp6 <= -8 && dp3 <= -3) {
      bonus += 0.9;
      hits.push({ key: "double_drop", label: "二段落ち", hit: true, bonus: 0.9 });
    }
  }

  return { bonus, hits };
}

/** level3（UI用の3段） */
function level3FromRisk(r) {
  if (r <= 1.2) return 0;     // 安定
  if (r <= 3.0) return 1;     // 注意
  return 2;                   // 要警戒
}

/** 1時間ごとのヒント（短文） */
function buildHint({ level3, trigger, symptom_focus, confLabel }) {
  if (level3 <= 0) return null;
  const trig = triggerLabelJa(trigger);
  const focus = symptomFocusJa(symptom_focus);
  const confTxt = confLabel === "low" ? "（精度低め）" : "";
  if (level3 === 2) return `${focus}が動きやすい時間。主因は「${trig}」。無理に詰めず、ペースを落としてOK${confTxt}`;
  return `${focus}が出やすいなら、ここは「${trig}」を前提に余裕を持って${confTxt}`;
}

/** 今日のタイムライン（今日全時間） */
export function computeRiskTimelineToday({ hourly, dateStrJST, profile, confidenceLabel }) {
  const pressure = hourly?.pressure_msl || [];
  const temp = hourly?.temperature_2m || [];
  const humidity = hourly?.relative_humidity_2m || [];
  const times = hourly?.time || [];

  const { startIdx, endIdx } = getTodayRangeIdx(hourly, dateStrJST);
  if (startIdx == null || endIdx == null || endIdx < startIdx) {
    return { items: [], meta: { startIdx, endIdx } };
  }

  const wBase = baseWeightsByFocus(profile?.symptom_focus || "fatigue");
  const { weights, amp } = applyConstitutionAdjust(profile, wBase);

  const items = [];
  for (let i = startIdx; i <= endIdx; i++) {
    // 3h差分（不足時は1h、さらに不足はnull）
    const back = i >= 3 ? 3 : i >= 1 ? 1 : 0;

    const dP = back ? signedDelta(pressure, i, back) : null;
    const dT = back ? signedDelta(temp, i, back) : null;
    const dH = back ? signedDelta(humidity, i, back) : null;

    const ext = computeExternalChangeScore({
      dP3hAbs: dP == null ? null : Math.abs(dP),
      dT3hAbs: dT == null ? null : Math.abs(dT),
      dH3hAbs: dH == null ? null : Math.abs(dH),
    });

    // 凪なら0固定（オオカミ少年防止）
    let risk = 0;
    let interaction = { bonus: 0, hits: [] };

    if (ext.change_score > 0) {
      interaction = computeInteractions({ pressure, idx: i });
      const base = weights.pressure * ext.parts.p + weights.temp * ext.parts.t + weights.humidity * ext.parts.h;
      risk = amp * base + interaction.bonus;
    }

    const level3 = level3FromRisk(risk);

    items.push({
      time: times[i],
      risk: Number.isFinite(risk) ? Number(risk.toFixed(2)) : 0,
      level3,
      trigger: ext.trigger,
      parts: ext.parts, // 0..3
      deltas: { dp: dP, dt: dT, dh: dH },
      events: interaction.hits,
      hint_text: buildHint({
        level3,
        trigger: ext.trigger,
        symptom_focus: profile?.symptom_focus || null,
        confLabel: confidenceLabel,
      }),
    });
  }

  return {
    items,
    meta: {
      startIdx,
      endIdx,
      weights,
      amp,
    },
  };
}

/** ピーク帯（今日の中で最大riskの連続区間） */
export function peakWindowFromTimeline(items = []) {
  if (!Array.isArray(items) || items.length === 0) return { start: null, end: null, startIdx: -1, endIdx: -1, maxRisk: 0 };

  let maxRisk = items.reduce((m, it) => Math.max(m, safeNum(it?.risk) ?? 0), 0);
  if (maxRisk <= 0) return { start: null, end: null, startIdx: -1, endIdx: -1, maxRisk: 0 };

  // maxRiskの連続区間（同値）
  let best = null;
  let cur = null;

  for (let i = 0; i < items.length; i++) {
    const r = safeNum(items[i]?.risk) ?? 0;
    if (r === maxRisk) {
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
  if (!best) return { start: null, end: null, startIdx: -1, endIdx: -1, maxRisk };

  return {
    start: items[best.startIdx]?.time ?? null,
    end: items[best.endIdx]?.time ?? null,
    startIdx: best.startIdx,
    endIdx: best.endIdx,
    maxRisk,
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

/** 今日まとめ：prob/intensity/主因/ピーク */
export function summarizeHeroFromTimeline({ items, profile, confidenceLabel }) {
  const risks = (items || []).map((x) => safeNum(x?.risk) ?? 0);
  const max = risks.length ? Math.max(...risks) : 0;

  // p90
  const sorted = [...risks].sort((a, b) => a - b);
  const p90 = sorted.length ? sorted[Math.floor(0.9 * (sorted.length - 1))] : 0;

  const raw = 0.7 * max + 0.3 * p90;
  const intensity = clamp(Math.round(raw * 0.9), 0, 10);

  const prob = clamp(sigmoid(0.9 * (raw - 3.5)), 0, 1);

  // 主因：ピーク帯（最大riskの時間）のtrigger最頻
  const maxItems = (items || []).filter((it) => (safeNum(it?.risk) ?? 0) === max);
  const freq = {};
  for (const it of maxItems) {
    const t = it?.trigger || "pressure";
    freq[t] = (freq[t] || 0) + 1;
  }
  const prio = { pressure: 3, temp: 2, humidity: 1 };
  const main_trigger =
    Object.entries(freq)
      .sort((a, b) => (b[1] - a[1]) || ((prio[b[0]] || 0) - (prio[a[0]] || 0)))
      .map((x) => x[0])[0] || "pressure";

  const peak = peakWindowFromTimeline(items);
  const peakRangeText = peak?.start && peak?.end ? fmtHourRange(peak.start, peak.end) : null;

  const focus = symptomFocusJa(profile?.symptom_focus || "fatigue");
  const one_liner = `今日 ${Math.round(prob * 100)}% / ${intensity}/10。ピーク${peakRangeText ? ` ${peakRangeText}` : ""}。主因は${triggerLabelJa(main_trigger)}。`;

  return {
    prob,
    intensity,
    main_trigger,
    peak: {
      start: peak?.start ?? null,
      end: peak?.end ?? null,
      range_text: peakRangeText,
      start_idx: peak?.startIdx ?? -1,
      end_idx: peak?.endIdx ?? -1,
    },
    confidence: confidenceLabel,
    one_liner,
    focus_label: focus,
  };
}

/** 信頼度（low/mid/high） */
export function computeConfidenceLabel({ baselineDays, coverage, maxChangeScore }) {
  let c = "low";
  if (baselineDays >= 2 && coverage >= 0.7) c = "mid";
  if (baselineDays >= 7 && coverage >= 0.85) c = "high";

  if (maxChangeScore >= 2) {
    if (c === "low") c = "mid";
    else if (c === "mid") c = "high";
  }
  return c;
}

/** 今日の最大change_score（0..3） */
function maxChangeScoreFromTimeline(items = []) {
  let m = 0;
  for (const it of items) {
    const parts = it?.parts || {};
    const p = safeNum(parts?.p) ?? 0;
    const t = safeNum(parts?.t) ?? 0;
    const h = safeNum(parts?.h) ?? 0;
    const max = Math.max(p, t, h);
    if (max > m) m = max;
  }
  return clamp(m, 0, 3);
}

/** 今日のriskパッケージ（today route / explain route 共通） */
export function computeTodayRiskPackage({ hourly, dateStrJST, profile, baselineDays }) {
  // coverage（今日の要素数 / 24目安）
  const { startIdx, endIdx } = getTodayRangeIdx(hourly, dateStrJST);
  const expected = 24;
  const have = (startIdx != null && endIdx != null && endIdx >= startIdx) ? (endIdx - startIdx + 1) : 0;
  const coverage = expected ? clamp(have / expected, 0, 1) : 0;

  // まず provisional timeline（confidence決めるために maxChangeScore が欲しい）
  const provisional = computeRiskTimelineToday({ hourly, dateStrJST, profile, confidenceLabel: "mid" });
  const maxChangeScore = maxChangeScoreFromTimeline(provisional.items);

  const confidenceLabel = computeConfidenceLabel({ baselineDays, coverage, maxChangeScore });

  // confidence確定後に hint_text を作り直す（UIのメッセージ整合）
  const timeline = computeRiskTimelineToday({ hourly, dateStrJST, profile, confidenceLabel });
  const hero = summarizeHeroFromTimeline({ items: timeline.items, profile, confidenceLabel });

  const axes = profile?.computed?.axes || {};
  const defEx = safeNum(axes?.def_ex_score);
  const yy = axes?.yin_yang_label_internal || null;
  const rec = safeNum(axes?.recovery_score);

  // explain（短い納得：内部語を隠して“翻訳”する）
  const why_short = (() => {
    // defEx: 虚→低気圧側、実→高気圧側（ざっくり）
    let pressureSide = "気圧の変化";
    if (defEx != null) {
      if (defEx <= -0.22) pressureSide = "低気圧側";
      if (defEx >= 0.22) pressureSide = "高気圧側";
    }
    let thermoSide = "寒暖差";
    if (yy === "cold") thermoSide = "冷え込み";
    if (yy === "heat") thermoSide = "暑さ";
    let recTxt = "";
    if (rec != null && rec < 0) recTxt = "（立て直しが遅め）";

    return `${pressureSide}×${thermoSide}の影響を拾う設計です${recTxt}。`;
  })();

  return {
    hero,
    timeline: timeline.items,
    debug: {
      coverage,
      baselineDays,
      weights: timeline.meta.weights,
      amp: timeline.meta.amp,
      axes: { def_ex_score: defEx, yin_yang_label_internal: yy, recovery_score: rec },
    },
    explain: {
      why_short,
    },
  };
}

/** 互換export（過去の explain route が参照しててもビルドが落ちないように） */
export function computeRisk() {
  throw new Error("computeRisk is deprecated. Use computeTodayRiskPackage().");
}
export function computeTimeWindowsNext24h() {
  throw new Error("computeTimeWindowsNext24h is deprecated. Use computeRiskTimelineToday() with today range.");
}
