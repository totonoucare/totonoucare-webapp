export const RECORD_CONDITION_OPTIONS = [
  { value: 2, label: "よかった", symbol: "○" },
  { value: 1, label: "少しつらかった", symbol: "△" },
  { value: 0, label: "つらかった", symbol: "×" },
];

export const RECORD_CARE_OPTIONS = [
  { value: 2, label: "した" },
  { value: 1, label: "少しした" },
  { value: 0, label: "していない" },
];

export const RECORD_DOMAIN_OPTIONS = [
  { value: "live", label: "暮らす", short: "暮", color: "#66B9A3" },
  { value: "eat", label: "食べる", short: "食", color: "#E2AE45" },
  { value: "loosen", label: "ほぐす", short: "ほ", color: "#A78BB3" },
];

export const RECORD_TIMING_OPTIONS = [
  { value: "before_peak", label: "注意時間の前" },
  { value: "after_symptom", label: "つらくなってから" },
  { value: "unknown", label: "時間は覚えていない" },
];

export const RECORD_FACTOR_OPTIONS = [
  { value: "sleep_short", label: "寝不足" },
  { value: "busy", label: "忙しかった" },
  { value: "food_alcohol", label: "食事や飲酒" },
  { value: "mental_load", label: "気分の負担" },
  { value: "body_change", label: "生理・体調の変化" },
  { value: "other", label: "その他" },
  { value: "none", label: "特にない" },
];

export const PERIOD_OPTIONS = [
  { key: "7d", label: "1週間", days: 7 },
  { key: "30d", label: "1ヶ月", days: 30 },
  { key: "90d", label: "3ヶ月", days: 90 },
  { key: "180d", label: "6ヶ月", days: 180 },
  { key: "365d", label: "12ヶ月", days: 365 },
];

export const FORECAST_PATTERN_KEYS = [
  "attention_good",
  "attention_difficult",
  "stable_good",
  "stable_difficult",
];

const DOMAIN_VALUES = new Set(RECORD_DOMAIN_OPTIONS.map((item) => item.value));
const TIMING_VALUES = new Set(RECORD_TIMING_OPTIONS.map((item) => item.value));
const FACTOR_VALUES = new Set(RECORD_FACTOR_OPTIONS.map((item) => item.value));

export function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function addDaysYmd(ymd, delta) {
  const [year, month, day] = String(ymd || "").split("-").map(Number);
  if (!year || !month || !day) return "";
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + delta);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function getPeriodRange(endDate, periodKey) {
  const option = PERIOD_OPTIONS.find((item) => item.key === periodKey) || PERIOD_OPTIONS[1];
  return {
    key: option.key,
    days: option.days,
    start: addDaysYmd(endDate, -(option.days - 1)),
    end: endDate,
  };
}

export function conditionLabel(value) {
  return RECORD_CONDITION_OPTIONS.find((item) => Number(item.value) === Number(value))?.label || "未記録";
}

export function conditionSymbol(value) {
  return RECORD_CONDITION_OPTIONS.find((item) => Number(item.value) === Number(value))?.symbol || "";
}

export function careLabel(value) {
  return RECORD_CARE_OPTIONS.find((item) => Number(item.value) === Number(value))?.label || "未記録";
}

export function careTimingLabel(value) {
  return RECORD_TIMING_OPTIONS.find((item) => item.value === value)?.label || "";
}

export function factorLabel(value) {
  return RECORD_FACTOR_OPTIONS.find((item) => item.value === value)?.label || value || "";
}

export function domainLabel(value) {
  return RECORD_DOMAIN_OPTIONS.find((item) => item.value === value)?.label || value || "";
}

export function signalKey(signal) {
  if (Number(signal) >= 2) return "guard";
  if (Number(signal) === 1) return "care";
  return "stable";
}

export function signalLabel(signal) {
  if (Number(signal) >= 2) return "守り";
  if (Number(signal) === 1) return "いたわり";
  return "安定";
}

export function signalTone(signal) {
  if (signal == null) {
    return {
      surface: "bg-slate-100",
      text: "text-slate-400",
      ring: "ring-slate-200",
      hex: "#CBD5E1",
    };
  }
  if (Number(signal) >= 2) {
    return {
      surface: "bg-[#FFF0EC]",
      text: "text-[#B75C3E]",
      ring: "ring-[#F1C8BA]",
      hex: "#D77A5D",
    };
  }
  if (Number(signal) === 1) {
    return {
      surface: "bg-[#FFF8EC]",
      text: "text-[#A56C18]",
      ring: "ring-[#EED8B4]",
      hex: "#E2AE45",
    };
  }
  return {
    surface: "bg-[#EFF8F4]",
    text: "text-[#2F816E]",
    ring: "ring-[#CFE7DE]",
    hex: "#66B9A3",
  };
}

export function compatTriggerToExact(mainTrigger, triggerDir) {
  if (mainTrigger === "pressure" && triggerDir === "down") return "pressure_down";
  if (mainTrigger === "pressure" && triggerDir === "up") return "pressure_up";
  if (mainTrigger === "temp" && triggerDir === "down") return "cold";
  if (mainTrigger === "temp" && triggerDir === "up") return "heat";
  if (mainTrigger === "humidity" && triggerDir === "up") return "damp";
  if (mainTrigger === "humidity" && triggerDir === "down") return "dry";
  return null;
}

export function exactTriggerKey(forecast) {
  if (!forecast) return null;
  const snapshot = forecast?.computed?.forecast_snapshot || forecast?.forecast_snapshot || {};
  const factors =
    safeArray(forecast.trigger_factors).length
      ? forecast.trigger_factors
      : safeArray(snapshot.trigger_factors);
  return (
    forecast.personal_main_trigger_exact ||
    snapshot.personal_main_trigger_exact ||
    factors[0]?.exact ||
    factors[0]?.key ||
    compatTriggerToExact(forecast.main_trigger, forecast.trigger_dir)
  );
}

export function triggerLabelExact(value) {
  return {
    pressure_down: "気圧低下",
    pressure_up: "気圧上昇",
    cold: "冷え込み",
    heat: "暑さ",
    damp: "湿気",
    dry: "乾燥",
  }[value] || "天気変化";
}

export function forecastSeverity(forecast) {
  if (!forecast) return null;
  const signal = Number(forecast.signal);
  if ([0, 1, 2].includes(signal)) return signal;
  const score = Number(
    forecast.score_display_0_10 ??
    forecast.score_precise_0_10 ??
    forecast.score_0_10
  );
  if (!Number.isFinite(score)) return null;
  if (score >= 7) return 2;
  if (score >= 4) return 1;
  return 0;
}

export function actualSeverity(review) {
  if (!review || review.condition_level == null) return null;
  const condition = Number(review.condition_level);
  if (condition === 2) return 0;
  if (condition === 1) return 1;
  if (condition === 0) return 2;
  return null;
}

export function forecastPercent(forecast) {
  if (!forecast) return null;
  const score = Number(
    forecast.score_display_0_10 ??
    forecast.score_precise_0_10 ??
    forecast.score_0_10
  );
  if (Number.isFinite(score)) return Math.max(0, Math.min(100, score * 10));
  const severity = forecastSeverity(forecast);
  return severity == null ? null : [10, 50, 90][severity];
}

export function actualPercent(review) {
  const severity = actualSeverity(review);
  return severity == null ? null : [0, 50, 100][severity];
}

export function inferCareDomains(actionTags) {
  const tags = new Set(safeArray(actionTags));
  const values = [];
  if (tags.has("live") || tags.has("rest") || tags.has("warm") || tags.has("hydrate")) values.push("live");
  if (tags.has("eat") || tags.has("food")) values.push("eat");
  if (tags.has("loosen") || tags.has("tsubo")) values.push("loosen");
  return Array.from(new Set(values));
}

export function inferCareTiming(actionTags) {
  const tag = safeArray(actionTags).find((item) => String(item).startsWith("timing:"));
  return tag ? String(tag).slice("timing:".length) : "";
}

export function inferFactors(actionTags) {
  return safeArray(actionTags)
    .filter((item) => String(item).startsWith("factor:"))
    .map((item) => String(item).slice("factor:".length));
}

export function reviewCareDomains(review) {
  const structured = safeArray(review?.care_domains).filter((value) => DOMAIN_VALUES.has(value));
  return structured.length ? structured : inferCareDomains(review?.action_tags);
}

export function reviewCareTiming(review) {
  const structured = String(review?.care_timing || "");
  return TIMING_VALUES.has(structured) ? structured : inferCareTiming(review?.action_tags);
}

export function reviewFactors(review) {
  const structured = safeArray(review?.context_factors).filter((value) => FACTOR_VALUES.has(value));
  return structured.length ? structured : inferFactors(review?.action_tags);
}

export function buildActionTags({ domains = [], timing = "", factors = [], existing = [] }) {
  const preserved = safeArray(existing).filter((item) => {
    const value = String(item);
    return (
      !["live", "eat", "loosen", "food", "tsubo", "rest", "warm", "hydrate", "nothing"].includes(value) &&
      !value.startsWith("timing:") &&
      !value.startsWith("factor:")
    );
  });
  const safeDomains = safeArray(domains).filter((value) => DOMAIN_VALUES.has(value));
  const safeTiming = TIMING_VALUES.has(timing) ? timing : "";
  let safeFactors = safeArray(factors).filter((value) => FACTOR_VALUES.has(value));
  if (safeFactors.includes("none")) safeFactors = ["none"];
  const next = [...preserved, ...safeDomains];
  if (safeTiming) next.push(`timing:${safeTiming}`);
  safeFactors.forEach((factor) => next.push(`factor:${factor}`));
  return Array.from(new Set(next));
}

/**
 * Three-level comparison: forecast stable/care/guard (0/1/2) against
 * actual good/mild/hard (0/1/2). A missing forecast is never treated as stable.
 */
export function classifyRecord(row) {
  const review = row?.review;
  const forecast = row?.forecast;
  const actual = actualSeverity(review);
  const predicted = forecastSeverity(forecast);
  const careDone = Number(review?.prevent_level ?? 0) > 0;

  if (actual == null) {
    return { key: "unrecorded", comparison: "unrecorded", label: "未記録", mismatch: false, comparable: false, careDone };
  }
  if (predicted == null) {
    return { key: "no_forecast", comparison: "no_forecast", label: "予報なしの記録", mismatch: false, comparable: false, careDone };
  }

  const delta = actual - predicted;
  const comparison = delta === 0 ? "aligned" : delta < 0 ? "better" : "worse";
  const careKey = careDone ? "care" : "no_care";
  const label = comparison === "aligned"
    ? "予報と実感が近かった"
    : comparison === "better"
      ? "予報より穏やかだった"
      : "予報よりゆらいだ";

  return {
    key: `${comparison}_${careKey}`,
    comparison,
    label,
    mismatch: comparison !== "aligned",
    comparable: true,
    careDone,
    forecast_severity: predicted,
    actual_severity: actual,
    delta,
  };
}

export function forecastPatternKey(row) {
  const forecast = forecastSeverity(row?.forecast);
  const actual = actualSeverity(row?.review);
  if (forecast == null || actual == null) return null;
  const forecastGroup = forecast === 0 ? "stable" : "attention";
  const actualGroup = actual === 0 ? "good" : "difficult";
  return `${forecastGroup}_${actualGroup}`;
}

function countBy(values) {
  const counts = {};
  values.filter(Boolean).forEach((value) => {
    counts[value] = Number(counts[value] || 0) + 1;
  });
  return counts;
}

function topCounts(values, limit = 5) {
  return Object.entries(countBy(values))
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function normalizeRow(row) {
  return {
    ...row,
    classification: classifyRecord(row),
    care_domains: reviewCareDomains(row?.review),
    care_timing: reviewCareTiming(row?.review),
    factors: reviewFactors(row?.review),
    exact_trigger: exactTriggerKey(row?.forecast),
  };
}

function buildWeatherPatterns(rows) {
  const groups = new Map();
  rows.filter((row) => row.classification.comparable).forEach((row) => {
    const trigger = row.exact_trigger || "unknown";
    const signal = forecastSeverity(row.forecast);
    const key = `${trigger}:${signal}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        exact_trigger: trigger,
        trigger_label: triggerLabelExact(trigger),
        signal,
        signal_label: signalLabel(signal),
        days: 0,
        aligned_days: 0,
        better_days: 0,
        worse_days: 0,
        good_days: 0,
        difficult_days: 0,
        care_days: 0,
        no_care_days: 0,
        dates: [],
        domain_counts: {},
      });
    }
    const group = groups.get(key);
    group.days += 1;
    group.dates.push(row.date);
    if (row.classification.comparison === "aligned") group.aligned_days += 1;
    if (row.classification.comparison === "better") group.better_days += 1;
    if (row.classification.comparison === "worse") group.worse_days += 1;
    if (actualSeverity(row.review) === 0) group.good_days += 1;
    else group.difficult_days += 1;
    if (row.classification.careDone) group.care_days += 1;
    else group.no_care_days += 1;
    row.care_domains.forEach((domain) => {
      group.domain_counts[domain] = Number(group.domain_counts[domain] || 0) + 1;
    });
  });

  return Array.from(groups.values())
    .map((group) => ({ ...group, dates: group.dates.slice(-8) }))
    .sort((a, b) => b.days - a.days || b.difficult_days - a.difficult_days)
    .slice(0, 10);
}

function buildCarePatterns(rows) {
  const groups = new Map();
  rows.filter((row) => row.classification.comparable && row.classification.careDone).forEach((row) => {
    const domains = row.care_domains.length ? row.care_domains : ["unspecified"];
    domains.forEach((domain) => {
      const timing = row.care_timing || "unspecified";
      const trigger = row.exact_trigger || "unknown";
      const key = `${domain}:${timing}:${trigger}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          domain,
          domain_label: domain === "unspecified" ? "種類未記録" : domainLabel(domain),
          timing,
          timing_label: timing === "unspecified" ? "時間未記録" : careTimingLabel(timing),
          exact_trigger: trigger,
          trigger_label: triggerLabelExact(trigger),
          days: 0,
          good_days: 0,
          difficult_days: 0,
          better_days: 0,
          worse_days: 0,
          dates: [],
        });
      }
      const group = groups.get(key);
      group.days += 1;
      group.dates.push(row.date);
      if (actualSeverity(row.review) === 0) group.good_days += 1;
      else group.difficult_days += 1;
      if (row.classification.comparison === "better") group.better_days += 1;
      if (row.classification.comparison === "worse") group.worse_days += 1;
    });
  });
  return Array.from(groups.values())
    .map((group) => ({ ...group, dates: group.dates.slice(-8) }))
    .sort((a, b) => b.days - a.days || b.good_days - a.good_days)
    .slice(0, 12);
}

export function buildRecordsSummary(rows) {
  const normalizedRows = safeArray(rows).map(normalizeRow);
  const recordedRows = normalizedRows.filter((row) => actualSeverity(row.review) != null);
  const comparableRows = recordedRows.filter((row) => row.classification.comparable);
  const forecastRows = normalizedRows.filter((row) => forecastSeverity(row.forecast) != null);
  const difficultRows = recordedRows.filter((row) => actualSeverity(row.review) >= 1);
  const goodRows = recordedRows.filter((row) => actualSeverity(row.review) === 0);
  const careRows = recordedRows.filter((row) => row.classification.careDone);
  const noCareRows = recordedRows.filter((row) => !row.classification.careDone);
  const alignedRows = comparableRows.filter((row) => row.classification.comparison === "aligned");
  const betterRows = comparableRows.filter((row) => row.classification.comparison === "better");
  const worseRows = comparableRows.filter((row) => row.classification.comparison === "worse");
  const stableGoodRows = comparableRows.filter((row) => forecastPatternKey(row) === "stable_good");
  const stableDifficultRows = comparableRows.filter((row) => forecastPatternKey(row) === "stable_difficult");
  const attentionGoodRows = comparableRows.filter((row) => forecastPatternKey(row) === "attention_good");
  const attentionDifficultRows = comparableRows.filter((row) => forecastPatternKey(row) === "attention_difficult");

  const careGoodRows = careRows.filter((row) => actualSeverity(row.review) === 0);
  const careDifficultRows = careRows.filter((row) => actualSeverity(row.review) >= 1);
  const noCareDifficultRows = noCareRows.filter((row) => actualSeverity(row.review) >= 1);

  const forecastValues = forecastRows.map((row) => forecastPercent(row.forecast)).filter((value) => value != null);
  const actualValues = recordedRows.map((row) => actualPercent(row.review)).filter((value) => value != null);

  return {
    rows: normalizedRows,
    recorded_days: recordedRows.length,
    comparable_days: comparableRows.length,
    forecast_days: forecastRows.length,
    missing_forecast_record_days: recordedRows.length - comparableRows.length,
    good_days: goodRows.length,
    difficult_days: difficultRows.length,
    hard_days: recordedRows.filter((row) => actualSeverity(row.review) === 2).length,
    mild_difficult_days: recordedRows.filter((row) => actualSeverity(row.review) === 1).length,
    care_days: careRows.length,
    no_care_days: noCareRows.length,
    aligned_days: alignedRows.length,
    better_than_forecast_days: betterRows.length,
    worse_than_forecast_days: worseRows.length,
    stable_good_days: stableGoodRows.length,
    stable_difficult_days: stableDifficultRows.length,
    attention_good_days: attentionGoodRows.length,
    attention_difficult_days: attentionDifficultRows.length,
    care_good_days: careGoodRows.length,
    care_difficult_days: careDifficultRows.length,
    no_care_difficult_days: noCareDifficultRows.length,
    before_peak_care_days: careRows.filter((row) => row.care_timing === "before_peak").length,
    after_symptom_care_days: careRows.filter((row) => row.care_timing === "after_symptom").length,
    domain_counts: countBy(careRows.flatMap((row) => row.care_domains)),
    factor_counts: countBy(recordedRows.flatMap((row) => row.factors.filter((factor) => factor !== "none"))),
    top_difficult_triggers: topCounts(difficultRows.map((row) => row.exact_trigger), 3),
    average_forecast_percent: forecastValues.length
      ? Math.round(forecastValues.reduce((sum, value) => sum + value, 0) / forecastValues.length)
      : null,
    average_actual_percent: actualValues.length
      ? Math.round(actualValues.reduce((sum, value) => sum + value, 0) / actualValues.length)
      : null,
    weather_patterns: buildWeatherPatterns(normalizedRows),
    care_patterns: buildCarePatterns(normalizedRows),
  };
}

function startOfIsoWeek(ymd) {
  const [year, month, day] = String(ymd || "").split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  return addDaysYmd(ymd, delta);
}

function weeklyGroups(rows) {
  const map = new Map();
  safeArray(rows).forEach((row) => {
    const key = startOfIsoWeek(row.date);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  });
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, values]) => values);
}

export function buildChartPoints(rows, periodDays = 30) {
  const normalized = safeArray(rows).map(normalizeRow);
  const groups = periodDays > 45 ? weeklyGroups(normalized) : normalized.map((row) => [row]);

  return groups.map((group) => {
    const forecastValues = group.map((row) => forecastPercent(row.forecast)).filter((value) => value != null);
    const actualValues = group.map((row) => actualPercent(row.review)).filter((value) => value != null);
    const domains = Array.from(new Set(group.flatMap((row) => row.care_domains || [])));
    const dates = group.map((row) => row.date).filter(Boolean);
    const forecastModeCounts = [0, 1, 2].map((severity) =>
      group.filter((row) => forecastSeverity(row.forecast) === severity).length
    );
    const actualCounts = [0, 1, 2].map((severity) =>
      group.filter((row) => actualSeverity(row.review) === severity).length
    );
    const dominantForecastSeverity = forecastModeCounts.reduce((best, count, severity) => {
      if (!count) return best;
      if (best == null) return severity;
      return count >= forecastModeCounts[best] ? severity : best;
    }, null);
    const recordedRows = group.filter((row) => actualSeverity(row.review) != null);
    const careRows = recordedRows.filter((row) => row.classification.careDone);
    return {
      date: dates[0] || "",
      end_date: dates[dates.length - 1] || dates[0] || "",
      is_aggregate: group.length > 1,
      forecast: forecastValues.length
        ? Math.round(forecastValues.reduce((sum, value) => sum + value, 0) / forecastValues.length)
        : null,
      actual: actualValues.length
        ? Math.round(actualValues.reduce((sum, value) => sum + value, 0) / actualValues.length)
        : null,
      actual_severity: group.length === 1 ? actualSeverity(group[0].review) : null,
      actual_counts: {
        good: actualCounts[0],
        mild: actualCounts[1],
        hard: actualCounts[2],
      },
      forecast_severity: dominantForecastSeverity,
      forecast_mode_counts: {
        stable: forecastModeCounts[0],
        care: forecastModeCounts[1],
        guard: forecastModeCounts[2],
      },
      domains,
      recorded_count: actualValues.length,
      forecast_count: forecastValues.length,
      care_count: careRows.length,
      rows: group,
    };
  });
}

export function buildForecastPatternGroups(rows) {
  const groups = new Map(FORECAST_PATTERN_KEYS.map((key) => [key, {
    key,
    days: 0,
    care_days: 0,
    no_care_days: 0,
    forecast_mode_counts: { stable: 0, care: 0, guard: 0 },
    actual_counts: { good: 0, mild: 0, hard: 0 },
    points: [],
  }]));

  safeArray(rows).map(normalizeRow).forEach((row) => {
    const key = forecastPatternKey(row);
    if (!key || !groups.has(key)) return;
    const group = groups.get(key);
    const forecast = forecastSeverity(row.forecast);
    const actual = actualSeverity(row.review);
    const careDone = row.classification.careDone;
    group.days += 1;
    if (careDone) group.care_days += 1;
    else group.no_care_days += 1;
    if (forecast === 0) group.forecast_mode_counts.stable += 1;
    if (forecast === 1) group.forecast_mode_counts.care += 1;
    if (forecast === 2) group.forecast_mode_counts.guard += 1;
    if (actual === 0) group.actual_counts.good += 1;
    if (actual === 1) group.actual_counts.mild += 1;
    if (actual === 2) group.actual_counts.hard += 1;
    group.points.push({
      date: row.date,
      forecast_severity: forecast,
      actual_severity: actual,
      care_done: careDone,
      domains: row.care_domains,
      care_timing: row.care_timing,
      exact_trigger: row.exact_trigger,
    });
  });

  return FORECAST_PATTERN_KEYS.map((key) => groups.get(key));
}

export function deterministicAnalysis(summary) {
  const count = Number(summary?.recorded_days || 0);
  if (count === 0) {
    return {
      mood: "normal",
      headline: "記録が増えると、あなたの傾向が見えてきます",
      empathy: "まずは今日の体調をひとつ残すところからで大丈夫です。",
      observed: "まだ比較できる記録がありません。",
      hypotheses: "予報・実感・ケアを同じ日に残すと、次に似た天気が来た時の手がかりになります。",
      next_step: "今日の記録カードから、体調とケアの有無を残してみましょう。",
      question: "今日一日の体調はどうでしたか？",
      suggested_questions: ["どんな記録を残すと役立つ？", "予報と実感はどう比べるの？"],
      evidence: [],
    };
  }
  if (count < 3) {
    return {
      mood: "listening",
      headline: "小さな手がかりが集まり始めました",
      empathy: "記録してくれてありがとうございます。まだ断定せず、ゆっくり見ていきましょう。",
      observed: `${count}日分の記録があります。`,
      hypotheses: "同じような天気の日がもう少し増えると、予報とのズレやケアとの重なりを比べやすくなります。",
      next_step: "まずは3日分を目安に、無理のない範囲で続けてみてください。",
      question: "次に記録できそうなのは、体調とケアのどちらですか？",
      suggested_questions: ["今の記録だけで分かることは？", "次に何を記録するといい？"],
      evidence: [`記録 ${count}日`],
    };
  }

  const stableDifficult = Number(summary?.stable_difficult_days || 0);
  const attentionGood = Number(summary?.attention_good_days || 0);
  const attentionDifficult = Number(summary?.attention_difficult_days || 0);
  const careDifficult = Number(summary?.care_difficult_days || 0);
  const noCareDifficult = Number(summary?.no_care_difficult_days || 0);
  const topFactor = Object.entries(summary?.factor_counts || {}).sort((a, b) => b[1] - a[1])[0];

  if (stableDifficult >= 2) {
    return {
      mood: "thinking",
      headline: "安定予報でもつらかった日を整理できます",
      empathy: "安定予報の日につらさが出たことも、体調の土台を知る大切な記録です。",
      observed: `安定予報でつらさがあった日が${stableDifficult}日ありました。${topFactor ? `${factorLabel(topFactor[0])}の記録は${topFactor[1]}日です。` : ""}`.trim(),
      hypotheses: "睡眠、忙しさ、食事、気分の負担など、予報ロジックに入れていない条件が重なった可能性があります。",
      next_step: "その日に共通する生活条件を、一つずつ確認してみましょう。",
      question: "安定予報でもつらかった日に、思い当たる生活の変化はありましたか？",
      suggested_questions: ["安定予報でつらかった日を整理して", "生活状況で共通することは？", "次の安定日に何を試す？"],
      evidence: [`安定予報・つらさあり ${stableDifficult}日`],
    };
  }

  const repeatableCare = safeArray(summary?.care_patterns).find((item) => item.days >= 2 && item.good_days >= 2);
  if (attentionGood >= 2 || repeatableCare) {
    const attentionFocus = attentionGood >= 2;
    return {
      mood: "insight",
      headline: attentionFocus ? "注意予報でも穏やかに過ごせた日があります" : "同じケアで穏やかだった記録があります",
      empathy: attentionFocus ? "負担が出やすい条件でも穏やかに過ごせたのは、大切な記録です。" : "穏やかに過ごせた日のケアを残せたことは、大切な手がかりです。",
      observed: `${attentionFocus ? `いたわり・守り予報で穏やかだった日が${attentionGood}日あります。` : ""}${repeatableCare ? `${repeatableCare.trigger_label}の日に「${repeatableCare.domain_label}」を行った記録は${repeatableCare.days}日です。` : ""}`.trim(),
      hypotheses: "ケアが役立った可能性や、生活の土台が安定していた可能性があります。今の記録だけで効果とは断定できません。",
      next_step: "次に似た天気が来たら、同じケアとタイミングを再現して記録してみましょう。",
      question: "穏やかに過ごせた日に、ほかに共通していたことはありますか？",
      suggested_questions: ["穏やかだった日の共通点は？", "同じケアを次も試していい？", "ケアなしで平気だった日は？"],
      evidence: [attentionFocus ? `注意予報・穏やか ${attentionGood}日` : `${repeatableCare.trigger_label}・${repeatableCare.domain_label} ${repeatableCare.days}日`],
    };
  }

  if (careDifficult >= 2) {
    return {
      mood: "listening",
      headline: "ケアを試してもつらかった日を見直せます",
      empathy: "つらい中でもケアを試したんですね。思ったほど楽にならなかった日も、次の手がかりになります。",
      observed: `ケアをしたものの、少しつらい・つらかった日が${careDifficult}日あります。`,
      hypotheses: "種類だけでなく、始めた時間、やり方、量、最近のケア習慣や生活の負担が関係した可能性があります。",
      next_step: "次回はケアの種類とタイミングを一つに絞り、変化を比べてみましょう。",
      question: "注意時間の前にできた日と、つらくなってからの日で違いはありましたか？",
      suggested_questions: ["ケアの種類を見直したい", "タイミングで違いはある？", "最近の習慣も含めて整理して"],
      evidence: [`ケアあり・つらかった ${careDifficult}日`],
    };
  }

  if (noCareDifficult >= 1) {
    return {
      mood: "thinking",
      headline: "先回りケアを試す余地がありそうです",
      empathy: "つらかった日を記録できたこと自体が、次に備えるための一歩です。",
      observed: `ケアをしないでつらかった日が${noCareDifficult}日ありました。`,
      hypotheses: "似た天気ストレスの日には、注意時間より前に軽いケアを入れると比較材料になります。",
      next_step: "次は「暮らす・食べる・ほぐす」から一つだけ選び、先回りして記録してみましょう。",
      question: "次に試しやすいのは、暮らす・食べる・ほぐすのどれですか？",
      suggested_questions: ["次に試すケアを選びたい", "注意時間前に何をすればいい？"],
      evidence: [`ケアなし・つらかった ${noCareDifficult}日`],
    };
  }

  return {
    mood: "complete",
    headline: "予報と実感の流れが少しずつつながっています",
    empathy: "続けて記録できています。小さな変化を一緒に見つけていきましょう。",
    observed: `比較できる${summary?.comparable_days || 0}日のうち、穏やかな日は${summary?.good_days || 0}日、つらさがあった日は${summary?.difficult_days || 0}日でした。`,
    hypotheses: "今のところ大きな偏りは見えません。似た天気の日を重ねると、あなたらしい傾向がより分かりやすくなります。",
    next_step: "同じ条件が来た時に、ケアの有無とタイミングを残して比べてみましょう。",
    question: "この期間で、自分でも気になった日はありましたか？",
    suggested_questions: ["この期間の特徴をもう少し教えて", "次の1週間で意識することは？"],
    evidence: [`注意予報・つらさあり ${attentionDifficult}日`],
  };
}

export function trimRecordForAi(row) {
  const normalized = normalizeRow(row);
  return {
    date: row?.date || "",
    forecast: row?.forecast
      ? {
          signal: forecastSeverity(row.forecast),
          signal_label: signalLabel(forecastSeverity(row.forecast)),
          score_percent: forecastPercent(row.forecast),
          exact_trigger: normalized.exact_trigger,
          trigger_label: triggerLabelExact(normalized.exact_trigger),
          secondary_exact_trigger: row.forecast.personal_secondary_trigger_exact || null,
          secondary_trigger_label: row.forecast.personal_secondary_trigger_exact
            ? triggerLabelExact(row.forecast.personal_secondary_trigger_exact)
            : null,
          trigger_factors: safeArray(row.forecast.trigger_factors).slice(0, 2).map((item) => ({
            exact: item?.exact || item?.key || null,
            role: item?.role || null,
            effective_load: item?.effective_load ?? null,
            weather_strength: item?.weather_strength ?? null,
            affinity_weight: item?.affinity_weight ?? null,
            peak_start: item?.peak_start || item?.peakStart || null,
            peak_end: item?.peak_end || item?.peakEnd || null,
          })),
          peak_start: row.forecast.peak_start || null,
          peak_end: row.forecast.peak_end || null,
          why_short: String(row.forecast.why_short || "").slice(0, 180),
          reason_trace: row.forecast.reason_trace || null,
          logic_version: row.forecast.logic_version || null,
          snapshot_source: row.forecast.snapshot_source || row.forecast_source || null,
        }
      : null,
    review: row?.review
      ? {
          condition_level: Number(row.review.condition_level),
          condition_label: conditionLabel(row.review.condition_level),
          prevent_level: Number(row.review.prevent_level ?? 0),
          care_label: careLabel(row.review.prevent_level),
          care_domains: normalized.care_domains,
          care_timing: normalized.care_timing,
          factors: normalized.factors,
          note: String(row.review.note || "").slice(0, 220),
        }
      : null,
    reflection_pattern: forecastPatternKey(row),
  };
}

function compactReasonChannels(value) {
  if (!value || typeof value !== "object") return null;
  const result = {};
  ["pressure_down", "pressure_up", "cold", "heat", "damp", "dry"].forEach((key) => {
    const number = Number(value[key]);
    if (Number.isFinite(number)) result[key] = Math.round(number * 1000) / 1000;
  });
  return Object.keys(result).length ? result : null;
}

function reasonTraceFromForecast(forecast) {
  const riskContext = forecast?.computed?.radar_plan_meta?.risk_context || {};
  const personalized = riskContext?.meta?.personalized_meta || {};
  const weatherMeta = riskContext?.meta?.weather_meta || {};
  if (!Object.keys(riskContext).length) return null;
  return {
    weather_strengths: compactReasonChannels(
      riskContext?.weather_context?.channel_strengths || personalized.weather_strengths
    ),
    personal_affinity_weights: compactReasonChannels(personalized.exact_affinity_weights),
    effective_channel_loads: compactReasonChannels(personalized.effective_channel_loads),
    battery_tier: personalized.battery_tier || null,
    battery_scalar: Number.isFinite(Number(personalized.battery_scalar)) ? Number(personalized.battery_scalar) : null,
    care_policies: safeArray(riskContext?.care_tone?.policies).slice(0, 3).map((item) => ({
      key: item?.key || null,
      label: item?.label || null,
      guide: item?.guide || null,
    })),
    weather_logic_version: weatherMeta.extraction_version || null,
    review_feedback_applied: Boolean(personalized?.review_feedback?.applied),
  };
}

export function snapshotFromForecast(forecast, source = "record_save") {
  if (!forecast) return null;
  const computedSnapshot = forecast?.computed?.forecast_snapshot || {};
  const triggerFactors = safeArray(
    forecast.trigger_factors || computedSnapshot.trigger_factors
  ).slice(0, 4);
  return {
    version: 2,
    snapshot_source: source,
    captured_at: new Date().toISOString(),
    forecast_id: forecast.id || null,
    target_date: forecast.target_date || null,
    score_0_10: forecast.score_0_10 ?? null,
    score_precise_0_10:
      forecast.score_precise_0_10 ??
      computedSnapshot.score_precise_0_10 ??
      computedSnapshot.score_display_0_10 ??
      null,
    signal: forecast.signal ?? null,
    main_trigger: forecast.main_trigger || null,
    trigger_dir: forecast.trigger_dir || null,
    personal_main_trigger_exact:
      forecast.personal_main_trigger_exact ||
      computedSnapshot.personal_main_trigger_exact ||
      triggerFactors[0]?.exact ||
      triggerFactors[0]?.key ||
      compatTriggerToExact(forecast.main_trigger, forecast.trigger_dir),
    personal_secondary_trigger_exact:
      forecast.personal_secondary_trigger_exact ||
      computedSnapshot.personal_secondary_trigger_exact ||
      triggerFactors[1]?.exact ||
      triggerFactors[1]?.key ||
      null,
    trigger_factors: triggerFactors,
    peak_start: forecast.peak_start || computedSnapshot.peak_start || null,
    peak_end: forecast.peak_end || computedSnapshot.peak_end || null,
    why_short: String(forecast.why_short || computedSnapshot.why_short || "").slice(0, 500),
    reason_trace: forecast.reason_trace || computedSnapshot.reason_trace || reasonTraceFromForecast(forecast),
    logic_version: forecast.logic_version || computedSnapshot.logic_version || {
      forecast_context: "radar_v1_personalized_weather",
      weather: forecast?.computed?.radar_plan_meta?.risk_context?.meta?.weather_meta?.extraction_version || null,
    },
    forecast_updated_at: forecast.updated_at || forecast.created_at || null,
  };
}
