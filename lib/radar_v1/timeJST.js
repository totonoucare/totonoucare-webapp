// lib/radar_v1/timeJST.js

const JST_TZ = "Asia/Tokyo";

/**
 * Format a Date into YYYY-MM-DD in JST.
 * @param {Date} date
 * @returns {string}
 */
export function toJstISODate(date) {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: JST_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA yields "YYYY-MM-DD"
  return dtf.format(date);
}

/**
 * Get weekday label in Japanese (月/火/...).
 * @param {string} isoDate YYYY-MM-DD
 * @returns {string} e.g. "火"
 */
export function jstWeekdayShort(isoDate) {
  const d = new Date(`${isoDate}T00:00:00+09:00`);
  const dtf = new Intl.DateTimeFormat("ja-JP", {
    timeZone: JST_TZ,
    weekday: "short",
  });
  // "火" or "火曜" depending on env; normalize to first char.
  const w = dtf.format(d);
  return w.replace("曜日", "").replace("曜", "");
}

/**
 * Create a title like "3/3(火) の予報"
 * @param {string} isoDate YYYY-MM-DD
 */
export function formatForecastTitleJST(isoDate) {
  const [y, m, d] = isoDate.split("-").map((x) => Number(x));
  const w = jstWeekdayShort(isoDate);
  return `${m}/${d}(${w}) の予報`;
}

/**
 * Get "now" in JST parts.
 * @param {Date} [now=new Date()]
 * @returns {{ isoDate: string, hour: number, minute: number }}
 */
export function nowJstParts(now = new Date()) {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: JST_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const isoDate = `${get("year")}-${get("month")}-${get("day")}`;
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  return { isoDate, hour, minute };
}

/**
 * Decide target_date (JST) by cutoff.
 * - If date param is provided -> use it.
 * - Else if JST time >= cutoffHour -> tomorrow
 * - Else -> today
 *
 * @param {{ date?: string | null, now?: Date, cutoffHour?: number }} args
 * @returns {{ targetDate: string, mode: "explicit" | "today" | "tomorrow" }}
 */
export function decideTargetDateJST({ date = null, now = new Date(), cutoffHour = 18 } = {}) {
  if (date) return { targetDate: date, mode: "explicit" };

  const { isoDate, hour } = nowJstParts(now);

  if (hour >= cutoffHour) {
    // tomorrow in JST
    const d = new Date(`${isoDate}T00:00:00+09:00`);
    d.setDate(d.getDate() + 1);
    return { targetDate: toJstISODate(d), mode: "tomorrow" };
  }
  return { targetDate: isoDate, mode: "today" };
}

/**
 * Safe parse for YYYY-MM-DD
 * @param {string} isoDate
 * @returns {boolean}
 */
export function isISODate(isoDate) {
  return /^\d{4}-\d{2}-\d{2}$/.test(isoDate);
}
