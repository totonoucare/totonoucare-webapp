// app/api/radar/v1/forecast/public/route.js
// 未ログインユーザー向け。認証不要、体質なし、気象ストレスのみ返す。

import { fetchMetnoLocationForecast } from “@/lib/radar_v1/metnoClient”;
import { normalizeMetnoForTargetDate } from “@/lib/radar_v1/metnoNormalize”;
import { buildWeatherStress } from “@/lib/radar_v1/weatherStress”;
import { decideTargetDateJST } from “@/lib/radar_v1/timeJST”;

export const runtime = “nodejs”;

// レート制限のため、東京をデフォルト座標として使う
const DEFAULT_LAT = 35.68944;
const DEFAULT_LON = 139.69167;

// 気象ストレス → シグナルへの汎用変換（体質なしバージョン）
// personalizeForecast.js の UNIVERSAL_WEATHER_SHARE (0.35) に相当する重みで計算
function calcUniversalSignal(weatherStress) {
const {
pressure_down_strength = 0,
pressure_up_strength = 0,
cold_strength = 0,
heat_strength = 0,
damp_strength = 0,
dry_strength = 0,
} = weatherStress;

// 気圧低下・寒暖差を重視（一般的な「気象病」の主要因）
const universalLoad =
pressure_down_strength * 1.10 +
pressure_up_strength * 0.85 +
cold_strength * 0.95 +
heat_strength * 0.85 +
damp_strength * 0.90 +
dry_strength * 0.75;

// 0〜10 スコアへ正規化（empiricalな上限 2.5 で割る）
const score = Math.min(10, Math.round((universalLoad / 2.5) * 10));

let signal;
if (score >= 7) signal = 2;      // 警戒
else if (score >= 4) signal = 1; // 注意
else signal = 0;                 // 安定

return { score_0_10: score, signal };
}

// メインのトリガー（最も強い気象変化）を特定
function resolveMainTrigger(weatherStress) {
const channels = [
{ key: “pressure_down”, strength: weatherStress.pressure_down_strength ?? 0 },
{ key: “pressure_up”,   strength: weatherStress.pressure_up_strength ?? 0 },
{ key: “cold”,          strength: weatherStress.cold_strength ?? 0 },
{ key: “heat”,          strength: weatherStress.heat_strength ?? 0 },
{ key: “damp”,          strength: weatherStress.damp_strength ?? 0 },
{ key: “dry”,           strength: weatherStress.dry_strength ?? 0 },
];
channels.sort((a, b) => b.strength - a.strength);
const top = channels[0];

const TRIGGER_MAP = {
pressure_down: { main_trigger: “pressure”, trigger_dir: “down” },
pressure_up:   { main_trigger: “pressure”, trigger_dir: “up” },
cold:          { main_trigger: “temp”,     trigger_dir: “down” },
heat:          { main_trigger: “temp”,     trigger_dir: “up” },
damp:          { main_trigger: “humidity”, trigger_dir: “up” },
dry:           { main_trigger: “humidity”, trigger_dir: “down” },
};

return TRIGGER_MAP[top?.key] ?? { main_trigger: “pressure”, trigger_dir: “down” };
}

function jsonUtf8(payload, status = 200) {
return new Response(JSON.stringify(payload), {
status,
headers: { “Content-Type”: “application/json; charset=utf-8” },
});
}

export async function GET(req) {
try {
const { searchParams } = new URL(req.url);

```
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
```

} catch (e) {
console.error(”/api/radar/v1/forecast/public error:”, e);
return jsonUtf8({ ok: false, error: String(e) }, 500);
}
}
