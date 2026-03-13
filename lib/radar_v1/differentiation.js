// lib/radar_v1/differentiation.js

/**
 * TCM differentiation for Radar v1
 *
 * Input:
 * - sub_labels (main pathological pattern)
 * - core_code (nuance / reserve)
 * - weather stress summary
 *
 * Output:
 * - primary / secondary treatment actions
 * - organ focus (liver / spleen / kidney)
 * - whether abdomen is needed
 * - CV12 or CV6 when abdomen is needed
 *
 * Philosophy:
 * - sub_labels are primary
 * - if any deficiency exists, deficiency is treated as the primary axis
 * - weather modifies today's emphasis
 * - core modifies intensity / abdomen need
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

/**
 * @param {{
 *   core_code?: string | null,
 *   sub_labels?: string[] | null,
 *   weatherStress: {
 *     main_trigger: 'pressure'|'temp'|'humidity',
 *     trigger_dir: 'up'|'down'|'none',
 *     pressure_down_strength?: number,
 *     cold_strength?: number,
 *     damp_strength?: number
 *   }
 * }} args
 */
export function differentiateForTcm({ core_code = "", sub_labels = [], weatherStress }) {
  const labels = Array.isArray(sub_labels) ? sub_labels.filter(Boolean) : [];
  const mainTrigger = weatherStress?.main_trigger || "pressure";
  const triggerDir = weatherStress?.trigger_dir || "none";

  const hasQiDef = labels.includes("qi_deficiency");
  const hasBloodDef = labels.includes("blood_deficiency");
  const hasFluidDef = labels.includes("fluid_deficiency");

  const hasQiStag = labels.includes("qi_stagnation");
  const hasBloodStasis = labels.includes("blood_stasis");
  const hasFluidDamp = labels.includes("fluid_damp");

  const hasAnyDeficiency = hasQiDef || hasBloodDef || hasFluidDef;

  const isBattSmall = core_code.includes("batt_small");
  const isBattLarge = core_code.includes("batt_large");
  const isAccel = core_code.startsWith("accel");
  const isBrake = core_code.startsWith("brake");

  const isColdStrong = Number(weatherStress?.cold_strength ?? 0) >= 0.45;
  const isDampStrong = Number(weatherStress?.damp_strength ?? 0) >= 0.45;

  // -------------------------
  // 1) pick primary & secondary pathological labels
  // Rule B: if deficiency exists, deficiency leads
  // -------------------------
  const deficiencyLabels = labels.filter((x) => DEFICIENCY_LABELS.has(x));
  const excessLabels = labels.filter((x) => EXCESS_LABELS.has(x));

  let primaryLabel = null;
  let secondaryLabel = null;

  if (hasAnyDeficiency) {
    primaryLabel = pickPrimaryDeficiency(deficiencyLabels, {
      isColdStrong,
      isDampStrong,
      mainTrigger,
      triggerDir,
    });

    secondaryLabel =
      pickSecondaryExcess(excessLabels, {
        hasQiStag,
        hasBloodStasis,
        hasFluidDamp,
      }) ||
      pickSecondaryDeficiency(deficiencyLabels, primaryLabel);
  } else {
    primaryLabel = pickPrimaryExcess(excessLabels, {
      mainTrigger,
      triggerDir,
      isDampStrong,
    });
    secondaryLabel = pickSecondaryExcess(excessLabels, {
      hasQiStag,
      hasBloodStasis,
      hasFluidDamp,
      exclude: primaryLabel,
    });
  }

  // -------------------------
  // 2) map pathological labels to treatment actions
  // -------------------------
  const primaryActions = labelToActions(primaryLabel);
  const secondaryActions = labelToActions(secondaryLabel);

  // weather-based nuance
  if (mainTrigger === "temp" && triggerDir === "down") {
    // cold day -> support kidney / warm / not overly dispersing
    if (!primaryActions.includes("support_kidney")) primaryActions.push("support_kidney");
  }

  if (mainTrigger === "humidity" && triggerDir === "up") {
    if (!primaryActions.includes("strengthen_spleen")) primaryActions.push("strengthen_spleen");
    if (!primaryActions.includes("transform_damp")) primaryActions.push("transform_damp");
  }

  if (mainTrigger === "pressure" && triggerDir === "down" && isAccel) {
    if (!primaryActions.includes("soothe_liver")) primaryActions.push("soothe_liver");
  }

  // -------------------------
  // 3) organ focus (MVP: liver / spleen / kidney)
  // -------------------------
  const organFocus = buildOrganFocus({
    hasQiDef,
    hasBloodDef,
    hasFluidDef,
    hasQiStag,
    hasBloodStasis,
    hasFluidDamp,
    mainTrigger,
    triggerDir,
    isColdStrong,
    isDampStrong,
    isBattSmall,
  });

  // -------------------------
  // 4) abdomen rule
  // batt_small OR cold/damp strong OR qi_def/fluid_damp
  // CV12 if spleen/qi_def/damp
  // otherwise CV6
  // -------------------------
  const needAbdomen =
    isBattSmall ||
    isColdStrong ||
    isDampStrong ||
    hasQiDef ||
    hasFluidDamp;

  const abdomenChoice =
    needAbdomen
      ? (hasQiDef || hasFluidDamp || organFocus.includes("spleen") || isDampStrong ? "CV12" : "CV6")
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
      is_batt_small: isBattSmall,
      is_batt_large: isBattLarge,
      is_accel: isAccel,
      is_brake: isBrake,
      is_cold_strong: isColdStrong,
      is_damp_strong: isDampStrong,
      main_trigger: mainTrigger,
      trigger_dir: triggerDir,
    },
  };
}

function pickPrimaryDeficiency(deficiencyLabels, ctx) {
  if (!deficiencyLabels.length) return null;

  // spleen/qi deficiency gets priority on damp days
  if (ctx.isDampStrong && deficiencyLabels.includes("qi_deficiency")) return "qi_deficiency";
  // cold / low reserve tends to push qi deficiency first
  if (ctx.isColdStrong && deficiencyLabels.includes("qi_deficiency")) return "qi_deficiency";
  // hot/up days can expose fluid deficiency
  if (ctx.mainTrigger === "temp" && ctx.triggerDir === "up" && deficiencyLabels.includes("fluid_deficiency")) {
    return "fluid_deficiency";
  }
  // otherwise blood deficiency is often meaningful in symptoms like headache/sleep
  if (deficiencyLabels.includes("blood_deficiency")) return "blood_deficiency";
  if (deficiencyLabels.includes("qi_deficiency")) return "qi_deficiency";
  if (deficiencyLabels.includes("fluid_deficiency")) return "fluid_deficiency";

  return deficiencyLabels[0];
}

function pickSecondaryDeficiency(deficiencyLabels, primaryLabel) {
  const rest = deficiencyLabels.filter((x) => x !== primaryLabel);
  return rest[0] || null;
}

function pickPrimaryExcess(excessLabels, ctx) {
  if (!excessLabels.length) return null;

  if (ctx.mainTrigger === "humidity" && ctx.triggerDir === "up" && excessLabels.includes("fluid_damp")) {
    return "fluid_damp";
  }
  if (ctx.mainTrigger === "pressure" && ctx.triggerDir === "down" && excessLabels.includes("qi_stagnation")) {
    return "qi_stagnation";
  }
  if (ctx.mainTrigger === "temp" && ctx.triggerDir === "down" && excessLabels.includes("blood_stasis")) {
    return "blood_stasis";
  }

  if (excessLabels.includes("qi_stagnation")) return "qi_stagnation";
  if (excessLabels.includes("fluid_damp")) return "fluid_damp";
  if (excessLabels.includes("blood_stasis")) return "blood_stasis";

  return excessLabels[0];
}

function pickSecondaryExcess(excessLabels, { hasQiStag, hasBloodStasis, hasFluidDamp, exclude = null }) {
  const rest = excessLabels.filter((x) => x && x !== exclude);
  if (!rest.length) return null;

  // mild stable order for MVP
  if (hasQiStag && rest.includes("qi_stagnation")) return "qi_stagnation";
  if (hasFluidDamp && rest.includes("fluid_damp")) return "fluid_damp";
  if (hasBloodStasis && rest.includes("blood_stasis")) return "blood_stasis";

  return rest[0];
}

function labelToActions(label) {
  switch (label) {
    case "qi_deficiency":
      return ["tonify_qi", "strengthen_spleen"];
    case "blood_deficiency":
      return ["nourish_blood"];
    case "fluid_deficiency":
      return ["generate_fluids", "support_kidney"];
    case "qi_stagnation":
      return ["move_qi", "soothe_liver"];
    case "blood_stasis":
      return ["move_blood"];
    case "fluid_damp":
      return ["transform_damp", "strengthen_spleen"];
    default:
      return [];
  }
}

function buildOrganFocus({
  hasQiDef,
  hasBloodDef,
  hasFluidDef,
  hasQiStag,
  hasBloodStasis,
  hasFluidDamp,
  mainTrigger,
  triggerDir,
  isColdStrong,
  isDampStrong,
  isBattSmall,
}) {
  const organs = [];

  // spleen
  if (hasQiDef || hasFluidDamp || isDampStrong || (mainTrigger === "humidity" && triggerDir === "up")) {
    organs.push("spleen");
  }

  // liver
  if (hasQiStag || hasBloodStasis || (mainTrigger === "pressure" && triggerDir === "down")) {
    organs.push("liver");
  }

  // kidney
  if (hasFluidDef || (hasBloodDef && isBattSmall) || isColdStrong || (mainTrigger === "temp" && triggerDir === "down")) {
    organs.push("kidney");
  }

  return uniq(organs).slice(0, 2);
}

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}
