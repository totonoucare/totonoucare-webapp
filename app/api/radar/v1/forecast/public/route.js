// app/api/radar/v1/forecast/public/route.js
// 未ログインユーザー向け。認証不要、体質なし、気象ストレスのみ返す。

import { fetchMetnoLocationForecast } from "@/lib/radar_v1/metnoClient";
import { normalizeMetnoForTargetDate } from "@/lib/radar_v1/metnoNormalize";
import { buildWeatherStress } from "@/lib/radar_v1/weatherStress";
import { decideTargetDateJST } from "@/lib/radar_v1/timeJST";

export const runtime = "nodejs";

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
function calcUniversalSignal(weatherStress) {
  const channels = [
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

  const [top = {}, second = {}, third = {}] = channels;

  let normalizedLoad =
    (top.weighted || 0) * 0.78 +
    (second.weighted || 0) * 0.35 +
    (third.weighted || 0) * 0.16;

  // 9〜10は「強い主因 + もう1つ明確な負担」が重なる日に限定する。
  if ((top.strength || 0) >= 0.88 && (second.strength || 0) >= 0.7) normalizedLoad += 0.13;
  else if ((top.strength || 0) >= 0.9) normalizedLoad += 0.06;

  if (channels.filter((channel) => channel.strength >= 0.72).length >= 3) normalizedLoad += 0.08;

  const score = Math.round((clamp(normalizedLoad, 0, 1.45) / 1.45) * 10);

  let signal;
  if (score >= 8) signal = 2;      // 警戒: 体質なしではかなり強い日だけ
  else if (score >= 4) signal = 1; // 注意
  else signal = 0;                 // 安定

  return { score_0_10: score, signal };
}

// メインのトリガー（最も強い気象変化）を特定
function resolveMainTrigger(weatherStress) {
  const channels = [
    { key: "pressure_down", strength: weatherStress.pressure_down_strength ?? 0 },
    { key: "pressure_up",   strength: weatherStress.pressure_up_strength ?? 0 },
    { key: "cold",          strength: weatherStress.cold_strength ?? 0 },
    { key: "heat",          strength: weatherStress.heat_strength ?? 0 },
    { key: "damp",          strength: weatherStress.damp_strength ?? 0 },
    { key: "dry",           strength: weatherStress.dry_strength ?? 0 },
  ];
  channels.sort((a, b) => b.strength - a.strength);
  const top = channels[0];

  const TRIGGER_MAP = {
    pressure_down: { main_trigger: "pressure", trigger_dir: "down" },
    pressure_up:   { main_trigger: "pressure", trigger_dir: "up" },
    cold:          { main_trigger: "temp",     trigger_dir: "down" },
    heat:          { main_trigger: "temp",     trigger_dir: "up" },
    damp:          { main_trigger: "humidity", trigger_dir: "up" },
    dry:           { main_trigger: "humidity", trigger_dir: "down" },
  };

  return TRIGGER_MAP[top?.key] ?? { main_trigger: "pressure", trigger_dir: "down" };
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

    const { data: metnoData } = await fetchMetnoLocationForecast({ lat, lon });
    const normalized = normalizeMetnoForTargetDate({ metnoJson: metnoData, targetDate });

    if (!normalized.points.length) {
      return jsonUtf8({ ok: false, error: "No forecast points available" }, 503);
    }

    const weatherStress = buildWeatherStress({ points: normalized.points });
    const { score_0_10, signal } = calcUniversalSignal(weatherStress);
    const { main_trigger, trigger_dir } = resolveMainTrigger(weatherStress);

    return jsonUtf8({
      ok: true,
      target_date: targetDate,
      forecast: {
        score_0_10,
        signal,
        main_trigger,
        trigger_dir,
      },
    });
  } catch (e) {
    console.error("/api/radar/v1/forecast/public error:", e);
    return jsonUtf8({ ok: false, error: String(e) }, 500);
  }
}

