import { safeLocalPath } from "./safeReturnPath";

export const CHECK_RUN_PATH = "/check/run";
export const CHECK_SIGNUP_HREF = `/signup?next=${encodeURIComponent(CHECK_RUN_PATH)}`;
export const CHECK_DRAFT_KEY = "pending_diagnosis_v2_rebuilt_answers";

export function clearCheckDraft() {
  try {
    if (typeof window !== "undefined") window.sessionStorage.removeItem(CHECK_DRAFT_KEY);
  } catch { /* A denied storage area must not prevent completion. */ }
}

export function isCheckRegistrationPath(value) {
  const localPath = safeLocalPath(value, "");
  if (!localPath) return false;
  return new URL(localPath, "https://totonoucare.invalid").pathname === CHECK_RUN_PATH;
}

// An explicit check-start destination must not inherit an older unsaved result.
// Legacy result-saving links continue to use their existing destination.
export function resolveSignupFlow({ resultId = "", nextPath = "", pending = null, fallbackPath = "" } = {}) {
  const checkEntry = !resultId && isCheckRegistrationPath(nextPath);
  const resolvedResultId = checkEntry ? "" : resultId || pending?.resultId || "";
  const fallback = safeLocalPath(fallbackPath, "") || (resolvedResultId
    ? `/result/${encodeURIComponent(resolvedResultId)}?attach=1`
    : "/radar");
  const resolvedNextPath = safeLocalPath(nextPath || pending?.nextPath, fallback);
  return {
    resultId: resolvedResultId,
    nextPath: resolvedNextPath,
    isBeforeCheck: !resolvedResultId && isCheckRegistrationPath(resolvedNextPath),
  };
}
