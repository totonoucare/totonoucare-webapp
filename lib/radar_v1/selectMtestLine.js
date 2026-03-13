// lib/radar_v1/selectMtestLine.js

/**
 * Decide which M-test line to use today.
 *
 * Input:
 * - primary_meridian
 * - secondary_meridian
 * - weatherStress.main_trigger / trigger_dir
 *
 * Philosophy:
 * - If only primary exists -> use it
 * - If secondary exists too, choose based on today's weather type
 * - This is not "truth", but a stable and explainable daily selector
 */

/**
 * @param {{
 *   primary_meridian?: string | null,
 *   secondary_meridian?: string | null,
 *   weatherStress: {
 *     main_trigger: 'pressure'|'temp'|'humidity',
 *     trigger_dir: 'up'|'down'|'none'
 *   }
 * }} args
 */
export function selectMtestLine({ primary_meridian, secondary_meridian, weatherStress }) {
  const primary = primary_meridian || null;
  const secondary = secondary_meridian || null;

  if (!primary && !secondary) {
    return {
      selected_line: null,
      selected_from: "none",
      reason: "no_mtest_line",
    };
  }

  if (primary && !secondary) {
    return {
      selected_line: primary,
      selected_from: "primary_only",
      reason: "only_primary_exists",
    };
  }

  if (!primary && secondary) {
    return {
      selected_line: secondary,
      selected_from: "secondary_only",
      reason: "only_secondary_exists",
    };
  }

  // both exist
  const main = weatherStress?.main_trigger || "pressure";
  const dir = weatherStress?.trigger_dir || "none";

  const primaryScore = scoreLineForWeather(primary, main, dir);
  const secondaryScore = scoreLineForWeather(secondary, main, dir);

  if (secondaryScore > primaryScore) {
    return {
      selected_line: secondary,
      selected_from: "secondary",
      reason: `secondary_better_matches_${main}_${dir}`,
      scores: {
        primary: primaryScore,
        secondary: secondaryScore,
      },
    };
  }

  return {
    selected_line: primary,
    selected_from: "primary",
    reason: `primary_kept_for_${main}_${dir}`,
    scores: {
      primary: primaryScore,
      secondary: secondaryScore,
    },
  };
}

function scoreLineForWeather(line, mainTrigger, triggerDir) {
  let score = 0;

  switch (mainTrigger) {
    case "pressure":
      // pressure↓ often feels more upper-body / head-neck / surface reactive
      if (line === "lung_li") score += 3;
      if (line === "pc_sj") score += 2;
      if (line === "liver_gb") score += 2;
      if (line === "heart_si") score += 1;
      break;

    case "humidity":
      // damp/heavy tends to pull toward lower-body earth/water
      if (line === "spleen_st") score += 3;
      if (line === "kidney_bl") score += 2;
      if (line === "liver_gb") score += 1;
      break;

    case "temp":
      if (triggerDir === "down") {
        // cold → back/water and reserve side
        if (line === "kidney_bl") score += 3;
        if (line === "spleen_st") score += 2;
        if (line === "lung_li") score += 1;
      } else if (triggerDir === "up") {
        // heat/up → lateral / upper / liver-like reactivity
        if (line === "liver_gb") score += 3;
        if (line === "pc_sj") score += 2;
        if (line === "lung_li") score += 1;
      }
      break;

    default:
      break;
  }

  return score;
}
