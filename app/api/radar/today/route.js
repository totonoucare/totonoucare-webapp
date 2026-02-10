// app/api/radar/today/route.js
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";
import { jstDateString } from "@/lib/dateJST";
import { fetchOpenMeteo, pickNowAnd24hAgo } from "@/lib/weather/openMeteo";
import { buildTimeWindowsFromHourly, summarizeToday } from "@/lib/radar/risk";

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
  return data || { lat: 34.7025, lon: 135.4959 };
}

async function getProfile(userId) {
  const { data, error } = await supabaseServer
    .from("constitution_profiles")
    .select("user_id,symptom_focus,qi,blood,fluid,cold_heat,resilience,primary_meridian,secondary_meridian,core_code,sub_labels,computed,engine_version,updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

function safeNum(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const date = jstDateString(new Date());

    const profile = await getProfile(user.id);
    if (!profile) {
      return NextResponse.json({
        data: {
          date,
          has_profile: false,
          message: "体質データがありません。体質チェックを先に完了してください。",
        },
      });
    }

    const loc = await getPrimaryLocation(user.id);

    // Open-Meteo
    const meteo = await fetchOpenMeteo({ lat: loc.lat, lon: loc.lon });
    const current = meteo?.current || {};
    const hourly = meteo?.hourly || {};

    const { nowIdx, agoIdx } = pickNowAnd24hAgo(hourly);

    // 現在値（メーター用）
    const curTemp = safeNum(current?.temperature_2m ?? hourly?.temperature_2m?.[nowIdx]);
    const curHum = safeNum(current?.relative_humidity_2m ?? hourly?.relative_humidity_2m?.[nowIdx]);
    const curPres = safeNum(current?.pressure_msl ?? hourly?.pressure_msl?.[nowIdx]);

    // 24h差（「昨日比」表記用）
    const presAgo = safeNum(hourly?.pressure_msl?.[agoIdx]);
    const tempAgo = safeNum(hourly?.temperature_2m?.[agoIdx]);
    const humAgo = safeNum(hourly?.relative_humidity_2m?.[agoIdx]);

    const dP24 = curPres != null && presAgo != null ? curPres - presAgo : null;
    const dT24 = curTemp != null && tempAgo != null ? curTemp - tempAgo : null;
    const dH24 = curHum != null && humAgo != null ? curHum - humAgo : null;

    // 直近1h差（メーター右上の矢印用）
    const pres1 = nowIdx >= 1 ? safeNum(hourly?.pressure_msl?.[nowIdx - 1]) : null;
    const temp1 = nowIdx >= 1 ? safeNum(hourly?.temperature_2m?.[nowIdx - 1]) : null;
    const hum1 = nowIdx >= 1 ? safeNum(hourly?.relative_humidity_2m?.[nowIdx - 1]) : null;

    const dP1 = curPres != null && pres1 != null ? curPres - pres1 : null;
    const dT1 = curTemp != null && temp1 != null ? curTemp - temp1 : null;
    const dH1 = curHum != null && hum1 != null ? curHum - hum1 : null;

    // 24hのタイムライン（今から24h先まで）
    const { windows, vulnerability } = buildTimeWindowsFromHourly(hourly, nowIdx, 24, profile);
    const today = summarizeToday({ windows });

    // DB保存（既存テーブルに合わせて最低限）
    // daily_external_factors: current + 24h差 + top_sixin相当（今回は“主因”だけ）
    const { error: eDef } = await supabaseServer
      .from("daily_external_factors")
      .upsert(
        [
          {
            user_id: user.id,
            date,
            lat: loc.lat,
            lon: loc.lon,
            pressure: curPres,
            temp: curTemp,
            humidity: curHum,
            d_pressure_24h: dP24,
            d_temp_24h: dT24,
            d_humidity_24h: dH24,
            // 既存カラム互換（今回は使わないが0埋め）
            score_wind: 0,
            score_cold: 0,
            score_heat: 0,
            score_damp: 0,
            score_dry: 0,
            top_sixin: [],
          },
        ],
        { onConflict: "user_id,date" }
      );
    if (eDef) throw eDef;

    // daily_radar: level(0..3)縛りがあるので、いったん 0..2 を 0..2 に格納（3は将来用）
    const { error: eRadar } = await supabaseServer
      .from("daily_radar")
      .upsert(
        [
          {
            user_id: user.id,
            date,
            level: today.level3, // 0..2
            top_sixin: [],       // 互換のため空
            reason_text: "",     // ここはUIで自動作文するので空でOK
            generated_by: "rule_v3_change_x_profile",
          },
        ],
        { onConflict: "user_id,date" }
      );
    if (eRadar) throw eRadar;

    return NextResponse.json({
      data: {
        date,
        has_profile: true,
        profile: {
          symptom_focus: profile.symptom_focus,
          core_code: profile.core_code,
          sub_labels: profile.sub_labels || [],
          computed: profile.computed || {},
        },
        external: {
          current: { temp: curTemp, humidity: curHum, pressure: curPres },
          delta24h: { dp: dP24, dt: dT24, dh: dH24 },
          delta1h: { dp: dP1, dt: dT1, dh: dH1 },
          lat: loc.lat,
          lon: loc.lon,
        },
        today: {
          level3: today.level3,          // 0..2
          mainTrigger: today.mainTrigger // pressure/temp/humidity
        },
        vulnerability,                  // 0..2（内部要因）
        time_windows: windows,          // 24h分（安定も含む）
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
