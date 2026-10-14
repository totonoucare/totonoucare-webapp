export const POINT_ROTATION_VERSION = "matched_points_v97_2026-10-14";

export function pointDateOrdinal(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const stamp = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const date = new Date(stamp);
  if (date.toISOString().slice(0, 10) !== value) return null;
  return Math.floor(stamp / 86400000);
}

export function shiftPointDate(value, days) {
  const ordinal = pointDateOrdinal(value);
  return ordinal === null ? null : new Date((ordinal + days) * 86400000).toISOString().slice(0, 10);
}

function hash(value) {
  let result = 2166136261;
  for (const character of String(value || "")) {
    result ^= character.codePointAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

export function recentCompletedPointCodes(actions, targetDate, days = 3) {
  const target = pointDateOrdinal(targetDate);
  if (target === null) return new Set();
  return new Set((Array.isArray(actions) ? actions : []).filter(row => {
    if (!row?.checked_at || row.domain !== "loosen") return false;
    const previous = pointDateOrdinal(row.target_date);
    const age = previous === null ? 0 : target - previous;
    return age > 0 && age <= days && row.item_snapshot?.meta?.point_code;
  }).map(row => row.item_snapshot.meta.point_code));
}

// A daily change is allowed only inside the fit band. An old execution never
// promotes a weaker candidate, and today's checks do not reshuffle today's UI.
export function selectMatchedPointCandidate({
  candidates = [], targetDate = null, contextKey = "", signal = 1, completedCare = [],
} = {}) {
  const ranked = candidates.filter(row => row?.point?.code && Number.isFinite(row.score))
    .slice().sort((a, b) => b.score - a.score || a.point.code.localeCompare(b.point.code));
  if (!ranked.length) return null;
  const delta = Number(signal) >= 2 ? 0.8 : 1.2;
  const best = ranked[0];
  const fit = ranked.filter(row => row.score >= best.score - delta);
  const day = pointDateOrdinal(targetDate);
  const used = recentCompletedPointCodes(completedCare, targetDate);
  const fresh = fit.filter(row => !used.has(row.point.code));
  const pool = fresh.length ? fresh : fit;
  const index = day === null ? 0 : (day + hash(contextKey)) % pool.length;
  const selected = day === null ? best : pool[index];
  return {
    ...selected,
    basis: {
      version: POINT_ROTATION_VERSION,
      score: selected.score,
      best_score: best.score,
      near_tie_delta: delta,
      fit_candidate_count: fit.length,
      history_avoided: pool.length < fit.length,
      rotated: selected.point.code !== best.point.code,
    },
  };
}
