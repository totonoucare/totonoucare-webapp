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
  return dtf.format(date);
}

/**
 * Get weekday label in Japanese (月/火/...).
 * @param {string} isoDate
 * @returns {string}
 */
export function jstWeekdayShort(isoDate) {
  const d = new Date(`${isoDate}T00:00:00+09:00`);
  const dtf = new Intl.DateTimeFormat("ja-JP", {
    timeZone: JST_TZ,
    weekday: "short",
  });
  const w = dtf.format(d);
  return w.replace("曜日", "").replace("曜", "");
}

/**
 * @param {string} isoDate
 */
export function formatForecastTitleJST(isoDate) {
  const [, m, d] = isoDate.split("-").map((x) => Number(x));
  const w = jstWeekdayShort(isoDate);
  return `${m}/${d}(${w}) の予報`;
}

/**
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
 * Radar v1 default:
 * - explicit date があればそれを使う
 * - それ以外は常に「明日」を返す
 *
 * 目的:
 * - partial-day forecast を避ける
 * - 未病レーダーを「明日の先回り予報」に統一する
 *
 * @param {{ date?: string | null, now?: Date }} args
 * @returns {{ targetDate: string, mode: "explicit" | "tomorrow" }}
 */
export function decideTargetDateJST({ date = null, now = new Date() } = {}) {
  if (date) return { targetDate: date, mode: "explicit" };

  const { isoDate } = nowJstParts(now);
  const d = new Date(`${isoDate}T00:00:00+09:00`);
  d.setDate(d.getDate() + 1);

  return { targetDate: toJstISODate(d), mode: "tomorrow" };
}

/**
 * @param {string} isoDate
 * @returns {boolean}
 */
export function isISODate(isoDate) {
  return /^\d{4}-\d{2}-\d{2}$/.test(isoDate);
}
