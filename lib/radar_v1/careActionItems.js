const DOMAIN_VALUES = new Set(["live", "eat", "loosen"]);
const SOURCE_MODE_VALUES = new Set(["today", "tomorrow"]);

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function compact(value, limit = 240) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, limit);
}

function hashText(value) {
  const text = String(value || "");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function buildCareActionKey({ domain, kind, identity, index = 0 }) {
  const safeDomain = DOMAIN_VALUES.has(domain) ? domain : "live";
  const safeKind = compact(kind || "item", 30).replace(/[^a-z0-9_-]/gi, "_");
  const basis = compact(identity || `${safeDomain}-${safeKind}-${index}`, 500);
  return `${safeDomain}:${safeKind}:${index}:${hashText(basis)}`.slice(0, 120);
}

export function buildDisplayedCareItems({
  lifestylePlan,
  food,
  tsuboPoints,
  sourceMode = "today",
} = {}) {
  const mode = SOURCE_MODE_VALUES.has(sourceMode) ? sourceMode : "today";
  const items = [];

  safeArray(lifestylePlan?.steps).slice(0, 6).forEach((step, index) => {
    const label = compact(step, 160);
    if (!label) return;
    items.push({
      item_key: buildCareActionKey({ domain: "live", kind: "step", identity: label, index }),
      domain: "live",
      kind: "lifestyle_step",
      label,
      detail: compact(lifestylePlan?.lead || lifestylePlan?.title, 220),
      meta: {
        plan_title: compact(lifestylePlan?.title, 100),
        order: index + 1,
      },
      source_mode: mode,
    });
  });

  const foodCards = safeArray(food?.action_cards);
  if (foodCards.length) {
    foodCards.slice(0, 6).forEach((card, cardIndex) => {
      const cardKey = compact(card?.key || `food-${cardIndex}`, 40);
      const cardItems = safeArray(card?.items)
        .map((item) => compact(item, 120))
        .filter(Boolean)
        .slice(0, 8);
      const cardLabel = compact(
        card?.label || (cardKey === "caution" ? "控えたい食べ方を意識する" : "食べ方を整える"),
        120
      );

      // 「足す」「飲む」「選ぶ」は候補ごとにチェックできるようにする。
      // これにより「食べる分野をした」ではなく、実際に取り入れた候補を保存できる。
      if (cardItems.length && cardKey !== "caution") {
        cardItems.forEach((foodItem, itemIndex) => {
          items.push({
            item_key: buildCareActionKey({
              domain: "eat",
              kind: `${cardKey}_item`,
              identity: `${cardKey}|${foodItem}`,
              index: itemIndex,
            }),
            domain: "eat",
            kind: `food_${cardKey}_item`,
            label: foodItem,
            detail: compact(card?.body || cardLabel, 240),
            meta: {
              card_key: cardKey,
              card_label: cardLabel,
              plan_title: compact(food?.title, 100),
              order: itemIndex + 1,
            },
            source_mode: mode,
          });
        });
        return;
      }

      if (!cardLabel) return;
      items.push({
        item_key: buildCareActionKey({
          domain: "eat",
          kind: cardKey || "card",
          identity: `${cardLabel}|${compact(card?.body, 240)}|${cardItems.join("|")}`,
          index: cardIndex,
        }),
        domain: "eat",
        kind: `food_${cardKey || "card"}`,
        label: cardLabel,
        detail: compact(card?.body, 240),
        meta: {
          items: cardItems,
          plan_title: compact(food?.title, 100),
          order: cardIndex + 1,
        },
        source_mode: mode,
      });
    });
  } else if (safeArray(food?.examples).length) {
    safeArray(food.examples).slice(0, 8).forEach((example, index) => {
      const label = compact(example, 120);
      if (!label) return;
      items.push({
        item_key: buildCareActionKey({ domain: "eat", kind: "example_item", identity: label, index }),
        domain: "eat",
        kind: "food_example_item",
        label,
        detail: compact(food?.how_to || food?.recommendation || food?.title, 240),
        meta: { plan_title: compact(food?.title, 100), order: index + 1 },
        source_mode: mode,
      });
    });
  } else if (food?.title) {
    const label = compact(food?.title || "食べ方を整える", 120);
    items.push({
      item_key: buildCareActionKey({ domain: "eat", kind: "plan", identity: `${label}|${compact(food?.how_to, 240)}` }),
      domain: "eat",
      kind: "food_plan",
      label,
      detail: compact(food?.how_to || food?.recommendation, 240),
      meta: {},
      source_mode: mode,
    });
  }

  safeArray(tsuboPoints).slice(0, 6).forEach((point, index) => {
    const pointCode = compact(point?.code, 30);
    const pointName = compact(point?.name_ja || point?.name || pointCode, 80);
    if (!pointName) return;
    const role = compact(
      point?.explanation?.selection_reason_rule_based ||
      point?.explanation?.selection_reason ||
      point?.role_summary ||
      point?.summary,
      220
    );
    items.push({
      item_key: buildCareActionKey({
        domain: "loosen",
        kind: "point",
        identity: pointCode || pointName,
        index,
      }),
      domain: "loosen",
      kind: "tsubo_point",
      label: `${pointName}のツボケア`,
      detail: role,
      meta: {
        point_code: pointCode || null,
        point_name: pointName,
        reading: compact(point?.reading || point?.name_kana, 50) || null,
        order: index + 1,
      },
      source_mode: mode,
    });
  });

  return items;
}

export function normalizeCareAction(action) {
  if (!action || typeof action !== "object") return null;
  const domain = DOMAIN_VALUES.has(action.domain) ? action.domain : null;
  const sourceMode = SOURCE_MODE_VALUES.has(action.source_mode) ? action.source_mode : null;
  const snapshot = action.item_snapshot && typeof action.item_snapshot === "object"
    ? action.item_snapshot
    : {};
  const label = compact(action.label || snapshot.label, 160);
  if (!domain || !sourceMode || !label) return null;
  return {
    id: action.id || null,
    target_date: action.target_date || null,
    source_date: action.source_date || null,
    source_mode: sourceMode,
    domain,
    item_key: compact(action.item_key, 120),
    kind: compact(action.kind || snapshot.kind, 50),
    label,
    detail: compact(action.detail || snapshot.detail, 240),
    item_snapshot: snapshot,
    timing_relation: compact(action.timing_relation, 40) || (sourceMode === "tomorrow" ? "previous_night" : "same_day_unknown"),
    checked_at: action.checked_at || null,
    updated_at: action.updated_at || action.checked_at || null,
  };
}

export function summarizeCareActions(actions) {
  const normalized = safeArray(actions).map(normalizeCareAction).filter(Boolean);
  const domains = Array.from(new Set(normalized.map((item) => item.domain)));
  const previousNight = normalized.filter((item) => item.source_mode === "tomorrow");
  const sameDay = normalized.filter((item) => item.source_mode === "today");
  return {
    actions: normalized,
    count: normalized.length,
    domains,
    previous_night_count: previousNight.length,
    same_day_count: sameDay.length,
    has_previous_night: previousNight.length > 0,
    has_same_day: sameDay.length > 0,
    labels: normalized.map((item) => item.label),
  };
}

export function actionTimingLabel(value) {
  return {
    previous_night: "前夜に実施",
    same_day_before: "つらさの前に実施",
    same_day_after: "つらくなってから実施",
    same_day_mixed: "前後どちらも実施",
    same_day_unknown: "当日・前後不明",
  }[value] || "時間不明";
}
