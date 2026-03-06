// lib/radar_v1/metnoClient.js

const BASE = "https://api.met.no/weatherapi/locationforecast/2.0";
const DEFAULT_TIMEOUT_MS = 12_000;

/**
 * Fetch MET Norway Locationforecast 2.0 (compact).
 * MET requires a descriptive User-Agent. Include contact info.
 *
 * @param {{ lat: number, lon: number, userAgent: string, timeoutMs?: number }} args
 * @returns {Promise<{ data: any, meta: { fetched_at: string, url: string, etag?: string, cache_control?: string } }>}
 */
export async function fetchMetnoLocationForecast({ lat, lon, userAgent, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  if (typeof lat !== "number" || typeof lon !== "number") {
    throw new Error("fetchMetnoLocationForecast: lat/lon must be numbers");
  }
  if (!userAgent || typeof userAgent !== "string") {
    throw new Error("fetchMetnoLocationForecast: userAgent is required (include contact info)");
  }

  const url = `${BASE}/compact?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": userAgent,
        "Accept": "application/json",
      },
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(t);
    throw new Error(`MET Norway fetch failed: ${String(e)}`);
  } finally {
    clearTimeout(t);
  }

  if (!res.ok) {
    const text = await safeReadText(res);
    throw new Error(`MET Norway HTTP ${res.status}: ${text?.slice(0, 200) || res.statusText}`);
  }

  const etag = res.headers.get("etag") || undefined;
  const cache_control = res.headers.get("cache-control") || undefined;

  const data = await res.json();

  return {
    data,
    meta: {
      fetched_at: new Date().toISOString(),
      url,
      etag,
      cache_control,
    },
  };
}

async function safeReadText(res) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
