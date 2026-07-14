/**
 * Supabase returns the requested message window newest-first.
 * Convert it to chronological order for display and model context.
 */
export function chronologicalFromNewest(rows = [], limit = 100) {
  const safeLimit = Number.isInteger(Number(limit)) && Number(limit) > 0 ? Number(limit) : 100;
  return (Array.isArray(rows) ? rows : []).slice(0, safeLimit).reverse();
}
