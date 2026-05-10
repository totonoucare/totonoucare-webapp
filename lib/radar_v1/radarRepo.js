import { createClient } from "@supabase/supabase-js";
import {
  findPresetLocationByCoords,
  isVisibleLocationLabel,
} from "@/lib/radar_v1/locationDisplay";
import {
  hasGptFoodContext,
  hasGptTsuboSelectionReasons,
} from "@/lib/radar_v1/gptCompletion";


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


function firstNonEmpty(...values) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return value;
  }
  return "";
}

function hydrateForecastGptFields(forecast) {
  if (!forecast) return forecast;
  const snapshot = forecast?.computed?.forecast_snapshot || {};
  const gptSummary = firstNonEmpty(forecast.gpt_summary, snapshot.gpt_summary);
  const gptModel = firstNonEmpty(forecast.gpt_model, snapshot.gpt_model) || null;
  const gptGeneratedAt = firstNonEmpty(forecast.gpt_generated_at, snapshot.gpt_generated_at) || null;

  if (
    gptSummary === (forecast.gpt_summary || "") &&
    gptModel === (forecast.gpt_model || null) &&
    gptGeneratedAt === (forecast.gpt_generated_at || null)
  ) {
    return forecast;
  }

  return {
    ...forecast,
    gpt_summary: gptSummary || forecast.gpt_summary || "",
    gpt_model: gptModel || forecast.gpt_model || null,
    gpt_generated_at: gptGeneratedAt || forecast.gpt_generated_at || null,
  };
}

async function repairForecastGptColumnsIfNeeded(supabase, forecast) {
  const hydrated = hydrateForecastGptFields(forecast);
  if (!hydrated?.id) return hydrated;

  const hasTopLevelSummary = Boolean(String(forecast?.gpt_summary || "").trim());
  const hasHydratedSummary = Boolean(String(hydrated?.gpt_summary || "").trim());

  if (hasTopLevelSummary || !hasHydratedSummary) {
    return hydrated;
  }

  const nextComputed = {
    ...(forecast.computed || {}),
    forecast_snapshot: {
      ...(forecast.computed?.forecast_snapshot || {}),
      gpt_summary: hydrated.gpt_summary || "",
      gpt_model: hydrated.gpt_model || null,
      gpt_generated_at: hydrated.gpt_generated_at || null,
    },
  };

  const { data, error } = await supabase
    .from("radar_forecasts")
    .update({
      gpt_summary: hydrated.gpt_summary || "",
      gpt_model: hydrated.gpt_model || null,
      gpt_generated_at: hydrated.gpt_generated_at || null,
      computed: nextComputed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", hydrated.id)
    .select("*")
    .single();

  if (error) {
    console.warn("repairForecastGptColumnsIfNeeded failed:", error.message);
    return hydrated;
  }

  return hydrateForecastGptFields(data);
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

  const forecast = await repairForecastGptColumnsIfNeeded(supabase, rawForecast);

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
  preserveGptIfMissing = true,
}) {
  if (!userId) throw new Error("saveForecast: userId is required");
  if (!targetDate) throw new Error("saveForecast: targetDate is required");
  if (!locationId) throw new Error("saveForecast: locationId is required");
  if (!radarPlan?.forecast) throw new Error("saveForecast: radarPlan.forecast is required");

  const supabase = getServiceSupabase();

  let existingForecast = null;
  if (preserveGptIfMissing) {
    const { data: existingRows, error: existingError } = await supabase
      .from("radar_forecasts")
      .select("id,location_id,gpt_summary,gpt_model,gpt_generated_at,computed")
      .eq("user_id", userId)
      .eq("target_date", targetDate)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingError) {
      throw new Error(`saveForecast existing lookup failed: ${existingError.message}`);
    }
    existingForecast = hydrateForecastGptFields(existingRows?.[0] || null);
  }

  const incomingGptSummary = String(radarPlan.forecast.gpt_summary || "").trim();
  const existingGptSummary = String(existingForecast?.gpt_summary || "").trim();
  const shouldPreserveExistingGpt =
    preserveGptIfMissing &&
    !incomingGptSummary &&
    Boolean(existingGptSummary) &&
    String(existingForecast?.location_id || "") === String(locationId || "");

  const gptSummary = shouldPreserveExistingGpt ? existingForecast.gpt_summary : (radarPlan.forecast.gpt_summary || "");
  const gptModel = shouldPreserveExistingGpt ? existingForecast.gpt_model : (radarPlan.forecast.gpt_model || null);
  const gptGeneratedAt = shouldPreserveExistingGpt ? existingForecast.gpt_generated_at : (radarPlan.forecast.gpt_generated_at || null);
  const forecastSnapshot = {
    ...(radarPlan.forecast || {}),
    gpt_summary: gptSummary,
    gpt_model: gptModel,
    gpt_generated_at: gptGeneratedAt,
  };

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
    gpt_summary: gptSummary,
    gpt_model: gptModel,
    gpt_generated_at: gptGeneratedAt,
    vendor,
    vendor_meta: vendorMeta,
    computed: {
      radar_plan_meta: radarPlan.meta || null,
      gpt_inputs: radarPlan.gpt_inputs || null,
      forecast_snapshot: forecastSnapshot,
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

  const saved = hydrateForecastGptFields(data);
  const expectedSummary = String(gptSummary || "").trim();
  const savedSummary = String(saved?.gpt_summary || "").trim();

  // 念のための二重化。upsert後の返却またはDB列にAI文が乗っていない場合、
  // 同じ行を明示updateしてから返す。これで「初回表示では生成文、再表示ではwhy_short」事故を防ぐ。
  if (expectedSummary && !savedSummary && saved?.id) {
    const { data: repaired, error: repairError } = await supabase
      .from("radar_forecasts")
      .update({
        gpt_summary: gptSummary || "",
        gpt_model: gptModel || null,
        gpt_generated_at: gptGeneratedAt || null,
        computed: row.computed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", saved.id)
      .select("*")
      .single();

    if (repairError) {
      throw new Error(`saveForecast GPT repair failed: ${repairError.message}`);
    }

    return hydrateForecastGptFields(repaired);
  }

  return saved;
}

function shouldPreserveExistingGptFood({ incomingFood, existingFood, preserveGptIfMissing }) {
  return Boolean(
    preserveGptIfMissing &&
      !hasGptFoodContext(incomingFood) &&
      hasGptFoodContext(existingFood)
  );
}

function shouldPreserveExistingGptTsubo({ incomingTsuboSet, existingTsuboSet, preserveGptIfMissing }) {
  return Boolean(
    preserveGptIfMissing &&
      !hasGptTsuboSelectionReasons(incomingTsuboSet) &&
      hasGptTsuboSelectionReasons(existingTsuboSet)
  );
}

export async function saveCarePlan({
  forecastId,
  radarPlan,
  preserveGptIfMissing = true,
}) {
  if (!forecastId) throw new Error("saveCarePlan: forecastId is required");
  if (!radarPlan) throw new Error("saveCarePlan: radarPlan is required");

  const supabase = getServiceSupabase();

  let existingCarePlan = null;
  if (preserveGptIfMissing) {
    const { data: existing, error: existingError } = await supabase
      .from("radar_care_plans")
      .select("tomorrow_food_context,night_tsubo_set,night_note,night_tsubo_reason")
      .eq("forecast_id", forecastId)
      .maybeSingle();

    if (existingError) {
      throw new Error(`saveCarePlan existing lookup failed: ${existingError.message}`);
    }
    existingCarePlan = existing || null;
  }

  const incomingFood = radarPlan.tomorrow_food || {};
  const incomingTsuboSet = radarPlan.tonight?.tsubo_set || {};
  const preserveExistingFood = shouldPreserveExistingGptFood({
    incomingFood,
    existingFood: existingCarePlan?.tomorrow_food_context,
    preserveGptIfMissing,
  });
  const preserveExistingTsubo = shouldPreserveExistingGptTsubo({
    incomingTsuboSet,
    existingTsuboSet: existingCarePlan?.night_tsubo_set,
    preserveGptIfMissing,
  });

  const nightNote = preserveExistingTsubo
    ? existingCarePlan?.night_note || existingCarePlan?.night_tsubo_reason || ""
    : radarPlan.tonight?.note?.body || "";

  const row = {
    forecast_id: forecastId,

    night_tsubo_set: preserveExistingTsubo
      ? existingCarePlan?.night_tsubo_set || {}
      : incomingTsuboSet,
    night_note: nightNote,

    day_tsubo_set: {},
    if_worse_tsubo_set: {},

    tomorrow_food_context: preserveExistingFood
      ? existingCarePlan?.tomorrow_food_context || {}
      : incomingFood,
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

  if (peakStart && peakEnd) {
    return `${trigger}。崩れやすい時間帯は ${peakStart}〜${peakEnd}。`;
  }

  return `${trigger}。`;
}

