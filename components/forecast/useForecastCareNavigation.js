"use client";

import { useCallback, useEffect, useRef } from "react";

const CARE_ID = "daily-care-section";
const headerBottom = () => document.querySelector("[data-app-header]")?.getBoundingClientRect().bottom || 0;
const careElement = () => document.getElementById(CARE_ID);

function alignCare(behavior = "instant", focus = false) {
  const section = careElement();
  if (!section) return;
  if (focus) section.focus({ preventScroll: true });
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: Math.max(0, window.scrollY + section.getBoundingClientRect().top - headerBottom() - 12), behavior: reducedMotion ? "instant" : behavior });
}

// A date change temporarily replaces the forecast with loading cards. Remember
// the user's place until the new care and the asynchronously sized summary land.
// Any deliberate scrolling/interaction releases the anchor immediately.
export default function useForecastCareNavigation({ activeDate, ready }) {
  const pending = useRef(null);
  const stopAnchoring = useRef(null);
  useEffect(() => {
    const release = event => {
      if (event.target instanceof Element && event.target.closest("[data-forecast-header-controls]")) return;
      pending.current = null;
      stopAnchoring.current?.();
    };
    const events = ["wheel", "touchstart", "pointerdown", "keydown"];
    for (const event of events) window.addEventListener(event, release, { passive: true });
    return () => { for (const event of events) window.removeEventListener(event, release); };
  }, []);
  const rememberDateChange = useCallback(nextDate => {
    const bounds = careElement()?.getBoundingClientRect();
    const inCare = bounds && bounds.top <= headerBottom() + 48 && bounds.bottom > headerBottom();
    // Reuse a pending position only while loading has removed the care section.
    // A visible section lets us respect an explicit return to the gauge as well.
    pending.current = bounds ? (inCare ? nextDate : null) : pending.current ? nextDate : null;
  }, []);
  const jumpToCare = useCallback(() => {
    pending.current = null;
    stopAnchoring.current?.();
    alignCare("smooth", true);
  }, []);

  useEffect(() => {
    if (!ready || pending.current !== activeDate || !careElement()) return;
    let frame = 0;
    let active = true;
    let anchored = false;
    const align = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (active && pending.current === activeDate) { alignCare(); anchored = true; }
      });
    };
    const release = () => {
      pending.current = null;
      active = false;
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(align);
    stopAnchoring.current = release;
    const releaseIfMoved = () => {
      const section = careElement();
      if (active && anchored && section && Math.abs(section.getBoundingClientRect().top - headerBottom() - 12) > 24) release();
    };
    window.addEventListener("scroll", releaseIfMoved, { passive: true });
    for (const selector of ["[data-forecast-overview]", "[data-app-header]"]) {
      const node = document.querySelector(selector);
      if (node) observer?.observe(node);
    }
    align();
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("scroll", releaseIfMoved);
      if (stopAnchoring.current === release) stopAnchoring.current = null;
    };
  }, [activeDate, ready]);

  return { jumpToCare, rememberDateChange };
}
