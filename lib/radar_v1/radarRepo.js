// lib/radar_v1/radarRepo.js
import { createClient } from "@supabase/supabase-js";

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
  label = "primary",
}) {
  if (!userId) throw new Error("upsertPrimaryRadarLocation: userId is required");
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("upsertPrimaryRadarLocation: lat/lon must be numbers");
  }

  const supabase = getServiceSupabase();
  const existing = await getPrimaryRadarLocation({ userId });

  if (existing) {
    const { data, error } = await supabase
      .from("radar_locations")
      .update({
        lat,
        lon,
        timezone,
        label,
        is_primary: true,
        updated_at: new Date().toISOString(),
      })
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
      lat,
      lon,
      timezone,
      label,
      is_primary: true,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`upsertPrimaryRadarLocation insert failed: ${error.message}`);
  }

  return data;
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

  const forecast = forecasts?.[0] || null;
  if (!forecast) return null;

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
    gpt_summary: "",
    gpt_model: null,
    gpt_generated_at: null,
    vendor,
    vendor_meta: vendorMeta,
    computed: {
      radar_plan_meta: radarPlan.meta || null,
      gpt_inputs: radarPlan.gpt_inputs || null,
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

  return data;
}

export async function saveCarePlan({
  forecastId,
  radarPlan,
}) {
  if (!forecastId) throw new Error("saveCarePlan: forecastId is required");
  if (!radarPlan) throw new Error("saveCarePlan: radarPlan is required");

  const supabase = getServiceSupabase();

  const row = {
    forecast_id: forecastId,

    // 今回のMVPではまず夜のセットを本体として保存
    night_tsubo_set: radarPlan.tonight?.tsubo_set || {},
    night_note: radarPlan.tonight?.note?.body || "",

    // まだ day / if_worse は専用設計未完なので空で保存
    day_tsubo_set: {},
    if_worse_tsubo_set: {},

    tomorrow_food_context: radarPlan.tomorrow_food || {},
    tomorrow_caution: radarPlan.tomorrow_caution || "",
    review_schema: radarPlan.review_schema || {},

    // 既存列との整合
    night_tsubo_reason: radarPlan.tonight?.note?.body || "",
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
  const trigger = radarPlan?.forecast?.main_trigger_label || "気象変化";
  const peakStart = radarPlan?.forecast?.peak_start;
  const peakEnd = radarPlan?.forecast?.peak_end;

  if (peakStart && peakEnd) {
    return `${trigger}。崩れやすい時間帯は ${peakStart}〜${peakEnd}。`;
  }

  return `${trigger}。`;
}
