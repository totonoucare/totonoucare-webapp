// lib/radar_v1/selectMtestPoint.js

import { getMtestBlockByLine } from "./mtestTable";

/**
 * Select one M-test point from the chosen line/block.
 *
 * MVP logic:
 * 1) line -> block (A..F)
 * 2) mother/child already selected
 * 3) inside the 4 points, choose "meridian side" by weather type
 * 4) then choose one of the 2 points based on mother/child
 *
 * Note:
 * - The original M-test mother/child mapping is approximated here
 *   by fixed ordering inside each block:
 *   first 2 points = meridian side 1
 *   last 2 points  = meridian side 2
 *
 *   and:
 *   - mother => first point of chosen side
 *   - child  => second point of chosen side
 *
 * This keeps the implementation stable and explainable for MVP.
 */

/**
 * @param {{
 *   selectedLine: string | null,
 *   motherChild: { mode: 'mother'|'child', reason?: string },
 *   weatherStress: {
 *     main_trigger: 'pressure'|'temp'|'humidity',
 *     trigger_dir: 'up'|'down'|'none'
 *   },
 *   previousPointCode?: string | null
 * }} args
 * @returns {{
 *   point: null | {
 *     code: string,
 *     name_ja: string,
 *     meridian: string,
 *     block: string,
 *     block_label: string
 *   },
 *   meta: {
 *     selected_line: string | null,
 *     selected_block: string | null,
 *     side_index: 0 | 1 | null,
 *     side_reason: string | null,
 *     mother_child_mode: 'mother'|'child',
 *     rotated_from_previous: boolean
 *   }
 * }}
 */
export function selectMtestPoint({
  selectedLine,
  motherChild,
  weatherStress,
  previousPointCode = null,
}) {
  if (!selectedLine) {
    return {
      point: null,
      meta: {
        selected_line: null,
        selected_block: null,
        side_index: null,
        side_reason: null,
        mother_child_mode: motherChild?.mode || "mother",
        rotated_from_previous: false,
      },
    };
  }

  const block = getMtestBlockByLine(selectedLine);
  if (!block) {
    return {
      point: null,
      meta: {
        selected_line: selectedLine,
        selected_block: null,
        side_index: null,
        side_reason: "block_not_found",
        mother_child_mode: motherChild?.mode || "mother",
        rotated_from_previous: false,
      },
    };
  }

  const side = chooseMeridianSide({
    line: selectedLine,
    weatherStress,
  });

  const mode = motherChild?.mode || "mother";

  // side 0 => points[0], points[1]
  // side 1 => points[2], points[3]
  const pair =
    side.sideIndex === 0
      ? block.points.slice(0, 2)
      : block.points.slice(2, 4);

  let chosen = mode === "mother" ? pair[0] : pair[1];
  let rotatedFromPrevious = false;

  // simple rotation: if same point repeats, swap within the same pair
  if (previousPointCode && chosen?.code === previousPointCode) {
    chosen = mode === "mother" ? pair[1] : pair[0];
    rotatedFromPrevious = true;
  }

  return {
    point: chosen
      ? {
          code: chosen.code,
          name_ja: chosen.name_ja,
          meridian: chosen.meridian,
          block: block.block,
          block_label: block.label,
        }
      : null,
    meta: {
      selected_line: selectedLine,
      selected_block: block.block,
      side_index: side.sideIndex,
      side_reason: side.reason,
      mother_child_mode: mode,
      rotated_from_previous: rotatedFromPrevious,
    },
  };
}

/**
 * Choose which meridian-side (0 or 1) inside a block to use.
 *
 * For each block:
 * - first pair belongs to one meridian
 * - second pair belongs to the paired meridian
 *
 * We choose side based on weather type so the daily selection
 * changes in an explainable way.
 */
function chooseMeridianSide({ line, weatherStress }) {
  const main = weatherStress?.main_trigger || "pressure";
  const dir = weatherStress?.trigger_dir || "none";

  // Default side = 0
  let sideIndex = 0;
  let reason = "default_side_0";

  switch (line) {
    case "lung_li":
      // LU vs LI
      if (main === "pressure" && dir === "down") {
        sideIndex = 0; // LU side
        reason = "lung_li_pressure_down_lu_side";
      } else if (main === "humidity" && dir === "up") {
        sideIndex = 1; // LI side
        reason = "lung_li_humidity_up_li_side";
      } else if (main === "temp" && dir === "down") {
        sideIndex = 0; // LU side
        reason = "lung_li_temp_down_lu_side";
      } else if (main === "temp" && dir === "up") {
        sideIndex = 1; // LI side
        reason = "lung_li_temp_up_li_side";
      }
      break;

    case "heart_si":
      // HT vs SI
      if (main === "pressure" && dir === "down") {
        sideIndex = 0; // HT
        reason = "heart_si_pressure_down_ht_side";
      } else if (main === "humidity" && dir === "up") {
        sideIndex = 1; // SI
        reason = "heart_si_humidity_up_si_side";
      } else if (main === "temp" && dir === "down") {
        sideIndex = 0; // HT
        reason = "heart_si_temp_down_ht_side";
      } else if (main === "temp" && dir === "up") {
        sideIndex = 1; // SI
        reason = "heart_si_temp_up_si_side";
      }
      break;

    case "pc_sj":
      // PC vs TE
      if (main === "pressure" && dir === "down") {
        sideIndex = 0; // PC
        reason = "pc_sj_pressure_down_pc_side";
      } else if (main === "humidity" && dir === "up") {
        sideIndex = 1; // TE
        reason = "pc_sj_humidity_up_te_side";
      } else if (main === "temp" && dir === "down") {
        sideIndex = 0; // PC
        reason = "pc_sj_temp_down_pc_side";
      } else if (main === "temp" && dir === "up") {
        sideIndex = 1; // TE
        reason = "pc_sj_temp_up_te_side";
      }
      break;

    case "spleen_st":
      // SP vs ST
      if (main === "humidity" && dir === "up") {
        sideIndex = 0; // SP
        reason = "spleen_st_humidity_up_sp_side";
      } else if (main === "temp" && dir === "down") {
        sideIndex = 0; // SP
        reason = "spleen_st_temp_down_sp_side";
      } else if (main === "temp" && dir === "up") {
        sideIndex = 1; // ST
        reason = "spleen_st_temp_up_st_side";
      } else if (main === "pressure" && dir === "down") {
        sideIndex = 0; // SP
        reason = "spleen_st_pressure_down_sp_side";
      }
      break;

    case "kidney_bl":
      // KI vs BL
      if (main === "temp" && dir === "down") {
        sideIndex = 0; // KI
        reason = "kidney_bl_temp_down_ki_side";
      } else if (main === "humidity" && dir === "up") {
        sideIndex = 1; // BL
        reason = "kidney_bl_humidity_up_bl_side";
      } else if (main === "pressure" && dir === "down") {
        sideIndex = 0; // KI
        reason = "kidney_bl_pressure_down_ki_side";
      } else if (main === "temp" && dir === "up") {
        sideIndex = 1; // BL
        reason = "kidney_bl_temp_up_bl_side";
      }
      break;

    case "liver_gb":
      // LR vs GB
      if (main === "temp" && dir === "up") {
        sideIndex = 1; // GB
        reason = "liver_gb_temp_up_gb_side";
      } else if (main === "pressure" && dir === "down") {
        sideIndex = 0; // LR
        reason = "liver_gb_pressure_down_lr_side";
      } else if (main === "humidity" && dir === "up") {
        sideIndex = 1; // GB
        reason = "liver_gb_humidity_up_gb_side";
      } else if (main === "temp" && dir === "down") {
        sideIndex = 0; // LR
        reason = "liver_gb_temp_down_lr_side";
      }
      break;

    default:
      break;
  }

  return { sideIndex, reason };
}
