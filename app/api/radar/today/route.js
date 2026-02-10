// app/api/radar/today/route.js
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";
import { jstDateString } from "@/lib/dateJST";
import { fetchOpenMeteo, pickNowAnd24hAgo } from "@/lib/weather/openMeteo";
import { buildTimeWindowsFromHourly, summarizeDayFromWindows } from "@/lib/radar/risk";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getPrimaryLocation(userId) {
  const { data, error } = await supabaseServer
    .from("user_locations")
    .select("lat, lon")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  // 未設定なら「日本（明石）」の近似（デフォルト）
  // ※後でUIで設定させる前提
  return data || { lat: 34.6519, lon: 134.9993 };
}

function safeNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const date = jstDateString(new Date());
    const loc = await getPrimaryLocation(user.id);

    // ---- weather (Open-Meteo) ----
    const meteo = await fetchOpenMeteo({ lat: loc.lat, lon: loc.lon });
    const current = meteo?.current || {};
    const hourly = meteo?.hourly || {};

    const { nowIdx, agoIdx } = pickNowAnd24hAgo(hourly);

    const temp = safeNum(current?.temperature_2m ?? hourly?.temperature_2m?.[nowIdx]);
    const humidity = safeNum(current?.relative_humidity_2m ?? hourly?.relative_humidity_2m?.[nowIdx]);
    const pressure = safeNum(current?.pressure_msl ?? hourly?.pressure_msl?.[nowIdx]);
    const wind = safeNum(current?.wind_speed_10m ?? hourly?.wind_speed_10m?.[nowIdx]);
    const precip = safeNum(current?.precipitation ?? hourly?.precipitation?.[nowIdx]);

    const pressureAgo = safeNum(hourly?.pressure_msl?.[agoIdx]);
    const tempAgo = safeNum(hourly?.temperature_2m?.[agoIdx]);
    const humidityAgo = safeNum(hourly?.relative_humidity_2m?.[agoIdx]);

    const d_pressure_24h = pressure != null && pressureAgo != null ? pressure - pressureAgo : null;
    const d_temp_24h = temp != null && tempAgo != null ? temp - tempAgo : null;
    const d_humidity_24h = humidity != null && humidityAgo != null ? humidity - humidityAgo : null;

    // ---- build wind-only time windows (next 24h) ----
    const time_windows = buildTimeWindowsFromHourly({
      hourly,
      nowIdx,
      hours: 24,
      timezone: "Asia/Tokyo",
    });

    const summary = summarizeDayFromWindows(time_windows);
    const level3 = summary.level3;     // 0..2
    const maxWind = summary.maxWind;   // 0..3
    const top_sixin = level3 >= 1 ? ["wind"] : [];

    // ---- save external factors (daily_external_factors) ----
    // score_* range constraints: 0..3
    const { error: eDef } = await supabaseServer
      .from("daily_external_factors")
      .upsert(
        [
          {
            user_id: user.id,
            date,
            lat: loc.lat,
            lon: loc.lon,
            pressure,
            temp,
            humidity,
            wind,
            precip,
            d_pressure_24h,
            d_temp_24h,
            d_humidity_24h,
            // wind-only model: only score_wind is meaningful
            score_wind: Math.max(0, Math.min(3, Number(maxWind || 0))),
            score_cold: 0,
            score_heat: 0,
            score_damp: 0,
            score_dry: 0,
            top_sixin,
          },
        ],
        { onConflict: "user_id,date" }
      );

    if (eDef) throw eDef;

    // ---- save daily radar (daily_radar) ----
    // daily_radar.level constraint allows 0..3; we store 0..2 (3段階)
    const reason_text =
      level3 === 2
        ? "今日は「変化（風）」が強め。急な揺れに備えて、無理を増やさない日。"
        : level3 === 1
        ? "今日は「変化（風）」が出ています。予定を詰め込みすぎないのが安全。"
        : "今日は大きな変化は少なめ。普段通りでOK。";

    const { data: radarRow, error: eRadar } = await supabaseServer
      .from("daily_radar")
      .upsert(
        [
          {
            user_id: user.id,
            date,
            level: level3,
            top_sixin,
            reason_text,
            recommended_main_card_id: null,
            recommended_food_card_id: null,
            generated_by: "rule_wind_only_v1",
          },
        ],
        { onConflict: "user_id,date" }
      )
      .select("id,user_id,date,level,top_sixin,reason_text,generated_by,created_at")
      .single();

    if (eRadar) throw eRadar;

    // ---- response ----
    return NextResponse.json({
      data: {
        date,
        external: {
          lat: loc.lat,
          lon: loc.lon,
          temp,
          humidity,
          pressure,
          wind,
          precip,
          d_pressure_24h,
          d_temp_24h,
          d_humidity_24h,
          // wind-only summary
          score_wind: maxWind,
          top_sixin,
          dominant_trigger: summary.dominant_trigger || null,
        },
        radar: {
          ...radarRow,
          level3, // explicit for UI (0..2)
          max_wind_score: maxWind, // 0..3
          reason_short: summary.reason_short,
        },
        time_windows, // next 24h, only wind-based
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
