function hasText(value) {
  return Boolean(String(value || "").trim());
}

function normalizeGeneratedBy(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

const TERMINAL_STATUSES = new Set([
  "completed",
  "fallback",
  "failed",
  "rejected",
  "skipped",
]);

function isTerminalStatus(value) {
  return TERMINAL_STATUSES.has(normalizeStatus(value));
}

function getEnrichmentMeta(bundle) {
  return bundle?.forecast?.computed?.radar_plan_meta?.gpt_enrichment || {};
}

function getPartAttempt(meta, key) {
  const part = meta?.[key];
  return part && typeof part === "object" ? part : null;
}

function hasTerminalAttempt(bundle, key) {
  return isTerminalStatus(getPartAttempt(getEnrichmentMeta(bundle), key)?.status);
}

export function getPersistedGptSummary(bundle) {
  return String(
    bundle?.forecast?.gpt_summary ||
      bundle?.forecast?.computed?.forecast_snapshot?.gpt_summary ||
      ""
  ).trim();
}

export function hasGptForecastSummary(bundle) {
  return Boolean(getPersistedGptSummary(bundle));
}

export function hasGptFoodContext(food) {
  if (!food || typeof food !== "object") return false;
  if (normalizeGeneratedBy(food.generated_by) !== "gpt") return false;

  return Boolean(
    hasText(food.recommendation) ||
      hasText(food.how_to) ||
      hasText(food.reason) ||
      hasText(food.lifestyle_tip)
  );
}

function hasTerminalFoodContext(bundle) {
  const food = bundle?.care_plan?.tomorrow_food_context || null;
  const generatedBy = normalizeGeneratedBy(food?.generated_by);

  return Boolean(
    hasGptFoodContext(food) ||
      generatedBy === "fallback" ||
      hasTerminalAttempt(bundle, "tomorrow_food")
  );
}

export function hasTsuboPoints(tsuboSet) {
  return Array.isArray(tsuboSet?.points) && tsuboSet.points.length > 0;
}

export function hasGptTsuboSelectionReasons(tsuboSet) {
  const points = Array.isArray(tsuboSet?.points) ? tsuboSet.points : [];
  if (!points.length) return false;
  if (normalizeGeneratedBy(tsuboSet?.generated_by) !== "gpt") return false;

  return points.some((point) => {
    const explanation = point?.explanation || {};
    return hasText(explanation.selection_reason) && hasText(explanation.selection_reason_rule_based);
  });
}

function hasTerminalTsuboReasons(bundle) {
  const tsuboSet = bundle?.care_plan?.night_tsubo_set || null;
  if (!hasTsuboPoints(tsuboSet)) return true;

  const generatedBy = normalizeGeneratedBy(tsuboSet?.generated_by);

  return Boolean(
    hasGptTsuboSelectionReasons(tsuboSet) ||
      generatedBy === "fallback" ||
      hasTerminalAttempt(bundle, "tsubo_reasons")
  );
}

function hasTerminalForecastSummary(bundle) {
  return Boolean(
    hasGptForecastSummary(bundle) || hasTerminalAttempt(bundle, "forecast_summary")
  );
}

export function getGptCompletionStatus(bundle) {
  const carePlan = bundle?.care_plan || {};
  const food = carePlan?.tomorrow_food_context || null;
  const tsuboSet = carePlan?.night_tsubo_set || null;

  return {
    forecast_summary: hasGptForecastSummary(bundle),
    forecast_summary_terminal: hasTerminalForecastSummary(bundle),
    tomorrow_food: hasGptFoodContext(food),
    tomorrow_food_terminal: hasTerminalFoodContext(bundle),
    tsubo_reasons: hasGptTsuboSelectionReasons(tsuboSet),
    tsubo_reasons_terminal: hasTerminalTsuboReasons(bundle),
  };
}

export function shouldAutoEnrich(bundle) {
  if (!bundle?.forecast || !bundle?.care_plan) return false;

  const status = getGptCompletionStatus(bundle);
  return Boolean(
    !status.forecast_summary_terminal ||
      !status.tomorrow_food_terminal ||
      !status.tsubo_reasons_terminal
  );
}

export function hasFinishedAutoEnrichment(bundle) {
  return !shouldAutoEnrich(bundle);
}

// 既存import互換用。ここでの「completed」は、表示時に自動生成をもう一度走らせない状態を指す。
export function hasCompletedGpt(bundle) {
  return hasFinishedAutoEnrichment(bundle);
}

