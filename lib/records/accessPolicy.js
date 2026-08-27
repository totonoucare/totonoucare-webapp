import {
  RECORDS_AI_BETA,
  RECORDS_AI_ENABLED,
  RECORDS_ENABLED,
  RECORDS_PAID_FEATURES,
} from "./policy.js";

function boundaryMs(value, endOfDay = false) {
  if (!value) return null;
  const raw = String(value);
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? `${raw}T${endOfDay ? "23:59:59.999" : "00:00:00"}+09:00`
    : raw;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getBetaWindow(now = Date.now(), config = RECORDS_AI_BETA) {
  const configured = Boolean(config?.enabled);
  const startsAt = config?.startsAt || null;
  const endsAt = config?.endsAt || null;
  const startMs = boundaryMs(startsAt, false);
  const endMs = boundaryMs(endsAt, true);
  const validWindow = Boolean(endMs) && (!startsAt || Boolean(startMs));
  const active = configured && validWindow && (!startMs || now >= startMs) && now <= endMs;
  return {
    configured,
    active,
    misconfigured: configured && !validWindow,
    starts_at: startsAt,
    ends_at: endsAt,
    expired: Boolean(configured && endMs && now > endMs),
  };
}

export function entitlementIsActive(entitlement, now = Date.now()) {
  if (!entitlement || entitlement.status !== "active") return false;
  const startsAt = boundaryMs(entitlement.starts_at, false);
  const endsAt = boundaryMs(entitlement.ends_at, true);
  return (!startsAt || now >= startsAt) && (!endsAt || now <= endsAt);
}

export function resolveRecordsAccess({
  beta,
  entitlement = null,
  aiFeatureEnabled = RECORDS_AI_ENABLED,
  recordsEnabled = RECORDS_ENABLED,
  paidFeatures = RECORDS_PAID_FEATURES,
} = {}) {
  const safeBeta = beta || getBetaWindow();
  const featureEnabled = Boolean(aiFeatureEnabled);
  const entitled = Boolean(entitlement);
  const sharedPaidAccess = safeBeta.active || entitled;
  const analysisEnabled = Boolean(
    featureEnabled &&
    (!paidFeatures.analysis || sharedPaidAccess)
  );
  const consultEnabled = Boolean(
    featureEnabled &&
    (!paidFeatures.consult || sharedPaidAccess)
  );

  return {
    records_enabled: Boolean(recordsEnabled),
    mode: entitled ? "paid" : safeBeta.active ? "beta" : "free",
    beta_enabled: safeBeta.active,
    beta_starts_at: safeBeta.starts_at,
    beta_ends_at: safeBeta.ends_at,
    beta_expired: safeBeta.expired,
    beta_misconfigured: safeBeta.misconfigured,
    entitled,
    entitlement: entitlement
      ? {
          product: entitlement.product,
          source: entitlement.source || null,
          starts_at: entitlement.starts_at || null,
          ends_at: entitlement.ends_at || null,
        }
      : null,
    analysis_enabled: analysisEnabled,
    consult_enabled: consultEnabled,
    analysis_requires_subscription: Boolean(
      paidFeatures.analysis && !safeBeta.active && !entitled
    ),
    consult_requires_subscription: Boolean(
      paidFeatures.consult && !safeBeta.active && !entitled
    ),
    // Older consumers may still read this while the two paid surfaces are split.
    ai_enabled: analysisEnabled || consultEnabled,
  };
}

export function applyFreeConsultTrialAccess(
  access,
  {
    used = 0,
    recordedDays = 0,
    limit = 2,
    minimumRecords = 3,
  } = {}
) {
  const base = access || {};
  if (base.consult_enabled) {
    return {
      ...base,
      consult_access_mode: base.entitled ? "paid" : base.beta_enabled ? "beta" : "included",
      consult_history_enabled: true,
      consult_trial: null,
    };
  }

  const safeLimit = Math.max(0, Number(limit) || 0);
  const safeUsed = Math.max(0, Number(used) || 0);
  const safeRecordedDays = Math.max(0, Number(recordedDays) || 0);
  const safeMinimumRecords = Math.max(0, Number(minimumRecords) || 0);
  const remaining = Math.max(0, safeLimit - safeUsed);
  const eligible = safeRecordedDays >= safeMinimumRecords;
  const trialEnabled = eligible && remaining > 0;
  const historyEnabled = safeUsed > 0;

  return {
    ...base,
    consult_enabled: trialEnabled,
    consult_requires_subscription: !trialEnabled,
    consult_access_mode: trialEnabled
      ? "trial"
      : historyEnabled
        ? "trial_exhausted"
        : "trial_locked",
    consult_history_enabled: historyEnabled,
    consult_trial: {
      limit: safeLimit,
      used: safeUsed,
      remaining,
      eligible,
      recorded_days: safeRecordedDays,
      minimum_records: safeMinimumRecords,
      records_needed: Math.max(0, safeMinimumRecords - safeRecordedDays),
    },
  };
}
