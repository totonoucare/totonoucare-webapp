import { buildDisplayedCareItems } from "@/lib/radar_v1/careActionItems";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function compactText(value, limit = 160) {
  return String(value || "").trim().slice(0, limit);
}

function compactItemLabel(value) {
  if (typeof value === "string") return compactText(value, 50);
  if (!value || typeof value !== "object") return "";
  return compactText(
    value.name_ja || value.name || value.label || value.title || value.ingredient || value.code,
    50,
  );
}

export function buildDisplayedCareSnapshot({
  carePlan,
  mode = "today",
  targetDate = null,
  source = "reconstructed_from_complete_risk_context",
} = {}) {
  if (!carePlan) return null;
  const displayMode = mode === "tomorrow" ? "tomorrow" : "today";
  const lifestylePlan = carePlan?.lifestyle_plan || null;
  const foodPlan = carePlan?.tomorrow_food_context || carePlan?.night_food || null;
  const tsuboSet = carePlan?.night_tsubo_set || null;
  const foodItems = safeArray(foodPlan?.add_items || foodPlan?.examples)
    .map(compactItemLabel)
    .filter(Boolean)
    .slice(0, 3);
  const points = safeArray(tsuboSet?.points).slice(0, 3).map((point) => ({
    code: compactText(point?.code, 20),
    name: compactText(point?.name_ja || point?.name || point?.code, 40),
    reason: compactText(
      point?.explanation?.selection_reason_rule_based || point?.explanation?.selection_reason,
      120,
    ),
  }));
  const exactItems = buildDisplayedCareItems({
    lifestylePlan,
    food: foodPlan,
    tsuboPoints: safeArray(tsuboSet?.points),
    tsuboSet,
    sourceMode: displayMode,
  }).map((item) => ({
    item_key: item.item_key || null,
    canonical_key: item.canonical_key || null,
    domain: item.domain,
    kind: item.kind,
    label: compactText(item.label, 120),
    detail: compactText(item.detail, 180),
  }));

  const lifestyle = lifestylePlan ? {
    title: compactText(lifestylePlan.title, 80),
    lead: compactText(lifestylePlan.lead, 160),
    steps: safeArray(lifestylePlan.steps).slice(0, 3).map((item) => compactText(item, 80)),
  } : null;
  const food = foodPlan?.title || foodItems.length ? {
    title: compactText(foodPlan?.title, 80),
    timing: compactText(foodPlan?.timing, 40),
    items: foodItems,
    how_to: compactText(foodPlan?.how_to, 120),
    reason: compactText(foodPlan?.reason, 140),
    caution: compactText(foodPlan?.avoid || carePlan?.tomorrow_caution, 120),
  } : null;
  const tsubo = points.length || tsuboSet?.line_care ? {
    title: compactText(tsuboSet?.title, 80),
    line_care: tsuboSet?.line_care ? {
      id: compactText(tsuboSet.line_care.id, 50),
      label: compactText(tsuboSet.line_care.label || tsuboSet.line_care.action, 100),
      reason: compactText(tsuboSet.line_care.reason, 140),
      timing_label: compactText(tsuboSet.line_care.timing_label, 80),
    } : null,
    points,
    note: compactText(carePlan?.night_note || carePlan?.night_tsubo_reason, 140),
  } : null;

  if (!lifestyle && !food && !tsubo && !exactItems.length) return null;
  const usageNote = source === "reconstructed_at_first_record_save"
    ? "初回記録時に同じルールで再構成した参考ケア。本人が当時閲覧・実行した事実とは扱わない。"
    : "現在の体調予報画面と同じ計算によるケア。追加案はミモルの応用案と明記して区別する。";
  return {
    version: 1,
    source,
    display_mode: displayMode,
    target_date: targetDate || null,
    care_logic_version: carePlan?.version || null,
    lifestyle,
    food,
    tsubo,
    exact_visible_items: exactItems,
    usage_note: usageNote,
  };
}
