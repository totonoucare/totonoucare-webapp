// app/api/radar/today/route.js
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";
import { jstDateString } from "@/lib/dateJST";
import { fetchOpenMeteo, pickNowAnd24hAgo } from "@/lib/weather/openMeteo";

import {
  buildTimeWindowsFromHourly,
  summarizeToday,
  peakWindowFromWindows,
  nextPeakFromWindows,
  levelLabelJa,
  triggerLabelJa,
} from "@/lib/radar/risk";

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
  return data || { lat: 34.7025, lon: 135.4959 }; // fallback: 大阪駅付近
}

async function getLatestConstitutionProfile(userId) {
  const { data, error } = await supabaseServer
    .from("constitution_profiles")
    .select(
      [
        "user_id",
        "symptom_focus",
        "qi",
        "blood",
        "fluid",
        "cold_heat",
        "resilience",
        "thermo",
        "is_mixed",
        "core_code",
        "sub_labels",
        "engine_version",
        "primary_meridian",
        "secondary_meridian",
        "computed",
        "updated_at",
      ].join(",")
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

/**
 * ベース気圧（直近数日平均との差）
 * - 基本：直近7日
 * - データ不足なら直近2日
 * - それでも不足なら null（補正なし）
 */
async function getPressureBaseline(userId) {
  const { data: d7, error: e7 } = await supabaseServer
    .from("daily_external_factors")
    .select("date, pressure")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(7);

  if (e7) throw e7;

  const vals7 = (d7 || [])
    .map((r) => Number(r.pressure))
    .filter((x) => Number.isFinite(x));

  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

  if (vals7.length >= 3) return avg(vals7);

  const { data: d2, error: e2 } = await supabaseServer
    .from("daily_external_factors")
    .select("date, pressure")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(2);

  if (e2) throw e2;

  const vals2 = (d2 || [])
    .map((r) => Number(r.pressure))
    .filter((x) => Number.isFinite(x));

  if (vals2.length >= 1) return avg(vals2);

  return null;
}

function numOrNull(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function fmtHourRange(startISO, endISO) {
  const hour = (iso) => {
    if (!iso || typeof iso !== "string") return null;
    const m = iso.match(/T(\d{2}):/);
    if (!m) return null;
    return String(Number(m[1]));
  };
  const s = hour(startISO);
  const e = hour(endISO);
  if (s == null) return null;
  if (e == null) return `${s}時`;
  if (s === e) return `${s}時`;
  return `${s}–${e}時`;
}

function buildReasonText({ level3, mainTrigger, peakRangeText, profile, baseHint }) {
  const lv = levelLabelJa(level3);
  const trig = triggerLabelJa(mainTrigger);

  const focus = profile?.symptom_focus || null;
  let line = `今日の予報：${lv}`;
  if (peakRangeText) line += `（ピーク ${peakRangeText}）`;
  line += `｜主な要因：${trig}`;

  if (focus) {
    const map = {
      fatigue: "だるさ",
      sleep: "睡眠",
      mood: "気分",
      neck_shoulder: "首肩",
      low_back_pain: "腰",
      swelling: "むくみ",
      headache: "頭",
      dizziness: "めまい",
    };
    const ja = map[focus] || "不調";
    line += `｜${ja}が出やすい人は余裕を持って`;
  } else {
    line += "｜無理に詰めないのが安全";
  }

  if (baseHint) line += `｜${baseHint}`;
  return line;
}

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const date = jstDateString(new Date());
    const loc = await getPrimaryLocation(user.id);

    const profile = await getLatestConstitutionProfile(user.id);
    if (!profile) {
      return NextResponse.json({
        data: {
          date,
          has_profile: false,
          message: "体質データがありません。先に体質チェックを行ってください。",
        },
      });
    }

    const pressureBaseline = await getPressureBaseline(user.id);

    // Open-Meteo
    const meteo = await fetchOpenMeteo({ lat: loc.lat, lon: loc.lon });
    const current = meteo?.current || {};
    const hourly = meteo?.hourly || {};

    const { nowIdx, agoIdx } = pickNowAnd24hAgo(hourly);

    // current values
    const temp = numOrNull(current?.temperature_2m ?? hourly?.temperature_2m?.[nowIdx]);
    const humidity = numOrNull(current?.relative_humidity_2m ?? hourly?.relative_humidity_2m?.[nowIdx]);
    const pressure = numOrNull(current?.pressure_msl ?? hourly?.pressure_msl?.[nowIdx]);

    const wind_speed_10m = numOrNull(current?.wind_speed_10m ?? hourly?.wind_speed_10m?.[nowIdx]);
    const precip = numOrNull(current?.precipitation ?? hourly?.precipitation?.[nowIdx]);

    // 24h deltas
    const pressureAgo = numOrNull(hourly?.pressure_msl?.[agoIdx]);
    const tempAgo = numOrNull(hourly?.temperature_2m?.[agoIdx]);
    const humidityAgo = numOrNull(hourly?.relative_humidity_2m?.[agoIdx]);

    const d_pressure_24h = pressure != null && pressureAgo != null ? pressure - pressureAgo : null;
    const d_temp_24h = temp != null && tempAgo != null ? temp - tempAgo : null;
    const d_humidity_24h = humidity != null && humidityAgo != null ? humidity - humidityAgo : null;

    // 1h deltas (直近1時間)
    const prevIdx = nowIdx != null ? Math.max(0, nowIdx - 1) : null;
    const pressurePrev = prevIdx != null ? numOrNull(hourly?.pressure_msl?.[prevIdx]) : null;
    const tempPrev = prevIdx != null ? numOrNull(hourly?.temperature_2m?.[prevIdx]) : null;
    const humidityPrev = prevIdx != null ? numOrNull(hourly?.relative_humidity_2m?.[prevIdx]) : null;

    const d_pressure_1h = pressure != null && pressurePrev != null ? pressure - pressurePrev : null;
    const d_temp_1h = temp != null && tempPrev != null ? temp - tempPrev : null;
    const d_humidity_1h = humidity != null && humidityPrev != null ? humidity - humidityPrev : null;

    // baseline diff (最近平均との差)
    const pressure_baseline_diff =
      pressure != null && pressureBaseline != null ? pressure - pressureBaseline : null;

    // timeline
    const hoursForward = 24;
    const { windows, vulnerability } = buildTimeWindowsFromHourly(
      hourly,
      nowIdx,
      hoursForward,
      profile,
      pressureBaseline
    );

    const summary = summarizeToday({ windows });
    const peak = peakWindowFromWindows(windows);
    const nextPeak = nextPeakFromWindows(windows, hourly?.time?.[nowIdx] || null);

    const peakRangeText = peak?.start && peak?.end ? fmtHourRange(peak.start, peak.end) : null;
    const baseHint = windows?.[0]?.base?.reason || null;

    const reason_text = buildReasonText({
      level3: summary.level3,
      mainTrigger: summary.mainTrigger,
      peakRangeText,
      profile,
      baseHint,
    });

    // 保存：daily_external_factors
    const maxChangeScore = windows.reduce((m, w) => {
      const c = Number(w?.combined ?? 0);
      if (!Number.isFinite(c)) return m;
      const s = c <= 1 ? 0 : c <= 3 ? 1 : c <= 4 ? 2 : 3;
      return Math.max(m, s);
    }, 0);

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
            wind: wind_speed_10m,
            precip,

            d_pressure_24h,
            d_temp_24h,
            d_humidity_24h,

            score_wind: maxChangeScore,
            score_cold: 0,
            score_heat: 0,
            score_damp: 0,
            score_dry: 0,

            top_sixin: summary.level3 > 0 ? [summary.mainTrigger] : [],
          },
        ],
        { onConflict: "user_id,date" }
      );

    if (eDef) throw eDef;

    // 保存：daily_radar
    const { data: radarRow, error: eRadar } = await supabaseServer
      .from("daily_radar")
      .upsert(
        [
          {
            user_id: user.id,
            date,
            level: summary.level3, // 0..2
            top_sixin: summary.level3 > 0 ? [summary.mainTrigger] : [],
            reason_text,
            recommended_main_card_id: null,
            recommended_food_card_id: null,
            generated_by: "risk_v3_basepressure_gate",
          },
        ],
        { onConflict: "user_id,date" }
      )
      .select("id, user_id, date, level, top_sixin, reason_text, created_at")
      .single();

    if (eRadar) throw eRadar;

    // ✅ 返却：page.js 互換の形にする
    return NextResponse.json({
      data: {
        date,

        has_profile: true,
        profile: {
          symptom_focus: profile?.symptom_focus || null,
        },

        // page.js が読む external 形状
        external: {
          lat: loc.lat,
          lon: loc.lon,

          current: {
            temp,
            humidity,
            pressure,
            wind: wind_speed_10m,
            precip,
          },

          delta1h: {
            dt: d_temp_1h,
            dh: d_humidity_1h,
            dp: d_pressure_1h,
          },

          delta24h: {
            dt: d_temp_24h,
            dh: d_humidity_24h,
            dp: d_pressure_24h,
          },

          baseline: {
            pressure: pressureBaseline, // 最近の平均
            dp: pressure_baseline_diff, // 最近平均との差（今日-最近平均）
          },

          // 既存互換（もし他で使ってたら生きる）
          pressure_baseline: pressureBaseline,
        },

        // page.js は today を見てるので、summary を today としても返す（互換）
        today: {
          level3: summary.level3,
          mainTrigger: summary.mainTrigger,
          peak: peakRangeText
            ? { maxLevel: peak.maxLevel, range_text: peakRangeText, start: peak.start, end: peak.end }
            : { maxLevel: peak.maxLevel, range_text: null, start: null, end: null },
          next_peak: nextPeak || null,
        },

        vulnerability, // 0..2（UIで隠してOK）
        radar: radarRow,

        // 旧名も残す（デバッグ用）
        summary: {
          level3: summary.level3,
          level_label: levelLabelJa(summary.level3),
          main_trigger: summary.mainTrigger,
          main_trigger_label: triggerLabelJa(summary.mainTrigger),
          peak: peakRangeText
            ? { maxLevel: peak.maxLevel, range_text: peakRangeText, start: peak.start, end: peak.end }
            : { maxLevel: peak.maxLevel, range_text: null, start: null, end: null },
          next_peak: nextPeak || null,
          vulnerability,
        },

        time_windows: windows,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
