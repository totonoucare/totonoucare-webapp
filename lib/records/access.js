import { supabaseServer } from "@/lib/supabaseServer";
import {
  RECORDS_AI_ENABLED,
  RECORDS_AI_ENTITLEMENT_PRODUCTS,
  RECORDS_AI_FREE_CONSULT_MINIMUM_RECORDS,
  RECORDS_AI_FREE_CONSULT_TRIAL_LIMIT,
} from "@/lib/records/policy";
import {
  applyFreeConsultTrialAccess,
  entitlementIsActive,
  getBetaWindow,
  resolveRecordsAccess,
} from "@/lib/records/accessPolicy";
import { getFreeConsultTrialUsage } from "@/lib/records/aiEvents";
import { entitlementMatchesStripeEnvironment } from "@/lib/stripeMode";

export { getBetaWindow, resolveRecordsAccess } from "@/lib/records/accessPolicy";

function entitlementProducts() {
  return [...RECORDS_AI_ENTITLEMENT_PRODUCTS];
}

async function loadActiveAiEntitlement(userId, now = Date.now()) {
  const products = entitlementProducts();
  if (!userId || !products.length) return null;
  const { data, error } = await supabaseServer
    .from("entitlements")
    .select("id,product,status,source,starts_at,ends_at,created_at,stripe_livemode")
    .eq("user_id", userId)
    .in("product", products)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("records access entitlement lookup failed:", error.message);
    return null;
  }
  return (data || []).find(
    (row) =>
      entitlementMatchesStripeEnvironment(row) &&
      entitlementIsActive(row, now)
  ) || null;
}

async function countRecordedDays(userId) {
  const { count, error } = await supabaseServer
    .from("radar_reviews")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("condition_level", "is", null);
  if (error) throw error;
  return Math.max(0, Number(count || 0));
}

export async function getRecordsAccess(userId, { now = Date.now() } = {}) {
  const beta = getBetaWindow(now);
  const entitlement = await loadActiveAiEntitlement(userId, now);
  const base = resolveRecordsAccess({
    beta,
    entitlement,
    aiFeatureEnabled: RECORDS_AI_ENABLED,
  });
  if (base.consult_enabled) return applyFreeConsultTrialAccess(base);

  try {
    const [trial, recordedDays] = await Promise.all([
      getFreeConsultTrialUsage(userId, RECORDS_AI_FREE_CONSULT_TRIAL_LIMIT),
      countRecordedDays(userId),
    ]);
    return applyFreeConsultTrialAccess(base, {
      used: trial.used,
      recordedDays,
      limit: RECORDS_AI_FREE_CONSULT_TRIAL_LIMIT,
      minimumRecords: RECORDS_AI_FREE_CONSULT_MINIMUM_RECORDS,
    });
  } catch (error) {
    console.warn("records free consult trial lookup failed:", error?.message || error);
    return applyFreeConsultTrialAccess(base, {
      used: RECORDS_AI_FREE_CONSULT_TRIAL_LIMIT,
      recordedDays: 0,
      limit: RECORDS_AI_FREE_CONSULT_TRIAL_LIMIT,
      minimumRecords: RECORDS_AI_FREE_CONSULT_MINIMUM_RECORDS,
    });
  }
}
