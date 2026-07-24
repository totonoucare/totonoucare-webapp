import { createClient } from "@supabase/supabase-js";
import {
  findPresetLocationByCoords,
  isVisibleLocationLabel,
} from "@/lib/radar_v1/locationDisplay";


const GENERIC_LOCATION_LABELS = new Set(["現在地付近", "設定地域", "設定中の地域"]);

function cleanLocationText(value) {
  return String(value || "").trim();
}

function visibleLocationText(value) {
  const text = cleanLocationText(value);
  return isVisibleLocationLabel(text) ? text : null;
}

function isGenericLocationLabel(value) {
  const text = cleanLocationText(value);
  return !text || GENERIC_LOCATION_LABELS.has(text);
}

function isSameLocation(existing, lat, lon) {
  const existingLat = Number(existing?.lat);
  const existingLon = Number(existing?.lon);
  if (!Number.isFinite(existingLat) || !Number.isFinite(existingLon)) return false;
  return existingLat.toFixed(4) === Number(lat).toFixed(4) && existingLon.toFixed(4) === Number(lon).toFixed(4);
}

function buildSafeLocationFields({ existing, lat, lon, label, displayName, regionName }) {
  const preset = findPresetLocationByCoords(lat, lon);
  const sameLocation = isSameLocation(existing, lat, lon);

  const incomingLabel = visibleLocationText(label);
  const incomingDisplay = visibleLocationText(displayName);
  const incomingRegion = visibleLocationText(regionName);
  const existingLabel = visibleLocationText(existing?.label);
  const existingDisplay = visibleLocationText(existing?.display_name);
  const existingRegion = visibleLocationText(existing?.region_name);
  const concreteIncomingDisplay = !isGenericLocationLabel(incomingDisplay) ? incomingDisplay : null;

  // プリセット座標は「京都」などの人間向けラベルを最優先で守る。
  // 同じ座標の再計算では既存の人間向けラベルを守り、別座標への変更では逆ジオコード結果を優先する。
  const safeLabel =
    preset?.label ||
    (!isGenericLocationLabel(incomingLabel) ? incomingLabel : null) ||
    (sameLocation ? existingLabel : null) ||
    concreteIncomingDisplay ||
    existingLabel ||
    existingDisplay ||
    incomingLabel ||
    "現在地付近";

  const safeDisplayName =
    concreteIncomingDisplay ||
    preset?.label ||
    (sameLocation ? existingDisplay : null) ||
    safeLabel ||
    null;

  const safeRegionName = incomingRegion || (sameLocation ? existingRegion : null) || null;

  return {
    label: safeLabel,
    displayName: safeDisplayName,
    regionName: safeRegionName,
  };
}


function finiteNumberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function hydrateForecastFields(forecast) {
  if (!forecast) return forecast;
  const snapshot = forecast?.computed?.forecast_snapshot || {};

  // score_0_10 はDB smallintなので整数保存。
  // ただし表示用の小数スコアは computed.forecast_snapshot に保存されるため、
  // 2回目以降の読み戻し時に forecast 直下へ復元する。
  const snapshotDisplayScore = finiteNumberOrNull(
    snapshot.score_display_0_10 ?? snapshot.score_precise_0_10
  );
  const displayScore = finiteNumberOrNull(
    forecast.score_display_0_10 ?? forecast.score_precise_0_10
  ) ?? snapshotDisplayScore;

  const next = { ...forecast };

  if (displayScore != null) {
    next.score_display_0_10 = displayScore;
    next.score_precise_0_10 = displayScore;
  }

  return next;
}

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export async function getPrimaryRadarLocation({ userId }) {
  if (!userId) throw new Error("getPrimaryRadarLocation: userId is required");

  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("radar_locations")
    .select("*")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`getPrimaryRadarLocation failed: ${error.message}`);
  }

  return data?.[0] || null;
}

export async function upsertPrimaryRadarLocation({
  userId,
  lat,
  lon,
  timezone = "Asia/Tokyo",
  label = "現在地付近",
  displayName,
  regionName,
}) {
  if (!userId) throw new Error("upsertPrimaryRadarLocation: userId is required");
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("upsertPrimaryRadarLocation: lat/lon must be numbers");
  }

  const supabase = getServiceSupabase();
  const existing = await getPrimaryRadarLocation({ userId });
  const safeFields = buildSafeLocationFields({
    existing,
    lat,
    lon,
    label,
    displayName,
    regionName,
  });

  const payload = {
    lat,
    lon,
    timezone,
    label: safeFields.label,
    is_primary: true,
    updated_at: new Date().toISOString(),
  };

  if (displayName !== undefined || existing?.display_name !== undefined) {
    payload.display_name = safeFields.displayName || null;
  }
  if (regionName !== undefined || existing?.region_name !== undefined) {
    payload.region_name = safeFields.regionName || null;
  }

  if (existing) {
    const { data, error } = await supabase
      .from("radar_locations")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(`upsertPrimaryRadarLocation update failed: ${error.message}`);
    }

    return data;
  }

  const { data, error } = await supabase
    .from("radar_locations")
    .insert({
      user_id: userId,
      ...payload,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`upsertPrimaryRadarLocation insert failed: ${error.message}`);
  }

  return data;
}


export async function listPrimaryRadarLocationsForForecastCron({
  limit = 100,
  userId = null,
} = {}) {
  const supabase = getServiceSupabase();
  const safeLimit = Math.max(1, Math.min(500, Number(limit) || 100));

  let query = supabase
    .from("radar_locations")
    .select("*")
    .eq("is_primary", true)
    .order("updated_at", { ascending: false })
    .limit(safeLimit);

  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query;
  if (error) {
    throw new Error(`listPrimaryRadarLocationsForForecastCron failed: ${error.message}`);
  }

  const seen = new Set();
  const unique = [];

  for (const location of data || []) {
    const uid = String(location?.user_id || "");
    if (!uid || seen.has(uid)) continue;
    seen.add(uid);
    unique.push(location);
  }

  return unique;
}

export async function getForecastBundle({ userId, targetDate }) {
  if (!userId) throw new Error("getForecastBundle: userId is required");
  if (!targetDate) throw new Error("getForecastBundle: targetDate is required");

  const supabase = getServiceSupabase();

  const { data: forecasts, error: forecastError } = await supabase
    .from("radar_forecasts")
    .select("*")
    .eq("user_id", userId)
    .eq("target_date", targetDate)
    .order("created_at", { ascending: false })
    .limit(1);

  if (forecastError) {
    throw new Error(`getForecastBundle forecast failed: ${forecastError.message}`);
  }

  const rawForecast = forecasts?.[0] || null;
  if (!rawForecast) return null;

  const forecast = hydrateForecastFields(rawForecast);

  const { data: carePlan, error: carePlanError } = await supabase
    .from("radar_care_plans")
    .select("*")
    .eq("forecast_id", forecast.id)
    .maybeSingle();

  if (carePlanError) {
    throw new Error(`getForecastBundle care plan failed: ${carePlanError.message}`);
  }

  return {
    forecast,
    care_plan: carePlan || null,
  };
}

export async function getPreviousMtestPointCode({ userId, beforeDate }) {
  if (!userId) throw new Error("getPreviousMtestPointCode: userId is required");
  if (!beforeDate) throw new Error("getPreviousMtestPointCode: beforeDate is required");

  const supabase = getServiceSupabase();

  const { data: forecasts, error: forecastError } = await supabase
    .from("radar_forecasts")
    .select("id,target_date")
    .eq("user_id", userId)
    .lt("target_date", beforeDate)
    .order("target_date", { ascending: false })
    .limit(1);

  if (forecastError) {
    throw new Error(`getPreviousMtestPointCode forecast failed: ${forecastError.message}`);
  }

  const prevForecast = forecasts?.[0];
  if (!prevForecast) return null;

  const { data: carePlan, error: carePlanError } = await supabase
    .from("radar_care_plans")
    .select("night_tsubo_set")
    .eq("forecast_id", prevForecast.id)
    .maybeSingle();

  if (carePlanError) {
    throw new Error(`getPreviousMtestPointCode care plan failed: ${carePlanError.message}`);
  }

  const points = carePlan?.night_tsubo_set?.points;
  if (!Array.isArray(points)) return null;

  const mtestPoint = points.find((p) => p?.source === "mtest" && p?.code);
  return mtestPoint?.code || null;
}

export async function saveForecast({
  userId,
  targetDate,
  locationId,
  radarPlan,
  vendor = "metno",
  vendorMeta = {},
}) {
  if (!userId) throw new Error("saveForecast: userId is required");
  if (!targetDate) throw new Error("saveForecast: targetDate is required");
  if (!locationId) throw new Error("saveForecast: locationId is required");
  if (!radarPlan?.forecast) throw new Error("saveForecast: radarPlan.forecast is required");

  const supabase = getServiceSupabase();

  const row = {
    user_id: userId,
    target_date: targetDate,
    location_id: locationId,
    score_0_10: radarPlan.forecast.score_0_10,
    signal: radarPlan.forecast.signal,
    peak_start: radarPlan.forecast.peak_start || null,
    peak_end: radarPlan.forecast.peak_end || null,
    main_trigger: radarPlan.forecast.main_trigger,
    trigger_dir: radarPlan.forecast.trigger_dir,
    delta_vs_today: radarPlan.forecast.delta_vs_today,
    why_short: buildWhyShort(radarPlan),
    vendor,
    vendor_meta: vendorMeta,
    computed: {
      radar_plan_meta: radarPlan.meta || null,
      forecast_snapshot: radarPlan.forecast,
    },
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("radar_forecasts")
    .upsert(row, {
      onConflict: "user_id,target_date",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`saveForecast failed: ${error.message}`);
  }

  return hydrateForecastFields(data);
}

export async function saveCarePlan({
  forecastId,
  radarPlan,
}) {
  if (!forecastId) throw new Error("saveCarePlan: forecastId is required");
  if (!radarPlan) throw new Error("saveCarePlan: radarPlan is required");

  const supabase = getServiceSupabase();

  const incomingFood = radarPlan.tomorrow_food || {};
  const incomingTsuboSet = radarPlan.tonight?.tsubo_set || {};
  const nightNote = radarPlan.tonight?.note?.body || "";

  const row = {
    forecast_id: forecastId,

    night_tsubo_set: incomingTsuboSet,
    night_note: nightNote,

    day_tsubo_set: {},
    if_worse_tsubo_set: {},

    tomorrow_food_context: incomingFood,
    tomorrow_caution: radarPlan.tomorrow_caution || "",
    review_schema: radarPlan.review_schema || {},

    night_tsubo_reason: nightNote,
    night_food: {},
    night_food_reason: "",
    day_tsubo_reason: "",
    if_worse_reason: "",
  };

  const { data, error } = await supabase
    .from("radar_care_plans")
    .upsert(row, {
      onConflict: "forecast_id",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`saveCarePlan failed: ${error.message}`);
  }

  return data;
}

function buildWhyShort(radarPlan) {
  const factors = Array.isArray(radarPlan?.forecast?.trigger_factors)
    ? radarPlan.forecast.trigger_factors
    : [];
  const labels = factors.map((item) => item?.label).filter(Boolean).slice(0, 2);
  const trigger = labels.length
    ? labels.join("＋")
    : radarPlan?.forecast?.main_trigger_label || "気象変化";
  const peakStart = radarPlan?.forecast?.peak_start;
  const peakEnd = radarPlan?.forecast?.peak_end;
  const manifestation = String(radarPlan?.forecast?.manifestation_summary || "").trim();

  if (peakStart && peakEnd) {
    return `${trigger}。${manifestation ? `${manifestation} ` : ""}天気ストレスが強まる時間帯は ${peakStart}〜${peakEnd}。症状が出る時刻を示すものではありません。`;
  }

  return `${trigger}。${manifestation}`;
}
