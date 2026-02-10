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

function numOrNull(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

async function getPrimaryLocation(userId) {
  const { data, error } = await supabaseServer
    .from("user_locations")
    .select("lat, lon")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || { lat: 34.7025, lon: 135.4959 }; // fallback
}

async function getLatestConstitutionProfile(userId) {
  const { data, error } = await supabaseServer
    .from("constitution_profiles")
    .select(
      [
        "user_id",
        "symptom_focus",
        "sub_labels",
        "computed",
        "updated_at",
        "engine_version",
      ].join(",")
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

/**
 * ベース気圧（直近数日平均との差）
 * - 7日で3件以上あれば7日平均
 * - なければ2日、さらに無ければnull
 */
async function getPressureBaseline(userId) {
  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

  const { data: d7, error: e7 } = await supabaseServer
    .from("daily_external_factors")
    .select("date, pressure")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(7);

  if (e7) throw e7;

  const vals7 = (d7 || []).map((r) => Number(r.pressure)).filter((x) => Number.isFinite(x));
  if (vals7.length >= 3) return avg(vals7);

  const { data: d2, error: e2 } = await supabaseServer
    .from("daily_external_factors")
    .select("date, pressure")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(2);

  if (e2) throw e2;

  const vals2 = (d2 || []).map((r) => Number(r.pressure)).filter((x) => Number.isFinite(x));
  if (vals2.length >= 1) return avg(vals2);

  return null;
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

function buildReasonText({ level3, mainTrigger, peakRangeText, symptomFocus, baseHint }) {
  const lv = levelLabelJa(level3);
  const trig = triggerLabelJa(mainTrigger);

  const focusMap = {
    fatigue: "だるさ",
    sleep: "睡眠",
    mood: "気分",
    neck_shoulder: "首肩",
    low_back_pain: "腰",
    swelling: "むくみ",
    headache: "頭",
    dizziness: "めまい",
  };
  const focusJa = symptomFocus ? (focusMap[symptomFocus] || "不調") : null;

  let s = `今日の予報：${lv}`;
  if (peakRangeText) s += `（ピーク ${peakRangeText}）`;
  s += `｜主な要因：${trig}`;

  if (focusJa) s += `｜${focusJa}が出やすい人は余裕を持って`;
  else s += "｜無理に詰めないのが安全";

  if (baseHint) s += `｜${baseHint}`;
  return s;
}

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const date = jstDateString(new Date());
    const loc = await getPrimaryLocation(user.id);

    // 体質（内因）
    const profile = await getLatestConstitutionProfile(user.id);
    if (!profile) {
      // ✅ page.js互換：has_profile=false
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

    // 現在値
    const curTemp = numOrNull(current?.temperature_2m ?? hourly?.temperature_2m?.[nowIdx]);
    const curHumidity = numOrNull(current?.relative_humidity_2m ?? hourly?.relative_humidity_2m?.[nowIdx]);
    const curPressure = numOrNull(current?.pressure_msl ?? hourly?.pressure_msl?.[nowIdx]);

    // 直近1時間Δ（符号つき）
    const dp1h =
      nowIdx >= 1 && hourly?.pressure_msl?.[nowIdx] != null && hourly?.pressure_msl?.[nowIdx - 1] != null
        ? numOrNull(hourly.pressure_msl[nowIdx]) - numOrNull(hourly.pressure_msl[nowIdx - 1])
        : null;

    const dt1h =
      nowIdx >= 1 && hourly?.temperature_2m?.[nowIdx] != null && hourly?.temperature_2m?.[nowIdx - 1] != null
        ? numOrNull(hourly.temperature_2m[nowIdx]) - numOrNull(hourly.temperature_2m[nowIdx - 1])
        : null;

    const dh1h =
      nowIdx >= 1 && hourly?.relative_humidity_2m?.[nowIdx] != null && hourly?.relative_humidity_2m?.[nowIdx - 1] != null
        ? numOrNull(hourly.relative_humidity_2m[nowIdx]) - numOrNull(hourly.relative_humidity_2m[nowIdx - 1])
        : null;

    // 24h差（昨日比・符号つき）
    const pressureAgo = numOrNull(hourly?.pressure_msl?.[agoIdx]);
    const tempAgo = numOrNull(hourly?.temperature_2m?.[agoIdx]);
    const humidityAgo = numOrNull(hourly?.relative_humidity_2m?.[agoIdx]);

    const dp24 = curPressure != null && pressureAgo != null ? curPressure - pressureAgo : null;
    const dt24 = curTemp != null && tempAgo != null ? curTemp - tempAgo : null;
    const dh24 = curHumidity != null && humidityAgo != null ? curHumidity - humidityAgo : null;

    // タイムライン（表示1h刻み / 計算3hΔ）
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

    // “今日のベース感”として先頭windowのbase.reasonを短く
    const baseHint = windows?.[0]?.base?.reason || null;

    const reason_text = buildReasonText({
      level3: summary.level3,
      mainTrigger: summary.mainTrigger,
      peakRangeText,
      symptomFocus: profile?.symptom_focus || null,
      baseHint,
    });

    // DB保存（必要なら）
    // - daily_external_factors / daily_radar はあなたの既存方針に合わせて残す
    // - ここではUI要件を優先し、保存失敗でUIが死ぬのを避けたいなら try/catch で包むのが安全

    try {
      // daily_external_factors（最低限：現在値と24h差だけ）
      await supabaseServer
        .from("daily_external_factors")
        .upsert(
          [
            {
              user_id: user.id,
              date,
              lat: loc.lat,
              lon: loc.lon,
              pressure: curPressure,
              temp: curTemp,
              humidity: curHumidity,
              d_pressure_24h: dp24,
              d_temp_24h: dt24,
              d_humidity_24h: dh24,
              // “風中心”運用：その他0
              score_wind: 0,
              score_cold: 0,
              score_heat: 0,
              score_damp: 0,
              score_dry: 0,
              top_sixin: summary.level3 > 0 ? [summary.mainTrigger] : [],
            },
          ],
          { onConflict: "user_id,date" }
        );

      await supabaseServer
        .from("daily_radar")
        .upsert(
          [
            {
              user_id: user.id,
              date,
              level: summary.level3, // 0..2
              top_sixin: summary.level3 > 0 ? [summary.mainTrigger] : [],
              reason_text,
              generated_by: "risk_v3_basepressure_gate",
            },
          ],
          { onConflict: "user_id,date" }
        );
    } catch (e) {
      // 保存失敗してもUIは返す
      console.warn("radar save skipped:", e?.message || e);
    }

    // ✅ page.js互換の返却形
    return NextResponse.json({
      data: {
        date,
        has_profile: true,

        vulnerability, // page.jsの buildHeadline が参照

        today: {
          level3: summary.level3,
          level_label: levelLabelJa(summary.level3),
          mainTrigger: summary.mainTrigger,
          mainTrigger_label: triggerLabelJa(summary.mainTrigger),
          peak: peakRangeText ? { range_text: peakRangeText, start: peak.start, end: peak.end } : null,
          next_peak: nextPeak || null,
          reason_text, // 使うならUIで差し込める
        },

        external: {
          current: {
            temp: curTemp,
            humidity: curHumidity,
            pressure: curPressure,
            pressure_baseline: pressureBaseline,
          },
          delta1h: {
            dp: dp1h,
            dt: dt1h,
            dh: dh1h,
          },
          delta24h: {
            dp: dp24,
            dt: dt24,
            dh: dh24,
          },
        },

        time_windows: windows,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
