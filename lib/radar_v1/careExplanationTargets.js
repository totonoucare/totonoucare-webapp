import { buildCareActionKey } from "./careActionItems";

const list = value => Array.isArray(value) ? value : [];

// Explanation-only targets never enter the care recording list. The same
// builder runs on the browser and server, including tomorrow's preview cards.
export function buildCareExplanationTargets({ items = [], food = {}, sourceMode = "today" } = {}) {
  const targets = items.map(item => ({ ...item, recordable: true }));
  for (const card of list(food.action_cards).slice(0, 6)) {
    const cardKey = card.key || "card";
    if (card.proposal) {
      const names = list(card.proposal.focus_ingredients || card.items);
      targets.push({
        item_key: buildCareActionKey({ domain: "eat", kind: "explanation_proposal", identity: `${cardKey}|${names.join("|")}|${card.proposal.meal_example || ""}` }),
        domain: "eat", kind: "food_proposal", label: names.join(" ＋ "), recordable: false,
        meta: { card_key: cardKey, explanation_role: "proposal" }, source_mode: sourceMode,
      });
    }
    if (cardKey === "caution") continue;
    list(card.items).slice(0, 8).forEach((label, index) => {
      if (targets.some(item => item.domain === "eat" && item.kind !== "food_proposal" && item.meta?.card_key === cardKey && item.meta?.order === index + 1)) return;
      const detail = list(card.item_details)[index] || {};
      targets.push({
        item_key: buildCareActionKey({ domain: "eat", kind: "explanation_preview", identity: `${cardKey}|${detail.consumed_id || label}|${detail.meal_example || ""}` }),
        domain: "eat", kind: `food_${cardKey}_item`, label: detail.consumed_name || label,
        recordable: false, meta: { card_key: cardKey, order: index + 1, consumed_id: detail.consumed_id || null, consumed_name: detail.consumed_name || null },
        source_mode: sourceMode,
      });
    });
  }
  return targets;
}

export function foodExplanationTarget(targets, card, index = null) {
  return targets.find(item => item.domain === "eat" && item.meta?.card_key === card?.key &&
    (index == null ? item.kind === "food_proposal" : item.kind !== "food_proposal" && item.meta?.order === index + 1)) || null;
}
