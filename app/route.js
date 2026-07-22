// app/api/radar/v1/forecast/public/route.js
// 未ログインユーザー向け。認証不要、体質なし、気象ストレスのみ返す。

import { fetchMetnoLocationForecast } from "@/lib/radar_v1/metnoClient";
import { normalizeMetnoForTargetDate } from "@/lib/radar_v1/metnoNormalize";
import { buildWeatherStressV2 } from "@/lib/radar_v1/weatherStressV2";
import { personalizePublicForecastV2 } from "@/lib/radar_v1/personalizeForecastV2";
import { getTriggerLabel } from "@/lib/radar_v1/copy";
import { decideTargetDateJST, nowJstParts, toJstISODate } from "@/lib/radar_v1/timeJST";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// レート制限のため、東京をデフォルト座標として使う
const DEFAULT_LAT = 35.68944;
const DEFAULT_LON = 139.69167;

function jsonUtf8(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const latParam = searchParams.get("lat");
    const lonParam = searchParams.get("lon");
    const dateParam = searchParams.get("date");

    const lat = latParam !== null ? Number(latParam) : DEFAULT_LAT;
    const lon = lonParam !== null ? Number(lonParam) : DEFAULT_LON;

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return jsonUtf8({ ok: false, error: "Invalid lat/lon" }, 400);
    }

    const { targetDate } = decideTargetDateJST({ date: dateParam || null });
    const includePreviousNightBridge = isTomorrowTargetDate(targetDate);

    const { data: metnoData } = await fetchMetnoLocationForecast({ lat, lon });
    const normalized = normalizeMetnoForTargetDate({
      metnoJson: metnoData,
      targetDate,
      includePreviousNightBridge,
    });

    if (!normalized.points.length) {
      return jsonUtf8({ ok: false, error: "No forecast points available" }, 503);
    }

    const weatherStress = buildWeatherStressV2({
      points: normalized.points,
      previousNightBridgePoints: includePreviousNightBridge
        ? normalized.previousNightBridgePoints
        : null,
    });
    const publicForecast = personalizePublicForecastV2({ weatherStress });
    const triggerFactors = publicForecast.trigger_factors || [];
    const weatherLoadGroups = Object.fromEntries(
      Object.entries(publicForecast?.meta?.weather_load_groups || {}).map(([group, value]) => [group, {
        ...value,
        personalized: false,
      }])
    );
    const primaryTrigger = triggerFactors[0] || {
      exact: publicForecast.personal_main_trigger_exact || "pressure_down",
      main_trigger: publicForecast.main_trigger || "pressure",
      trigger_dir: publicForecast.trigger_dir || "down",
    };
    const secondaryTrigger = triggerFactors[1] || null;

    return jsonUtf8({
      ok: true,
      target_date: targetDate,
      forecast: {
        score_0_10: publicForecast.score_0_10,
        score_display_0_10: publicForecast.score_display_0_10,
        score_precise_0_10: publicForecast.score_precise_0_10,
        signal: publicForecast.signal,
        main_trigger: primaryTrigger.main_trigger,
        trigger_dir: primaryTrigger.trigger_dir,
        main_trigger_label: getTriggerLabel(primaryTrigger.main_trigger, primaryTrigger.trigger_dir),
        personal_main_trigger_exact: primaryTrigger.exact,
        personal_secondary_trigger_exact: secondaryTrigger?.exact || null,
        personal_main_event_key: publicForecast.personal_main_event_key || null,
        pressure_direction: publicForecast.pressure_direction || null,
        pressure_response_direction: publicForecast.pressure_response_direction || "balanced",
        secondary_trigger_label: secondaryTrigger
          ? getTriggerLabel(secondaryTrigger.main_trigger, secondaryTrigger.trigger_dir)
          : null,
        trigger_factors: triggerFactors.length ? triggerFactors : [primaryTrigger],
        weather_load_groups: weatherLoadGroups,
        forecast_model_version: publicForecast.model_version,
        environmental_cautions: publicForecast.environmental_cautions || [],
      },
    });
  } catch (e) {
    console.error("/api/radar/v1/forecast/public error:", e);
    return jsonUtf8({ ok: false, error: String(e) }, 500);
  }
}


function isTomorrowTargetDate(targetDate) {
  const { isoDate: today } = nowJstParts(new Date());
  const [y, m, d] = today.split("-").map(Number);
  const tomorrowDate = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0));
  const tomorrow = toJstISODate(tomorrowDate);
  return targetDate === tomorrow;
}
