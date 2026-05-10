function hasText(value) {
  return Boolean(String(value || "").trim());
}

function normalizeGeneratedBy(value) {
  return String(value || "").trim().toLowerCase();
}

const GPT_GENERATED_BY = new Set(["gpt", "openai", "ai"]);
const SETTLED_GENERATED_BY = new Set(["gpt", "openai", "ai", "fallback", "failed", "rejected", "skipped"]);
const SETTLED_STATUSES = new Set(["completed", "fallback", "failed", "rejected", "skipped"]);

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isGptGeneratedBy(value) {
  return GPT_GENERATED_BY.has(normalizeGeneratedBy(value));
}

function isSettledGeneratedBy(value) {
  return SETTLED_GENERATED_BY.has(normalizeGeneratedBy(value));
}

function isSettledStatus(value) {
  return SETTLED_STATUSES.has(String(value || "").trim().toLowerCase());
}

function hasGeneratedAt(value) {
  return hasText(value?.generated_at) || hasText(value?.gpt_generated_at);
}

function hasFoodBody(food) {
  return Boolean(
    hasText(food?.recommendation) ||
      hasText(food?.how_to) ||
      hasText(food?.reason) ||
      hasText(food?.lifestyle_tip)
  );
}

function getPointReasonStatus(point) {
  const explanation = point?.explanation || {};
  return Boolean(
    hasText(explanation.selection_reason) &&
      hasText(explanation.selection_reason_rule_based)
  );
}

export function getGptEnrichmentMeta(bundleOrForecast) {
  const forecast = bundleOrForecast?.forecast || bundleOrForecast || {};
  return forecast?.computed?.radar_plan_meta?.gpt_enrichment || {};
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

// Strict判定: 既存AI文を通常再保存から守るために使う。
export function hasGptFoodContext(food) {
  return Boolean(isObject(food) && isGptGeneratedBy(food.generated_by) && hasFoodBody(food));
}

// Settled判定: 自動enrichをもう一度走らせるべきかの判定に使う。
function hasSettledFoodContext(food) {
  return Boolean(isObject(food) && isSettledGeneratedBy(food.generated_by) && hasFoodBody(food));
}

export function hasTsuboPoints(tsuboSet) {
  return Array.isArray(tsuboSet?.points) && tsuboSet.points.length > 0;
}

// Strict判定: 旧データ互換のため generated_by がなくても、1点でもAI理由があればAI保護対象にする。
export function hasGptTsuboSelectionReasons(tsuboSet) {
  const points = Array.isArray(tsuboSet?.points) ? tsuboSet.points : [];
  if (!points.length) return false;

  if (isGptGeneratedBy(tsuboSet?.generated_by)) return true;
  return points.some(getPointReasonStatus);
}

function hasSettledTsuboSelectionReasons(tsuboSet) {
  const points = Array.isArray(tsuboSet?.points) ? tsuboSet.points : [];
  if (!points.length) return false;

  if (isSettledGeneratedBy(tsuboSet?.generated_by) && hasGeneratedAt(tsuboSet)) {
    return true;
  }

  return hasGptTsuboSelectionReasons(tsuboSet);
}

function componentSettledByMeta(meta, key) {
  return isSettledStatus(meta?.[key]?.status);
}

export function getGptCompletionStatus(bundle) {
  const carePlan = bundle?.care_plan || {};
  const food = carePlan?.tomorrow_food_context || null;
  const tsuboSet = carePlan?.night_tsubo_set || null;
  const meta = getGptEnrichmentMeta(bundle);
  const needsTsuboReasons = hasTsuboPoints(tsuboSet);

  return {
    forecast_summary:
      hasGptForecastSummary(bundle) || componentSettledByMeta(meta, "forecast_summary"),
    tomorrow_food:
      hasSettledFoodContext(food) || componentSettledByMeta(meta, "tomorrow_food"),
    tsubo_reasons:
      !needsTsuboReasons ||
      hasSettledTsuboSelectionReasons(tsuboSet) ||
      componentSettledByMeta(meta, "tsubo_reasons"),
  };
}

export function getGptGenerationPlan(bundle) {
  const status = getGptCompletionStatus(bundle);
  return {
    forecast_summary: !status.forecast_summary,
    tomorrow_food: !status.tomorrow_food,
    tsubo_reasons: !status.tsubo_reasons,
  };
}

export function hasCompletedGpt(bundle) {
  const status = getGptCompletionStatus(bundle);
  return Boolean(status.forecast_summary && status.tomorrow_food && status.tsubo_reasons);
}

export function withGptEnrichmentStatus(radarPlan, key, status, details = {}) {
  const safeStatus = String(status || "").trim().toLowerCase() || "failed";
  const now = new Date().toISOString();
  const previousMeta = radarPlan?.meta || {};
  const previousEnrichment = previousMeta?.gpt_enrichment || {};

  return {
    ...radarPlan,
    meta: {
      ...previousMeta,
      gpt_enrichment: {
        ...previousEnrichment,
        [key]: {
          status: safeStatus,
          attempted_at: details.attempted_at || now,
          ...(details.model ? { model: details.model } : {}),
          ...(details.reason ? { reason: String(details.reason).slice(0, 240) } : {}),
        },
      },
    },
  };
}


