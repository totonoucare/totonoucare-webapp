import { FUNNEL_EVENTS, FUNNEL_SOURCES } from './funnelEvents';
// Best-effort first-party telemetry. Never include URLs, result IDs, email or health data.
export function trackFunnel(event, source = '') {
  try {
    if (typeof window === 'undefined' || window.location.hostname !== 'mibyo-radar.totonoucare.com') return;
    if (!FUNNEL_EVENTS.includes(event) || !FUNNEL_SOURCES.includes(source)) return;
    let visit = sessionStorage.getItem('mibyo_funnel_visit');
    if (!visit) { visit = crypto.randomUUID(); sessionStorage.setItem('mibyo_funnel_visit', visit); }
    const key = `funnel_once:${event}:${source}`;
    if (event.endsWith('_view') && sessionStorage.getItem(key)) return;
    if (event.endsWith('_view')) sessionStorage.setItem(key, '1');
    fetch('/api/funnel', { method: 'POST', credentials: 'same-origin', keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visit_id: visit, event_id: crypto.randomUUID(), event, source })
    }).catch(() => {});
  } catch { /* Storage/network denial must never block the app. */ }
}
