// lib/radar_v1/metnoNormalize.js

import { toJstISODate } from "./timeJST";

const HOUR_MS = 60 * 60 * 1000;

/**
 * Normalize MET Norway timeseries into hourly-ish points for the given target_date (JST).
 *
 * points:
 * - targetDate 00:00〜23:59 JST
 * - UI表示、保存、当日ピーク用
 *
 * contextPoints:
 * - 前日18:00〜翌日03:00 JST
 * - 気圧・気温・湿度の「日付またぎの変化」検出用
 *
 * @param {{ metnoJson: any, targetDate: string }} args
 * @returns {{
 *   targetDate: string,
 *   points: Array<{ ts: string, pressure_hpa: number|null, temp_c: number|null, humidity_pct: number|null }>,
 *   contextPoints: Array<{ ts: string, pressure_hpa: number|null, temp_c: number|null, humidity_pct: number|null }>,
 *   contextWindow: { start: string, end: string }
 * }}
 */
export function normalizeMetnoForTargetDate({ metnoJson, targetDate }) {
  if (!metnoJson?.properties?.timeseries || !Array.isArray(metnoJson.properties.timeseries)) {
    throw new Error("normalizeMetnoForTargetDate: invalid metnoJson (missing properties.timeseries)");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    throw new Error("normalizeMetnoForTargetDate: targetDate must be YYYY-MM-DD");
  }

  const targetStartMs = new Date(`${targetDate}T00:00:00+09:00`).getTime();
  const targetEndMs = targetStartMs + 24 * HOUR_MS;

  // 前日18時〜翌日03時。
  // 例: 4/24対象なら、4/23 18:00〜4/25 03:00 JST。
  const contextStartMs = targetStartMs - 6 * HOUR_MS;
  const contextEndMs = targetStartMs + 27 * HOUR_MS;

  const allPoints = metnoJson.properties.timeseries
    .map((row) => {
      const ts = row?.time; // ISO string in UTC (usually ends with Z)
      const tsMs = ts ? new Date(ts).getTime() : NaN;
      const details = row?.data?.instant?.details || {};

      const pressure = numberOrNull(details.air_pressure_at_sea_level);
      const temp = numberOrNull(details.air_temperature);
      const humidity = numberOrNull(details.relative_humidity);

      return {
        ts,
        tsMs,
        jstDate: Number.isFinite(tsMs) ? toJstISODate(new Date(ts)) : null,
        pressure_hpa: pressure,
        temp_c: temp,
        humidity_pct: humidity,
      };
    })
    .filter((p) => p.ts && Number.isFinite(p.tsMs));

  allPoints.sort((a, b) => a.tsMs - b.tsMs);

  const points = allPoints
    .filter((p) => p.tsMs >= targetStartMs && p.tsMs < targetEndMs)
    .map(toPublicPoint);

  const contextPoints = allPoints
    .filter((p) => p.tsMs >= contextStartMs && p.tsMs <= contextEndMs)
    .map(toPublicPoint);

  return {
    targetDate,
    points,
    contextPoints: contextPoints.length ? contextPoints : points,
    contextWindow: {
      start: new Date(contextStartMs).toISOString(),
      end: new Date(contextEndMs).toISOString(),
    },
  };
}

/**
 * Optionally: downsample to at most N points (e.g. hourly).
 * MET can be hourly already, but keep this helper for safety.
 *
 * @param {Array<{ts: string, pressure_hpa: number|null, temp_c: number|null, humidity_pct: number|null}>} points
 * @param {number} step take every Nth point (e.g. 1 = keep all, 2 = every 2 points)
 */
export function downsamplePoints(points, step = 1) {
  if (!Array.isArray(points) || points.length === 0) return [];
  if (step <= 1) return points;
  const out = [];
  for (let i = 0; i < points.length; i += step) out.push(points[i]);
  return out;
}

function toPublicPoint({ ts, pressure_hpa, temp_c, humidity_pct }) {
  return {
    ts,
    pressure_hpa,
    temp_c,
    humidity_pct,
  };
}

function numberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
