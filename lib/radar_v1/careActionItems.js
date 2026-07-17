const DOMAIN_VALUES = new Set(["live", "eat", "loosen"]);
const SOURCE_MODE_VALUES = new Set(["today", "tomorrow"]);
const IDENTITY_VERSION = 3;

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function compact(value, limit = 240) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, limit);
}

function normalizeIdentity(value) {
  return compact(value, 500)
    .normalize("NFKC")
    .toLocaleLowerCase("ja-JP")
    .replace(/[‐‑‒–—―ーｰ]/g, "-")
    .replace(/[・･]/g, "·")
    .replace(/\s+/g, " ")
    .trim();
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

function safeKind(value) {
  return compact(value || "item", 30).replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
}

/**
 * 表示順に依存しない、具体的ケアの意味上のID。
 * order/indexは表示用metaへだけ保存し、同一ケアの識別には使わない。
 */
export function buildCareActionKey({ domain, kind, identity }) {
  const safeDomain = DOMAIN_VALUES.has(domain) ? domain : "live";
  const normalizedKind = safeKind(kind);
  const normalizedIdentity = normalizeIdentity(identity || `${safeDomain}-${normalizedKind}`);
  return `v${IDENTITY_VERSION}:${safeDomain}:${normalizedKind}:${hashText(normalizedIdentity)}`.slice(0, 120);
}

function actionIdentityParts(action = {}) {
  const snapshot = action.item_snapshot && typeof action.item_snapshot === "object"
    ? action.item_snapshot
    : {};
  const meta = snapshot.meta && typeof snapshot.meta === "object"
    ? snapshot.meta
    : action.meta && typeof action.meta === "object"
      ? action.meta
      : {};
  const domain = DOMAIN_VALUES.has(action.domain || snapshot.domain)
    ? (action.domain || snapshot.domain)
    : "live";
  const storedKind = compact(action.kind || snapshot.kind || "item", 50);
  const label = compact(action.label || snapshot.label, 160);
  const detail = compact(action.detail || snapshot.detail, 240);

  if (domain === "loosen") {
    if (storedKind === "tsubo_line_care" || storedKind === "line_care") {
      return {
        domain,
        kind: "line_care",
        identity: compact(meta.rule_id, 80) || compact(meta.meridian_code, 30) || label,
      };
    }
    return {
      domain,
      kind: "point",
      identity: compact(meta.point_code, 30) || compact(meta.point_name, 80) || label,
    };
  }
  if (domain === "eat") {
    const cardKey = compact(meta.card_key, 40);
    if (storedKind === "food_example_item") {
      return { domain, kind: "example_item", identity: label };
    }
    if (storedKind === "food_plan") {
      return { domain, kind: "plan", identity: `${label}|${detail}` };
    }
    if (/_item$/.test(storedKind) && cardKey) {
      return {
        domain,
        kind: `${cardKey}_item`,
        identity: `${cardKey}|${label}`,
      };
    }
    const normalizedCardKey = cardKey || storedKind.replace(/^food_/, "") || "card";
    const cardItems = safeArray(meta.items).map((item) => compact(item, 120)).filter(Boolean);
    return {
      domain,
      kind: normalizedCardKey,
      identity: `${normalizedCardKey}|${label}|${detail}|${cardItems.join("|")}`,
    };
  }
  return {
    domain,
    kind: storedKind === "lifestyle_step" ? "step" : (storedKind || "step"),
    identity: compact(meta.rule_id, 80) || label,
  };
}

/**
 * v7.71の旧item_keyも、保存済みsnapshotからv3の安定IDへ正規化する。
 */
export function canonicalCareActionKey(action) {
  const snapshot = action?.item_snapshot && typeof action.item_snapshot === "object"
    ? action.item_snapshot
    : {};
  const explicit = compact(
    action?.canonical_key || snapshot?.canonical_key || snapshot?.meta?.canonical_key,
    120
  );
  if (/^v3:/.test(explicit)) return explicit;
  return buildCareActionKey(actionIdentityParts(action));
}

export function buildDisplayedCareItems({
  lifestylePlan,
  food,
  tsuboPoints,
  tsuboSet = null,
  sourceMode = "today",
} = {}) {
  const mode = SOURCE_MODE_VALUES.has(sourceMode) ? sourceMode : "today";
  const items = [];

  safeArray(lifestylePlan?.steps).slice(0, 6).forEach((step, index) => {
    const label = compact(step, 160);
    if (!label) return;
    const detail = compact(lifestylePlan?.lead || lifestylePlan?.title, 220);
    const itemKey = buildCareActionKey({
      domain: "live",
      kind: "step",
      identity: lifestylePlan?.step_ids?.[index] || label,
    });
    items.push({
      item_key: itemKey,
      canonical_key: itemKey,
      identity_version: IDENTITY_VERSION,
      domain: "live",
      kind: "lifestyle_step",
      label,
      detail,
      meta: {
        plan_title: compact(lifestylePlan?.title, 100),
        rule_id: compact(lifestylePlan?.step_ids?.[index], 80) || null,
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

      if (cardItems.length && cardKey !== "caution") {
        cardItems.forEach((foodItem, itemIndex) => {
          const itemKey = buildCareActionKey({
            domain: "eat",
            kind: `${cardKey}_item`,
            identity: `${cardKey}|${foodItem}`,
          });
          items.push({
            item_key: itemKey,
            canonical_key: itemKey,
            identity_version: IDENTITY_VERSION,
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
      const detail = compact(card?.body, 240);
      const itemKey = buildCareActionKey({
        domain: "eat",
        kind: cardKey || "card",
        identity: `${cardKey}|${cardLabel}|${detail}|${cardItems.join("|")}`,
      });
      items.push({
        item_key: itemKey,
        canonical_key: itemKey,
        identity_version: IDENTITY_VERSION,
        domain: "eat",
        kind: `food_${cardKey || "card"}`,
        label: cardLabel,
        detail,
        meta: {
          items: cardItems,
          card_key: cardKey,
          card_label: cardLabel,
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
      const itemKey = buildCareActionKey({ domain: "eat", kind: "example_item", identity: label });
      items.push({
        item_key: itemKey,
        canonical_key: itemKey,
        identity_version: IDENTITY_VERSION,
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
    const detail = compact(food?.how_to || food?.recommendation, 240);
    const itemKey = buildCareActionKey({ domain: "eat", kind: "plan", identity: `${label}|${detail}` });
    items.push({
      item_key: itemKey,
      canonical_key: itemKey,
      identity_version: IDENTITY_VERSION,
      domain: "eat",
      kind: "food_plan",
      label,
      detail,
      meta: {},
      source_mode: mode,
    });
  }

  const lineCare = tsuboSet?.line_care;
  if (lineCare?.label || lineCare?.action) {
    const label = compact(lineCare.label || lineCare.action, 160);
    const detail = compact(lineCare.reason || tsuboSet?.lead, 240);
    const ruleId = compact(lineCare.id || lineCare.meridian_code || label, 80);
    const itemKey = buildCareActionKey({
      domain: "loosen",
      kind: "line_care",
      identity: ruleId,
    });
    items.push({
      item_key: itemKey,
      canonical_key: itemKey,
      identity_version: IDENTITY_VERSION,
      domain: "loosen",
      kind: "tsubo_line_care",
      label,
      detail,
      meta: {
        rule_id: ruleId,
        meridian_code: compact(lineCare.meridian_code, 30) || null,
        order: 0,
      },
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
    const itemKey = buildCareActionKey({
      domain: "loosen",
      kind: "point",
      identity: pointCode || pointName,
    });
    items.push({
      item_key: itemKey,
      canonical_key: itemKey,
      identity_version: IDENTITY_VERSION,
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
  const canonicalKey = canonicalCareActionKey({ ...action, item_snapshot: snapshot });
  return {
    id: action.id || null,
    target_date: action.target_date || null,
    source_date: action.source_date || null,
    source_mode: sourceMode,
    domain,
    item_key: compact(action.item_key, 120),
    canonical_key: canonicalKey,
    identity_version: Number(snapshot.identity_version || action.identity_version || (/^v3:/.test(action.item_key) ? 3 : /^v2:/.test(action.item_key) ? 2 : 1)),
    kind: compact(action.kind || snapshot.kind, 50),
    label,
    detail: compact(action.detail || snapshot.detail, 240),
    item_snapshot: snapshot,
    timing_relation: compact(action.timing_relation, 40) || (sourceMode === "tomorrow" ? "previous_night" : "same_day_unknown"),
    entry_origin: compact(snapshot?.meta?.entry_origin || action.entry_origin, 40) || "daily_care_card",
    checked_at: action.checked_at || null,
    updated_at: action.updated_at || action.checked_at || null,
  };
}

export function dedupeCareActions(actions) {
  const normalized = safeArray(actions).map(normalizeCareAction).filter(Boolean);
  const byIdentity = new Map();
  normalized.forEach((item) => {
    const key = `${item.target_date || ""}:${item.source_mode}:${item.canonical_key || item.item_key}`;
    const previous = byIdentity.get(key);
    const previousStamp = String(previous?.updated_at || previous?.checked_at || "");
    const currentStamp = String(item.updated_at || item.checked_at || "");
    if (!previous || currentStamp >= previousStamp) byIdentity.set(key, item);
  });
  return Array.from(byIdentity.values());
}

export function summarizeCareActions(actions) {
  const normalized = dedupeCareActions(actions);
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
