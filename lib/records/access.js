import { supabaseServer } from "@/lib/supabaseServer";

function enabled(value, fallback = false) {
  if (value == null || value === "") return fallback;
  return !["false", "0", "off", "no"].includes(String(value).toLowerCase());
}

function boundaryMs(value, endOfDay = false) {
  if (!value) return null;
  const raw = String(value);
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? `${raw}T${endOfDay ? "23:59:59.999" : "00:00:00"}+09:00`
    : raw;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getBetaWindow(now = Date.now()) {
  const configured = enabled(process.env.RECORDS_AI_BETA_ENABLED, false);
  const startsAt = process.env.RECORDS_AI_BETA_STARTS_AT || null;
  const endsAt = process.env.RECORDS_AI_BETA_ENDS_AT || null;
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

function entitlementActive(entitlement, now = Date.now()) {
  if (!entitlement || entitlement.status !== "active") return false;
  const startsAt = boundaryMs(entitlement.starts_at, false);
  const endsAt = boundaryMs(entitlement.ends_at, true);
  return (!startsAt || now >= startsAt) && (!endsAt || now <= endsAt);
}

function entitlementProducts() {
  return String(process.env.RECORDS_AI_ENTITLEMENT_PRODUCTS || "radar_ai,radar_subscription")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

async function hasAiEntitlement(userId) {
  const products = entitlementProducts();
  if (!userId || !products.length) return false;
  const { data, error } = await supabaseServer
    .from("entitlements")
    .select("product,status,starts_at,ends_at,created_at")
    .eq("user_id", userId)
    .in("product", products)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("records access entitlement lookup failed:", error.message);
    return false;
  }
  return (data || []).some((row) => entitlementActive(row));
}

export async function getRecordsAccess(userId) {
  const beta = getBetaWindow();
  const aiFeatureEnabled = enabled(process.env.RECORDS_AI_ENABLED, true);
  const entitled = beta.active ? false : await hasAiEntitlement(userId);
  const aiEnabled = aiFeatureEnabled && (beta.active || entitled);
  return {
    records_enabled: enabled(process.env.RECORDS_ENABLED, true),
    mode: beta.active ? "beta" : entitled ? "paid" : "free",
    beta_enabled: beta.active,
    beta_starts_at: beta.starts_at,
    beta_ends_at: beta.ends_at,
    beta_expired: beta.expired,
    beta_misconfigured: beta.misconfigured,
    entitled,
    ai_enabled: aiEnabled,
  };
}
