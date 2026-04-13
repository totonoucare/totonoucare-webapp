import crypto from "node:crypto";

const GUEST_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 3; // 3 days
const COOKIE_PREFIX = "dg_";

function secureCookie() {
  return process.env.NODE_ENV === "production";
}

export function getGuestCookieName(eventId) {
  return `${COOKIE_PREFIX}${eventId}`;
}

export function createGuestToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashGuestToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

export function getGuestTokenExpiry() {
  return new Date(Date.now() + GUEST_TOKEN_TTL_SECONDS * 1000);
}

export function getGuestCookieOptions(maxAge = GUEST_TOKEN_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: secureCookie(),
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

export function setGuestTokenCookie(response, eventId, token) {
  response.cookies.set(getGuestCookieName(eventId), token, getGuestCookieOptions());
}

export function clearGuestTokenCookie(response, eventId) {
  response.cookies.set(getGuestCookieName(eventId), "", getGuestCookieOptions(0));
}

export async function loadGuestAccessRow(supabase, eventId) {
  const { data, error } = await supabase
    .from("diagnosis_guest_access")
    .select("event_id, token_hash, expires_at, claimed_at, created_at, updated_at")
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function hasValidGuestToken({ req, supabase, eventId }) {
  const token = req.cookies.get(getGuestCookieName(eventId))?.value || "";
  if (!token) return false;

  const accessRow = await loadGuestAccessRow(supabase, eventId);
  if (!accessRow?.token_hash) return false;

  if (new Date(accessRow.expires_at).getTime() <= Date.now()) {
    return false;
  }

  return hashGuestToken(token) === accessRow.token_hash;
}
