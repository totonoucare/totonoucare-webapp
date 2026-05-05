// lib/radar_v1/metnoNormalize.js

const HOUR_MS = 60 * 60 * 1000;

/**
 * Normalize MET Norway timeseries into hourly-ish points for the given target_date (JST).
 *
 * Default policy:
 * - Extract targetDate 00:00〜23:59 JST only.
 * - Do not add previous-day context to today's forecast.
 *
 * Optional previous-night bridge:
 * - For tomorrow forecasts only, callers may request previousNightBridgePoints.
 * - This extracts previous day 18:00〜targetDate 09:00 JST from the same future forecast.
 * - Because MET Norway only supplies forecast data, this never depends on past observations.
 *
 * Fields used by Radar v1:
 * - air_pressure_at_sea_level (hPa)
 * - air_temperature (°C)
 * - relative_humidity (%)
 *
 * @param {{ metnoJson: any, targetDate: string, includePreviousNightBridge?: boolean }} args
 * @returns {{ targetDate: string, points: Array<{ ts: string, pressure_hpa: number|null, temp_c: number|null, humidity_pct: number|null }>, previousNightBridgePoints?: Array<{ ts: string, pressure_hpa: number|null, temp_c: number|null, humidity_pct: number|null }> }}
 */
export function normalizeMetnoForTargetDate({
  metnoJson,
  targetDate,
  includePreviousNightBridge = false,
}) {
  if (!metnoJson?.properties?.timeseries || !Array.isArray(metnoJson.properties.timeseries)) {
    throw new Error("normalizeMetnoForTargetDate: invalid metnoJson (missing properties.timeseries)");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    throw new Error("normalizeMetnoForTargetDate: targetDate must be YYYY-MM-DD");
  }

  const targetStartMs = new Date(`${targetDate}T00:00:00+09:00`).getTime();
  const targetEndMs = targetStartMs + 24 * HOUR_MS;
  const previousNightStartMs = targetStartMs - 6 * HOUR_MS; // previous day 18:00 JST
  const targetMorningEndMs = targetStartMs + 9 * HOUR_MS; // target day 09:00 JST

  const rows = metnoJson.properties.timeseries
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
        pressure_hpa: pressure,
        temp_c: temp,
        humidity_pct: humidity,
      };
    })
    .filter((p) => p.ts && Number.isFinite(p.tsMs))
    .sort((a, b) => a.tsMs - b.tsMs);

  const toPublicPoint = ({ ts, pressure_hpa, temp_c, humidity_pct }) => ({
    ts,
    pressure_hpa,
    temp_c,
    humidity_pct,
  });

  const points = rows
    .filter((p) => p.tsMs >= targetStartMs && p.tsMs < targetEndMs)
    .map(toPublicPoint);

  const result = { targetDate, points };

  if (includePreviousNightBridge) {
    result.previousNightBridgePoints = rows
      .filter((p) => p.tsMs >= previousNightStartMs && p.tsMs < targetMorningEndMs)
      .map(toPublicPoint);
  }

  return result;
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

function numberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

