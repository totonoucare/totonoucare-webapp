function hasText(value) {
  return Boolean(String(value || "").trim());
}

function normalizeGeneratedBy(value) {
  return String(value || "").trim().toLowerCase();
}

function hasGeneratedAt(value) {
  return hasText(value?.generated_at) || hasText(value?.gpt_generated_at);
}

function isGptLikeGeneratedBy(value) {
  const generatedBy = normalizeGeneratedBy(value);
  return generatedBy === "gpt" || generatedBy === "openai" || generatedBy === "ai";
}

function isAttemptedGeneratedBy(value) {
  const generatedBy = normalizeGeneratedBy(value);
  return isGptLikeGeneratedBy(generatedBy) || generatedBy === "fallback" || generatedBy === "failed";
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

function hasFoodBody(food) {
  return Boolean(
    hasText(food?.recommendation) ||
      hasText(food?.how_to) ||
      hasText(food?.reason) ||
      hasText(food?.lifestyle_tip)
  );
}

// Strict判定: 既存のAI生成文を通常のルールベース再保存から守るために使う。
export function hasGptFoodContext(food) {
  if (!food || typeof food !== "object") return false;
  if (!isGptLikeGeneratedBy(food.generated_by)) return false;
  return hasFoodBody(food);
}

// Pending判定: フロントが毎回OpenAIを叩かないよう、「GPT生成または検証fallbackまで完了」を見る。
export function hasEnrichedFoodContext(food) {
  if (!food || typeof food !== "object") return false;
  if (!isAttemptedGeneratedBy(food.generated_by)) return false;
  return hasFoodBody(food);
}

export function hasTsuboPoints(tsuboSet) {
  return Array.isArray(tsuboSet?.points) && tsuboSet.points.length > 0;
}

export function hasGptTsuboSelectionReasons(tsuboSet) {
  const points = Array.isArray(tsuboSet?.points) ? tsuboSet.points : [];
  if (!points.length) return false;

  if (isGptLikeGeneratedBy(tsuboSet?.generated_by) && hasGeneratedAt(tsuboSet)) {
    return true;
  }

  return points.some((point) => {
    const explanation = point?.explanation || {};
    return hasText(explanation.selection_reason) && hasText(explanation.selection_reason_rule_based);
  });
}

export function hasEnrichedTsuboSelectionReasons(tsuboSet) {
  const points = Array.isArray(tsuboSet?.points) ? tsuboSet.points : [];
  if (!points.length) return false;

  if (isAttemptedGeneratedBy(tsuboSet?.generated_by) && hasGeneratedAt(tsuboSet)) {
    return true;
  }

  return hasGptTsuboSelectionReasons(tsuboSet);
}

export function getGptCompletionStatus(bundle) {
  const carePlan = bundle?.care_plan || {};
  const food = carePlan?.tomorrow_food_context || null;
  const tsuboSet = carePlan?.night_tsubo_set || null;
  const needsTsuboReasons = hasTsuboPoints(tsuboSet);

  return {
    forecast_summary: hasGptForecastSummary(bundle),
    tomorrow_food: hasEnrichedFoodContext(food),
    tsubo_reasons: needsTsuboReasons ? hasEnrichedTsuboSelectionReasons(tsuboSet) : true,
  };
}

export function hasCompletedGpt(bundle) {
  const status = getGptCompletionStatus(bundle);
  return Boolean(status.forecast_summary && status.tomorrow_food && status.tsubo_reasons);
}

