// Authenticated first-party metrics: no health answers, coordinates, URL or text.
export const JOURNEY_EVENTS = [
  "forecast_cta_view", "forecast_cta_click", "forecast_cta_close",
  "forecast_page_view", "location_setup_view",
  "location_save_start", "location_save_success", "location_save_error",
];
export const JOURNEY_MAX_DAILY_EVENTS = 300;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FIELDS = {
  position: ["floating_save", "overview_footer", "compat_footer", "care_footer", "reflected_profile_link", "unknown"],
  tab: ["overview", "compat", "care"],
  method: ["gps", "preset"],
  code: ["unsupported", "permission_denied", "unavailable", "timeout", "save_failed"],
  state: ["current", "history", "unsaved"],
};
export function sanitizeJourneyEvent(body) {
  if (!body || !JOURNEY_EVENTS.includes(body.event) || typeof body.event_id !== "string" || !UUID.test(body.event_id)) return null;
  const payload = { version: "v779109" };
  for (const [field, allowed] of Object.entries(FIELDS)) {
    if (body[field] === undefined) continue;
    if (!allowed.includes(body[field])) return null;
    payload[field] = body[field];
  }
  return { event: body.event, event_id: body.event_id.toLowerCase(), payload };
}
