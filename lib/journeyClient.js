"use client";
import { supabase } from "@/lib/supabaseClient";
import { sanitizeJourneyEvent } from "@/lib/journeyEvents";

// Never await metrics from a click, save or permission request.
export function trackJourney(event, detail = {}) {
  try {
    if (typeof window === "undefined" || window.location.hostname !== "mibyo-radar.totonoucare.com") return false;
    const clean = sanitizeJourneyEvent({ ...detail, event, event_id: crypto.randomUUID() });
    if (!clean) return false;
    const send = async () => {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) return;
      await fetch("/api/journey", {
        method: "POST", keepalive: true,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ event: clean.event, event_id: clean.event_id, ...clean.payload }),
      });
    };
    send().catch(() => {});
    return true;
  } catch { return false; }
}
