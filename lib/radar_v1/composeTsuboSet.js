// lib/radar_v1/composeTsuboSet.js
import { explainPointSelection } from "@/lib/radar_v1/explainPointSelection";

/**
 * Compose final tsubo set for UI / GPT input.
 */
export function composeTsuboSet({ tcmPoints, mtestPoint, riskContext }) {
  const out = [];
  const seen = new Set();

  const tcmList = Array.isArray(tcmPoints?.points) ? tcmPoints.points : [];
  for (const p of tcmList) {
    if (!p?.code) continue;
    if (seen.has(p.code)) continue;

    const point = {
      code: p.code,
      name_ja: p.name_ja,
      reading_ja: p.reading_ja || null,
      name_en: p.name_en || null,
      image_path: p.image_path || null,
      point_region: p.point_region || null,
      source: "tcm",
      tcm_actions: Array.isArray(p.tcm_actions) ? p.tcm_actions : [],
      organ_focus: Array.isArray(p.organ_focus) ? p.organ_focus : [],
      meridian_code: null,
      mtest_block: null,
    };

    out.push({
      ...point,
      explanation: explainPointSelection({
        point,
        riskContext,
        tsuboMeta: {
          tcm_meta: tcmPoints?.meta || null,
          mtest_meta: mtestPoint?.meta || null,
        },
      }),
    });

    seen.add(p.code);
  }

  const mp = mtestPoint?.point || null;
  if (mp?.code && !seen.has(mp.code)) {
    const point = {
      code: mp.code,
      name_ja: mp.name_ja,
      reading_ja: mp.reading_ja || null,
      name_en: mp.name_en || null,
      image_path: mp.image_path || null,
      point_region: mp.point_region || null,
      source: "mtest",
      tcm_actions: [],
      organ_focus: [],
      meridian_code: mp.meridian_code || null,
      mtest_block: mp.block || null,
    };

    out.push({
      ...point,
      explanation: explainPointSelection({
        point,
        riskContext,
        tsuboMeta: mtestPoint?.meta || null,
      }),
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
