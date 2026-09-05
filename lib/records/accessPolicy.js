import {
  RECORDS_AI_BETA,
  RECORDS_AI_ENABLED,
  RECORDS_ENABLED,
  RECORDS_PAID_FEATURES,
  RECORDS_SUBSCRIPTION_TRIAL,
} from "./policy.js";

const DAY_MS = 24 * 60 * 60 * 1000;

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

export function getRegistrationTrialWindow(
  now = Date.now(),
  {
    userCreatedAt = null,
    config = RECORDS_SUBSCRIPTION_TRIAL,
  } = {}
) {
  const configured = Boolean(config?.enabled);
  const launchMs = boundaryMs(config?.startsAt, false);
  const createdMs = Date.parse(String(userCreatedAt || ""));
  const days = Math.max(0, Math.round(Number(config?.days || 0)));
  const eligible = configured && Boolean(launchMs) && Number.isFinite(createdMs) && days > 0;
  const startsMs = eligible ? Math.max(launchMs, createdMs) : null;
  const endsExclusiveMs = startsMs == null ? null : startsMs + days * DAY_MS;
  const active = Boolean(eligible && now >= startsMs && now < endsExclusiveMs);

  return {
    configured,
    eligible,
    active,
    upcoming: Boolean(eligible && now < startsMs),
    expired: Boolean(eligible && now >= endsExclusiveMs),
    days,
    days_remaining: active
      ? Math.max(1, Math.ceil((endsExclusiveMs - now) / DAY_MS))
      : 0,
    starts_at: startsMs == null ? null : new Date(startsMs).toISOString(),
    ends_at: endsExclusiveMs == null ? null : new Date(endsExclusiveMs - 1).toISOString(),
  };
}

export function resolveRecordsAccess({
  beta,
  trial = null,
  entitlement = null,
  aiFeatureEnabled = RECORDS_AI_ENABLED,
  recordsEnabled = RECORDS_ENABLED,
  paidFeatures = RECORDS_PAID_FEATURES,
} = {}) {
  const safeBeta = beta || getBetaWindow();
  const safeTrial = trial || getRegistrationTrialWindow();
  const featureEnabled = Boolean(aiFeatureEnabled);
  const entitled = Boolean(entitlement);
  const sharedPaidAccess = safeBeta.active || safeTrial.active || entitled;
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
    records_history_enabled: Boolean(recordsEnabled),
    records_write_enabled: Boolean(recordsEnabled && sharedPaidAccess),
    personalized_forecast_enabled: Boolean(sharedPaidAccess),
    care_enabled: Boolean(sharedPaidAccess),
    notifications_enabled: Boolean(sharedPaidAccess),
    mode: entitled
      ? "paid"
      : safeBeta.active
        ? "beta"
        : safeTrial.active
          ? "trial"
          : "free",
    beta_enabled: safeBeta.active,
    beta_starts_at: safeBeta.starts_at,
    beta_ends_at: safeBeta.ends_at,
    beta_expired: safeBeta.expired,
    beta_misconfigured: safeBeta.misconfigured,
    trial_enabled: safeTrial.active,
    trial_eligible: safeTrial.eligible,
    trial_upcoming: safeTrial.upcoming,
    trial_expired: safeTrial.expired,
    trial_days: safeTrial.days,
    trial_days_remaining: safeTrial.days_remaining,
    trial_starts_at: safeTrial.starts_at,
    trial_ends_at: safeTrial.ends_at,
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
      paidFeatures.analysis && !sharedPaidAccess
    ),
    consult_requires_subscription: Boolean(
      paidFeatures.consult && !sharedPaidAccess
    ),
    consult_access_mode: consultEnabled
      ? entitled
        ? "paid"
        : safeBeta.active
          ? "beta"
          : "trial"
      : "subscription_required",
    analysis_history_enabled: true,
    consult_history_enabled: true,
    consult_trial: null,
    // Older consumers may still read this while the two paid surfaces are split.
    ai_enabled: analysisEnabled || consultEnabled,
  };
}
