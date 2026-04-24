// lib/radar_v1/metnoNormalize.js

const HOUR_MS = 60 * 60 * 1000;

/**
 * Normalize MET Norway timeseries into hourly-ish points for the given target_date (JST).
 * Day-only policy:
 * - Extract targetDate 00:00〜23:59 JST only.
 * - Do not add previous-day or next-day context points.
 *
 * Fields used by Radar v1:
 * - air_pressure_at_sea_level (hPa)
 * - air_temperature (°C)
 * - relative_humidity (%)
 *
 * @param {{ metnoJson: any, targetDate: string }} args
 * @returns {{ targetDate: string, points: Array<{ ts: string, pressure_hpa: number|null, temp_c: number|null, humidity_pct: number|null }> }}
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

  const points = metnoJson.properties.timeseries
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
    .filter((p) => p.tsMs >= targetStartMs && p.tsMs < targetEndMs)
    .sort((a, b) => a.tsMs - b.tsMs)
    .map(({ ts, pressure_hpa, temp_c, humidity_pct }) => ({
      ts,
      pressure_hpa,
      temp_c,
      humidity_pct,
    }));

  return { targetDate, points };
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
