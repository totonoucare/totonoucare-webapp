import { CORE_LABELS } from "./diagnosis/v2/labels";

export function getSignupResultIdentity(event, resultId) {
  const code = event?.computed?.core_code;
  if (!resultId || event?.id !== resultId || event?.retake_required ||
      typeof code !== "string" || !Object.prototype.hasOwnProperty.call(CORE_LABELS, code)) return null;
  return { resultId, coreCode: code, title: CORE_LABELS[code].title };
}

// Decoration uses the existing access-controlled result API; failure must not block signup.
export async function loadSignupResultIdentity({ resultId, accessToken = "", signal }, fetchImpl = fetch) {
  if (!resultId || signal?.aborted) return null;
  try {
    const response = await fetchImpl(`/api/diagnosis/v2/events/${encodeURIComponent(resultId)}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      credentials: "include",
      cache: "no-store",
      signal,
    });
    if (!response.ok || signal?.aborted) return null;
    const payload = await response.json();
    if (signal?.aborted) return null;
    return getSignupResultIdentity(payload?.data, resultId);
  } catch {
    return null;
  }
}
