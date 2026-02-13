// -----------------------------
// Backward-compatible exports
// (for /api/radar/today/explain)
// -----------------------------

function isoDatePart(iso) {
  if (!iso || typeof iso !== "string") return null;
  return iso.slice(0, 10);
}

/**
 * Legacy: computeTimeWindowsNext24h
 * 互換のため名前は残すが、方針として「今日(0-23)」を返す。
 */
export function computeTimeWindowsNext24h(hourly, nowIdx, profile, jstDateStr) {
  const times = hourly?.time || [];
  const date = jstDateStr || (nowIdx != null ? isoDatePart(times?.[nowIdx]) : null);

  if (!date) {
    // fallback: nowIdx中心の24hっぽい範囲
    const start = Math.max(0, (nowIdx ?? 0) - 12);
    const end = Math.min(times.length - 1, start + 24);
    return buildTimeWindowsFromHourlyRange(hourly, start, end, profile);
  }

  const todayIdxs = [];
  for (let i = 0; i < times.length; i++) {
    if (isoDatePart(times[i]) === date) todayIdxs.push(i);
  }

  if (!todayIdxs.length) {
    const start = Math.max(0, (nowIdx ?? 0) - 12);
    const end = Math.min(times.length - 1, start + 24);
    return buildTimeWindowsFromHourlyRange(hourly, start, end, profile);
  }

  return buildTimeWindowsFromHourlyRange(hourly, todayIdxs[0], todayIdxs[todayIdxs.length - 1], profile);
}

/**
 * Legacy: computeRisk
 * explain ルートが使う想定の “まとめ計算” を返す。
 */
export function computeRisk({ hourly, nowIdx, profile, jstDateStr }) {
  const times = hourly?.time || [];
  const nowTimeISO = nowIdx != null ? times?.[nowIdx] : null;

  const { windows, vulnerability } = computeTimeWindowsNext24h(hourly, nowIdx, profile, jstDateStr);

  const summary = summarizeToday({ windows });
  const peak = peakWindowFromWindows(windows);
  const nextPeak = nextPeakFromWindows(windows, nowTimeISO);

  return {
    windows,
    vulnerability,
    summary,
    peak,
    nextPeak,
  };
}
