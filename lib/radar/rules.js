function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function sixinScores({ temp, humidity, wind, d_pressure_24h }) {
  let score_wind =
    wind >= 8 ? 3 : wind >= 5 ? 2 : wind >= 3 ? 1 : 0;

  const score_cold =
    temp <= 5 ? 3 : temp <= 10 ? 2 : temp <= 15 ? 1 : 0;

  const score_heat =
    temp >= 32 ? 3 : temp >= 28 ? 2 : temp >= 24 ? 1 : 0;

  const score_damp =
    humidity >= 90 ? 3 : humidity >= 80 ? 2 : humidity >= 70 ? 1 : 0;

  const score_dry =
    humidity <= 25 ? 3 : humidity <= 35 ? 2 : humidity <= 45 ? 1 : 0;

  // 気圧変化が大きい日は「風」要素を+1（変化量＝揺さぶり）
  if (Math.abs(d_pressure_24h || 0) >= 10) {
    score_wind = clamp(score_wind + 1, 0, 3);
  }

  return { score_wind, score_cold, score_heat, score_damp, score_dry };
}

export function topSixin(scores) {
  const entries = [
    ["wind", scores.score_wind],
    ["cold", scores.score_cold],
    ["heat", scores.score_heat],
    ["damp", scores.score_damp],
    ["dry", scores.score_dry],
  ]
    .sort((a, b) => b[1] - a[1]);

  const top = entries.filter((x) => x[1] > 0).slice(0, 2).map((x) => x[0]);
  return top;
}

/**
 * flowTypeで軽く補正（あなたの本診断に差し替えてもOKな形）
 */
export function applyFlowBonus(scores, flowType) {
  const s = { ...scores };

  if (!flowType) return s;

  // 例：水滞 => 湿が強い
  if (String(flowType).includes("水")) s.score_damp = clamp(s.score_damp + 1, 0, 3);
  // 例：気滞 => 変化に弱い
  if (String(flowType).includes("気")) s.score_wind = clamp(s.score_wind + 1, 0, 3);
  // 例：瘀血 => 冷え/滞りに寄せる
  if (String(flowType).includes("瘀") || String(flowType).includes("血"))
    s.score_cold = clamp(s.score_cold + 1, 0, 3);

  return s;
}

/**
 * レーダーレベル：0=安定 1=注意 2=警戒 3=要対策
 */
export function radarLevel({ scores, condition_am }) {
  const t = topSixin(scores);
  const sumTop = t.reduce((acc, k) => {
    const map = {
      wind: scores.score_wind,
      cold: scores.score_cold,
      heat: scores.score_heat,
      damp: scores.score_damp,
      dry: scores.score_dry,
    };
    return acc + (map[k] || 0);
  }, 0);

  const amBonus = condition_am === 2 ? 1 : 0; // 朝から不調なら+1
  const base = sumTop + amBonus;

  if (base <= 1) return 0;
  if (base <= 3) return 1;
  if (base <= 5) return 2;
  return 3;
}

export function reasonText({ level, top_sixin, d_pressure_24h, temp, humidity }) {
  const levelLabel = ["安定", "注意", "警戒", "要対策"][level] || "—";
  const sixLabel = (top_sixin || [])
    .map((x) => ({ wind: "風", cold: "寒", heat: "暑", damp: "湿", dry: "燥" }[x] || x))
    .join("＋");

  const dp = typeof d_pressure_24h === "number" ? `${d_pressure_24h.toFixed(1)}hPa` : "—";
  const t = typeof temp === "number" ? `${temp.toFixed(1)}℃` : "—";
  const h = typeof humidity === "number" ? `${humidity.toFixed(0)}%` : "—";

  return `今日：${levelLabel}（${sixLabel || "外因小さめ"}）｜気圧差(24h)：${dp}｜気温：${t}｜湿度：${h}`;
}
