export const V126_ALLOWED_EVENTS = new Set(["check_start", "check_completed", "result_view", "compat_view", "care_view",
  "forecast_cta_click", "forecast_page_view", "location_setup_view", "location_save_start", "location_save_success", "location_save_error",
  "forecast_display", "care_category_view", "care_recorded", "result_insight_view", "forecast_insight_view",
  "save_prompt_view", "save_prompt_close", "save_bar_view", "save_bar_close", "save_prompt_click",
  "signup_view", "signup_revisit", "signup_google_start", "signup_email_start", "email_code_sent", "email_verify_start",
  "auth_success", "auth_error", "result_save_success", "result_save_error", "analysis_open", "analysis_paywall_view", "checkout_start","shop_entry_view","shop_material_click","shop_shelf_view","shop_outbound"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function cleanV126Metric(body) {
  if (!UUID.test(body?.visit_id || "") || !UUID.test(body?.event_id || "") || !V126_ALLOWED_EVENTS.has(body?.event)) return null;
  const detail = {};
  for (const [key, values] of Object.entries({ category: ["eat", "loosen", "live"], mode: ["today", "tomorrow"], source: ["", "overview", "compat", "care", "google", "email", "modal", "bar","forecast","shop_tab"] })) {
    if (body.detail?.[key] === undefined) continue;
    if (!values.includes(body.detail[key])) return null;
    detail[key] = body.detail[key];
  }
  return { visit_id: body.visit_id, event_id: body.event_id, event: body.event, detail };
}
