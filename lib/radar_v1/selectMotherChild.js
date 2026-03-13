// lib/radar_v1/selectMotherChild.js

/**
 * Decide mother / child for M-test point selection.
 *
 * Agreed MVP logic:
 * - pressure/down -> mother
 * - temp/down     -> mother
 * - temp/up       -> child
 * - humidity/up   -> child
 * - fallback      -> mother
 *
 * Safety correction:
 * - if deficiency exists OR batt_small -> bias toward mother
 * - but if humidity/up + fluid_damp is present, keep child
 */

/**
 * @param {{
 *   weatherStress: {
 *     main_trigger: 'pressure'|'temp'|'humidity',
 *     trigger_dir: 'up'|'down'|'none'
 *   },
 *   core_code?: string | null,
 *   sub_labels?: string[] | null
 * }} args
 * @returns {{
 *   mode: 'mother' | 'child',
 *   reason: string,
 *   meta: {
 *     base_mode: 'mother' | 'child',
 *     corrected: boolean,
 *     is_batt_small: boolean,
 *     has_deficiency: boolean,
 *     has_fluid_damp: boolean
 *   }
 * }}
 */
export function selectMotherChild({ weatherStress, core_code = "", sub_labels = [] }) {
  const main = weatherStress?.main_trigger || "pressure";
  const dir = weatherStress?.trigger_dir || "none";

  const labels = Array.isArray(sub_labels) ? sub_labels : [];
  const isBattSmall = String(core_code || "").includes("batt_small");

  const hasDeficiency =
    labels.includes("qi_deficiency") ||
    labels.includes("blood_deficiency") ||
    labels.includes("fluid_deficiency");

  const hasFluidDamp = labels.includes("fluid_damp");

  // 1) base mode by weather type
  let baseMode = "mother";
  let baseReason = "fallback_to_mother";

  if (main === "pressure" && dir === "down") {
    baseMode = "mother";
    baseReason = "pressure_down_support";
  } else if (main === "temp" && dir === "down") {
    baseMode = "mother";
    baseReason = "temp_down_support";
  } else if (main === "temp" && dir === "up") {
    baseMode = "child";
    baseReason = "temp_up_release";
  } else if (main === "humidity" && dir === "up") {
    baseMode = "child";
    baseReason = "humidity_up_drain";
  }

  // 2) safety correction
  let mode = baseMode;
  let corrected = false;
  let reason = baseReason;

  // If damp day + fluid_damp, keep child (do not over-tonify)
  if (main === "humidity" && dir === "up" && hasFluidDamp) {
    mode = "child";
    corrected = false;
    reason = "humidity_up_with_fluid_damp_keep_child";
  } else if ((isBattSmall || hasDeficiency) && baseMode === "child") {
    // weakness / low reserve biases to mother
    mode = "mother";
    corrected = true;
    reason = isBattSmall
      ? "child_to_mother_due_to_batt_small"
      : "child_to_mother_due_to_deficiency";
  }

  return {
    mode,
    reason,
    meta: {
      base_mode: baseMode,
      corrected,
      is_batt_small: isBattSmall,
      has_deficiency: hasDeficiency,
      has_fluid_damp: hasFluidDamp,
    },
  };
}
