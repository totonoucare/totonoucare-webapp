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

  // 未設定なら仮：大阪駅付近
  return data || { lat: 34.7025, lon: 135.4959 };
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
 * ベース気圧（直近数日平均との差）を作る
 * - 基本：直近7日
 * - データ不足なら直近2日
 * - それでも不足なら null（補正なし）
 */
async function getPressureBaseline(userId) {
  // 直近7日
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

  // 直近2日（fallback）
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
  // "YYYY-MM-DDTHH:00" -> "HH時"
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
  // “変化＝風”は言わない。ユーザー語彙で。
  const lv = levelLabelJa(level3);
  const trig = triggerLabelJa(mainTrigger);

  const focus = profile?.symptom_focus || null;
  // UIの短文：AIがいなくても意味が通る
  let line = `今日の予報：${lv}`;
  if (peakRangeText) line += `（ピーク ${peakRangeText}）`;
  line += `｜主な要因：${trig}`;

  // 体質の存在を匂わせる（内部語は出さない）
  // ※ここは短く。詳細はAI explain側へ。
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

  // ベース気圧×虚実ヒント（短文）
  if (baseHint) line += `｜${baseHint}`;

  return line;
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
      return NextResponse.json({
        data: {
          date,
          needs_profile: true,
          message: "体質データがありません。先に体質チェックを行ってください。",
        },
      });
    }

    // ベース気圧
    const pressureBaseline = await getPressureBaseline(user.id);

    // 天気（Open-Meteo）
    const meteo = await fetchOpenMeteo({ lat: loc.lat, lon: loc.lon });
    const current = meteo?.current || {};
    const hourly = meteo?.hourly || {};

    const { nowIdx, agoIdx } = pickNowAnd24hAgo(hourly);

    const temp = numOrNull(current?.temperature_2m ?? hourly?.temperature_2m?.[nowIdx]);
    const humidity = numOrNull(current?.relative_humidity_2m ?? hourly?.relative_humidity_2m?.[nowIdx]);
    const pressure = numOrNull(current?.pressure_msl ?? hourly?.pressure_msl?.[nowIdx]);
    const wind_speed_10m = numOrNull(current?.wind_speed_10m ?? hourly?.wind_speed_10m?.[nowIdx]);
    const precip = numOrNull(current?.precipitation ?? hourly?.precipitation?.[nowIdx]);

    const pressureAgo = numOrNull(hourly?.pressure_msl?.[agoIdx]);
    const tempAgo = numOrNull(hourly?.temperature_2m?.[agoIdx]);
    const humidityAgo = numOrNull(hourly?.relative_humidity_2m?.[agoIdx]);

    const d_pressure_24h =
      pressure != null && pressureAgo != null ? pressure - pressureAgo : null;
    const d_temp_24h = temp != null && tempAgo != null ? temp - tempAgo : null;
    const d_humidity_24h =
      humidity != null && humidityAgo != null ? humidity - humidityAgo : null;

    // タイムライン（1時間刻み / 計算は3hΔ）
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

    // ベース気圧ヒント（総合カードに短く）
    // windows[0]のbase.reasonを採用（“今日のベース感”として）
    const baseHint = windows?.[0]?.base?.reason || null;

    // 総合の短文（ダサい羅列禁止・内部語なし）
    const reason_text = buildReasonText({
      level3: summary.level3,
      mainTrigger: summary.mainTrigger,
      peakRangeText,
      profile,
      baseHint,
    });

    // 保存：daily_external_factors（“日次の外因”として）
    // - score_wind は「直近24hウィンドウの最大の change_score」を入れるのが筋
    //   （daily_external_factorsのrangeチェックが0..3なので、ここは 0..3 を保存）
    const maxChangeScore = windows.reduce((m, w) => {
      // partsは0..3、change_scoreはext内部だがここでは再現できないので combinedからは作らない
      // 代わりに level3 を 0..2 として保存するのは違うので、
      // windowsのcombined(0..5)を 0..3に丸めて代用（設計上の“外因強度”）
      const c = Number(w?.combined ?? 0);
      if (!Number.isFinite(c)) return m;
      // combinedのうち「外因の寄与が大きい時は 2~5」に寄る。粗く 0..3へ。
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

            // schema互換：風中心にする（他は0）
            score_wind: maxChangeScore,
            score_cold: 0,
            score_heat: 0,
            score_damp: 0,
            score_dry: 0,

            // 互換：主因トリガーを入れる（既存のwind/cold等とは意味が異なるが利用側がいない前提）
            top_sixin: summary.level3 > 0 ? [summary.mainTrigger] : [],
          },
        ],
        { onConflict: "user_id,date" }
      );

    if (eDef) throw eDef;

    // 保存：daily_radar
    // daily_radar.level は 0..3 なので、現状は 0..2 をそのまま入れる
    const { data: radarRow, error: eRadar } = await supabaseServer
      .from("daily_radar")
      .upsert(
        [
          {
            user_id: user.id,
            date,
            level: summary.level3,
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

    // 返却
    return NextResponse.json({
      data: {
        date,
        profile: {
          symptom_focus: profile?.symptom_focus || null,
          // UIが必要なら増やしてOK（出しすぎ注意）
        },
        external: {
          lat: loc.lat,
          lon: loc.lon,
          temp,
          humidity,
          pressure,
          wind: wind_speed_10m,
          precip,
          d_pressure_24h,
          d_temp_24h,
          d_humidity_24h,
          pressure_baseline: pressureBaseline,
        },
        radar: radarRow,
        summary: {
          level3: summary.level3,
          level_label: levelLabelJa(summary.level3),
          main_trigger: summary.mainTrigger,
          main_trigger_label: triggerLabelJa(summary.mainTrigger),
          peak: peakRangeText
            ? { maxLevel: peak.maxLevel, range_text: peakRangeText, start: peak.start, end: peak.end }
            : { maxLevel: peak.maxLevel, range_text: null, start: null, end: null },
          next_peak: nextPeak || null,
          vulnerability, // 0..2（デバッグ用。UIで隠してOK）
        },
        time_windows: windows, // UIの横スクロール帯に使う
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
