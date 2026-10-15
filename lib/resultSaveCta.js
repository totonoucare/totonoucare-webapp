export const RESULT_SAVE_CTA_SCROLL_THRESHOLD = 100;

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
