// app/api/radar/v1/forecast/public/route.js
// 未ログインユーザー向け。認証不要、体質なし、気象ストレスのみ返す。

import { fetchMetnoLocationForecast } from "@/lib/radar_v1/metnoClient";
import { normalizeMetnoForTargetDate } from "@/lib/radar_v1/metnoNormalize";
import { buildWeatherStress } from "@/lib/radar_v1/weatherStress";
import { decideTargetDateJST, nowJstParts, toJstISODate } from "@/lib/radar_v1/timeJST";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// レート制限のため、東京をデフォルト座標として使う
const DEFAULT_LAT = 35.68944;
const DEFAULT_LON = 139.69167;

const UNIVERSAL_CHANNEL_IMPORTANCE = {
  pressure_down: 1.0,
  pressure_up: 0.74,
  cold: 0.86,
  heat: 0.76,
  damp: 0.8,
  dry: 0.66,
};

function clamp(value, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.max(min, Math.min(max, num));
}

// 気象ストレス → シグナルへの汎用変換（体質なしバージョン）
// 体質補正がないため、複数要因の単純合算ではなく「上位要因を中心に控えめ」に出す。
function buildUniversalChannelRanking(weatherStress) {
  return [
    { key: "pressure_down", strength: weatherStress.pressure_down_strength ?? 0 },
    { key: "pressure_up", strength: weatherStress.pressure_up_strength ?? 0 },
    { key: "cold", strength: weatherStress.cold_strength ?? 0 },
    { key: "heat", strength: weatherStress.heat_strength ?? 0 },
    { key: "damp", strength: weatherStress.damp_strength ?? 0 },
    { key: "dry", strength: weatherStress.dry_strength ?? 0 },
  ]
    .map((channel) => ({
      ...channel,
      weighted: clamp(channel.strength, 0, 1) * (UNIVERSAL_CHANNEL_IMPORTANCE[channel.key] || 1),
    }))
    .sort((a, b) => b.weighted - a.weighted);
}

function calcUniversalSignal(weatherStress) {
  const channels = buildUniversalChannelRanking(weatherStress);

  const [top = {}, second = {}, third = {}] = channels;

  let normalizedLoad =
    (top.weighted || 0) * 0.78 +
    (second.weighted || 0) * 0.35 +
    (third.weighted || 0) * 0.16;

  // 9〜10は「強い主因 + もう1つ明確な負担」が重なる日に限定する。
  if ((top.strength || 0) >= 0.88 && (second.strength || 0) >= 0.7) normalizedLoad += 0.13;
  else if ((top.strength || 0) >= 0.9) normalizedLoad += 0.06;

  if (channels.filter((channel) => channel.strength >= 0.72).length >= 3) normalizedLoad += 0.08;

  const scorePrecise = Math.round((clamp(normalizedLoad, 0, 1.45) / 1.45) * 100) / 10;
  const score = Math.round(scorePrecise);

  let signal;
  if (score >= 7) signal = 2;      // 守り
  else if (score >= 4) signal = 1; // いたわり
  else signal = 0;                 // 安定

  return {
    score_0_10: score,
    score_display_0_10: scorePrecise,
    score_precise_0_10: scorePrecise,
    signal,
  };
}

// メイン/副因のトリガー（強い気象変化）を特定
function resolveTriggerFactors(weatherStress) {
  const channels = buildUniversalChannelRanking(weatherStress);
  const [top = {}, second = {}] = channels;

  const primary = buildTriggerFactor(top, "primary");
  if (!primary) return [];

  const out = [primary];
  const secondWeighted = Number(second?.weighted || 0);
  const topWeighted = Number(top?.weighted || 0);
  const secondIsMeaningful =
    second?.key &&
    secondWeighted >= 0.18 &&
    secondWeighted >= topWeighted * 0.45;

  if (secondIsMeaningful) {
    const secondary = buildTriggerFactor(second, "secondary");
    if (secondary) out.push(secondary);
  }

  return out;
}

function buildTriggerFactor(channel, role) {
  if (!channel?.key || Number(channel.weighted || 0) <= 0.05) return null;

  const TRIGGER_MAP = {
    pressure_down: { main_trigger: "pressure", trigger_dir: "down", label: "気圧低下" },
    pressure_up:   { main_trigger: "pressure", trigger_dir: "up", label: "気圧上昇" },
    cold:          { main_trigger: "temp",     trigger_dir: "down", label: "冷え込み" },
    heat:          { main_trigger: "temp",     trigger_dir: "up", label: "気温上昇" },
    damp:          { main_trigger: "humidity", trigger_dir: "up", label: "湿気" },
    dry:           { main_trigger: "humidity", trigger_dir: "down", label: "乾燥" },
  };

  const compat = TRIGGER_MAP[channel.key];
  if (!compat) return null;

  return {
    key: channel.key,
    exact: channel.key,
    role,
    main_trigger: compat.main_trigger,
    trigger_dir: compat.trigger_dir,
    label: compat.label,
    weather_strength: Math.round(Number(channel.strength || 0) * 100) / 100,
    effective_load: Math.round(Number(channel.weighted || 0) * 100) / 100,
  };
}

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

    const weatherStress = buildWeatherStress({
      points: normalized.points,
      previousNightBridgePoints: includePreviousNightBridge
        ? normalized.previousNightBridgePoints
        : null,
    });
    const { score_0_10, score_display_0_10, score_precise_0_10, signal } = calcUniversalSignal(weatherStress);
    const triggerFactors = resolveTriggerFactors(weatherStress);
    const primaryTrigger = triggerFactors[0] || buildTriggerFactor({ key: "pressure_down", strength: 0, weighted: 0.06 }, "primary");
    const secondaryTrigger = triggerFactors[1] || null;

    return jsonUtf8({
      ok: true,
      target_date: targetDate,
      forecast: {
        score_0_10,
        score_display_0_10,
        score_precise_0_10,
        signal,
        main_trigger: primaryTrigger.main_trigger,
        trigger_dir: primaryTrigger.trigger_dir,
        main_trigger_label: primaryTrigger.label,
        personal_main_trigger_exact: primaryTrigger.exact,
        personal_secondary_trigger_exact: secondaryTrigger?.exact || null,
        secondary_trigger_label: secondaryTrigger?.label || null,
        trigger_factors: triggerFactors.length ? triggerFactors : [primaryTrigger],
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

