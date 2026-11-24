"use client";
import { jstDateString } from "./dateJST";

export const V126_EVENTS = ["check_start", "check_completed", "result_view", "compat_view", "care_view",
  "forecast_cta_click", "forecast_page_view", "location_setup_view", "location_save_start", "location_save_success", "location_save_error",
  "forecast_display", "forecast_trial_display", "care_category_view", "care_recorded", "result_insight_view", "forecast_insight_view",
  "save_prompt_view", "save_prompt_close", "save_bar_view", "save_bar_close", "save_prompt_click",
  "signup_view", "signup_revisit", "signup_google_start", "signup_email_start", "email_code_sent", "email_verify_start",
  "auth_success", "auth_error", "result_save_success", "result_save_error", "analysis_open", "analysis_paywall_view", "checkout_start","shop_entry_view","shop_material_click","shop_shelf_view","shop_outbound"];
export function trackV126(event, detail = {}) {
  try {
    if (typeof window === "undefined" || !V126_EVENTS.includes(event)) return;
    if (!["mibyo-radar.totonoucare.com", "totonoucare-webapp.vercel.app", "localhost", "127.0.0.1"].includes(location.hostname)) return;
    let visit = sessionStorage.getItem("mibyo_funnel_visit");
    if (!visit) { visit = crypto.randomUUID(); sessionStorage.setItem("mibyo_funnel_visit", visit); }
    const { category, mode, source } = detail;
    const forecastDisplay = event === "forecast_display" || event === "forecast_trial_display";
    const once = forecastDisplay || event.endsWith("_view") || event === "check_start" || event === "check_completed";
    const day = forecastDisplay ? `:${jstDateString()}` : "";
    const key = `v126_once:${event}:${category || ""}:${mode || ""}:${source || ""}${day}`;
    if (once && sessionStorage.getItem(key)) return;
    if (once) sessionStorage.setItem(key, "1");
    import("./supabaseClient").then(async ({ supabase }) => {
      const { data } = supabase ? await supabase.auth.getSession() : {};
      const token = data?.session?.access_token;
      fetch("/api/experience/v126", { method: "POST", credentials: "same-origin", keepalive: true,
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ event, visit_id: visit, event_id: crypto.randomUUID(), detail: { category, mode, source } }),
      }).catch(() => {});
    }).catch(() => {});
  } catch { /* Telemetry and storage failure never block the experience. */ }
}
