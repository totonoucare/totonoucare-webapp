function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function scoreAbsDelta(value, thresholds) {
  // thresholds: [{ lt: number, score }, ... , { gte: number, score }]
  const x = Math.abs(Number(value ?? 0));
  for (const t of thresholds) {
    if (t.lt != null && x < t.lt) return t.score;
    if (t.gte != null && x >= t.gte) return t.score;
  }
  return 0;
}

function scoreWindYuragi({ d_pressure_24h, d_temp_24h, d_humidity_24h }) {
  // 0..3 に離散化（abs）
  const P = scoreAbsDelta(d_pressure_24h, [
    { lt: 2, score: 0 },
    { lt: 5, score: 1 },
    { lt: 10, score: 2 },
    { gte: 10, score: 3 },
  ]);

  const T = scoreAbsDelta(d_temp_24h, [
    { lt: 3, score: 0 },
    { lt: 6, score: 1 },
    { lt: 10, score: 2 },
    { gte: 10, score: 3 },
  ]);

  const H = scoreAbsDelta(d_humidity_24h, [
    { lt: 10, score: 0 },
    { lt: 20, score: 1 },
    { lt: 30, score: 2 },
    { gte: 30, score: 3 },
  ]);

  // 風＝ゆらぎ：重み付き合成（0..3）
  const raw = 0.5 * P + 0.3 * T + 0.2 * H;
  return clamp(Math.round(raw), 0, 3);
}

function scoreCold({ temp, d_temp_24h }) {
  let s = 0;

  // 絶対値：寒いほど強い
  if (Number.isFinite(temp)) {
    if (temp < 5) s += 2;
    else if (temp < 10) s += 1;
  }

  // 変化：急に冷えた（マイナス方向のみ）
  if (Number.isFinite(d_temp_24h) && d_temp_24h <= -6) s += 1;

  return clamp(s, 0, 3);
}

function scoreHeat({ temp, d_temp_24h }) {
  let s = 0;

  if (Number.isFinite(temp)) {
    if (temp >= 30) s += 2;
    else if (temp >= 25) s += 1;
  }

  // 変化：急に暑くなった（プラス方向のみ）
  if (Number.isFinite(d_temp_24h) && d_temp_24h >= 6) s += 1;

  return clamp(s, 0, 3);
}

function scoreDamp({ humidity, d_humidity_24h }) {
  let s = 0;

  if (Number.isFinite(humidity)) {
    if (humidity >= 80) s += 2;
    else if (humidity >= 70) s += 1;
  }

  // 変化：急に湿ってきた（プラス方向のみ）
  if (Number.isFinite(d_humidity_24h) && d_humidity_24h >= 15) s += 1;

  return clamp(s, 0, 3);
}

function scoreDry({ humidity, d_humidity_24h }) {
  let s = 0;

  if (Number.isFinite(humidity)) {
    if (humidity < 35) s += 2;
    else if (humidity < 45) s += 1;
  }

  // 変化：急に乾燥した（マイナス方向のみ）
  if (Number.isFinite(d_humidity_24h) && d_humidity_24h <= -15) s += 1;

  return clamp(s, 0, 3);
}

/**
 * 六淫スコア（0..3）
 * - wind は「風速」ではなく「ゆらぎ（変化量Δの合成）」として扱う
 */
export function sixinScores({
  temp,
  humidity,
  d_pressure_24h,
  d_temp_24h,
  d_humidity_24h,
}) {
  const score_wind = scoreWindYuragi({ d_pressure_24h, d_temp_24h, d_humidity_24h });
  const score_cold = scoreCold({ temp, d_temp_24h });
  const score_heat = scoreHeat({ temp, d_temp_24h });
  const score_damp = scoreDamp({ humidity, d_humidity_24h });
  const score_dry = scoreDry({ humidity, d_humidity_24h });

  return { score_wind, score_cold, score_heat, score_damp, score_dry };
}

/**
 * top_sixin（最大2つ）
 * ルール：
 * - ゆらぎ（wind）が 2以上なら、1番目に wind を優先表示
 * - 2番目は cold/heat/damp/dry の最大（>0）
 * - wind が弱い（<2）場合は、cold/heat/damp/dry の上位2つ
 */
export function topSixin(scores) {
  const others = [
    ["cold", scores.score_cold],
    ["heat", scores.score_heat],
    ["damp", scores.score_damp],
    ["dry", scores.score_dry],
  ].sort((a, b) => b[1] - a[1]);

  const topOther = others.filter((x) => x[1] > 0).slice(0, 2).map((x) => x[0]);

  if ((scores.score_wind || 0) >= 2) {
    const second = topOther[0];
    return second ? ["wind", second] : ["wind"];
  }

  return topOther;
}

/**
 * flowTypeで軽く補正（あなたの本診断に差し替えてもOKな形）
 * - ここは “仮” のまま（本診断の flow/organ を厳密に接続するときに調整）
 */
export function applyFlowBonus(scores, flowType) {
  const s = { ...scores };
  if (!flowType) return s;

  if (String(flowType).includes("水")) s.score_damp = clamp(s.score_damp + 1, 0, 3);
  if (String(flowType).includes("気")) s.score_wind = clamp(s.score_wind + 1, 0, 3);
  if (String(flowType).includes("瘀") || String(flowType).includes("血")) s.score_cold = clamp(s.score_cold + 1, 0, 3);

  return s;
}

/**
 * レーダーレベル：0=安定 1=注意 2=警戒 3=要対策
 */
export function radarLevel({ scores, condition_am }) {
  const t = topSixin(scores);

  const map = {
    wind: scores.score_wind,
    cold: scores.score_cold,
    heat: scores.score_heat,
    damp: scores.score_damp,
    dry: scores.score_dry,
  };

  const sumTop = t.reduce((acc, k) => acc + (map[k] || 0), 0);
  const amBonus = condition_am === 2 ? 1 : 0; // 朝から不調なら+1
  const base = sumTop + amBonus;

  if (base <= 1) return 0;
  if (base <= 3) return 1;
  if (base <= 5) return 2;
  return 3;
}

export function reasonText({
  level,
  top_sixin,
  d_pressure_24h,
  d_temp_24h,
  d_humidity_24h,
  temp,
  humidity,
}) {
  const levelLabel = ["安定", "注意", "警戒", "要対策"][level] || "—";
  const labelMap = {
    wind: "ゆらぎ",
    cold: "冷え",
    heat: "暑さ",
    damp: "湿気",
    dry: "乾燥",
  };

  const sixLabel = (top_sixin || []).map((x) => labelMap[x] || x).join("＋");

  const dp = typeof d_pressure_24h === "number" ? `${d_pressure_24h.toFixed(1)}hPa` : "—";
  const dt = typeof d_temp_24h === "number" ? `${d_temp_24h.toFixed(1)}℃` : "—";
  const dh = typeof d_humidity_24h === "number" ? `${d_humidity_24h.toFixed(0)}%` : "—";

  const t = typeof temp === "number" ? `${temp.toFixed(1)}℃` : "—";
  const h = typeof humidity === "number" ? `${humidity.toFixed(0)}%` : "—";

  return `今日：${levelLabel}（${sixLabel || "天気の影響小さめ"}）｜変化(24h)：気圧${dp} / 気温${dt} / 湿度${dh}｜現在：気温${t} / 湿度${h}`;
}
