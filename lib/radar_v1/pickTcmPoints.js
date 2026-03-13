// lib/radar_v1/pickTcmPoints.js
import { createClient } from "@supabase/supabase-js";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

/**
 * Pick 2 TCM points:
 * - if abdomen is needed: abdomen(CV12/CV6) + one limb point
 * - else: two limb points
 *
 * @param {{
 *   differentiation: {
 *     primary_actions: string[],
 *     secondary_actions: string[],
 *     organ_focus: string[],
 *     need_abdomen: boolean,
 *     abdomen_choice: string | null
 *   }
 * }} args
 */
export async function pickTcmPoints({ differentiation }) {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("radar_tsubo_points")
    .select("*")
    .eq("is_active", true);

  if (error) {
    throw new Error(`pickTcmPoints failed to load radar_tsubo_points: ${error.message}`);
  }

  const points = Array.isArray(data) ? data : [];

  const chosen = [];

  // 1) abdomen fixed choice when needed
  if (differentiation.need_abdomen && differentiation.abdomen_choice) {
    const abdomen = points.find((p) => p.code === differentiation.abdomen_choice);
    if (abdomen) chosen.push(abdomen);
  }

  const usedCodes = new Set(chosen.map((p) => p.code));

  // 2) limb point for primary actions
  const firstLimb = findBestPoint({
    points,
    excludeCodes: usedCodes,
    pointRegion: "limb",
    wantedActions: differentiation.primary_actions,
    wantedOrgans: differentiation.organ_focus,
  });

  if (firstLimb) {
    chosen.push(firstLimb);
    usedCodes.add(firstLimb.code);
  }

  // 3) if no abdomen, choose second limb too
  if (!differentiation.need_abdomen) {
    const secondLimb = findBestPoint({
      points,
      excludeCodes: usedCodes,
      pointRegion: "limb",
      wantedActions: differentiation.secondary_actions.length
        ? differentiation.secondary_actions
        : differentiation.primary_actions,
      wantedOrgans: differentiation.organ_focus,
    });

    if (secondLimb) {
      chosen.push(secondLimb);
      usedCodes.add(secondLimb.code);
    }
  }

  // 4) fallback: if abdomen needed but no limb chosen, try secondary
  if (differentiation.need_abdomen && chosen.length < 2) {
    const fallbackLimb = findBestPoint({
      points,
      excludeCodes: usedCodes,
      pointRegion: "limb",
      wantedActions: differentiation.secondary_actions.length
        ? differentiation.secondary_actions
        : differentiation.primary_actions,
      wantedOrgans: differentiation.organ_focus,
    });

    if (fallbackLimb) {
      chosen.push(fallbackLimb);
      usedCodes.add(fallbackLimb.code);
    }
  }

  return {
    points: chosen.slice(0, 2).map((p) => ({
      code: p.code,
      name_ja: p.name_ja,
      image_path: p.image_path || null,
      point_region: p.point_region,
      tcm_actions: p.tcm_actions || [],
      organ_focus: p.organ_focus || [],
    })),
    meta: {
      need_abdomen: differentiation.need_abdomen,
      abdomen_choice: differentiation.abdomen_choice,
      primary_actions: differentiation.primary_actions,
      secondary_actions: differentiation.secondary_actions,
      organ_focus: differentiation.organ_focus,
    },
  };
}

function findBestPoint({
  points,
  excludeCodes,
  pointRegion,
  wantedActions,
  wantedOrgans,
}) {
  const filtered = points.filter((p) => {
    if (!p?.code) return false;
    if (excludeCodes?.has(p.code)) return false;
    if (pointRegion && p.point_region !== pointRegion) return false;
    return true;
  });

  // Stage 1: organ + all actions
  let match = filtered.find((p) =>
    overlapsAll(p.tcm_actions, wantedActions) &&
    overlapsAny(p.organ_focus, wantedOrgans)
  );
  if (match) return match;

  // Stage 2: organ + any action
  match = filtered.find((p) =>
    overlapsAny(p.tcm_actions, wantedActions) &&
    overlapsAny(p.organ_focus, wantedOrgans)
  );
  if (match) return match;

  // Stage 3: any action
  match = filtered.find((p) => overlapsAny(p.tcm_actions, wantedActions));
  if (match) return match;

  // Stage 4: any organ
  match = filtered.find((p) => overlapsAny(p.organ_focus, wantedOrgans));
  if (match) return match;

  // Stage 5: first available
  return filtered[0] || null;
}

function overlapsAny(source, target) {
  const s = Array.isArray(source) ? source : [];
  const t = Array.isArray(target) ? target : [];
  return t.some((x) => s.includes(x));
}

function overlapsAll(source, target) {
  const s = Array.isArray(source) ? source : [];
  const t = Array.isArray(target) ? target : [];
  if (!t.length) return false;
  return t.every((x) => s.includes(x));
}
