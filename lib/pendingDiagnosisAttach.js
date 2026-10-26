import { safeLocalPath } from "@/lib/safeReturnPath";
import { isCheckRegistrationPath } from "@/lib/checkRegistration";

const KEY = "pending_diagnosis_attach_v1";
const MAX_AGE_MS = 1000 * 60 * 60 * 12; // 12 hours

function now() {
  return Date.now();
}

function canUseStorage() {
  try {
    return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
  } catch {
    return false;
  }
}

function isValidResultId(v) {
  return typeof v === "string" && /^[0-9a-fA-F-]{36}$/.test(v);
}

export function setPendingDiagnosisAttach({ resultId, nextPath } = {}) {
  const beforeCheck = !resultId && isCheckRegistrationPath(nextPath);
  if (!canUseStorage() || (!isValidResultId(resultId) && !beforeCheck)) return;

  const payload = {
    resultId: resultId || "",
    nextPath: safeLocalPath(nextPath, "/radar"),
    savedAt: now(),
  };

  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {}
}

export function getPendingDiagnosisAttach() {
  if (!canUseStorage()) return null;

  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const beforeCheck = !parsed?.resultId && isCheckRegistrationPath(parsed?.nextPath);
    if (!parsed || (!isValidResultId(parsed.resultId) && !beforeCheck)) {
      window.sessionStorage.removeItem(KEY);
      return null;
    }

    if (typeof parsed.savedAt !== "number" || now() - parsed.savedAt > MAX_AGE_MS) {
      window.sessionStorage.removeItem(KEY);
      return null;
    }

    return {
      resultId: parsed.resultId,
      nextPath: safeLocalPath(parsed.nextPath, "/radar"),
    };
  } catch {
    return null;
  }
}

export function clearPendingDiagnosisAttach() {
  if (!canUseStorage()) return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {}
}
