// lib/radar_v1/differentiation.js

/**
 * TCM differentiation for Radar v1
 *
 * Input:
 * - sub_labels (ordered pathological pattern candidates)
 * - core_code (pace / reserve nuance)
 * - weather stress summary
 *
 * Output:
 * - primary / secondary treatment actions
 * - organ focus (liver / spleen / kidney)
 * - whether abdomen is needed
 * - CV12 or CV6 when abdomen is needed
 *
 * Philosophy:
 * - sub_labels order is respected first
 * - weather can promote the 2nd label when today's stress matches strongly
 * - 6-channel weather (pressure_up / heat / dry) is also used when available
 * - batt_small increases support need, but does not automatically override everything
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

/**
 * @param {{
 *   core_code?: string | null,
 *   sub_labels?: string[] | null,
 *   weatherStress?: {
 *     main_trigger?: 'pressure'|'temp'|'humidity',
 *     trigger_dir?: 'up'|'down'|'none',
 *     weather_main_trigger_exact?: 'pressure_down'|'pressure_up'|'cold'|'heat'|'damp'|'dry'|'none',
 *     personal_main_trigger_exact?: 'pressure_down'|'pressure_up'|'cold'|'heat'|'damp'|'dry'|'none',
 *     pressure_down_strength?: number,
 *     pressure_up_strength?: number,
 *     cold_strength?: number,
 *     heat_strength?: number,
 *     damp_strength?: number,
 *     dry_strength?: number,
 *   }
 * }} args
 */
export function differentiateForTcm({
  core_code = "",
  sub_labels = [],
  weatherStress = {},
}) {
  const labels = Array.isArray(sub_labels) ? sub_labels.filter(Boolean).slice(0, 3) : [];

  const exactTrigger = normalizeExactTrigger(weatherStress);
  const strengths = normalizeStrengths(weatherStress);

  const isBattSmall = core_code.includes("batt_small");
  const isBattLarge = core_code.includes("batt_large");
  const isAccel = core_code.startsWith("accel");
  const isBrake = core_code.startsWith("brake");

  const ctx = {
    exactTrigger,
    strengths,
    isBattSmall,
    isBattLarge,
    isAccel,
    isBrake,
  };

  const primaryLabel = pickPrimaryLabel(labels, ctx);
  const secondaryLabel = pickSecondaryLabel(labels, primaryLabel, ctx);

  const primaryActions = labelToActions(primaryLabel);
  const secondaryActions = labelToActions(secondaryLabel);

  applyWeatherNuance(primaryActions, ctx, primaryLabel, secondaryLabel);

  const organFocus = buildOrganFocus({
    primaryLabel,
    secondaryLabel,
    labels,
    ctx,
  });

  const needAbdomen = decideNeedAbdomen({
    labels,
    primaryLabel,
    secondaryLabel,
    ctx,
  });

  const abdomenChoice = needAbdomen
    ? decideAbdomenChoice({ primaryLabel, secondaryLabel, organFocus, ctx })
    : null;

  return {
    primary_label: primaryLabel,
    secondary_label: secondaryLabel,

    primary_actions: uniq(primaryActions),
    secondary_actions: uniq(secondaryActions),

    organ_focus: organFocus,
    need_abdomen: needAbdomen,
    abdomen_choice: abdomenChoice,

    meta: {
      exact_trigger: exactTrigger,
      strengths,
      is_batt_small: isBattSmall,
      is_batt_large: isBattLarge,
      is_accel: isAccel,
      is_brake: isBrake,
      ranked_labels: labels,
      primary_score: primaryLabel ? round3(scoreLabel(primaryLabel, getRankIndex(labels, primaryLabel), ctx)) : null,
      secondary_score: secondaryLabel ? round3(scoreLabel(secondaryLabel, getRankIndex(labels, secondaryLabel), ctx)) : null,
    },
  };
}

function normalizeExactTrigger(weatherStress) {
  if (weatherStress?.personal_main_trigger_exact) {
    return weatherStress.personal_main_trigger_exact;
  }
  if (weatherStress?.weather_main_trigger_exact) {
    return weatherStress.weather_main_trigger_exact;
  }

  const mainTrigger = weatherStress?.main_trigger || "pressure";
  const triggerDir = weatherStress?.trigger_dir || "none";

  if (mainTrigger === "pressure" && triggerDir === "down") return "pressure_down";
  if (mainTrigger === "pressure" && triggerDir === "up") return "pressure_up";
  if (mainTrigger === "temp" && triggerDir === "down") return "cold";
  if (mainTrigger === "temp" && triggerDir === "up") return "heat";
  if (mainTrigger === "humidity" && triggerDir === "up") return "damp";
  if (mainTrigger === "humidity" && triggerDir === "down") return "dry";

  return "none";
}

function normalizeStrengths(weatherStress) {
  return {
    pressure_down: Number(weatherStress?.pressure_down_strength ?? 0) || 0,
    pressure_up: Number(weatherStress?.pressure_up_strength ?? 0) || 0,
    cold: Number(weatherStress?.cold_strength ?? 0) || 0,
    heat: Number(weatherStress?.heat_strength ?? 0) || 0,
    damp: Number(weatherStress?.damp_strength ?? 0) || 0,
    dry: Number(weatherStress?.dry_strength ?? 0) || 0,
  };
}

function pickPrimaryLabel(labels, ctx) {
  if (!labels.length) {
    return inferFallbackPrimary(ctx);
  }

  const scored = labels
    .map((label, index) => ({
      label,
      score: scoreLabel(label, index, ctx),
      index,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.index - b.index;
    });

  return scored[0]?.label || inferFallbackPrimary(ctx);
}

function pickSecondaryLabel(labels, primaryLabel, ctx) {
  const rest = labels.filter((x) => x && x !== primaryLabel);

  if (rest.length > 0) {
    const scored = rest
      .map((label) => ({
        label,
        score: scoreLabel(label, getRankIndex(labels, label), ctx),
      }))
      .sort((a, b) => b.score - a.score);

    return scored[0]?.label || inferFallbackSecondary(primaryLabel, ctx);
  }

  return inferFallbackSecondary(primaryLabel, ctx);
}

function scoreLabel(label, rankIndex, ctx) {
  let score = RANK_BASE[rankIndex] ?? 0.45;

  const s = ctx.strengths;
  const t = ctx.exactTrigger;

  switch (label) {
    case "qi_deficiency":
      if (t === "pressure_down") score += 0.14;
      if (t === "cold") score += 0.16;
      if (t === "damp") score += 0.14;
      score += s.cold * 0.18;
      score += s.damp * 0.16;
      score += s.pressure_down * 0.12;
      if (ctx.isBattSmall) score += 0.16;
      if (ctx.isBrake) score += 0.06;
      break;

    case "blood_deficiency":
      if (t === "cold") score += 0.10;
      if (t === "dry") score += 0.12;
      score += s.cold * 0.12;
      score += s.dry * 0.18;
      if (ctx.isBattSmall) score += 0.08;
      break;

    case "fluid_deficiency":
      if (t === "dry") score += 0.18;
      if (t === "heat") score += 0.14;
      score += s.dry * 0.22;
      score += s.heat * 0.16;
      score += s.pressure_up * 0.06;
      break;

    case "qi_stagnation":
      if (t === "pressure_up") score += 0.16;
      if (t === "heat") score += 0.16;
      if (t === "pressure_down") score += 0.04; // 低気圧で張りが出る余地だけ少し残す
      score += s.pressure_up * 0.18;
      score += s.heat * 0.18;
      score += s.pressure_down * 0.06;
      if (ctx.isAccel) score += 0.10;
      break;

    case "blood_stasis":
      if (t === "pressure_down") score += 0.12;
      if (t === "cold") score += 0.12;
      score += s.pressure_down * 0.14;
      score += s.cold * 0.12;
      score += s.damp * 0.06;
      break;

    case "fluid_damp":
      if (t === "damp") score += 0.20;
      if (t === "cold") score += 0.10;
      if (t === "pressure_down") score += 0.10;
      score += s.damp * 0.24;
      score += s.cold * 0.12;
      score += s.pressure_down * 0.12;
      if (ctx.isBrake) score += 0.10;
      break;

    default:
      break;
  }

  return score;
}

function inferFallbackPrimary(ctx) {
  const t = ctx.exactTrigger;

  if (t === "damp") return "fluid_damp";
  if (t === "cold") return ctx.isBattSmall ? "qi_deficiency" : "blood_stasis";
  if (t === "pressure_down") return ctx.isBrake ? "fluid_damp" : "qi_stagnation";
  if (t === "heat") return ctx.isAccel ? "qi_stagnation" : "fluid_deficiency";
  if (t === "dry") return "fluid_deficiency";
  if (t === "pressure_up") return "qi_stagnation";

  return ctx.isBrake ? "qi_deficiency" : "qi_stagnation";
}

function inferFallbackSecondary(primaryLabel, ctx) {
  const t = ctx.exactTrigger;

  const candidates = {
    qi_deficiency: t === "damp" ? "fluid_damp" : t === "cold" ? "blood_deficiency" : "fluid_damp",
    blood_deficiency: t === "dry" || t === "heat" ? "fluid_deficiency" : "qi_deficiency",
    fluid_deficiency: t === "heat" ? "qi_stagnation" : "blood_deficiency",
    qi_stagnation: t === "pressure_down" ? "blood_stasis" : "fluid_damp",
    blood_stasis: t === "cold" ? "qi_deficiency" : "qi_stagnation",
    fluid_damp: t === "pressure_down" || t === "cold" ? "qi_deficiency" : "blood_stasis",
  };

  return candidates[primaryLabel] || null;
}

function labelToActions(label) {
  return [...(LABEL_ACTIONS[label] || [])];
}

function applyWeatherNuance(primaryActions, ctx, primaryLabel, secondaryLabel) {
  const t = ctx.exactTrigger;
  const s = ctx.strengths;

  if (t === "cold") {
    if (!primaryActions.includes("support_kidney")) primaryActions.push("support_kidney");
  }

  if (t === "damp") {
    if (!primaryActions.includes("strengthen_spleen")) primaryActions.push("strengthen_spleen");
    if (!primaryActions.includes("transform_damp")) primaryActions.push("transform_damp");
  }

  if (t === "heat") {
    if (
      primaryLabel === "qi_stagnation" ||
      secondaryLabel === "qi_stagnation" ||
      s.heat >= 0.5
    ) {
      if (!primaryActions.includes("soothe_liver")) primaryActions.push("soothe_liver");
    }
  }

  if (t === "dry") {
    if (
      primaryLabel === "fluid_deficiency" ||
      secondaryLabel === "fluid_deficiency"
    ) {
      if (!primaryActions.includes("generate_fluids")) primaryActions.push("generate_fluids");
    }
  }

  if (t === "pressure_down" && ctx.isBrake) {
    if (!primaryActions.includes("strengthen_spleen")) primaryActions.push("strengthen_spleen");
  }

  if (t === "pressure_up" && ctx.isAccel) {
    if (!primaryActions.includes("soothe_liver")) primaryActions.push("soothe_liver");
  }
}

function buildOrganFocus({ primaryLabel, secondaryLabel, labels, ctx }) {
  const organs = [];

  const has = (x) => labels.includes(x) || primaryLabel === x || secondaryLabel === x;
  const t = ctx.exactTrigger;
  const s = ctx.strengths;

  // spleen
  if (
    has("qi_deficiency") ||
    has("fluid_damp") ||
    t === "damp" ||
    s.damp >= 0.45
  ) {
    organs.push("spleen");
  }

  // liver
  if (
    has("qi_stagnation") ||
    has("blood_stasis") ||
    t === "pressure_up" ||
    t === "heat" ||
    (t === "pressure_down" && ctx.isAccel)
  ) {
    organs.push("liver");
  }

  // kidney
  if (
    has("fluid_deficiency") ||
    (has("blood_deficiency") && ctx.isBattSmall) ||
    t === "cold" ||
    t === "dry" ||
    s.cold >= 0.45 ||
    s.dry >= 0.45
  ) {
    organs.push("kidney");
  }

  return uniq(organs).slice(0, 2);
}

function decideNeedAbdomen({ labels, primaryLabel, secondaryLabel, ctx }) {
  const has = (x) => labels.includes(x) || primaryLabel === x || secondaryLabel === x;
  const t = ctx.exactTrigger;
  const s = ctx.strengths;

  return (
    ctx.isBattSmall ||
    has("qi_deficiency") ||
    has("fluid_damp") ||
    has("fluid_deficiency") ||
    t === "cold" ||
    t === "damp" ||
    s.cold >= 0.45 ||
    s.damp >= 0.45 ||
    s.dry >= 0.52
  );
}

function decideAbdomenChoice({ primaryLabel, secondaryLabel, organFocus, ctx }) {
  const labels = [primaryLabel, secondaryLabel].filter(Boolean);
  const has = (x) => labels.includes(x);

  // damp / spleen / qi-deficiency -> CV12
  if (
    has("qi_deficiency") ||
    has("fluid_damp") ||
    organFocus.includes("spleen") ||
    ctx.exactTrigger === "damp" ||
    ctx.strengths.damp >= 0.45
  ) {
    return "CV12";
  }

  // dry / cold / kidney / fluid-deficiency -> CV6
  if (
    has("fluid_deficiency") ||
    organFocus.includes("kidney") ||
    ctx.exactTrigger === "dry" ||
    ctx.exactTrigger === "cold" ||
    ctx.strengths.dry >= 0.45 ||
    ctx.strengths.cold >= 0.45
  ) {
    return "CV6";
  }

  return ctx.isBrake ? "CV12" : "CV6";
}

function getRankIndex(labels, label) {
  const idx = labels.indexOf(label);
  return idx >= 0 ? idx : 2;
}

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function round3(v) {
  return Math.round(v * 1000) / 1000;
}
