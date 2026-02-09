// lib/radar/risk.js
// 未病レーダー v2 決定版（3段階）
// - 入力: constitution_profiles.computed（scoring.jsの出力） + daily_external_factors相当の六淫スコア
// - 出力: risk(0..16目安) + level3(0..2) + chips 等

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function abs(n) {
  const x = Number(n);
  return Number.isFinite(x) ? Math.abs(x) : 0;
}

// -------------------------
// 1) Exposure（外因） 0..6
// -------------------------
export function computeExposure(scores = {}) {
  const change = clamp(Number(scores.score_wind ?? 0), 0, 3); // 変化ストレス
  const state = clamp(
    Math.max(
      Number(scores.score_cold ?? 0),
      Number(scores.score_heat ?? 0),
      Number(scores.score_damp ?? 0),
      Number(scores.score_dry ?? 0)
    ),
    0,
    3
  );
  return { exposure: change + state, change, state };
}

// ---------------------------------
// 2) Vulnerability（内因） 0..6
// ---------------------------------
function recoveryPenalty(recovery_score) {
  const r = Number(recovery_score);
  if (!Number.isFinite(r)) return 1;
  if (r >= 0.2) return 0;
  if (r <= -0.2) return 2;
  return 1;
}

function imbalancePenalty(def_ex_score) {
  const d = abs(def_ex_score);
  if (d < 0.25) return 0;
  if (d < 0.55) return 1;
  return 2;
}

function materialPenalty(sub_labels) {
  const n = Array.isArray(sub_labels) ? sub_labels.length : 0;
  if (n <= 0) return 0;
  if (n === 1) return 1;
  return 2;
}

export function computeVulnerability(computed = {}) {
  const axes = computed.axes || {};
  const sub_labels = computed.sub_labels || [];

  const rp = recoveryPenalty(axes.recovery_score);
  const ip = imbalancePenalty(axes.def_ex_score);
  const mp = materialPenalty(sub_labels);

  const vulnerability = rp + ip + mp; // 0..6
  return { vulnerability, recoveryPenalty: rp, imbalancePenalty: ip, materialPenalty: mp };
}

// ------------------------------
// 3) Match（一致補正） 0..4
// ------------------------------
function mapTopSixinToEnvKeys(top_sixin = []) {
  // top_sixin: ['wind','cold','damp'...]
  // env_vectors（新キー）: pressure_shift/temp_swing/humidity_up/dryness_up/wind_strong
  const keys = new Set();

  for (const k of top_sixin) {
    if (k === "wind") {
      keys.add("pressure_shift");
      keys.add("wind_strong");
      keys.add("temp_swing"); // ゆらぎ全般に反応する人も拾う
    }
    if (k === "cold" || k === "heat") keys.add("temp_swing");
    if (k === "damp") keys.add("humidity_up");
    if (k === "dry") keys.add("dryness_up");
  }
  return keys;
}

function envMatchScore(env = {}, top_sixin = []) {
  const sens = clamp(Number(env?.sensitivity ?? 0), 0, 3);
  const vecs = Array.isArray(env?.vectors) ? env.vectors : [];

  if (sens === 0) return 0;
  if (vecs.length === 0) return 0;

  const allowed = mapTopSixinToEnvKeys(top_sixin);
  const hitCount = vecs.filter((v) => allowed.has(v)).length;

  if (hitCount <= 0) return 0;

  // sens=1 => max1, sens>=2 => max2
  const cap = sens === 1 ? 1 : 2;

  // hitが2つ以上なら2点（cap内）
  return clamp(hitCount >= 2 ? 2 : 1, 0, cap);
}

function bodyMatchScore(computed = {}, scores = {}, top_sixin = []) {
  const axes = computed.axes || {};
  const sub = Array.isArray(computed.sub_labels) ? computed.sub_labels : [];
  const yy = axes.yin_yang_label_internal; // cold/heat/neutral/mixed

  let s = 0;

  // 陰陽寄り × 状態邪
  const stateMax = {
    cold: Number(scores.score_cold ?? 0),
    heat: Number(scores.score_heat ?? 0),
    damp: Number(scores.score_damp ?? 0),
    dry: Number(scores.score_dry ?? 0),
  };

  if (yy === "cold" && stateMax.cold >= 2) s += 1;
  if (yy === "heat" && stateMax.heat >= 2) s += 1;

  // 水分系 sub_labels と湿燥の一致
  if (sub.includes("fluid_damp") && stateMax.damp >= 2) s += 1;
  if (sub.includes("fluid_deficiency") && stateMax.dry >= 2) s += 1;

  // 取りすぎると全部2点になりやすいので上限2
  return clamp(s, 0, 2);
}

export function computeMatch({ computed, scores, top_sixin }) {
  const env = computed?.env || {};
  const envMatch = envMatchScore(env, top_sixin);
  const bodyMatch = bodyMatchScore(computed, scores, top_sixin);
  const match = envMatch + bodyMatch; // 0..4
  return { match, envMatch, bodyMatch };
}

// -------------------------
// 4) Risk => Level3（0..2）
// -------------------------
export function computeRisk({ computed, scores, top_sixin }) {
  const ex = computeExposure(scores);
  const vu = computeVulnerability(computed);
  const ma = computeMatch({ computed, scores, top_sixin });

  const risk = ex.exposure + vu.vulnerability + ma.match;

  // 3段階の閾値（決定版）
  let level3 = 0; // 安定
  if (risk >= 10) level3 = 2; // 要警戒
  else if (risk >= 6) level3 = 1; // 注意

  // 根拠チップ（UI用）
  const chips = [];
  // 外因
  if ((scores?.score_wind ?? 0) >= 2) chips.push("ゆらぎ大");
  if ((scores?.score_cold ?? 0) >= 2) chips.push("冷え強め");
  if ((scores?.score_heat ?? 0) >= 2) chips.push("暑さ強め");
  if ((scores?.score_damp ?? 0) >= 2) chips.push("湿気強め");
  if ((scores?.score_dry ?? 0) >= 2) chips.push("乾燥強め");

  // 内因
  if (vu.recoveryPenalty >= 2) chips.push("引きずり注意");
  if (vu.imbalancePenalty >= 2) chips.push("偏り強め");
  if (vu.materialPenalty >= 2) chips.push("弱点複数");

  // 一致
  if (ma.envMatch >= 1) chips.push("体感トリガー一致");
  if (ma.bodyMatch >= 1) chips.push("体質と刺さり一致");

  return {
    risk,
    level3,
    chips,
    breakdown: { exposure: ex, vulnerability: vu, match: ma },
  };
}

// -------------------------------------------
// 5) 24hの注意時間帯（次の24hをスキャン）
// -------------------------------------------
export function computeTimeWindowsNext24h({
  computed,
  hourly, // { time:[], temperature_2m:[], relative_humidity_2m:[], pressure_msl:[] ... }
  nowIdx,
}) {
  const times = hourly?.time || [];
  if (!Array.isArray(times) || times.length === 0) return [];

  const get = (arr, i) => (Array.isArray(arr) ? Number(arr[i]) : NaN);

  const res = [];
  const start = Math.max(0, nowIdx);
  const end = Math.min(times.length - 1, start + 24); // 次の24h

  for (let i = start; i <= end; i++) {
    const temp = get(hourly.temperature_2m, i);
    const humidity = get(hourly.relative_humidity_2m, i);
    const pressure = get(hourly.pressure_msl, i);

    // 「変化量」は “24h前” が必須ではない。時間帯判定は「直近の変化」が重要。
    // ここでは 3時間前との差を “ゆらぎ” の材料にする（短期の荒れを拾う）
    const iPrev = Math.max(0, i - 3);
    const dP = Number.isFinite(pressure) && Number.isFinite(get(hourly.pressure_msl, iPrev)) ? pressure - get(hourly.pressure_msl, iPrev) : null;
    const dT = Number.isFinite(temp) && Number.isFinite(get(hourly.temperature_2m, iPrev)) ? temp - get(hourly.temperature_2m, iPrev) : null;
    const dH = Number.isFinite(humidity) && Number.isFinite(get(hourly.relative_humidity_2m, iPrev)) ? humidity - get(hourly.relative_humidity_2m, iPrev) : null;

    // dailyの rules.sixinScores をそのまま使えるように “d_*_24h” 名で渡す（中身は短期Δ）
    // ※この関数はAPI側で sixinScores を呼んで scores を作って渡してOK
    res.push({
      idx: i,
      time: times[i],
      temp: Number.isFinite(temp) ? temp : null,
      humidity: Number.isFinite(humidity) ? humidity : null,
      pressure: Number.isFinite(pressure) ? pressure : null,
      dP_3h: Number.isFinite(dP) ? dP : null,
      dT_3h: Number.isFinite(dT) ? dT : null,
      dH_3h: Number.isFinite(dH) ? dH : null,
    });
  }

  return res;
}
