const CARE_ACTION_DOMAINS = new Set(["live", "eat", "loosen"]);
const CARE_ACTION_SOURCE_MODES = new Set(["today", "tomorrow"]);

function normalizeAnalysisCareAction(action) {
  if (!action || typeof action !== "object") return null;
  const domain = CARE_ACTION_DOMAINS.has(action.domain) ? action.domain : null;
  const sourceMode = CARE_ACTION_SOURCE_MODES.has(action.source_mode) ? action.source_mode : null;
  const snapshot = action.item_snapshot && typeof action.item_snapshot === "object" ? action.item_snapshot : {};
  const label = String(action.label || snapshot.label || "").trim().replace(/\s+/g, " ").slice(0, 160);
  if (!domain || !sourceMode || !label) return null;
  return {
    id: action.id || null,
    target_date: action.target_date || null,
    source_date: action.source_date || null,
    source_mode: sourceMode,
    domain,
    item_key: String(action.item_key || "").slice(0, 120),
    canonical_key: String(action.canonical_key || action.item_key || "").slice(0, 120),
    kind: String(action.kind || snapshot.kind || "").slice(0, 50),
    label,
    detail: String(action.detail || snapshot.detail || "").trim().replace(/\s+/g, " ").slice(0, 240),
    item_snapshot: snapshot,
    timing_relation: String(action.timing_relation || (sourceMode === "tomorrow" ? "previous_night" : "same_day_unknown")),
    entry_origin: String(snapshot?.meta?.entry_origin || action.entry_origin || "daily_care_card").slice(0, 40),
    checked_at: action.checked_at || null,
    updated_at: action.updated_at || action.checked_at || null,
  };
}

function summarizeCareActions(actions) {
  const normalizedInput = (Array.isArray(actions) ? actions : []).map(normalizeAnalysisCareAction).filter(Boolean);
  const byIdentity = new Map();
  normalizedInput.forEach((item) => {
    const key = `${item.target_date || ""}:${item.source_mode}:${item.canonical_key || item.item_key}`;
    const previous = byIdentity.get(key);
    const previousStamp = String(previous?.updated_at || previous?.checked_at || "");
    const currentStamp = String(item.updated_at || item.checked_at || "");
    if (!previous || currentStamp >= previousStamp) byIdentity.set(key, item);
  });
  const normalized = Array.from(byIdentity.values());
  const previousNight = normalized.filter((item) => item.source_mode === "tomorrow");
  const sameDay = normalized.filter((item) => item.source_mode === "today");
  return {
    actions: normalized,
    count: normalized.length,
    domains: Array.from(new Set(normalized.map((item) => item.domain))),
    previous_night_count: previousNight.length,
    same_day_count: sameDay.length,
    has_previous_night: previousNight.length > 0,
    has_same_day: sameDay.length > 0,
    labels: normalized.map((item) => item.label),
  };
}

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
  { value: "mixed", label: "前後どちらも" },
  { value: "unknown", label: "前後は覚えていない" },
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
  if (mainTrigger === "temp" && triggerDir === "change") return "temp_shift";
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
    pressure_shift: "気圧変化",
    pressure_down: "気圧低下",
    pressure_up: "気圧上昇",
    temperature_shift: "気温変化",
    temp_shift: "気温変化",
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
  const careDone = Number(review?.prevent_level ?? 0) > 0 || safeArray(row?.care_actions).length > 0;

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

function actionTimingToReviewTiming(actionSummary) {
  if (!actionSummary?.count) return "";
  const relations = new Set(actionSummary.actions.map((item) => item.timing_relation));
  const hasPrevious = relations.has("previous_night");
  const hasBefore = relations.has("same_day_before") || hasPrevious;
  const hasAfter = relations.has("same_day_after");
  if (relations.has("same_day_unknown")) return "unknown";
  if (relations.has("same_day_mixed") || (hasBefore && hasAfter)) return "mixed";
  if (hasAfter) return "after_symptom";
  if (hasBefore) return "before_peak";
  return "unknown";
}

function careTimingFlags(row) {
  const actions = safeArray(row?.care_actions);
  const relations = new Set(actions.map((item) => item?.timing_relation).filter(Boolean));
  const hasPreviousNight = actions.some((item) => item?.source_mode === "tomorrow") || relations.has("previous_night");
  const aggregate = String(row?.care_timing || "");
  const hasBefore = hasPreviousNight
    || relations.has("same_day_before")
    || relations.has("same_day_mixed")
    || aggregate === "before_peak"
    || aggregate === "mixed";
  const hasAfter = relations.has("same_day_after")
    || relations.has("same_day_mixed")
    || aggregate === "after_symptom"
    || aggregate === "mixed";
  const hasUnknown = relations.has("same_day_unknown") || aggregate === "unknown" || (!hasBefore && !hasAfter);
  return {
    before_peak: hasBefore,
    after_symptom: hasAfter,
    mixed: (hasBefore && hasAfter) || relations.has("same_day_mixed") || aggregate === "mixed",
    unknown: hasUnknown,
    previous_night: hasPreviousNight,
    same_day: actions.some((item) => item?.source_mode === "today"),
  };
}

function normalizeRow(row) {
  const actionSummary = summarizeCareActions(row?.care_actions);
  const reviewDomains = reviewCareDomains(row?.review);
  const careDomains = Array.from(new Set([...reviewDomains, ...actionSummary.domains]));
  return {
    ...row,
    classification: classifyRecord(row),
    care_domains: careDomains,
    care_timing: reviewCareTiming(row?.review) || actionTimingToReviewTiming(actionSummary),
    care_actions: actionSummary.actions,
    care_action_summary: actionSummary,
    timing_flags: careTimingFlags({ ...row, care_actions: actionSummary.actions, care_timing: reviewCareTiming(row?.review) || actionTimingToReviewTiming(actionSummary) }),
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


function createActualCounts() {
  return { good: 0, mild: 0, hard: 0 };
}

function addActualCount(counts, severity) {
  if (severity === 0) counts.good += 1;
  if (severity === 1) counts.mild += 1;
  if (severity === 2) counts.hard += 1;
}

function forecastScoreBand(percent) {
  const value = Math.max(0, Math.min(100, Number(percent)));
  const min = Math.min(90, Math.floor(value / 10) * 10);
  const max = min >= 90 ? 100 : min + 9;
  return { min, max, label: `${min}〜${max}` };
}

function createTimingOutcomes() {
  return {
    before_peak: { days: 0, actual_counts: createActualCounts() },
    after_symptom: { days: 0, actual_counts: createActualCounts() },
    mixed: { days: 0, actual_counts: createActualCounts() },
    unknown: { days: 0, actual_counts: createActualCounts() },
  };
}

function addTimingOutcome(outcomes, timing, severity) {
  const key = ["before_peak", "after_symptom", "mixed", "unknown"].includes(timing) ? timing : "unknown";
  outcomes[key].days += 1;
  addActualCount(outcomes[key].actual_counts, severity);
}

function addTimingEvidence(outcomes, flags, severity) {
  if (flags?.before_peak) addTimingOutcome(outcomes, "before_peak", severity);
  if (flags?.after_symptom) addTimingOutcome(outcomes, "after_symptom", severity);
  if (flags?.mixed) addTimingOutcome(outcomes, "mixed", severity);
  if (flags?.unknown) addTimingOutcome(outcomes, "unknown", severity);
}

function comparisonEvidenceLevel(careDays, noCareDays) {
  if (!careDays || !noCareDays) return "one_sided";
  const smaller = Math.min(careDays, noCareDays);
  if (smaller >= 5) return "repeated_pattern";
  if (smaller >= 3) return "initial_pattern";
  return "small_clue";
}

function buildMatchedForecastComparisons(rows) {
  const groups = new Map();
  rows.filter((row) => row.classification.comparable).forEach((row) => {
    const score = forecastPercent(row.forecast);
    if (score == null) return;
    const trigger = row.exact_trigger || "unknown";
    const signal = forecastSeverity(row.forecast);
    const band = forecastScoreBand(score);
    const key = `${trigger}:${signal}:${band.min}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        exact_trigger: trigger,
        trigger_label: triggerLabelExact(trigger),
        signal,
        signal_label: signalLabel(signal),
        score_band: band,
        total_days: 0,
        care_days: 0,
        no_care_days: 0,
        care_actual_counts: createActualCounts(),
        no_care_actual_counts: createActualCounts(),
        before_peak_care_days: 0,
        after_symptom_care_days: 0,
        mixed_timing_care_days: 0,
        unknown_timing_care_days: 0,
        timing_outcomes: createTimingOutcomes(),
        domain_outcomes: {},
        dates: [],
      });
    }
    const group = groups.get(key);
    const severity = actualSeverity(row.review);
    const careDone = row.classification.careDone;
    group.total_days += 1;
    group.dates.push(row.date);
    if (careDone) {
      group.care_days += 1;
      addActualCount(group.care_actual_counts, severity);
      const timing = row.care_timing || "unknown";
      const timingFlags = row.timing_flags || careTimingFlags(row);
      if (timingFlags.before_peak) group.before_peak_care_days += 1;
      if (timingFlags.after_symptom) group.after_symptom_care_days += 1;
      if (timingFlags.mixed) group.mixed_timing_care_days += 1;
      if (timingFlags.unknown) group.unknown_timing_care_days += 1;
      addTimingEvidence(group.timing_outcomes, timingFlags, severity);
      const domains = row.care_domains.length ? row.care_domains : ["unspecified"];
      domains.forEach((domain) => {
        if (!group.domain_outcomes[domain]) {
          group.domain_outcomes[domain] = {
            domain,
            domain_label: domain === "unspecified" ? "種類未記録" : domainLabel(domain),
            days: 0,
            actual_counts: createActualCounts(),
            before_peak_days: 0,
            after_symptom_days: 0,
            mixed_timing_days: 0,
            unknown_timing_days: 0,
            timing_outcomes: createTimingOutcomes(),
          };
        }
        const outcome = group.domain_outcomes[domain];
        outcome.days += 1;
        addActualCount(outcome.actual_counts, severity);
        if (timingFlags.before_peak) outcome.before_peak_days += 1;
        if (timingFlags.after_symptom) outcome.after_symptom_days += 1;
        if (timingFlags.mixed) outcome.mixed_timing_days += 1;
        if (timingFlags.unknown) outcome.unknown_timing_days += 1;
        addTimingEvidence(outcome.timing_outcomes, timingFlags, severity);
      });
    } else {
      group.no_care_days += 1;
      addActualCount(group.no_care_actual_counts, severity);
    }
  });

  return Array.from(groups.values())
    .map((group) => {
      const evidenceLevel = comparisonEvidenceLevel(group.care_days, group.no_care_days);
      return {
        ...group,
        comparison_status: evidenceLevel === "one_sided"
          ? "one_sided"
          : evidenceLevel === "small_clue"
            ? "early_comparison"
            : "comparison_ready",
        evidence_level: evidenceLevel,
        evidence_label: {
          one_sided: "まだ比較できない",
          small_clue: "小さな手がかり",
          initial_pattern: "初期的な傾向",
          repeated_pattern: "繰り返し見られた傾向",
        }[evidenceLevel],
        domain_outcomes: Object.values(group.domain_outcomes)
          .sort((a, b) => b.days - a.days || b.actual_counts.good - a.actual_counts.good)
          .slice(0, 3),
        dates: group.dates.slice(-10),
      };
    })
    .sort((a, b) => {
      const rank = { repeated_pattern: 0, initial_pattern: 1, small_clue: 2, one_sided: 3 };
      return rank[a.evidence_level] - rank[b.evidence_level]
        || Math.min(b.care_days, b.no_care_days) - Math.min(a.care_days, a.no_care_days)
        || b.total_days - a.total_days;
    })
    .slice(0, 12);
}

function buildSpecificCarePatterns(rows) {
  const groups = new Map();
  rows.filter((row) => row.classification.comparable && row.care_actions.some((action) => action.entry_origin !== "record_page")).forEach((row) => {
    const score = forecastPercent(row.forecast);
    if (score == null) return;
    const trigger = row.exact_trigger || "unknown";
    const signal = forecastSeverity(row.forecast);
    const band = forecastScoreBand(score);
    const severity = actualSeverity(row.review);

    // 同じ具体的ケアを前夜と当日に行った場合も、実施日は1日として数えつつ
    // 前夜・当日前・当日後のタイミング情報はすべて保持する。
    const dailyCare = new Map();
    row.care_actions
      .filter((action) => action.entry_origin !== "record_page")
      .forEach((action) => {
      const identity = action.canonical_key || action.item_key || `${action.domain}:${action.label}`;
      if (!identity) return;
      if (!dailyCare.has(identity)) {
        dailyCare.set(identity, {
          identity,
          label: action.label,
          detail: action.detail || "",
          domain: action.domain,
          actions: [],
        });
      }
      dailyCare.get(identity).actions.push(action);
    });

    dailyCare.forEach((daily) => {
      const key = `${trigger}:${signal}:${band.min}:${daily.identity}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          item_key: daily.identity,
          label: daily.label,
          detail: daily.detail,
          domain: daily.domain,
          domain_label: domainLabel(daily.domain),
          exact_trigger: trigger,
          trigger_label: triggerLabelExact(trigger),
          signal,
          signal_label: signalLabel(signal),
          score_band: band,
          days: 0,
          actual_counts: createActualCounts(),
          previous_night_days: 0,
          same_day_days: 0,
          timing_outcomes: createTimingOutcomes(),
          dates: [],
        });
      }
      const group = groups.get(key);
      group.days += 1;
      addActualCount(group.actual_counts, severity);

      const timings = new Set();
      if (daily.actions.some((action) => action.source_mode === "tomorrow")) {
        group.previous_night_days += 1;
        timings.add("before_peak");
      }
      if (daily.actions.some((action) => action.source_mode === "today")) {
        group.same_day_days += 1;
      }
      daily.actions
        .filter((action) => action.source_mode === "today")
        .forEach((action) => {
          const timing = action.timing_relation === "same_day_before"
            ? "before_peak"
            : action.timing_relation === "same_day_after"
              ? "after_symptom"
              : action.timing_relation === "same_day_mixed"
                ? "mixed"
                : "unknown";
          timings.add(timing);
        });
      timings.forEach((timing) => addTimingOutcome(group.timing_outcomes, timing, severity));
      group.dates.push(row.date);
    });
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      evidence_level: group.days >= 5 ? "repeated_pattern" : group.days >= 3 ? "initial_pattern" : "small_clue",
      evidence_label: group.days >= 5 ? "繰り返し見られた傾向" : group.days >= 3 ? "初期的な傾向" : "小さな手がかり",
      dates: group.dates.slice(-10),
    }))
    .sort((a, b) => b.days - a.days || b.actual_counts.good - a.actual_counts.good)
    .slice(0, 20);
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
    before_peak_care_days: careRows.filter((row) => row.timing_flags.before_peak).length,
    after_symptom_care_days: careRows.filter((row) => row.timing_flags.after_symptom).length,
    mixed_timing_care_days: careRows.filter((row) => row.timing_flags.mixed).length,
    unknown_timing_care_days: careRows.filter((row) => row.timing_flags.unknown).length,
    previous_night_care_days: recordedRows.filter((row) => row.care_action_summary.has_previous_night).length,
    same_day_care_days: recordedRows.filter((row) => row.care_action_summary.has_same_day).length,
    concrete_care_days: recordedRows.filter((row) => row.care_action_summary.count > 0).length,
    concrete_care_action_count: recordedRows.reduce((sum, row) => sum + row.care_action_summary.count, 0),
    care_timing_outcomes: careRows.reduce((result, row) => {
      addTimingEvidence(result, row.timing_flags, actualSeverity(row.review));
      return result;
    }, createTimingOutcomes()),
    care_timing_outcomes_non_exclusive: true,
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
    matched_forecast_comparisons: buildMatchedForecastComparisons(normalizedRows),
    specific_care_patterns: buildSpecificCarePatterns(normalizedRows),
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
    const roundForecast = (value) => Math.round(Number(value) * 10) / 10;
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
    const triggerCounts = countBy(group.map((row) => row.exact_trigger));
    const dominantTrigger = Object.entries(triggerCounts)
      .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0]?.[0] || null;
    const patternCounts = Object.fromEntries(FORECAST_PATTERN_KEYS.map((key) => [key, 0]));
    group.forEach((row) => {
      const key = forecastPatternKey(row);
      if (key && key in patternCounts) patternCounts[key] += 1;
    });
    const timingCounts = countBy(careRows.map((row) => row.care_timing || 'unknown'));
    const dailyRow = group.length === 1 ? group[0] : null;

    return {
      date: dates[0] || "",
      end_date: dates[dates.length - 1] || dates[0] || "",
      is_aggregate: group.length > 1,
      forecast: forecastValues.length
        ? roundForecast(forecastValues.reduce((sum, value) => sum + value, 0) / forecastValues.length)
        : null,
      forecast_min: forecastValues.length ? roundForecast(Math.min(...forecastValues)) : null,
      forecast_max: forecastValues.length ? roundForecast(Math.max(...forecastValues)) : null,
      actual_severity: dailyRow ? actualSeverity(dailyRow.review) : null,
      actual_counts: {
        good: actualCounts[0],
        mild: actualCounts[1],
        hard: actualCounts[2],
      },
      forecast_severity: dailyRow ? forecastSeverity(dailyRow.forecast) : dominantForecastSeverity,
      forecast_mode_counts: {
        stable: forecastModeCounts[0],
        care: forecastModeCounts[1],
        guard: forecastModeCounts[2],
      },
      exact_trigger: dailyRow?.exact_trigger || dominantTrigger,
      trigger_label: triggerLabelExact(dailyRow?.exact_trigger || dominantTrigger),
      trigger_counts: triggerCounts,
      pattern_key: dailyRow ? forecastPatternKey(dailyRow) : null,
      pattern_counts: patternCounts,
      care_timing: dailyRow?.care_timing || "",
      care_timing_counts: timingCounts,
      domains,
      recorded_count: recordedRows.length,
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
      hypotheses: "同じ天気ストレスと近い体調ゆらぎ度の日がもう少し増えると、ケアの有無やタイミングと実感を比べやすくなります。",
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

  const repeatableSpecificCare = safeArray(summary?.specific_care_patterns)
    .find((item) => item.days >= 3 && Number(item?.actual_counts?.good || 0) >= 2);
  const repeatableCare = safeArray(summary?.care_patterns).find((item) => item.days >= 2 && item.good_days >= 2);
  if (attentionGood >= 2 || repeatableSpecificCare || repeatableCare) {
    const attentionFocus = attentionGood >= 2;
    const specificFocus = !attentionFocus && Boolean(repeatableSpecificCare);
    return {
      mood: "insight",
      headline: attentionFocus
        ? "注意予報でも穏やかに過ごせた日があります"
        : specificFocus
          ? "同じ具体的ケアを試した記録があります"
          : "同じケア分野で穏やかだった記録があります",
      empathy: attentionFocus ? "負担が出やすい条件でも穏やかに過ごせたのは、大切な記録です。" : "実際に行ったケアを残せたことは、大切な手がかりです。",
      observed: `${attentionFocus ? `いたわり・守り予報で穏やかだった日が${attentionGood}日あります。` : ""}${specificFocus ? `${repeatableSpecificCare.trigger_label}・${repeatableSpecificCare.signal_label}・体調ゆらぎ度${repeatableSpecificCare.score_band.label}の条件で「${repeatableSpecificCare.label}」を記録した日が${repeatableSpecificCare.days}日あります。` : !attentionFocus && repeatableCare ? `${repeatableCare.trigger_label}の日に「${repeatableCare.domain_label}」を行った記録は${repeatableCare.days}日です。` : ""}`.trim(),
      hypotheses: "ケアが関係した可能性や、同日に行ったほかのケア・生活の土台が関係した可能性があります。単独の効果とはまだ断定できません。",
      next_step: "次に似た予報条件が来たら、同じケアとタイミングを再現して記録してみましょう。",
      question: "穏やかに過ごせた日に、ほかに一緒に行ったケアはありましたか？",
      suggested_questions: ["穏やかだった日の具体的ケアは？", "同じ条件でもう一度試すなら？", "ケアなしの日とも比べられる？"],
      evidence: [attentionFocus
        ? `注意予報・穏やか ${attentionGood}日`
        : specificFocus
          ? `${repeatableSpecificCare.label} ${repeatableSpecificCare.days}日`
          : `${repeatableCare.trigger_label}・${repeatableCare.domain_label} ${repeatableCare.days}日`],
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

export function selectAiDetailRows(summary, maxRows = 40) {
  const limit = Math.max(10, Math.min(60, Number(maxRows) || 40));
  const rows = safeArray(summary?.rows).filter((row) => row?.review);
  const priorityDates = new Set();
  safeArray(summary?.specific_care_patterns).slice(0, 12).forEach((pattern) => {
    safeArray(pattern?.dates).forEach((date) => priorityDates.add(date));
  });
  safeArray(summary?.matched_forecast_comparisons).slice(0, 8).forEach((comparison) => {
    safeArray(comparison?.dates).forEach((date) => priorityDates.add(date));
  });
  rows.filter((row) => safeArray(row?.care_actions).length).forEach((row) => priorityDates.add(row.date));
  rows.slice(-14).forEach((row) => priorityDates.add(row.date));

  const selected = [];
  const selectedDates = new Set();
  rows.forEach((row) => {
    if (!priorityDates.has(row.date) || selectedDates.has(row.date)) return;
    selected.push(row);
    selectedDates.add(row.date);
  });
  for (let index = rows.length - 1; index >= 0 && selected.length < limit; index -= 1) {
    const row = rows[index];
    if (selectedDates.has(row.date)) continue;
    selected.push(row);
    selectedDates.add(row.date);
  }
  return selected
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(-limit);
}

export function trimRecordForAi(row) {
  const normalized = normalizeRow(row);
  const performedCareItems = normalized.care_actions
    .filter((item) => item.entry_origin !== "record_page")
    .slice(0, 12);
  const userAddedCareItems = normalized.care_actions
    .filter((item) => item.entry_origin === "record_page")
    .slice(0, 8);
  const serializeCareItem = (item) => ({
    item_key: item.canonical_key || item.item_key || null,
    label: item.label,
    detail: item.detail || null,
    domain: item.domain,
    domain_label: domainLabel(item.domain),
    source_mode: item.source_mode,
    source_label: item.source_mode === "tomorrow" ? "前日の明日カード" : "当日の今日カード",
    timing_relation: item.timing_relation,
  });
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
          prevent_level: normalized.classification.careDone ? Math.max(1, Number(row.review.prevent_level ?? 0)) : 0,
          care_label: normalized.care_actions.length
            ? `具体的ケア ${normalized.care_actions.length}件`
            : careLabel(Number(row.review.manual_prevent_level ?? row.review.prevent_level ?? 0)),
          manual_prevent_level: Number(row.review.manual_prevent_level ?? row.review.prevent_level ?? 0),
          manual_care_label: careLabel(Number(row.review.manual_prevent_level ?? row.review.prevent_level ?? 0)),
          care_domains: normalized.care_domains,
          care_timing: normalized.care_timing,
          factors: normalized.factors,
          note: String(row.review.note || "").slice(0, 220),
        }
      : null,
    performed_care_items: performedCareItems.map(serializeCareItem),
    user_added_care_items: userAddedCareItems.map((item) => ({
      ...serializeCareItem(item),
      source_label: "本人が記録ページで追加したケア",
    })),
    care_action_summary: {
      count: normalized.care_action_summary.count,
      proposed_care_count: performedCareItems.length,
      user_added_care_count: userAddedCareItems.length,
      previous_night_count: normalized.care_action_summary.previous_night_count,
      same_day_count: normalized.care_action_summary.same_day_count,
    },
    reflection_pattern: forecastPatternKey(row),
  };
}

function compactReasonChannels(value) {
  if (!value || typeof value !== "object") return null;
  const result = {};
  [
    "pressure_shift",
    "temperature_shift",
    "temp_shift",
    "pressure_down",
    "pressure_up",
    "cold",
    "heat",
    "damp",
    "dry",
  ].forEach((key) => {
    const number = Number(value[key]);
    if (Number.isFinite(number)) result[key] = Math.round(number * 1000) / 1000;
  });
  return Object.keys(result).length ? result : null;
}

function compactReasonWeatherGroups(value) {
  if (!value || typeof value !== "object") return null;
  const result = {};
  ["pressure", "temperature", "moisture"].forEach((key) => {
    const item = value[key];
    if (!item || typeof item !== "object") return;
    result[key] = {
      group: key,
      event_key: item.event_key || null,
      exact: item.exact || null,
      direction: item.direction || null,
      effective_load: Number.isFinite(Number(item.effective_load)) ? Number(item.effective_load) : null,
      weather_strength: Number.isFinite(Number(item.weather_strength)) ? Number(item.weather_strength) : null,
      affinity_weight: Number.isFinite(Number(item.affinity_weight)) ? Number(item.affinity_weight) : null,
    };
  });
  return Object.keys(result).length ? result : null;
}

function reasonTraceFromForecast(forecast) {
  const riskContext = forecast?.computed?.radar_plan_meta?.risk_context || {};
  const personalized = riskContext?.meta?.personalized_meta || {};
  const weatherMeta = riskContext?.meta?.weather_meta || {};
  if (!Object.keys(riskContext).length) return null;
  return {
    forecast_model_version:
      personalized.forecast_model_version || riskContext?.meta?.forecast_model_version || null,
    weather_strengths: compactReasonChannels(
      riskContext?.weather_context?.channel_strengths || personalized.weather_strengths
    ),
    weather_event_strengths: compactReasonChannels(
      riskContext?.weather_context?.event_strengths || personalized.weather_strengths
    ),
    pressure_direction: riskContext?.weather_context?.pressure_direction || null,
    temperature_direction: riskContext?.weather_context?.temperature_direction || null,
    moisture_shift_strength: Number.isFinite(Number(riskContext?.weather_context?.moisture_shift_strength))
      ? Number(riskContext.weather_context.moisture_shift_strength)
      : null,
    moisture_direction: riskContext?.weather_context?.moisture_direction || null,
    personal_affinity_weights: compactReasonChannels(personalized.exact_affinity_weights),
    core_weather_weights: compactReasonChannels(personalized.core_weather_weights),
    affinity_sub_codes: safeArray(personalized.sub_codes).slice(0, 2),
    event_effective_loads: compactReasonChannels(personalized.event_effective_loads),
    effective_weather_groups: compactReasonWeatherGroups(personalized.effective_weather_groups),
    effective_channel_loads: compactReasonChannels(personalized.effective_channel_loads),
    continuous_axes: personalized.continuous_axes || null,
    material_scores: personalized.material_scores || personalized.normalized_material_scores || null,
    manifestation: personalized.manifestation || null,
    reserve_scalar: Number.isFinite(Number(personalized.reserve_scalar)) ? Number(personalized.reserve_scalar) : null,
    battery_tier: personalized.battery_tier || null,
    battery_scalar: Number.isFinite(Number(personalized.battery_scalar)) ? Number(personalized.battery_scalar) : null,
    battery_scalar_applied: Number.isFinite(Number(personalized.battery_scalar_applied))
      ? Number(personalized.battery_scalar_applied)
      : null,
    forecast_model: personalized.forecast_model || null,
    score_trace: personalized.score_trace || null,
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
      forecast_context:
        forecast?.computed?.radar_plan_meta?.risk_context?.meta?.forecast_model_version ||
        "radar_v1_personalized_weather",
      weather: forecast?.computed?.radar_plan_meta?.risk_context?.meta?.weather_meta?.extraction_version || null,
    },
    forecast_updated_at: forecast.updated_at || forecast.created_at || null,
  };
}
