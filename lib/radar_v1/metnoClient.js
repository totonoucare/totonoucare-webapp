// lib/radar_v1/metnoClient.js

const BASE = "https://api.met.no/weatherapi/locationforecast/2.0";
const DEFAULT_TIMEOUT_MS = 12_000;

// MET Norway recommends a descriptive UA with contact info.
// You can change this anytime.
const DEFAULT_USER_AGENT = "MibyoRadar/0.1 (contact: hello@totonoucare.com)";

/**
 * Fetch MET Norway Locationforecast 2.0 (compact).
 *
 * @param {{ lat: number, lon: number, userAgent?: string, timeoutMs?: number, cache?: RequestCache }} args
 * @returns {Promise<{ data: any, meta: { fetched_at: string, url: string, etag?: string, cache_control?: string, user_agent: string } }>}
 */
export async function fetchMetnoLocationForecast({
  lat,
  lon,
  userAgent = DEFAULT_USER_AGENT,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  cache,
}) {
  if (typeof lat !== "number" || typeof lon !== "number") {
    throw new Error("fetchMetnoLocationForecast: lat/lon must be numbers");
  }

  // Ensure some UA always exists
  const ua = (userAgent && String(userAgent).trim()) || DEFAULT_USER_AGENT;

  const url = `${BASE}/compact?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  let data;
  let errorText;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": ua,
        Accept: "application/json",
      },
      signal: controller.signal,
      cache,
    });
    if (res.ok) {
      data = await res.json();
    } else {
      errorText = await safeReadText(res);
    }
  } catch (e) {
    throw new Error(`MET Norway fetch failed: ${String(e)}`);
  } finally {
    clearTimeout(t);
  }

  if (!res.ok) {
    throw new Error(`MET Norway HTTP ${res.status}: ${errorText?.slice(0, 200) || res.statusText}`);
  }

  const etag = res.headers.get("etag") || undefined;
  const cache_control = res.headers.get("cache-control") || undefined;

  return {
    data,
    meta: {
      fetched_at: new Date().toISOString(),
      url,
      etag,
      cache_control,
      user_agent: ua,
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
