export const FUNNEL_EVENTS = ['result_view', 'compat_view', 'care_view', 'signup_cta_view', 'signup_cta_click', 'signup_view', 'signup_google_start', 'signup_email_start', 'email_code_sent', 'email_verify_start', 'auth_success', 'auth_error', 'result_save_success', 'result_save_error', 'radar_view'];
export const FUNNEL_SOURCES = ['', 'overview', 'compat', 'care', 'google', 'email'];
export function validFunnelEvent(v) {
  return !!v && /^[0-9a-f-]{36}$/i.test(v.visit_id || '') && /^[0-9a-f-]{36}$/i.test(v.event_id || '') && FUNNEL_EVENTS.includes(v.event) && FUNNEL_SOURCES.includes(v.source || '');
}
