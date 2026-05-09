import { flattenRadarLocationPresets } from "@/lib/radar_v1/locationPresets";

export const HIDDEN_LOCATION_LABELS = new Set(["primary", "current", "home"]);
const PRESETS = flattenRadarLocationPresets();

function clean(value) {
  return String(value || "").trim();
}

export function isVisibleLocationLabel(value) {
  const label = clean(value);
  return Boolean(label && !HIDDEN_LOCATION_LABELS.has(label.toLowerCase()));
}

export function findPresetLocationByCoords(lat, lon) {
  const nLat = Number(lat);
  const nLon = Number(lon);
  if (!Number.isFinite(nLat) || !Number.isFinite(nLon)) return null;

  return (
    PRESETS.find(
      (opt) =>
        Number(opt.lat).toFixed(4) === nLat.toFixed(4) &&
        Number(opt.lon).toFixed(4) === nLon.toFixed(4)
    ) || null
  );
}

export function getSafeLocationLabelHint(location, fallback = "現在地付近") {
  const visibleLabel = isVisibleLocationLabel(location?.label) ? clean(location.label) : null;
  const visibleDisplay = isVisibleLocationLabel(location?.display_name) ? clean(location.display_name) : null;
  const visibleRegion = isVisibleLocationLabel(location?.region_name) ? clean(location.region_name) : null;
  const preset = findPresetLocationByCoords(location?.lat, location?.lon);

  return visibleDisplay || visibleLabel || preset?.label || visibleRegion || fallback;
}

export function getDisplayableLocationName(location, fallback = "設定地域") {
  if (!location) return fallback;

  const visibleDisplay = isVisibleLocationLabel(location.display_name) ? clean(location.display_name) : null;
  if (visibleDisplay) return visibleDisplay;

  const visibleLabel = isVisibleLocationLabel(location.label) ? clean(location.label) : null;
  if (visibleLabel) return visibleLabel;

  const preset = findPresetLocationByCoords(location.lat, location.lon);
  if (preset?.label) return preset.label;

  const visibleRegion = isVisibleLocationLabel(location.region_name) ? clean(location.region_name) : null;
  if (visibleRegion) return visibleRegion;

  return fallback;
}

export function serializeDisplayableRadarLocation(location, fallback = "設定地域") {
  if (!location) return null;

  const displayName = getDisplayableLocationName(location, fallback);
  const visibleLabel = isVisibleLocationLabel(location.label) ? clean(location.label) : null;
  const visibleRegion = isVisibleLocationLabel(location.region_name) ? clean(location.region_name) : null;

  return {
    id: location.id,
    lat: location.lat,
    lon: location.lon,
    timezone: location.timezone,
    label: visibleLabel || null,
    display_name: displayName,
    region_name: visibleRegion || null,
    updated_at: location.updated_at || null,
  };
}
