// A stable, account-scoped receipt. The server stores the same guide id in
// app_experience_events; local storage prevents repeat prompts during outages.
export const TRIAL_WELCOME_ID = "trial_intro";
const STORAGE_PREFIX = "mibyo-trial-welcome:";

export function trialWelcomeActive(access, now = Date.now()) {
  const ends = Date.parse(access?.trial_ends_at || "");
  return Boolean(access?.mode === "trial" && access.trial_enabled &&
    !access.entitled && !access.beta_enabled && Number.isFinite(ends) && now <= ends);
}

export function trialWelcomeEligible({ access, rows = [], seen = false, now = Date.now() } = {}) {
  return trialWelcomeActive(access, now) && !seen &&
    !rows.some(row => row.event_key === `guide:${TRIAL_WELCOME_ID}`);
}

export function readTrialWelcomeSeen(userId) {
  if (!userId || typeof window === "undefined") return false;
  try { return window.localStorage.getItem(`${STORAGE_PREFIX}${userId}`) === "1"; }
  catch { return false; }
}

export function rememberTrialWelcome(userId) {
  if (!userId || typeof window === "undefined") return;
  try { window.localStorage.setItem(`${STORAGE_PREFIX}${userId}`, "1"); }
  catch { /* The authenticated server receipt is the primary persistence. */ }
}

export function formatTrialEnd(value) {
  const time = Date.parse(value || "");
  if (!Number.isFinite(time)) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo", month: "long", day: "numeric", weekday: "short",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(time);
}
