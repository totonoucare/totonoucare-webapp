import { flattenRadarLocationPresets } from "@/lib/radar_v1/locationPresets";

const PRESETS = flattenRadarLocationPresets();
const HIDDEN_LOCATION_LABELS = new Set(["primary", "current", "home"]);

function normalizeLabel(value) {
  return String(value || "").trim();
}

function isVisibleLabel(value) {
  const label = normalizeLabel(value);
  return !!label && !HIDDEN_LOCATION_LABELS.has(label.toLowerCase());
}

function findPresetByCoords(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return (
    PRESETS.find(
      (opt) =>
        Number(opt.lat).toFixed(4) === Number(lat).toFixed(4) &&
        Number(opt.lon).toFixed(4) === Number(lon).toFixed(4)
    ) || null
  );
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = normalizeLabel(value);
    if (text) return text;
  }
  return null;
}

function dedupeAdjacent(parts) {
  const out = [];
  for (const part of parts) {
    const text = normalizeLabel(part);
    if (!text) continue;
    if (out[out.length - 1] === text) continue;
    out.push(text);
  }
  return out;
}

function parseJapaneseDisplayName(address, fallbackDisplayName) {
  const city = firstNonEmpty(
    address.city,
    address.town,
    address.village,
    address.municipality,
    address.county
  );

  const ward = firstNonEmpty(
    address.city_district,
    address.borough,
    address.suburb,
    address.quarter,
    address.neighbourhood,
    address.district
  );

  const parts = dedupeAdjacent([
    city,
    ward && city && city.includes(ward) ? null : ward,
  ]);

  if (parts.length) return parts.join("");

  return firstNonEmpty(
    address.city_district,
    address.suburb,
    address.borough,
    fallbackDisplayName?.split(",")?.[0]
  );
}

function parseGenericDisplayName(address, fallbackDisplayName) {
  return firstNonEmpty(
    address.city,
    address.town,
    address.village,
    address.municipality,
    address.county,
    address.state_district,
    address.suburb,
    fallbackDisplayName?.split(",")?.[0]
  );
}

function parseRegionName(address, fallbackDisplayName) {
  return firstNonEmpty(
    address.state,
    address.province,
    address.region,
    address.county,
    address.state_district,
    fallbackDisplayName?.split(",")?.[1]
  );
}

async function fetchNominatimReverse({ lat, lon }) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "ja");

  const res = await fetch(url, {
    headers: {
      "User-Agent": "totonoucare-webapp/1.0 (radar geocoding)",
      "Accept-Language": "ja",
    },
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!res.ok) {
    throw new Error(`reverse geocode failed: HTTP ${res.status}`);
  }

  return res.json();
}

export async function resolveRadarLocationMeta({ lat, lon, labelHint = "primary" }) {
  const preset = findPresetByCoords(lat, lon);
  const safeLabelHint = isVisibleLabel(labelHint) ? normalizeLabel(labelHint) : null;

  let displayName = preset?.label || null;
  let regionName = null;

  try {
    const json = await fetchNominatimReverse({ lat, lon });
    const address = json?.address || {};
    const countryCode = String(address.country_code || "").toLowerCase();

    const geocodedDisplayName =
      countryCode === "jp"
        ? parseJapaneseDisplayName(address, json?.display_name || "")
        : parseGenericDisplayName(address, json?.display_name || "");

    displayName = displayName || geocodedDisplayName || safeLabelHint || null;
    regionName = parseRegionName(address, json?.display_name || "") || null;
  } catch (e) {
    console.error("resolveRadarLocationMeta reverse geocode failed:", e);
    displayName = displayName || safeLabelHint || null;
  }

  return {
    label: preset?.label || safeLabelHint || "primary",
    display_name: displayName || null,
    region_name: regionName || null,
  };
}
