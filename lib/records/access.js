import { supabaseServer } from "@/lib/supabaseServer";
import {
  RECORDS_AI_ENABLED,
  RECORDS_AI_ENTITLEMENT_PRODUCTS,
} from "@/lib/records/policy";
import {
  entitlementIsActive,
  getBetaWindow,
  getRegistrationTrialWindow,
  resolveRecordsAccess,
} from "@/lib/records/accessPolicy";
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

async function loadUserCreatedAt(userId) {
  if (!userId) return null;
  const { data, error } = await supabaseServer.auth.admin.getUserById(userId);
  if (error) {
    console.warn("records access user lookup failed:", error.message);
    return null;
  }
  return data?.user?.created_at || null;
}

export async function getRecordsAccess(
  userId,
  { now = Date.now(), userCreatedAt = null } = {}
) {
  const beta = getBetaWindow(now);
  const [entitlement, resolvedCreatedAt] = await Promise.all([
    loadActiveAiEntitlement(userId, now),
    userCreatedAt ? Promise.resolve(userCreatedAt) : loadUserCreatedAt(userId),
  ]);
  const trial = getRegistrationTrialWindow(now, {
    userCreatedAt: resolvedCreatedAt,
  });
  return resolveRecordsAccess({
    beta,
    trial,
    entitlement,
    aiFeatureEnabled: RECORDS_AI_ENABLED,
  });
}
