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
  computeInfluenceFromBaselines,
  influenceLabelJa,
  buildWindowHintJa,
  buildAnomalyRowJa,
} from "@/lib/radar/risk";

import { getCoreLabel, getSubLabels } from "@/lib/diagnosis/v2/labels";

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

function numOrNull(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function avg(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const vals = arr.map(Number).filter(Number.isFinite);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
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

function buildForecastLine({ level3, mainTrigger, peakRangeText, symptom_focus }) {
  const lv = levelLabelJa(level3);
  const trig = triggerLabelJa(mainTrigger);

  let line = `今日の予報：${lv}`;
  if (peakRangeText) line += `（ピーク ${peakRangeText}）`;
  line += `｜主因：${trig}`;

  if (symptom_focus) {
    const map = {
      fatigue: "だるさ",
      sleep: "睡眠",
      mood: "気分",
      neck_shoulder: "首肩",
      low_back_pain: "腰",
      swelling: "むくみ",
      headache: "頭痛",
      dizziness: "めまい",
    };
    const ja = map[symptom_focus] || "不調";
    line += `｜${ja}が出やすい人は余裕を持って`;
  } else {
    line += "｜無理に詰めないのが安全";
  }
  return line;
}

function buildInfluenceText({ influence, core, subTitles }) {
  const label = influenceLabelJa(influence?.level ?? 1);

  const main = influence?.main_factor || "pressure";
  const mainJa = main === "temp" ? "気温" : main === "humidity" ? "湿度" : "気圧";

  const a = influence?.anomalies || {};
  const p = a?.pressure;
  const t = a?.temp;
  const h = a?.humidity;

  const head = core?.title ? `あなたは「${core.title}」。` : "あなたの体質傾向から見た予報です。";

  if (label === "受けやすい") {
    return `${head}最近より${mainJa}がズレていて、今日は影響を受けやすい日です。`;
  }
  if (label === "受けにくい") {
    return `${head}最近より${mainJa}の条件が合いやすく、今日は影響を受けにくい側です。`;
  }

  const hints = [];
  if (p != null && Math.abs(p) >= 1.5) hints.push("気圧");
  if (t != null && Math.abs(t) >= 1.5) hints.push("気温");
  if (h != null && Math.abs(h) >= 6) hints.push("湿度");
  const extra = hints.length ? `（最近より${hints.join("・")}がややズレ）` : "";
  const sub = subTitles?.length ? `／弱点：${subTitles.join("・")}` : "";
  return `${head}今日は概ね通常です${extra}${sub ? sub : ""}。`;
}

/**
 * ✅ 方針1：baseline を user履歴ではなく location 由来にする
 * Open-Meteoで past_days=14 を取得し、直近14日（今日を除く）の平均を作る。
 *
 * - timezone=Asia/Tokyo で日付がズレにくくする
 * - 取得できない場合のみ null を返す（route側でfallback可能）
 */
async function fetchEnvBaseline14dByLocation({ lat, lon, todayDateJst }) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: "temperature_2m,relative_humidity_2m,pressure_msl",
    past_days: "14",
    forecast_days: "1",
    timezone: "Asia/Tokyo",
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Open-Meteo baseline fetch failed: ${res.status}`);

  const json = await res.json();
  const hourly = json?.hourly || {};
  const times = Array.isArray(hourly?.time) ? hourly.time : [];
  const T = Array.isArray(hourly?.temperature_2m) ? hourly.temperature_2m : [];
  const H = Array.isArray(hourly?.relative_humidity_2m) ? hourly.relative_humidity_2m : [];
  const P = Array.isArray(hourly?.pressure_msl) ? hourly.pressure_msl : [];

  // 今日（JST日付）を除いた直近日群を集計（最大14日）
  // timesは "YYYY-MM-DDTHH:00" 想定
  const daySet = [];
  const idxByDay = new Map(); // day -> indices

  for (let i = 0; i < times.length; i++) {
    const ts = times[i];
    if (typeof ts !== "string") continue;
    const day = ts.slice(0, 10);
    if (!day || day === todayDateJst) continue;

    if (!idxByDay.has(day)) {
      idxByDay.set(day, []);
      daySet.push(day);
    }
    idxByDay.get(day).push(i);
  }

  // daySetは古い→新しい順になることが多いので、末尾から14日ぶん使う
  const useDays = daySet.slice(Math.max(0, daySet.length - 14));
  if (useDays.length === 0) {
    return { pressure: null, temp: null, humidity: null, days: 0 };
  }

  const collect = (arr) => {
    const vals = [];
    for (const d of useDays) {
      const idxs = idxByDay.get(d) || [];
      for (const i of idxs) {
        const v = Number(arr[i]);
        if (Number.isFinite(v)) vals.push(v);
      }
    }
    return avg(vals);
  };

  const bT = collect(T);
  const bH = collect(H);
  const bP = collect(P);

  // 最低2要素取れてればOK（それ以下は弱いのでdaysを0扱いに近づける）
  const ok = [bP, bT, bH].filter((x) => x != null).length;
  if (ok < 2) {
    return { pressure: bP ?? null, temp: bT ?? null, humidity: bH ?? null, days: Math.min(useDays.length, 14) };
  }

  return { pressure: bP, temp: bT, humidity: bH, days: Math.min(useDays.length, 14) };
}

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const date = jstDateString(new Date());
    const loc = await getPrimaryLocation(user.id);

    // 体質
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

    // 天気（Open-Meteo）: タイムライン用
    const meteo = await fetchOpenMeteo({ lat: loc.lat, lon: loc.lon });
    const hourly = meteo?.hourly || {};
    const { nowIdx } = pickNowAnd24hAgo(hourly);

    // ✅ 方針1：baseline（直近14日平均）を location 由来で作る
    let baseline = { pressure: null, temp: null, humidity: null, days: 0 };
    try {
      baseline = await fetchEnvBaseline14dByLocation({
        lat: loc.lat,
        lon: loc.lon,
        todayDateJst: date,
      });
    } catch (e) {
      // baselineが取れない場合は null のまま（influenceが「通常寄り」になるだけで落とさない）
      baseline = { pressure: null, temp: null, humidity: null, days: 0 };
    }

    // ✅ 同時刻同値に寄せる：currentではなく hourly[nowIdx] を採用
    const curTemp = numOrNull(hourly?.temperature_2m?.[nowIdx]);
    const curHum = numOrNull(hourly?.relative_humidity_2m?.[nowIdx]);
    const curPres = numOrNull(hourly?.pressure_msl?.[nowIdx]);

    // delta1h はAPIには残す（UIでは非表示：方針3）
    const prevIdx = nowIdx != null && nowIdx >= 1 ? nowIdx - 1 : null;
    const prevTemp = prevIdx != null ? numOrNull(hourly?.temperature_2m?.[prevIdx]) : null;
    const prevHum = prevIdx != null ? numOrNull(hourly?.relative_humidity_2m?.[prevIdx]) : null;
    const prevPres = prevIdx != null ? numOrNull(hourly?.pressure_msl?.[prevIdx]) : null;

    const d1 = {
      dt: curTemp != null && prevTemp != null ? curTemp - prevTemp : null,
      dh: curHum != null && prevHum != null ? curHum - prevHum : null,
      dp: curPres != null && prevPres != null ? curPres - prevPres : null,
    };

    // タイムライン（変化ストレス）
    const hoursForward = 24;
    const { windows, vulnerability } = buildTimeWindowsFromHourly(hourly, nowIdx, hoursForward, profile);

    const summary = summarizeToday({ windows });
    const peak = peakWindowFromWindows(windows);
    const nextPeak = nextPeakFromWindows(windows, hourly?.time?.[nowIdx] || null);

    const peakRangeText = peak?.start && peak?.end ? fmtHourRange(peak.start, peak.end) : null;
    const forecastLine = buildForecastLine({
      level3: summary.level3,
      mainTrigger: summary.mainTrigger,
      peakRangeText,
      symptom_focus: profile?.symptom_focus || null,
    });

    // 影響の受けやすさ（メイン）
    const influence = computeInfluenceFromBaselines({
      current: { pressure: curPres, temp: curTemp, humidity: curHum },
      baseline,
      profile,
    });

    const core = getCoreLabel(profile?.core_code);
    const subTitles = getSubLabels(profile?.sub_labels || []).map((x) => x?.short).filter(Boolean);

    const influenceText = buildInfluenceText({
      influence,
      core,
      subTitles,
    });

    // タイムライン詳細に「短文ヒント」を付与（注意/警戒のみ）
    const windowsWithHint = windows.map((w) => ({
      ...w,
      hint_text: buildWindowHintJa({ window: w, influenceLevel: influence?.level ?? 1 }),
    }));

    // 最近平均との差（表示用）
    const anomalyRow = buildAnomalyRowJa(influence?.anomalies);

    return NextResponse.json({
      data: {
        date,

        profile: {
          symptom_focus: profile?.symptom_focus || null,
          core_code: profile?.core_code || null,
          core_title: core?.title || null,
          core_short: core?.short || null,
          sub_labels: (profile?.sub_labels || []).slice(0, 2),
          sub_shorts: subTitles,
        },

        external: {
          location: { lat: loc.lat, lon: loc.lon },
          current: {
            temp: curTemp,
            humidity: curHum,
            pressure: curPres,
          },
          delta1h: d1, // UIでは非表示
          baseline: {
            days: baseline?.days ?? 0,
            temp: baseline?.temp ?? null,
            humidity: baseline?.humidity ?? null,
            pressure: baseline?.pressure ?? null,
          },
          anomaly: {
            temp: influence?.anomalies?.temp ?? null,
            humidity: influence?.anomalies?.humidity ?? null,
            pressure: influence?.anomalies?.pressure ?? null,
          },
          anomaly_text: anomalyRow,
        },

        influence: {
          level: influence?.level ?? 1,
          label: influenceLabelJa(influence?.level ?? 1),
          main_factor: influence?.main_factor || "pressure",
          main_factor_label:
            influence?.main_factor === "temp" ? "気温"
              : influence?.main_factor === "humidity" ? "湿度"
                : "気圧",
          text: influenceText,
          debug: {
            raw_signed: influence?.raw_signed ?? null,
            signed_parts: influence?.signed_parts ?? null,
            constitution: influence?.constitution ?? null,
            baseline_days: baseline?.days ?? 0,
          },
        },

        forecast: {
          level3: summary.level3,
          level_label: levelLabelJa(summary.level3),
          main_trigger: summary.mainTrigger,
          main_trigger_label: triggerLabelJa(summary.mainTrigger),
          peak: peakRangeText
            ? { maxLevel: peak.maxLevel, range_text: peakRangeText, start: peak.start, end: peak.end }
            : { maxLevel: peak.maxLevel, range_text: null, start: null, end: null },
          next_peak: nextPeak || null,
          text: forecastLine,
          vulnerability, // デバッグ
        },

        time_windows: windowsWithHint,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
