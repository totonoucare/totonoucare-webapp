export function recordsBetaEnabled() {
  return process.env.RECORDS_AI_BETA_ENABLED !== "false";
}

export function recordsBetaEndsAt() {
  return process.env.RECORDS_AI_BETA_ENDS_AT || null;
}

export function getRecordsAccess() {
  return {
    mode: recordsBetaEnabled() ? "beta" : "restricted",
    beta_enabled: recordsBetaEnabled(),
    beta_ends_at: recordsBetaEndsAt(),
    ai_enabled: recordsBetaEnabled() && process.env.RECORDS_AI_ENABLED !== "false",
  };
}
