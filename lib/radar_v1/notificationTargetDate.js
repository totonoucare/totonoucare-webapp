import { nowJstParts, toJstISODate } from "@/lib/radar_v1/timeJST";

export function addDaysJST(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00+09:00`);
  d.setDate(d.getDate() + days);
  return toJstISODate(d);
}

export function getNotificationTargetDate({ kind, now = new Date() }) {
  const { isoDate } = nowJstParts(now);
  if (kind === "night") return addDaysJST(isoDate, 1);
  if (kind === "morning") return isoDate;
  throw new Error(`Unknown notification kind: ${kind}`);
}
