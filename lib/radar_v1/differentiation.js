// lib/radar_v1/differentiation.js

/**
 * TCM differentiation for Radar v1
 *
 * Input:
 * - sub_labels (ordered pathological pattern candidates)
 * - core_code (pace / reserve nuance)
 * - weather stress summary
 * - symptom_focus (optional, used only as a mild contextual nudge)
 *
 * Output:
 * - primary / secondary treatment actions
 * - organ focus (liver / spleen / kidney)
 * - whether abdomen is needed
 * - CV12 or CV6 when abdomen is needed
 *
 * Philosophy:
 * - sub_labels order remains the base signal
 * - today's trigger can reshape emphasis, but should not erase constitution
 * - dry / damp / pressure_down should not collapse into the same abdomen logic
 * - symptom_focus is a supporting cue, not the main driver
 */

const DEFICIENCY_LABELS = new Set([
  "qi_deficiency",
  "blood_deficiency",
  "fluid_deficiency",
]);

const EXCESS_LABELS = new Set([
  "qi_stagnation",
  "blood_stasis",
  "fluid_damp",
]);

const RANK_BASE = [1.0, 0.72, 0.55];

const LABEL_ACTIONS = {
  qi_deficiency: ["tonify_qi", "strengthen_spleen"],
  blood_deficiency: ["nourish_blood"],
  fluid_deficiency: ["generate_fluids", "support_kidney"],
  qi_stagnation: ["move_qi", "soothe_liver"],
  blood_stasis: ["move_blood"],
  fluid_damp: ["transform_damp", "strengthen_spleen"],
};

export function differentiateForTcm({
  core_code,
  sub_labels,
  weatherStress,
  symptom_focus = null,
}) {
  const labels = normalizeSubLabels(sub_labels);
  const ctx = buildContext(core_code, weatherStress, symptom_focus);

  const weighted = labels.map((label, idx) => ({
    label,
    rank: idx,
    score: scoreLabel(label, idx, ctx),
  }));

  const sorted = weighted.sort((a, b) => b.score - a.score);
  const topLabels = pickTopLabels(sorted, ctx);

  const primaryLabel = topLabels[0] || labels[0] || null;
  const secondaryLabel = topLabels[1] || labels[1] || null;

  const primaryActions = buildActions(primaryLabel, ctx, topLabels, "primary");
  const secondaryActions = buildActions(secondaryLabel, ctx, topLabels, "secondary");
  const organFocus = buildOrganFocus(topLabels, ctx);
  const needAbdomen = decideNeedAbdomen(topLabels, ctx, organFocus);
  const abdomenChoice = needAbdomen
    ? decideAbdomenChoice(topLabels, ctx, organFocus)
    : null;

  return {
    primary_label: primaryLabel,
    secondary_label: secondaryLabel,
    primary_actions: primaryActions,
    secondary_actions: secondaryActions,
    organ_focus: organFocus,
    need_abdomen: needAbdomen,
    abdomen_choice: abdomenChoice,
    meta: {
      exact_trigger: ctx.exactTrigger,
      strengths: ctx.strengths,
      symptom_focus: ctx.symptomFocus,
      is_batt_small: ctx.isBattSmall,
      is_batt_large: ctx.isBattLarge,
      is_accel: ctx.isAccel,
      is_brake: ctx.isBrake,
      ranked_labels: topLabels,
      primary_score: primaryLabel
        ? round3(sorted.find((x) => x.label === primaryLabel)?.score || 0)
        : 0,
      secondary_score: secondaryLabel
        ? round3(sorted.find((x) => x.label === secondaryLabel)?.score || 0)
        : 0,
    },
  };
}

function normalizeSubLabels(sub_labels) {
  if (!Array.isArray(sub_labels)) return [];
  return sub_labels
    .map((x) => (typeof x === "string" ? x : x?.code))
    .filter(Boolean)
    .slice(0, 3);
}

function buildContext(core_code, weatherStress, symptom_focus) {
  const code = String(core_code || "");
  const exactTrigger =
    weatherStress?.personal_main_trigger_exact ||
    weatherStress?.weather_main_trigger_exact ||
    null;

  return {
    exactTrigger,
    symptomFocus: typeof symptom_focus === "string" ? symptom_focus : null,
    strengths: {
      pressure_down: Number(weatherStress?.pressure_down_strength || 0),
      pressure_up: Number(weatherStress?.pressure_up_strength || 0),
      cold: Number(weatherStress?.cold_strength || 0),
      heat: Number(weatherStress?.heat_strength || 0),
      damp: Number(weatherStress?.damp_strength || 0),
      dry: Number(weatherStress?.dry_strength || 0),
    },
    isBattSmall: code.includes("batt_small"),
    isBattLarge: code.includes("batt_large"),
    isAccel: code.startsWith("accel_"),
    isBrake: code.startsWith("brake_"),
  };
}

function scoreLabel(label, rankIndex, ctx) {
  const s = ctx.strengths;
  const t = ctx.exactTrigger;
  const rankBase = RANK_BASE[Math.min(rankIndex, RANK_BASE.length - 1)] || 0.55;
  let score = rankBase;

  switch (label) {
    case "qi_deficiency": {
      score += s.pressure_down * 0.18;
      score += s.cold * 0.22;
      score += s.damp * 0.10;
      score += s.dry * 0.02;
      if (t === "pressure_down") score += 0.12;
      if (t === "cold") score += 0.14;
      if (t === "damp") score += 0.08;
      if (ctx.isBattSmall) score += 0.18;
      if (ctx.isBrake) score += 0.06;
      if (ctx.symptomFocus === "fatigue") score += 0.12;
      if (ctx.symptomFocus === "low_back_pain") score += 0.05;
      break;
    }

    case "blood_deficiency": {
      score += s.cold * 0.10;
      score += s.dry * 0.22;
      score += s.heat * 0.05;
      if (t === "dry") score += 0.14;
      if (t === "cold") score += 0.06;
      if (ctx.isBattSmall) score += 0.05;
      if (ctx.symptomFocus === "dizziness") score += 0.12;
      if (ctx.symptomFocus === "sleep") score += 0.08;
      break;
    }

    case "fluid_deficiency": {
      score += s.dry * 0.34;
      score += s.heat * 0.16;
      score += s.cold * 0.05;
      score -= s.damp * 0.10;
      if (t === "dry") score += 0.24;
      if (t === "heat") score += 0.10;
      if (ctx.isBattSmall) score += 0.06;
      if (ctx.symptomFocus === "low_back_pain") score += 0.10;
      if (ctx.symptomFocus === "dizziness") score += 0.08;
      break;
    }

    case "qi_stagnation": {
      score += s.pressure_up * 0.22;
      score += s.heat * 0.16;
      score += s.pressure_down * 0.06;
      if (t === "pressure_up") score += 0.16;
      if (t === "heat") score += 0.10;
      if (ctx.isAccel) score += 0.10;
      if (ctx.symptomFocus === "mood") score += 0.10;
      if (ctx.symptomFocus === "headache") score += 0.06;
      break;
    }

    case "blood_stasis": {
      score += s.pressure_down * 0.18;
      score += s.cold * 0.08;
      if (t === "pressure_down") score += 0.14;
      if (ctx.isAccel) score += 0.04;
      if (ctx.symptomFocus === "headache") score += 0.10;
      if (ctx.symptomFocus === "neck_shoulder") score += 0.08;
      break;
    }

    case "fluid_damp": {
      score += s.damp * 0.34;
      score += s.cold * 0.12;
      score += s.pressure_down * 0.10;
      score -= s.dry * 0.18;
      if (t === "damp") score += 0.24;
      if (t === "cold") score += 0.06;
      if (t === "pressure_down") score += 0.08;
      if (ctx.isBrake) score += 0.10;
      if (ctx.symptomFocus === "swelling") score += 0.14;
      if (ctx.symptomFocus === "low_back_pain") score += 0.06;
      break;
    }

    default:
      break;
  }

  return score;
}

function pickTopLabels(sorted, ctx) {
  const labels = sorted.map((x) => x.label).filter(Boolean);
  if (!labels.length) return [];
  if (labels.length === 1) return labels;

  const chosen = [labels[0]];

  const secondDefault = labels[1] || null;
  const secondDefaultScore = sorted.find((x) => x.label === secondDefault)?.score || 0;

  const preferred = getTriggerPreferredSecondaryLabels(ctx);
  const promoted = preferred
    .map((label) => ({
      label,
      score: sorted.find((x) => x.label === label)?.score ?? -Infinity,
    }))
    .filter((x) => x.score > -Infinity && !chosen.includes(x.label))
    .sort((a, b) => b.score - a.score)[0];

  if (promoted && promoted.score >= secondDefaultScore - 0.14) {
    chosen.push(promoted.label);
  } else if (secondDefault) {
    chosen.push(secondDefault);
  }

  return uniq(chosen).slice(0, 2);
}

function getTriggerPreferredSecondaryLabels(ctx) {
  switch (ctx.exactTrigger) {
    case "dry":
      return ["fluid_deficiency", "blood_deficiency", "qi_deficiency"];
    case "damp":
      return ["fluid_damp", "qi_deficiency"];
    case "pressure_down":
      return ctx.isAccel
        ? ["blood_stasis", "qi_stagnation", "qi_deficiency"]
        : ["qi_deficiency", "fluid_damp", "blood_stasis"];
    case "cold":
      return ["qi_deficiency", "fluid_deficiency", "blood_deficiency"];
    case "heat":
      return ["qi_stagnation", "fluid_deficiency"];
    default:
      return [];
  }
}

function buildActions(label, ctx, topLabels, slot = "primary") {
  const actions = uniq(LABEL_ACTIONS[label] || []);

  if (ctx.exactTrigger === "cold") {
    pushIf(actions, "support_kidney");
  }

  if (ctx.exactTrigger === "damp") {
    pushIf(actions, "strengthen_spleen");
    pushIf(actions, "transform_damp");
  }

  if (ctx.exactTrigger === "heat" && topLabels.includes("qi_stagnation")) {
    pushIf(actions, "soothe_liver");
  }

  if (ctx.exactTrigger === "dry") {
    pushIf(actions, "generate_fluids");
    if (
      ctx.isBattSmall ||
      ctx.symptomFocus === "low_back_pain" ||
      topLabels.includes("fluid_deficiency")
    ) {
      pushIf(actions, "support_kidney");
    }
  }

  if (
    ctx.exactTrigger === "pressure_down" &&
    ctx.isBattSmall &&
    (slot === "secondary" || topLabels.includes("qi_deficiency"))
  ) {
    pushIf(actions, "support_kidney");
  }

  return uniq(actions);
}

function buildOrganFocus(topLabels, ctx) {
  const scores = {
    spleen: 0,
    liver: 0,
    kidney: 0,
  };

  topLabels.forEach((label, idx) => {
    const w = idx === 0 ? 1.0 : 0.72;

    switch (label) {
      case "qi_deficiency":
        scores.spleen += 1.15 * w;
        scores.kidney += 0.18 * w;
        break;
      case "fluid_damp":
        scores.spleen += 1.25 * w;
        scores.kidney += 0.16 * w;
        break;
      case "qi_stagnation":
        scores.liver += 1.20 * w;
        break;
      case "blood_stasis":
        scores.liver += 1.00 * w;
        scores.kidney += 0.18 * w;
        break;
      case "fluid_deficiency":
        scores.kidney += 1.20 * w;
        scores.liver += 0.10 * w;
        break;
      case "blood_deficiency":
        scores.kidney += 0.78 * w;
        scores.liver += 0.46 * w;
        break;
      default:
        break;
    }
  });

  switch (ctx.exactTrigger) {
    case "damp":
      scores.spleen += 1.00;
      break;
    case "dry":
      scores.kidney += 1.10;
      scores.liver += 0.12;
      break;
    case "pressure_down":
      scores.kidney += 0.42;
      scores.spleen += 0.30;
      break;
    case "cold":
      scores.kidney += 0.68;
      scores.spleen += 0.26;
      break;
    case "heat":
      scores.liver += 0.72;
      break;
    default:
      break;
  }

  switch (ctx.symptomFocus) {
    case "low_back_pain":
      scores.kidney += 0.85;
      scores.spleen += 0.10;
      break;
    case "headache":
      scores.liver += 0.72;
      break;
    case "swelling":
      scores.spleen += 0.72;
      scores.kidney += 0.15;
      break;
    case "fatigue":
      scores.spleen += 0.58;
      scores.kidney += 0.12;
      break;
    case "dizziness":
      scores.kidney += 0.42;
      scores.liver += 0.20;
      break;
    default:
      break;
  }

  if (ctx.isBattSmall) scores.kidney += 0.24;
  if (ctx.isBrake) scores.spleen += 0.10;
  if (ctx.isAccel) scores.liver += 0.08;

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .filter(([, score]) => score >= 0.75)
    .slice(0, 2)
    .map(([organ]) => organ);
}

function decideNeedAbdomen(topLabels, ctx, organFocus) {
  const has = (label) => topLabels.includes(label);
  let score = 0;

  if (ctx.isBattSmall) score += 1.00;
  if (has("qi_deficiency") && has("fluid_damp")) score += 0.70;
  if (has("fluid_deficiency") && has("blood_deficiency")) score += 0.60;

  if (
    (ctx.exactTrigger === "damp" || ctx.strengths.damp >= 0.45) &&
    (has("fluid_damp") || has("qi_deficiency") || organFocus.includes("spleen"))
  ) {
    score += 1.00;
  }

  if (
    (ctx.exactTrigger === "dry" || ctx.strengths.dry >= 0.48) &&
    (has("fluid_deficiency") || has("blood_deficiency") || organFocus.includes("kidney"))
  ) {
    score += 0.95;
  }

  if (
    (ctx.exactTrigger === "cold" || ctx.strengths.cold >= 0.50) &&
    (has("qi_deficiency") || has("fluid_deficiency") || has("blood_deficiency"))
  ) {
    score += 0.75;
  }

  if (
    ctx.exactTrigger === "pressure_down" &&
    ctx.isBrake &&
    (has("qi_deficiency") || has("fluid_damp"))
  ) {
    score += 0.45;
  }

  if (ctx.symptomFocus === "low_back_pain" && organFocus.includes("kidney")) {
    score += 0.25;
  }

  if (
    ctx.isAccel &&
    !ctx.isBattSmall &&
    !has("qi_deficiency") &&
    !has("fluid_deficiency") &&
    !has("blood_deficiency")
  ) {
    score -= 0.55;
  }

  return score >= 1.25;
}

function decideAbdomenChoice(topLabels, ctx, organFocus) {
  const has = (label) => topLabels.includes(label);
  let cv12 = 0;
  let cv6 = 0;

  if (organFocus.includes("spleen")) cv12 += 0.80;
  if (organFocus.includes("kidney")) cv6 += 0.88;

  if (has("fluid_damp")) cv12 += 1.00;
  if (has("qi_deficiency")) {
    cv12 += 0.46;
    cv6 += 0.22;
  }
  if (has("fluid_deficiency")) cv6 += 1.08;
  if (has("blood_deficiency")) cv6 += 0.52;

  switch (ctx.exactTrigger) {
    case "damp":
      cv12 += 1.10;
      break;
    case "dry":
      cv6 += 1.25;
      break;
    case "cold":
      cv6 += 0.72;
      break;
    case "pressure_down":
      cv12 += ctx.isBrake ? 0.34 : 0;
      cv6 += ctx.isBattSmall ? 0.34 : 0;
      break;
    default:
      break;
  }

  cv12 += ctx.strengths.damp * 0.30;
  cv6 += ctx.strengths.dry * 0.36;
  cv6 += ctx.strengths.cold * 0.18;

  switch (ctx.symptomFocus) {
    case "low_back_pain":
      cv6 += 0.42;
      break;
    case "swelling":
    case "fatigue":
      cv12 += 0.22;
      break;
    case "dizziness":
      cv6 += 0.14;
      break;
    default:
      break;
  }

  if (cv6 >= cv12 + 0.18) return "CV6";
  if (cv12 >= cv6 + 0.18) return "CV12";

  if (ctx.exactTrigger === "dry" || ctx.exactTrigger === "cold") return "CV6";
  return "CV12";
}

function pushIf(arr, value) {
  if (!value) return;
  arr.push(value);
}

function uniq(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}

function round3(v) {
  return Math.round(v * 1000) / 1000;
}
