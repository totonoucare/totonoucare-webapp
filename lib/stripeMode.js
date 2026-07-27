export function stripeModeFromSecret(value = process.env.STRIPE_SECRET_KEY) {
  const key = String(value || "");
  if (key.startsWith("sk_test_")) return "test";
  if (key.startsWith("sk_live_")) return "live";
  return "unconfigured";
}

export function stripeLivemodeForCurrentEnvironment(
  value = process.env.STRIPE_SECRET_KEY
) {
  const mode = stripeModeFromSecret(value);
  if (mode === "live") return true;
  if (mode === "test") return false;
  return null;
}

export function entitlementMatchesStripeEnvironment(
  entitlement,
  value = process.env.STRIPE_SECRET_KEY
) {
  if (entitlement?.source !== "stripe") return true;
  const expected = stripeLivemodeForCurrentEnvironment(value);
  return expected !== null && entitlement?.stripe_livemode === expected;
}
