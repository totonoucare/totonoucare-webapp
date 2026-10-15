// Internal 0–10 threshold. The public 0–100 gauge displays this as 40 points.
// Shared by registration, settings UI/API and scheduled delivery.
export const DEFAULT_NOTIFICATION_MIN_SCORE = 4;

export function notificationThresholdLabel(value = DEFAULT_NOTIFICATION_MIN_SCORE) {
  const score = resolveNotificationMinScore(value);
  return `体調警戒度が${Math.round(score * 10)}点以上${score === 4 ? "（いたわり以上）" : ""}`;
}

export function resolveNotificationMinScore(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return DEFAULT_NOTIFICATION_MIN_SCORE;
  }
  const score = Number(value);
  return Number.isFinite(score) && score >= 0 && score <= 10
    ? score
    : DEFAULT_NOTIFICATION_MIN_SCORE;
}
