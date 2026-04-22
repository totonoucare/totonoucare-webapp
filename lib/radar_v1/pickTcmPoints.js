// lib/radar_v1/pickTcmPoints.js
import { createClient } from "@supabase/supabase-js";

const ACTION_BONUS_BY_TRIGGER = {
  pressure_down: {
    tonify_qi: 1.6,
    support_kidney: 1.4,
    move_qi: 1.0,
    nourish_blood: 1.0,
    transform_damp: 0.8,
  },
  pressure_up: {
    move_qi: 2.0,
    soothe_liver: 2.0,
    move_blood: 1.4,
    generate_fluids: 0.6,
  },
  cold: {
    support_kidney: 2.0,
    tonify_qi: 1.8,
    generate_fluids: 0.8,
    strengthen_spleen: 0.8,
  },
  heat: {
    soothe_liver: 2.0,
    move_qi: 1.6,
    generate_fluids: 1.4,
    nourish_blood: 0.8,
  },
  damp: {
    transform_damp: 2.4,
    strengthen_spleen: 2.0,
    tonify_qi: 1.0,
    move_qi: 0.6,
  },
  dry: {
    generate_fluids: 2.4,
    support_kidney: 2.0,
    nourish_blood: 1.6,
    tonify_qi: 0.8,
    soothe_liver: 0.4,
  },
};

const LABEL_BONUS_BY_TRIGGER = {
  pressure_down: {
    qi_deficiency: 1.0,
    blood_deficiency: 0.8,
    blood_stasis: 0.8,
    fluid_damp: 0.8,
  },
  pressure_up: {
    qi_stagnation: 1.8,
    blood_stasis: 1.0,
    fluid_deficiency: 0.4,
  },
  cold: {
    qi_deficiency: 1.4,
    fluid_deficiency: 1.2,
    blood_deficiency: 0.8,
  },
  heat: {
    qi_stagnation: 1.2,
    fluid_deficiency: 1.4,
    blood_stasis: 0.8,
  },
  damp: {
    fluid_damp: 2.2,
    qi_deficiency: 1.0,
  },
  dry: {
    fluid_deficiency: 2.2,
    blood_deficiency: 1.0,
    qi_deficiency: 0.6,
  },
};

const ORGAN_BONUS_BY_TRIGGER = {
  pressure_down: { kidney: 0.6, spleen: 0.4 },
  pressure_up: { liver: 0.8 },
  cold: { kidney: 1.0, spleen: 0.4 },
  heat: { liver: 0.8, kidney: 0.3 },
  damp: { spleen: 1.0 },
  dry: { kidney: 0.9, liver: 0.3 },
};

const SYMPTOM_HINTS = {
  headache: {
    organ_focus: { liver: 0.8 },
    meridian_code: { lr: 0.6, gb: 0.6, li: 0.5, pc: 0.5, gv: 0.6 },
    point_region: { head_neck: 0.8, limb: 0.3 },
  },
  low_back_pain: {
    organ_focus: { kidney: 1.3 },
    meridian_code: { ki: 0.9, bl: 0.9, cv: 0.5, st: 0.3, sp: 0.3 },
    point_region: { abdomen: 0.7, limb: 0.4 },
  },
  neck_shoulder: {
    organ_focus: { liver: 0.7 },
    meridian_code: { li: 0.7, lu: 0.6, si: 0.7, te: 0.7, gb: 0.5 },
    point_region: { head_neck: 0.6, limb: 0.4 },
  },
  dizziness: {
    organ_focus: { kidney: 0.8, liver: 0.5 },
    meridian_code: { ki: 0.6, pc: 0.5, gv: 0.5, lu: 0.3 },
    point_region: { head_neck: 0.4, limb: 0.3 },
  },
  swelling: {
    organ_focus: { spleen: 1.0, kidney: 0.4 },
    meridian_code: { sp: 0.6, st: 0.6, ki: 0.3 },
    point_region: { abdomen: 0.4, limb: 0.4 },
  },
  fatigue: {
    organ_focus: { spleen: 0.8, kidney: 0.5 },
    meridian_code: { st: 0.6, sp: 0.6, ki: 0.4, lu: 0.3 },
    point_region: { abdomen: 0.3, limb: 0.4 },
  },
  sleep: {
    organ_focus: { kidney: 0.4, liver: 0.4 },
    meridian_code: { ht: 0.5, pc: 0.5, ki: 0.3, gv: 0.3 },
    point_region: { limb: 0.3, head_neck: 0.2 },
  },
  mood: {
    organ_focus: { liver: 0.9 },
    meridian_code: { lr: 0.7, gb: 0.5, pc: 0.5, ht: 0.4 },
    point_region: { limb: 0.3, head_neck: 0.2 },
  },
};

const UNIVERSAL_POINT_PENALTY = {
  CV12: 0.35,
  ST36: 0.25,
};

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function pickTcmPoints({ differentiation, riskContext = null }) {
  if (!differentiation) throw new Error("pickTcmPoints: differentiation is required");

  const supabase = getServiceSupabase();

  const { data: rows, error } = await supabase
    .from("radar_tsubo_points")
    .select("*")
    .eq("is_active", true);

  if (error) throw new Error(`radar_tsubo_points fetch failed: ${error.message}`);

  const allPoints = Array.isArray(rows) ? rows : [];
  const context = buildSelectionContext({ differentiation, riskContext });

  const abdomenPoints = allPoints.filter((p) => p.point_region === "abdomen");
  const classicLimbPoints = allPoints.filter((p) => p.point_region === "limb" && !p.mtest_block);
  const fallbackLimbPoints = allPoints.filter((p) => p.point_region === "limb");

  let chosen = [];
  let abdomenPick = null;

  if (differentiation.need_abdomen) {
    abdomenPick = pickBestScoredPoint({
      points: abdomenPoints,
      slot: "abdomen",
      context,
    });

    if (abdomenPick?.point) {
      chosen.push(abdomenPick.point);
    }
  }

  const primaryLimbPick = pickBestLimbPoint({
    preferredPool: classicLimbPoints,
    fallbackPool: fallbackLimbPoints,
    slot: differentiation.need_abdomen ? "limb_primary_with_abdomen" : "limb_primary",
    context,
    chosen,
  });

  if (primaryLimbPick?.point) {
    chosen.push(primaryLimbPick.point);
  }

  const secondaryWantedActions = Array.isArray(differentiation.secondary_actions) && differentiation.secondary_actions.length
    ? differentiation.secondary_actions
    : differentiation.primary_actions;

  const secondaryLimbPick = pickBestLimbPoint({
    preferredPool: classicLimbPoints,
    fallbackPool: fallbackLimbPoints,
    slot: differentiation.need_abdomen ? "limb_secondary_with_abdomen" : "limb_secondary",
    context: {
      ...context,
      wantedActionsOverride: secondaryWantedActions,
      wantedLabelsOverride: compactUnique([
        differentiation.secondary_label,
        differentiation.primary_label,
      ]),
      secondaryMode: true,
    },
    chosen,
  });

  if (!differentiation.need_abdomen && secondaryLimbPick?.point) {
    chosen.push(secondaryLimbPick.point);
  }

  const points = chosen
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => ({ ...p, source: "tcm" }));

  return {
    points,
    meta: {
      primary_actions: differentiation.primary_actions,
      secondary_actions: differentiation.secondary_actions,
      organ_focus: differentiation.organ_focus,
      need_abdomen: differentiation.need_abdomen,
      abdomen_choice: abdomenPick?.point?.code || differentiation.abdomen_choice || null,
      primary_label: differentiation.primary_label || null,
      secondary_label: differentiation.secondary_label || null,
      symptom_focus: context.symptomFocus || null,
      selection_debug: {
        primary_limb: primaryLimbPick?.debug || null,
        secondary_limb: secondaryLimbPick?.debug || null,
        abdomen: abdomenPick?.debug || null,
      },
    },
  };
}

function buildSelectionContext({ differentiation, riskContext }) {
  const exactTrigger =
    differentiation?.meta?.personal_main_trigger_exact ||
    differentiation?.meta?.weather_main_trigger_exact ||
    null;

  const coarseTrigger = exactTriggerToMainTrigger(exactTrigger) || null;

  const rankedSubLabels = compactUnique([
    differentiation?.primary_label,
    differentiation?.secondary_label,
    ...(Array.isArray(riskContext?.constitution_context?.sub_labels)
      ? riskContext.constitution_context.sub_labels
      : []),
  ]);

  return {
    exactTrigger,
    coarseTrigger,
    triggerDir: riskContext?.summary?.trigger_dir || null,
    symptomFocus: riskContext?.constitution_context?.symptom_focus || null,
    coreCode: riskContext?.constitution_context?.core_code || null,
    wantedActions: compactUnique(differentiation?.primary_actions),
    wantedActionsSecondary: compactUnique(differentiation?.secondary_actions),
    wantedOrgans: compactUnique(differentiation?.organ_focus),
    wantedLabels: compactUnique([
      differentiation?.primary_label,
      differentiation?.secondary_label,
    ]),
    rankedSubLabels,
    preferredAbdomenCode: differentiation?.abdomen_choice || null,
  };
}

function pickBestLimbPoint({ preferredPool, fallbackPool, slot, context, chosen }) {
  const preferred = pickBestScoredPoint({
    points: preferredPool,
    slot,
    context,
    chosen,
  });

  if (preferred?.point) return preferred;

  return pickBestScoredPoint({
    points: fallbackPool,
    slot,
    context,
    chosen,
  });
}

function pickBestScoredPoint({ points, slot, context, chosen = [] }) {
  const chosenCodes = new Set(chosen.map((p) => p.code));
  const chosenMeridians = new Set(chosen.map((p) => String(p.meridian_code || "").toLowerCase()).filter(Boolean));
  const chosenActionSet = new Set(chosen.flatMap((p) => safeArray(p.tcm_actions)));
  const chosenOrganSet = new Set(chosen.flatMap((p) => safeArray(p.organ_focus)));

  const scored = points
    .map((point) => {
      const score = scorePoint(point, {
        slot,
        context,
        chosenCodes,
        chosenMeridians,
        chosenActionSet,
        chosenOrganSet,
      });
      return { point, score };
    })
    .filter((item) => Number.isFinite(item.score))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.point.code).localeCompare(String(b.point.code), "ja");
    });

  const best = scored[0] || null;
  if (!best) return { point: null, debug: null };

  return {
    point: best.point,
    debug: {
      slot,
      selected_code: best.point.code,
      selected_score: round1(best.score),
      top_candidates: scored.slice(0, 5).map((item) => ({
        code: item.point.code,
        score: round1(item.score),
      })),
    },
  };
}

function scorePoint(point, { slot, context, chosenCodes, chosenMeridians, chosenActionSet, chosenOrganSet }) {
  if (!point?.code || chosenCodes.has(point.code)) return Number.NEGATIVE_INFINITY;

  const region = point.point_region;
  if (slot === "abdomen" && region !== "abdomen") return Number.NEGATIVE_INFINITY;
  if (slot !== "abdomen" && region !== "limb") return Number.NEGATIVE_INFINITY;

  const actions = safeArray(point.tcm_actions);
  const organs = safeArray(point.organ_focus);
  const triggerTags = safeArray(point.tags_trigger);
  const symptomTags = safeArray(point.tags_symptom);
  const subTags = safeArray(point.tags_sub);
  const meridian = String(point.meridian_code || "").toLowerCase();

  const wantedActions = compactUnique(context.wantedActionsOverride || context.wantedActions);
  const wantedOrgans = compactUnique(context.wantedOrgans);
  const wantedLabels = compactUnique(context.wantedLabelsOverride || context.wantedLabels);
  const rankedSubLabels = compactUnique(context.rankedSubLabels);
  const exactTrigger = context.exactTrigger;
  const coarseTrigger = context.coarseTrigger;
  const symptomFocus = context.symptomFocus;
  const symptomHints = symptomFocus ? SYMPTOM_HINTS[symptomFocus] || null : null;

  let score = 0;

  // Prefer classic TCM points for the TCM slot; keep mtest-specific points as fallback only.
  score += point.mtest_block ? -1.1 : 0.5;

  // Core action fit.
  score += overlapCount(actions, wantedActions) * 3.4;
  score += overlapCount(actions, context.wantedActionsSecondary) * 1.7;

  // Organ / label fit.
  score += overlapCount(organs, wantedOrgans) * 2.4;
  score += overlapWeighted(subTags, wantedLabels, [2.6, 1.8, 1.2]);
  score += overlapWeighted(subTags, rankedSubLabels, [1.5, 1.0, 0.7, 0.4]);

  // Trigger fit.
  if (coarseTrigger && triggerTags.includes(coarseTrigger)) {
    score += 1.6;
  }

  score += sumActionBonuses(actions, ACTION_BONUS_BY_TRIGGER[exactTrigger]);
  score += sumLabelBonuses(subTags, LABEL_BONUS_BY_TRIGGER[exactTrigger]);
  score += sumOrganBonuses(organs, ORGAN_BONUS_BY_TRIGGER[exactTrigger]);

  // Symptom bridge fit.
  if (symptomFocus && symptomTags.includes(symptomFocus)) {
    score += slot === "abdomen" ? 2.0 : 2.8;
  }

  if (symptomHints) {
    score += valueFromMap(symptomHints.organ_focus, organs);
    score += valueFromMap(symptomHints.meridian_code, [meridian]);
    score += valueFromMap(symptomHints.point_region, [region]);
  }

  // Abdomen choice should steer, not hard-force.
  if (slot === "abdomen") {
    if (point.code === context.preferredAbdomenCode) {
      score += 2.6;
    }

    if (symptomFocus === "low_back_pain" && point.code === "CV6") {
      score += 1.8;
    }
    if ((symptomFocus === "swelling" || symptomFocus === "fatigue") && point.code === "CV12") {
      score += 1.0;
    }
  }

  // Once abdomen is chosen, limb points should do more bridging / finishing work.
  if (slot === "limb_primary_with_abdomen") {
    if (symptomFocus && symptomTags.includes(symptomFocus)) score += 0.8;
    if (coarseTrigger && triggerTags.includes(coarseTrigger)) score += 0.6;
  }

  if (slot === "limb_secondary" || slot === "limb_secondary_with_abdomen") {
    score += context.secondaryMode ? 0.4 : 0;
    score -= overlapCount(actions, Array.from(chosenActionSet)) * 0.45;
    score -= overlapCount(organs, Array.from(chosenOrganSet)) * 0.35;
    if (meridian && chosenMeridians.has(meridian)) score -= 0.7;
  }

  // Mild penalty for points that otherwise win by being too generic every day.
  score -= UNIVERSAL_POINT_PENALTY[point.code] || 0;

  return score;
}

function exactTriggerToMainTrigger(exactTrigger) {
  switch (exactTrigger) {
    case "pressure_down":
    case "pressure_up":
      return "pressure";
    case "cold":
    case "heat":
      return "temp";
    case "damp":
    case "dry":
      return "humidity";
    default:
      return null;
  }
}

function overlapCount(a, b) {
  const bSet = new Set(safeArray(b));
  return safeArray(a).filter((item) => bSet.has(item)).length;
}

function overlapWeighted(pointTags, wantedTags, weights = []) {
  const pointSet = new Set(safeArray(pointTags));
  return safeArray(wantedTags).reduce((sum, tag, idx) => {
    if (!pointSet.has(tag)) return sum;
    return sum + (weights[idx] ?? weights[weights.length - 1] ?? 0.6);
  }, 0);
}

function sumActionBonuses(actions, bonusMap) {
  if (!bonusMap) return 0;
  return safeArray(actions).reduce((sum, action) => sum + Number(bonusMap[action] || 0), 0);
}

function sumLabelBonuses(labels, bonusMap) {
  if (!bonusMap) return 0;
  return safeArray(labels).reduce((sum, label) => sum + Number(bonusMap[label] || 0), 0);
}

function sumOrganBonuses(organs, bonusMap) {
  if (!bonusMap) return 0;
  return safeArray(organs).reduce((sum, organ) => sum + Number(bonusMap[organ] || 0), 0);
}

function valueFromMap(map, keys) {
  if (!map) return 0;
  return safeArray(keys).reduce((sum, key) => sum + Number(map[key] || 0), 0);
}

function compactUnique(items) {
  return [...new Set(safeArray(items).filter(Boolean))];
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function round1(n) {
  return Math.round(Number(n || 0) * 10) / 10;
}

