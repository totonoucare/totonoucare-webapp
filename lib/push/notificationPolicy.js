// Default notification threshold: 4 points or higher.
// Shared by registration, settings UI/API and scheduled delivery.
export const DEFAULT_NOTIFICATION_MIN_SCORE = 4;

export function resolveNotificationMinScore(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return DEFAULT_NOTIFICATION_MIN_SCORE;
  }
  const score = Number(value);
  return Number.isFinite(score) && score >= 0 && score <= 10
    ? score
    : DEFAULT_NOTIFICATION_MIN_SCORE;
}
