const LEGACY_MAIN_TRIGGERS = new Set(["pressure", "temp", "humidity"]);
const LEGACY_TRIGGER_DIRECTIONS = new Set(["up", "down"]);

function directionOrNull(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return LEGACY_TRIGGER_DIRECTIONS.has(normalized) ? normalized : null;
}

function mainTriggerFromExact(exact) {
  if (exact === "pressure_down" || exact === "pressure_up") return "pressure";
  if (exact === "temp_shift" || exact === "cold" || exact === "heat") return "temp";
  if (exact === "damp" || exact === "dry") return "humidity";
  return "pressure";
}

function fallbackDirectionFromExact(exact) {
  if (exact === "pressure_up" || exact === "heat" || exact === "damp") return "up";
  return "down";
}

function primaryFactor(forecast) {
  const factors = Array.isArray(forecast?.trigger_factors) ? forecast.trigger_factors : [];
  return factors.find((item) => item?.role === "primary") || factors[0] || null;
}

function matchingWeatherGroup(forecast, factor, mainTrigger) {
  const groups = forecast?.weather_load_groups || {};
  const groupKey = factor?.weather_group || (
    mainTrigger === "temp"
      ? "temperature"
      : mainTrigger === "humidity"
        ? "moisture"
        : "pressure"
  );
  return groups?.[groupKey] || null;
}

/**
 * radar_forecasts.main_trigger / trigger_dir are legacy compatibility columns.
 * The existing production constraint only accepts the old trigger directions
 * (up/down). Rich V2 states such as temp_shift + change/mixed remain intact in
 * computed.forecast_snapshot and are only projected at the database boundary.
 */
export function projectForecastStorageCompat(forecast = {}) {
  const factor = primaryFactor(forecast);
  const exact =
    forecast?.personal_main_trigger_exact ||
    factor?.exact ||
    factor?.key ||
    null;
  const requestedMain = String(forecast?.main_trigger || "").trim().toLowerCase();
  const mainTrigger = LEGACY_MAIN_TRIGGERS.has(requestedMain)
    ? requestedMain
    : mainTriggerFromExact(exact);
  const group = matchingWeatherGroup(forecast, factor, mainTrigger);

  const candidates = [
    forecast?.trigger_dir,
    factor?.trigger_dir,
    factor?.attention_direction,
    factor?.peak_direction,
    group?.attention_direction,
    group?.peak_direction,
    factor?.direction,
    factor?.physical_direction,
    group?.direction,
    mainTrigger === "pressure" ? forecast?.pressure_direction : null,
  ];
  const triggerDirection =
    candidates.map(directionOrNull).find(Boolean) ||
    fallbackDirectionFromExact(exact);

  return {
    main_trigger: mainTrigger,
    trigger_dir: triggerDirection,
  };
}
