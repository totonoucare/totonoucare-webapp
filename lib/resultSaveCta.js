export const RESULT_SAVE_CTA_SCROLL_THRESHOLD = 100;

export function resultCtaDismissed(id) {
  try { return typeof window !== "undefined" && window.sessionStorage.getItem(`result_forecast_cta_dismissed:${id}`) === "1"; }
  catch { return false; }
}

export function dismissResultCta(id) {
  try { if (typeof window !== "undefined") window.sessionStorage.setItem(`result_forecast_cta_dismissed:${id}`, "1"); }
  catch { /* The component's state still dismisses it if storage is blocked. */ }
}

// Wait for a scroll event so a restored scroll position never opens the CTA on mount.
export function observeResultSaveCtaScroll(target, onReveal) {
  let active = true;
  const stop = () => {
    active = false;
    target.removeEventListener("scroll", onScroll);
  };
  const onScroll = () => {
    if (!active || target.scrollY < RESULT_SAVE_CTA_SCROLL_THRESHOLD) return;
    stop();
    onReveal();
  };
  target.addEventListener("scroll", onScroll, { passive: true });
  return stop;
}
