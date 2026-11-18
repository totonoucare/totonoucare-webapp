"use client";
import { setPendingDiagnosisAttach } from "./pendingDiagnosisAttach";

let memoryResult = null;
const KEY = "mibyo_temporary_result_v126";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function getTemporaryResult() {
  try {
    const row = memoryResult || JSON.parse(sessionStorage.getItem(KEY) || "null");
    return UUID.test(row?.id || "") && Date.now() - row.at < 12 * 60 * 60 * 1000 ? row.id : null;
  } catch { return memoryResult && Date.now() - memoryResult.at < 12 * 60 * 60 * 1000 ? memoryResult.id : null; }
}
export function setTemporaryResult(id) {
  if (!UUID.test(id || "")) return;
  memoryResult = { id, at: Date.now() };
  try { sessionStorage.setItem(KEY, JSON.stringify(memoryResult)); } catch {}
  window.dispatchEvent(new Event("mibyo:temporary-result"));
}
export function clearTemporaryResult() {
  memoryResult = null;
  try { sessionStorage.removeItem(KEY); } catch {}
  window.dispatchEvent(new Event("mibyo:temporary-result"));
}
export function temporaryHeaders() {
  const id = getTemporaryResult();
  return id ? { "X-Mibyo-Guest-Result": id } : {};
}
export function temporarySignupHref(next = "/radar") {
  const id = getTemporaryResult();
  if (!id) return `/signup?next=${encodeURIComponent(next)}`;
  setPendingDiagnosisAttach({ resultId: id, nextPath: next });
  return `/signup?result=${encodeURIComponent(id)}&next=${encodeURIComponent(next)}`;
}
