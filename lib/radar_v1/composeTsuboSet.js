// lib/radar_v1/composeTsuboSet.js

/**
 * Compose final 3-point tsubo set for UI / GPT input.
 *
 * Input:
 * - tcmPoints: result from pickTcmPoints()
 * - mtestPoint: result from selectMtestPoint()
 *
 * Output:
 * - unified point list
 * - de-duplicated by code
 * - stable display order:
 *   1) TCM points
 *   2) M-test point
 *
 * We do NOT expose internal "primary/secondary" hierarchy to UI.
 * UI should treat all selected points as one set.
 */

/**
 * @param {{
 *   tcmPoints: {
 *     points?: Array<{
 *       code: string,
 *       name_ja: string,
 *       name_en?: string | null,
 *       image_path?: string | null,
 *       point_region?: string | null,
 *       tcm_actions?: string[],
 *       organ_focus?: string[]
 *     }>,
 *     meta?: any
 *   } | null,
 *   mtestPoint: {
 *     point?: {
 *       code: string,
 *       name_ja: string,
 *       name_en?: string | null,
 *       image_path?: string | null,
 *       meridian_code?: string | null,
 *       block?: string | null,
 *       point_region?: string | null
 *     } | null,
 *     meta?: any
 *   } | null
 * }} args
 */
export function composeTsuboSet({ tcmPoints, mtestPoint }) {
  const out = [];
  const seen = new Set();

  const tcmList = Array.isArray(tcmPoints?.points) ? tcmPoints.points : [];
  for (const p of tcmList) {
    if (!p?.code) continue;
    if (seen.has(p.code)) continue;

    out.push({
      code: p.code,
      name_ja: p.name_ja,
      name_en: p.name_en || null,
      image_path: p.image_path || null,
      point_region: p.point_region || null,
      source: "tcm",
      tcm_actions: Array.isArray(p.tcm_actions) ? p.tcm_actions : [],
      organ_focus: Array.isArray(p.organ_focus) ? p.organ_focus : [],
      meridian_code: null,
      mtest_block: null,
    });

    seen.add(p.code);
  }

  const mp = mtestPoint?.point || null;
  if (mp?.code && !seen.has(mp.code)) {
    out.push({
      code: mp.code,
      name_ja: mp.name_ja,
      name_en: mp.name_en || null,
      image_path: mp.image_path || null,
      point_region: mp.point_region || null,
      source: "mtest",
      tcm_actions: [],
      organ_focus: [],
      meridian_code: mp.meridian_code || null,
      mtest_block: mp.block || null,
    });
    seen.add(mp.code);
  }

  return {
    points: out,
    meta: {
      point_count: out.length,
      has_tcm: tcmList.length > 0,
      has_mtest: !!mp?.code,
      tcm_meta: tcmPoints?.meta || null,
      mtest_meta: mtestPoint?.meta || null,
    },
  };
}
