// lib/premium.js
import { supabaseServer } from "@/lib/supabaseServer";
import { RECORDS_SUBSCRIPTION_PRODUCT } from "@/lib/records/policy";
import { entitlementIsActive } from "@/lib/records/accessPolicy";
import { entitlementMatchesStripeEnvironment } from "@/lib/stripeMode";

const PRODUCT = RECORDS_SUBSCRIPTION_PRODUCT;

function isPremiumEntitlementActive(row, nowMs) {
  if (!row) return false;
  if (row.product !== PRODUCT) return false;
  return (
    entitlementMatchesStripeEnvironment(row) &&
    entitlementIsActive(row, nowMs)
  );
}

export async function getPremiumStatus(userId) {
  const nowMs = Date.now();

  const { data, error } = await supabaseServer
    .from("entitlements")
    .select("id,user_id,product,status,source,starts_at,ends_at,created_at,updated_at,stripe_customer_id,stripe_subscription_id,stripe_price_id,stripe_livemode")
    .eq("user_id", userId)
    .eq("product", PRODUCT)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = data ?? [];
  const activeEntitlement = rows.find((row) => isPremiumEntitlementActive(row, nowMs)) ?? null;

  return {
    isPremium: Boolean(activeEntitlement),
    entitlement: activeEntitlement ?? rows[0] ?? null,
    subscription: activeEntitlement
      ? {
          status: activeEntitlement.status,
          starts_at: activeEntitlement.starts_at || null,
          ends_at: activeEntitlement.ends_at || null,
          customer_portal_available: Boolean(activeEntitlement.stripe_customer_id),
        }
      : null,
  };
}
