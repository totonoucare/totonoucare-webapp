// lib/radar_v1/selectMtestPoint.js
import { getMtestPointsByLine } from "./mtestPointRepo";

/**
 * Select one M-test point from DB-backed M-test candidates.
 *
 * Agreed MVP:
 * - selectedLine is already chosen by selectMtestLine()
 * - mother/child is already chosen by selectMotherChild()
 * - inside the block, choose meridian side by today's weather type
 * - then choose the point by mtest_role = mother/child
 * - if the same point repeats, rotate within the same side if possible
 *
 * DB assumptions:
 * - radar_tsubo_points contains M-test points
 * - mtest_block: A..F
 * - mtest_meridian_side: 0 or 1
 * - mtest_role: 'mother' | 'child'
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
 * @returns {Promise<{
 *   point: null | {
 *     code: string,
 *     name_ja: string,
 *     name_en?: string | null,
 *     image_path?: string | null,
 *     meridian_code?: string | null,
 *     block: string | null,
 *     point_region?: string | null
 *   },
 *   meta: {
 *     selected_line: string | null,
 *     selected_block: string | null,
 *     side_index: 0 | 1 | null,
 *     side_reason: string | null,
 *     mother_child_mode: 'mother'|'child',
 *     rotated_from_previous: boolean,
 *     candidate_count: number
 *   }
 * }>}
 */
export async function selectMtestPoint({
  selectedLine,
  motherChild,
  weatherStress,
  previousPointCode = null,
}) {
  const mode = motherChild?.mode || "mother";

  if (!selectedLine) {
    return {
      point: null,
      meta: {
        selected_line: null,
        selected_block: null,
        side_index: null,
        side_reason: null,
        mother_child_mode: mode,
        rotated_from_previous: false,
        candidate_count: 0,
      },
    };
  }

  const candidates = await getMtestPointsByLine({ line: selectedLine });

  if (!candidates.length) {
    return {
      point: null,
      meta: {
        selected_line: selectedLine,
        selected_block: null,
        side_index: null,
        side_reason: "no_db_candidates",
        mother_child_mode: mode,
        rotated_from_previous: false,
        candidate_count: 0,
      },
    };
  }

  // assume one block per line
  const selectedBlock = candidates[0]?.mtest_block || null;

  const side = chooseMeridianSide({
    line: selectedLine,
    weatherStress,
  });

  const sameSide = candidates.filter(
    (p) => Number(p.mtest_meridian_side) === side.sideIndex
  );

  const sameSideAndRole = sameSide.filter(
    (p) => p.mtest_role === mode
  );

  let rotatedFromPrevious = false;
  let chosen = null;

  // 1) same side + requested role
  chosen = pickAvoidingPrevious(sameSideAndRole, previousPointCode);
  if (chosen && previousPointCode && chosen.code !== previousPointCode) {
    rotatedFromPrevious = sameSideAndRole.length > 1;
  }

  // 2) fallback: same side whatever role
  if (!chosen) {
    chosen = pickAvoidingPrevious(sameSide, previousPointCode);
    if (chosen && previousPointCode && chosen.code !== previousPointCode) {
      rotatedFromPrevious = sameSide.length > 1;
    }
  }

  // 3) fallback: any role, any side
  if (!chosen) {
    chosen = pickAvoidingPrevious(candidates, previousPointCode);
    if (chosen && previousPointCode && chosen.code !== previousPointCode) {
      rotatedFromPrevious = candidates.length > 1;
    }
  }

  return {
    point: chosen
      ? {
          code: chosen.code,
          name_ja: chosen.name_ja,
          name_en: chosen.name_en || null,
          image_path: chosen.image_path || null,
          meridian_code: chosen.meridian_code || null,
          block: chosen.mtest_block || null,
          point_region: chosen.point_region || null,
        }
      : null,
    meta: {
      selected_line: selectedLine,
      selected_block: selectedBlock,
      side_index: side.sideIndex,
      side_reason: side.reason,
      mother_child_mode: mode,
      rotated_from_previous: rotatedFromPrevious,
      candidate_count: candidates.length,
    },
  };
}

function pickAvoidingPrevious(list, previousPointCode) {
  if (!Array.isArray(list) || !list.length) return null;
  if (!previousPointCode) return list[0];

  const firstDifferent = list.find((x) => x.code !== previousPointCode);
  return firstDifferent || list[0];
}

/**
 * Choose which meridian-side (0 or 1) inside a block to use.
 *
 * side 0 / 1 are encoded in DB by mtest_meridian_side.
 *
 * This keeps the agreed MVP logic:
 * - pressure/down -> more upper/surface/supportive side
 * - humidity/up   -> more draining/heavy side
 * - temp/down     -> more reserve/back/water side
 * - temp/up       -> more lateral/upward/releasing side
 */
function chooseMeridianSide({ line, weatherStress }) {
  const main = weatherStress?.main_trigger || "pressure";
  const dir = weatherStress?.trigger_dir || "none";

  let sideIndex = 0;
  let reason = "default_side_0";

  switch (line) {
    case "lung_li":
      // side 0 = LU, side 1 = LI
      if (main === "pressure" && dir === "down") {
        sideIndex = 0;
        reason = "lung_li_pressure_down_lu_side";
      } else if (main === "humidity" && dir === "up") {
        sideIndex = 1;
        reason = "lung_li_humidity_up_li_side";
      } else if (main === "temp" && dir === "down") {
        sideIndex = 0;
        reason = "lung_li_temp_down_lu_side";
      } else if (main === "temp" && dir === "up") {
        sideIndex = 1;
        reason = "lung_li_temp_up_li_side";
      }
      break;

    case "heart_si":
      // side 0 = HT, side 1 = SI
      if (main === "pressure" && dir === "down") {
        sideIndex = 0;
        reason = "heart_si_pressure_down_ht_side";
      } else if (main === "humidity" && dir === "up") {
        sideIndex = 1;
        reason = "heart_si_humidity_up_si_side";
      } else if (main === "temp" && dir === "down") {
        sideIndex = 0;
        reason = "heart_si_temp_down_ht_side";
      } else if (main === "temp" && dir === "up") {
        sideIndex = 1;
        reason = "heart_si_temp_up_si_side";
      }
      break;

    case "pc_sj":
      // side 0 = PC, side 1 = TE
      if (main === "pressure" && dir === "down") {
        sideIndex = 0;
        reason = "pc_sj_pressure_down_pc_side";
      } else if (main === "humidity" && dir === "up") {
        sideIndex = 1;
        reason = "pc_sj_humidity_up_te_side";
      } else if (main === "temp" && dir === "down") {
        sideIndex = 0;
        reason = "pc_sj_temp_down_pc_side";
      } else if (main === "temp" && dir === "up") {
        sideIndex = 1;
        reason = "pc_sj_temp_up_te_side";
      }
      break;

    case "spleen_st":
      // side 0 = SP, side 1 = ST
      if (main === "humidity" && dir === "up") {
        sideIndex = 0;
        reason = "spleen_st_humidity_up_sp_side";
      } else if (main === "temp" && dir === "down") {
        sideIndex = 0;
        reason = "spleen_st_temp_down_sp_side";
      } else if (main === "temp" && dir === "up") {
        sideIndex = 1;
        reason = "spleen_st_temp_up_st_side";
      } else if (main === "pressure" && dir === "down") {
        sideIndex = 0;
        reason = "spleen_st_pressure_down_sp_side";
      }
      break;

    case "kidney_bl":
      // side 0 = KI, side 1 = BL
      if (main === "temp" && dir === "down") {
        sideIndex = 0;
        reason = "kidney_bl_temp_down_ki_side";
      } else if (main === "humidity" && dir === "up") {
        sideIndex = 1;
        reason = "kidney_bl_humidity_up_bl_side";
      } else if (main === "pressure" && dir === "down") {
        sideIndex = 0;
        reason = "kidney_bl_pressure_down_ki_side";
      } else if (main === "temp" && dir === "up") {
        sideIndex = 1;
        reason = "kidney_bl_temp_up_bl_side";
      }
      break;

    case "liver_gb":
      // side 0 = LR, side 1 = GB
      if (main === "temp" && dir === "up") {
        sideIndex = 1;
        reason = "liver_gb_temp_up_gb_side";
      } else if (main === "pressure" && dir === "down") {
        sideIndex = 0;
        reason = "liver_gb_pressure_down_lr_side";
      } else if (main === "humidity" && dir === "up") {
        sideIndex = 1;
        reason = "liver_gb_humidity_up_gb_side";
      } else if (main === "temp" && dir === "down") {
        sideIndex = 0;
        reason = "liver_gb_temp_down_lr_side";
      }
      break;

    default:
      break;
  }

  return { sideIndex, reason };
}
