import { lineCareFacts, pointCareFacts } from "./careKnowledge";
import { getPointPressGuide } from "@/app/radar/utils";

const list = value => Array.isArray(value) ? value : [];
const text = (value, max = 400) => typeof value === "string" ? value.trim().slice(0, max) : "";
const texts = value => list(value).slice(0, 10).map(v => text(v, 240)).filter(Boolean);

function basisEvidence(basis = {}) {
  return {
    nature: text(basis.nature, 20),
    functions: texts(basis.functions),
    matched_functions: texts(basis.matched_functions),
    matched_context: text(basis.matched_context),
    matches: list(basis.evidence || basis.matches || basis.matched_context).slice(0, 8).map(row => ({
      source: text(row.source, 40), key: text(row.key, 80), reason: text(row.reason),
      tags: texts(row.tags), matched_functions: texts(row.matched_functions),
      nature_match: text(row.nature_match, 30),
    })),
  };
}

// Use the displayed plan's catalog facts and selection evidence, keeping the
// recording identity unchanged. Recording instructions are not care rationale.
export function buildCareExplanationItems({ items = [], food = {}, lifestylePlan = {}, tsuboSet = {} } = {}) {
  return items.map(item => {
    const meta = item.meta || {};
    const result = { item_key: item.item_key, domain: item.domain, kind: item.kind,
      label: meta.consumed_name || item.label, recordable: item.recordable !== false };
    if (item.domain === "eat") {
      const card = list(food.action_cards).find(row => row.key === meta.card_key);
      if (item.kind === "food_proposal") {
        const proposal = card?.proposal || {};
        return { ...result, ingredients: texts(proposal.focus_ingredients || card?.items),
          meal_example: text(proposal.meal_example), preparation: text(proposal.preparation),
          characteristics: list(proposal.theory_details).map(row => text(row.text)).filter(Boolean),
          components: list(card?.item_details).map(detail => ({ name: text(detail.consumed_name),
            characteristics: list(detail.theory_details).map(row => text(row.text)).filter(Boolean),
            selection_evidence: basisEvidence(detail.selection_basis) })),
        };
      }
      const detail = list(card?.item_details).find(row => meta.consumed_id && row.consumed_id === meta.consumed_id)
        || list(card?.item_details)[Math.max(0, (meta.order || 1) - 1)] || {};
      const basis = detail.selection_basis || meta.selection_basis || {};
      const theory = list(detail.theory_details).map(row => text(row.text)).filter(Boolean);
      if (!theory.length && basis.theory) theory.push(text(basis.theory));
      return { ...result,
        selection_reason: text(detail.public_reason || meta.selection_reason || card?.body || food.reason || food.recommendation),
        characteristics: theory,
        ingredients: texts(detail.ingredients || detail.focus_ingredients || meta.suggested_ingredients),
        selection_evidence: basisEvidence(basis),
        preparation: text(detail.how_to || detail.preparation || food.how_to),
      };
    }
    if (item.kind === "tsubo_line_care") {
      const line = tsuboSet.line_care || {};
      return { ...result, action: text(line.label || line.action),
        selection_reason: text(line.selection_reason || meta.selection_reason),
        care_facts: lineCareFacts(line.id || meta.rule_id), guidance: text(line.guidance_note),
        intensity: text(line.intensity, 50), care_kind: text(line.care_kind, 40),
        selection_source: text(line.selection_source || meta.selection_source, 30),
        selection_evidence: line.selection_basis || meta.selection_basis || {},
        care_policy: line.care_policy || meta.care_policy || null,
        meridian: text(line.meridian_code || meta.meridian_code, 40),
      };
    }
    if (item.kind === "tsubo_point") {
      const point = list(tsuboSet.points).find(row => row.code === meta.point_code) || {};
      return { ...result, selection_reason: text(point.explanation?.selection_reason_rule_based
          || point.explanation?.selection_reason || item.detail),
        care_facts: pointCareFacts(point), guidance: text(getPointPressGuide(point)),
        characteristics: texts(point.tcm_actions), organ_focus: texts(point.organ_focus),
        meridian: text(point.meridian_code, 40), selection_source: text(point.source, 40),
        care_trigger: text(point.care_trigger_exact, 40),
        role: text(point.role_summary || point.summary || point.care_trigger_role),
      };
    }
    const actions = [lifestylePlan.primary_action, ...list(lifestylePlan.alternatives)].filter(Boolean);
    const action = actions.find(row => row.id === meta.rule_id) || actions[(meta.order || 1) - 1];
    return { ...result, action: text(action?.label || item.label),
      equipment: text(action?.equipment), check_context: text(action?.felt_sense), reset: text(action?.reset), selection_reason: text(action?.reason || item.detail),
      characteristics: texts([action?.reason || lifestylePlan.lead]), guidance: text(action?.guidance || lifestylePlan.guidance) };
  });
}


export function buildResultCareExplanationInput(example) {
  if (!example) return null;
  return { item_key: example.id, kind: "result_line_care", label: example.title,
    action: text(example.action), care_facts: lineCareFacts(example.id),
    guidance: text(example.guidance), selection_evidence: example.selection_basis,
    care_policy: example.care_policy || null,
    scope: "この体質と不調に合う、結果画面のほぐすケア。実際の天気や当日の体感は含まない。" };
}
