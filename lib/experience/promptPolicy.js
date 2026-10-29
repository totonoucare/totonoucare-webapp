export const EXPERIENCE_COOLDOWN_MS = 30_000;

// The radar trigger unmounts during location setup/loading/errors/paywalls.
export function hardwareExperienceReady({ rows = [], pathname, forecastMounted = false } = {}) {
  const seenForecast = rows.some(row => row.event_key === "milestone:forecast" || row.event_key?.startsWith("use:forecast:"));
  return seenForecast && (pathname !== "/radar" || forecastMounted);
}

export function experienceCandidateReady(kind, { now, cooldownUntil, boundary, closedBoundary }) {
  return now >= cooldownUntil && (kind === "hardware" || boundary > closedBoundary);
}
