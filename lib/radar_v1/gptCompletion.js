function hasText(value) {
  return Boolean(String(value || "").trim());
}

function normalizeGeneratedBy(value) {
  return String(value || "").trim().toLowerCase();
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

export function hasTsuboPoints(tsuboSet) {
  return Array.isArray(tsuboSet?.points) && tsuboSet.points.length > 0;
}

export function hasGptTsuboSelectionReasons(tsuboSet) {
  const points = Array.isArray(tsuboSet?.points) ? tsuboSet.points : [];
  if (!points.length) return false;

  return points.every((point) => {
    const explanation = point?.explanation || {};
    return hasText(explanation.selection_reason) && hasText(explanation.selection_reason_rule_based);
  });
}

export function getGptCompletionStatus(bundle) {
  const carePlan = bundle?.care_plan || {};
  const food = carePlan?.tomorrow_food_context || null;
  const tsuboSet = carePlan?.night_tsubo_set || null;
  const needsTsuboReasons = hasTsuboPoints(tsuboSet);

  return {
    forecast_summary: hasGptForecastSummary(bundle),
    tomorrow_food: hasGptFoodContext(food),
    tsubo_reasons: needsTsuboReasons ? hasGptTsuboSelectionReasons(tsuboSet) : true,
  };
}

export function hasCompletedGpt(bundle) {
  const status = getGptCompletionStatus(bundle);
  return Boolean(status.forecast_summary && status.tomorrow_food && status.tsubo_reasons);
}
