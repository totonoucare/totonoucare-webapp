// lib/premium.js
import { supabaseServer } from "@/lib/supabaseServer";

const PRODUCT = "radar_subscription";

function isEntitlementActive(row, nowIso) {
  if (!row) return false;
  if (row.product !== PRODUCT) return false;
  if (row.status !== "active") return false;
  if (row.starts_at && row.starts_at > nowIso) return false;
  if (row.ends_at && row.ends_at <= nowIso) return false;
  return true;
}

export async function getPremiumStatus(userId) {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabaseServer
    .from("entitlements")
    .select("id, user_id, product, status, source, starts_at, ends_at, created_at")
    .eq("user_id", userId)
    .eq("product", PRODUCT)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = data ?? [];
  const activeEntitlement = rows.find((row) => isEntitlementActive(row, nowIso)) ?? null;

  return {
    isPremium: Boolean(activeEntitlement),
    entitlement: activeEntitlement ?? rows[0] ?? null,
  };
}
