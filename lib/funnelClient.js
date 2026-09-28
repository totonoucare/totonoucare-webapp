import { FUNNEL_EVENTS, FUNNEL_SOURCES, FUNNEL_CTA_LOCATIONS } from './funnelEvents';
// Best-effort first-party telemetry. Never include URLs, result IDs, email or health data.
export function trackFunnel(event, source = '', ctaLocation = '') {
  try {
    if (typeof window === 'undefined' || window.location.hostname !== 'mibyo-radar.totonoucare.com') return;
    if (!FUNNEL_EVENTS.includes(event) || !FUNNEL_SOURCES.includes(source) || !FUNNEL_CTA_LOCATIONS.includes(ctaLocation)) return;
    let visit = sessionStorage.getItem('mibyo_funnel_visit');
    if (!visit) { visit = crypto.randomUUID(); sessionStorage.setItem('mibyo_funnel_visit', visit); }
    const key = `funnel_once:${event}:${source}`;
    if (event.endsWith('_view') && sessionStorage.getItem(key)) return;
    if (event.endsWith('_view')) sessionStorage.setItem(key, '1');
    fetch('/api/funnel', { method: 'POST', credentials: 'same-origin', keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visit_id: visit, event_id: crypto.randomUUID(), event, source, ...(ctaLocation ? { cta_location: ctaLocation } : {}) })
    }).catch(() => {});
  } catch { /* Storage/network denial must never block the app. */ }
}

// Called once per actual page entry; the component guards React effect replay.
export function trackSignupEntry() {
  try {
    const seen = sessionStorage.getItem('funnel_once:signup_view:');
    trackFunnel(seen ? 'signup_revisit' : 'signup_view');
  } catch { /* Optional telemetry must not interrupt authentication. */ }
}
