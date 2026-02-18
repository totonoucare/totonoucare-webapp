// lib/radar/risk.js
// Phase1c: 「人（体質/主訴）が主語」→ 気象変化は入力
// - 個人感受性ベクトル S_user = {Wp, Wt, Wh} を先に確定
// - 各時刻 t で寄与 E_p/E_t/E_h を計算し、risk(t) を作る
// - ピーク帯は「p90以上の連続帯」（帯の平均riskが最大の区間）
// - 主因はピーク帯の寄与合計（contrib）で決定（＝個人化される）
// - 方向（上昇/下降）を main_trigger_dir として返す（物理単位は出さない）

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

export function triggerDirJa(trigger, dir) {
  if (!dir || dir === "none") return "";
  if (trigger === "pressure") return dir === "down" ? "（低下）" : "（上昇）";
  if (trigger === "temp") return dir === "down" ? "（冷え込み）" : "（上昇）";
  if (trigger === "humidity") return dir === "down" ? "（乾燥寄り）" : "（多湿寄り）";
  return "";
}

/** 外因（変化）スコア: 0..3 */
export function computeExternalChangeScore({ dP3hAbs, dT3hAbs, dH3hAbs }) {
  const p = scoreByAbsDelta(dP3hAbs, 2, 5, 10);
  const t = scoreByAbsDelta(dT3hAbs, 3, 6, 10);
  const h = scoreByAbsDelta(dH3hAbs, 10, 20, 30);

  // 変化の総量ゲート用（表示は使わない）
  const raw = 1.0 * p + 0.5 * t + 0.2 * h;
  const change_score = clamp(Math.round(raw), 0, 3);

  // “気象だけ”のトリガー判定（初期値）
  const max = Math.max(p, t, h);
  let trigger = "pressure";
  if (max === h) trigger = "humidity";
  if (max === t) trigger = "temp";
  if (max === p) trigger = "pressure";

  return { change_score, parts: { p, t, h }, trigger };
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
 * 1) Vulnerability (0..2) → amp
 * ------------------------------ */
export function computeVulnerability(profile) {
  const computed = profile?.computed || {};
  const env = computed?.env || {};
  const axes = computed?.axes || {};

  const envSensitivity = safeNum(env?.sensitivity) ?? 0; // 0..3
  const recoveryScore = safeNum(axes?.recovery_score);   // -1..+1

  const sub = Array.isArray(profile?.sub_labels)
    ? profile.sub_labels
    : Array.isArray(computed?.sub_labels)
      ? computed.sub_labels
      : [];
  const weakCount = sub?.length || 0;

  let v = 0;

  // 環境感受性
  if (envSensitivity >= 3) v += 2;
  else if (envSensitivity >= 2) v += 1;

  // 立て直し力
  if (recoveryScore != null && recoveryScore < 0) v += 1;

  // 複合弱点
  if (weakCount >= 2) v += 1;

  return clamp(v, 0, 2);
}

function ampFromVulnerability(v) {
  // Phase1: 暴れない倍率
  return 1.0 + 0.25 * clamp(v ?? 0, 0, 2);
}

/** -----------------------------
 * 2) 主訴×トリガー 初期重み（0.7..1.3）
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
 * 3) 体質×トリガー 補正（最大でも +0.15 程度）
 * ------------------------------ */
function constitutionAdjust(profile) {
  const core = profile?.core_code ?? profile?.computed?.core_code ?? "";
  const sub = Array.isArray(profile?.sub_labels)
    ? profile.sub_labels
    : Array.isArray(profile?.computed?.sub_labels)
      ? profile.computed.sub_labels
      : [];

  const add = { pressure: 0, temp: 0, humidity: 0 };

  // sub_labels補正
  if (sub.includes("fluid_damp")) add.humidity += 0.15;
  if (sub.includes("fluid_deficiency")) add.humidity += 0.15;

  if (sub.includes("qi_stagnation")) add.pressure += 0.10;
  if (sub.includes("qi_deficiency")) add.pressure += 0.10;

  if (sub.includes("blood_stasis")) { add.pressure += 0.10; add.temp += 0.05; }
  if (sub.includes("blood_deficiency")) add.temp += 0.10;

  // core_code補正（今の8タイプ互換：cold/heat/mixedだけ薄く）
  if (typeof core === "string") {
    if (core.startsWith("cold_")) add.temp += 0.10;
    if (core.startsWith("heat_")) add.temp += 0.10;
    if (core.startsWith("mixed_")) { add.pressure += 0.05; add.temp += 0.05; }
  }

  return add;
}

/** 個人感受性ベクトル S_user を確定 */
export function buildUserSensitivity(profile) {
  const symptom_focus = profile?.symptom_focus || "fatigue";
  const wFocus = focusWeights(symptom_focus);
  const wAdd = constitutionAdjust(profile);

  let Wp = wFocus.pressure + wAdd.pressure;
  let Wt = wFocus.temp + wAdd.temp;
  let Wh = wFocus.humidity + wAdd.humidity;

  // 上限clamp（暴れ防止）
  Wp = clamp(Wp, 0.7, 1.6);
  Wt = clamp(Wt, 0.7, 1.6);
  Wh = clamp(Wh, 0.7, 1.6);

  // vulnerability → amp
  const v = computeVulnerability(profile);
  const amp = ampFromVulnerability(v);

  return {
    symptom_focus,
    weights: { pressure: Wp, temp: Wt, humidity: Wh },
    vulnerability: v,
    amp,
  };
}

/** -----------------------------
 * 4) Interaction（最小3つ）
 * ------------------------------ */
function computeInteractions({ profile, symptom_focus, parts, deltas, pressureArr, idx }) {
  const dp = safeNum(deltas?.dp);
  const dt = safeNum(deltas?.dt);

  let bonus = 0;
  const hits = [];

  // I1) 低気圧低下 × 高湿（むくみ/めまい系）
  if ((dp != null && dp < 0) && (parts?.p ?? 0) >= 2 && (parts?.h ?? 0) >= 2) {
    const b = (symptom_focus === "swelling" || symptom_focus === "dizziness") ? 0.8 : 0.6;
    bonus += b;
    hits.push({ key: "lowP_x_highH", label: "低気圧×高湿", bonus: b });
  }

  // I2) 気温急低下 × 低気圧（冷えで崩れる）
  if ((dt != null && dt < 0) && (parts?.t ?? 0) >= 2 && (parts?.p ?? 0) >= 1) {
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
  if (r <= 1.2) return 0;   // 安定
  if (r <= 3.0) return 1;   // 注意
  return 2;                 // 要警戒
}

/** 方向（上昇/下降）を返す：物理単位は出さず、符号だけ使う */
function dirByDelta(delta) {
  const x = safeNum(delta);
  if (x == null) return "none";
  if (x > 0) return "up";
  if (x < 0) return "down";
  return "none";
}

function buildHint({ level3, main_trigger, main_trigger_dir, symptom_focus, confidence }) {
  if (level3 <= 0) return null;
  const trig = triggerLabelJa(main_trigger) + triggerDirJa(main_trigger, main_trigger_dir);
  const focus = symptomFocusJa(symptom_focus);
  const confTxt = confidence === "low" ? "（精度低め）" : "";
  if (level3 === 2) return `${focus}が動きやすい時間。主因は「${trig}」。詰めすぎ注意${confTxt}`;
  return `${focus}が出やすいなら、ここは「${trig}」前提で余裕を持って${confTxt}`;
}

/** 今日のタイムライン（今日0-23時の全時間） */
export function computeRiskTimelineToday({ hourly, dateStrJST, profile, confidence }) {
  const pressure = hourly?.pressure_msl || [];
  const temp = hourly?.temperature_2m || [];
  const humidity = hourly?.relative_humidity_2m || [];
  const times = hourly?.time || [];

  const { startIdx, endIdx } = getTodayRangeIdx(hourly, dateStrJST);
  if (startIdx == null || endIdx == null || endIdx < startIdx) {
    return { items: [], meta: { startIdx, endIdx } };
  }

  const S = buildUserSensitivity(profile);

  const items = [];
  for (let i = startIdx; i <= endIdx; i++) {
    // 3h差分（不足時は1h）
    const back = i >= 3 ? 3 : i >= 1 ? 1 : 0;

    const dP = back ? signedDelta(pressure, i, back) : null;
    const dT = back ? signedDelta(temp, i, back) : null;
    const dH = back ? signedDelta(humidity, i, back) : null;

    const ext = computeExternalChangeScore({
      dP3hAbs: dP == null ? null : Math.abs(dP),
      dT3hAbs: dT == null ? null : Math.abs(dT),
      dH3hAbs: dH == null ? null : Math.abs(dH),
    });

    // 個人寄与（主語はS_user）
    const Ep = S.weights.pressure * (ext.parts.p ?? 0);
    const Et = S.weights.temp * (ext.parts.t ?? 0);
    const Eh = S.weights.humidity * (ext.parts.h ?? 0);

    // 凪なら0固定
    let risk = 0;
    let interaction = { bonus: 0, hits: [] };

    if (ext.change_score > 0) {
      interaction = computeInteractions({
        profile,
        symptom_focus: S.symptom_focus,
        parts: ext.parts,
        deltas: { dp: dP, dt: dT, dh: dH },
        pressureArr: pressure,
        idx: i,
      });

      const base = Ep + Et + Eh;
      risk = S.amp * base + interaction.bonus;
    }

    // interaction を各要因へ割り当て（説明の個人化のため）
    let addP = 0, addT = 0, addH = 0;
    for (const ev of interaction.hits) {
      if (ev.key === "lowP_x_highH") { addP += ev.bonus * 0.5; addH += ev.bonus * 0.5; }
      if (ev.key === "dropT_x_moveP") { addT += ev.bonus * 0.6; addP += ev.bonus * 0.4; }
      if (ev.key === "double_drop") { addP += ev.bonus; }
    }

    const contrib = {
      pressure: Ep + addP,
      temp: Et + addT,
      humidity: Eh + addH,
    };

    const main_trigger =
      Object.entries(contrib).sort((a, b) => (b[1] - a[1]))[0]?.[0] || "pressure";

    // 方向は符号だけ（物理量は出さない）
    const main_trigger_dir = (() => {
      if (main_trigger === "pressure") return dirByDelta(dP);
      if (main_trigger === "temp") return dirByDelta(dT);
      if (main_trigger === "humidity") return dirByDelta(dH);
      return "none";
    })();

    const level3 = level3FromRisk(risk);

    items.push({
      time: times[i],
      risk: Number.isFinite(risk) ? Number(risk.toFixed(2)) : 0,
      level3,

      // 個人化の根拠
      contrib: {
        pressure: Number((contrib.pressure ?? 0).toFixed(2)),
        temp: Number((contrib.temp ?? 0).toFixed(2)),
        humidity: Number((contrib.humidity ?? 0).toFixed(2)),
      },
      main_trigger,
      main_trigger_dir,

      parts: ext.parts, // 0..3
      deltas: { dp: dP, dt: dT, dh: dH },
      events: interaction.hits,

      hint_text: buildHint({
        level3,
        main_trigger,
        main_trigger_dir,
        symptom_focus: S.symptom_focus,
        confidence,
      }),
    });
  }

  return {
    items,
    meta: { startIdx, endIdx, S },
  };
}

/** パーセンタイル */
function percentile(values, q) {
  const xs = (values || []).map(Number).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (xs.length === 0) return 0;
  const pos = clamp(q, 0, 1) * (xs.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return xs[lo];
  const t = pos - lo;
  return xs[lo] * (1 - t) + xs[hi] * t;
}

/** ピーク帯：p90以上の連続区間（帯として最も“濃い”ところ） */
export function peakBandFromTimeline(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return { start: null, end: null, startIdx: -1, endIdx: -1, threshold: 0 };
  }

  const risks = items.map((it) => safeNum(it?.risk) ?? 0);
  const p90 = percentile(risks, 0.90);

  const th = p90 > 0.5 ? p90 : 0;
  if (th <= 0) {
    return { start: null, end: null, startIdx: -1, endIdx: -1, threshold: th };
  }

  let best = null;
  let cur = null;

  // 評価：平均riskが高い帯を優先、同点なら長い帯
  const scoreBand = (band) => {
    const slice = items.slice(band.startIdx, band.endIdx + 1);
    const avg = slice.reduce((s, x) => s + (safeNum(x?.risk) ?? 0), 0) / Math.max(1, slice.length);
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
    threshold: th,
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

/** 今日まとめ：prob/intensity/ピーク帯/主因/信頼度 */
export function summarizeHeroFromTimeline({ items, profile, confidence }) {
  const risks = (items || []).map((x) => safeNum(x?.risk) ?? 0);
  const rMax = risks.length ? Math.max(...risks) : 0;
  const rP90 = percentile(risks, 0.90);

  const raw = 0.7 * rMax + 0.3 * rP90;

  const intensity = clamp(Math.round(raw * 0.9), 0, 10);
  const prob = clamp(sigmoid(0.9 * (raw - 3.5)), 0, 1);

  const band = peakBandFromTimeline(items);
  const peakRangeText = band?.start && band?.end ? fmtHourRange(band.start, band.end) : null;

  // 主因：ピーク帯での寄与合計（contrib）
  let sumP = 0, sumT = 0, sumH = 0;
  if (band.startIdx >= 0) {
    for (let i = band.startIdx; i <= band.endIdx; i++) {
      const c = items[i]?.contrib || {};
      sumP += safeNum(c.pressure) ?? 0;
      sumT += safeNum(c.temp) ?? 0;
      sumH += safeNum(c.humidity) ?? 0;
    }
  } else {
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

  // 方向：ピーク帯の中心時刻の符号を採用（帯の説明として一番自然）
  const main_trigger_dir = (() => {
    if (band.startIdx >= 0) {
      const mid = Math.floor((band.startIdx + band.endIdx) / 2);
      const d = items[mid]?.deltas || {};
      if (main_trigger === "pressure") return dirByDelta(d.dp);
      if (main_trigger === "temp") return dirByDelta(d.dt);
      if (main_trigger === "humidity") return dirByDelta(d.dh);
    }
    return "none";
  })();

  const focus = symptomFocusJa(profile?.symptom_focus || "fatigue");
  const one_liner =
    `今日 ${Math.round(prob * 100)}% / ${intensity}/10。` +
    (peakRangeText ? `ピーク ${peakRangeText}。` : "") +
    `主因は${triggerLabelJa(main_trigger)}${triggerDirJa(main_trigger, main_trigger_dir)}。`;

  return {
    prob,
    intensity,
    main_trigger,
    main_trigger_dir,
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
    raw: Number(raw.toFixed(3)),
    r_max: Number(rMax.toFixed(3)),
    r_p90: Number(rP90.toFixed(3)),
  };
}

/** 信頼度（low/mid/high） */
export function computeConfidenceLabel({ baselineDays, coverage, maxChangePart }) {
  let c = "low";
  if (baselineDays >= 2 && coverage >= 0.7) c = "mid";
  if (baselineDays >= 7 && coverage >= 0.85) c = "high";

  // 変化が大きい日は外れにくい（+1段）
  if (maxChangePart >= 2) {
    if (c === "low") c = "mid";
    else if (c === "mid") c = "high";
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

  // 暫定timeline（confidence計算用）
  const provisional = computeRiskTimelineToday({ hourly, dateStrJST, profile, confidence: "mid" });
  const maxPart = maxPartFromTimeline(provisional.items);
  const confidence = computeConfidenceLabel({ baselineDays, coverage, maxChangePart: maxPart });

  // confidence確定後に作り直し
  const timeline = computeRiskTimelineToday({ hourly, dateStrJST, profile, confidence });
  const hero = summarizeHeroFromTimeline({ items: timeline.items, profile, confidence });

  // 短い納得（方向まで言う）
  const S = timeline.meta?.S || buildUserSensitivity(profile);
  const why_short = (() => {
    const f = symptomFocusJa(S.symptom_focus);
    const trig = triggerLabelJa(hero.main_trigger) + triggerDirJa(hero.main_trigger, hero.main_trigger_dir);
    return `主訴「${f}」に対して、あなたの“刺さりやすさ”（重み）× 今日の変化量で時間帯リスクを作っています。ピークの主因は「${trig}」。`;
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
