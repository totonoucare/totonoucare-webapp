// app/api/radar/today/route.js
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";
import { jstDateString } from "@/lib/dateJST";
import { fetchOpenMeteo, pickNowAnd24hAgo } from "@/lib/weather/openMeteo";
import { sixinScores, topSixin } from "@/lib/radar/rules";
import { computeRisk, computeTimeWindowsNext24h } from "@/lib/radar/risk";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_LOC = {
  // デフォルト：日本の基準として明石（JSTの基準）付近に寄せる
  lat: 34.6431,
  lon: 134.9974,
};

async function getPrimaryLocation(userId) {
  const { data, error } = await supabaseServer
    .from("user_locations")
    .select("lat, lon")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || DEFAULT_LOC;
}

async function getProfile(userId) {
  // scoring.js の computed を丸ごと使う（axes/env/sub_labels含む）
  const { data, error } = await supabaseServer
    .from("constitution_profiles")
    .select("user_id, symptom_focus, answers, computed, updated_at, latest_event_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

function pickLevelLabel3(level3) {
  // 3段階の名称（DB level 0..2で運用）
  if (level3 === 0) return "安定";
  if (level3 === 1) return "注意";
  if (level3 === 2) return "要警戒";
  return "—";
}

function buildReasonText({ level3, top_sixin, externalNow, deltas24h, chips }) {
  const labelMap = {
    wind: "ゆらぎ",
    cold: "冷え",
    heat: "暑さ",
    damp: "湿気",
    dry: "乾燥",
  };

  const levelJa = pickLevelLabel3(level3);
  const six = (top_sixin || []).map((x) => labelMap[x] || x).join("＋") || "影響小さめ";

  const dp = typeof deltas24h?.d_pressure_24h === "number" ? `${deltas24h.d_pressure_24h.toFixed(1)}hPa` : "—";
  const dt = typeof deltas24h?.d_temp_24h === "number" ? `${deltas24h.d_temp_24h.toFixed(1)}℃` : "—";
  const dh = typeof deltas24h?.d_humidity_24h === "number" ? `${deltas24h.d_humidity_24h.toFixed(0)}%` : "—";

  const t = typeof externalNow?.temp === "number" ? `${externalNow.temp.toFixed(1)}℃` : "—";
  const h = typeof externalNow?.humidity === "number" ? `${externalNow.humidity.toFixed(0)}%` : "—";
  const p = typeof externalNow?.pressure === "number" ? `${externalNow.pressure.toFixed(1)}hPa` : "—";

  const chipText = Array.isArray(chips) && chips.length ? `｜根拠: ${chips.slice(0, 5).join("・")}` : "";

  return `今日：${levelJa}（${six}）｜24h変化：気圧${dp} / 気温${dt} / 湿度${dh}｜現在：気温${t} / 湿度${h} / 気圧${p}${chipText}`;
}

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const date = jstDateString(new Date());

    // 1) 体質プロファイル（必須）
    const profile = await getProfile(user.id);
    if (!profile?.computed) {
      return NextResponse.json(
        {
          error: "体質情報が未設定です（先に体質チェックを行ってください）",
          code: "NO_PROFILE",
        },
        { status: 400 }
      );
    }

    const computed = profile.computed;

    // 2) ロケーション（必須：なければデフォルト）
    const loc = await getPrimaryLocation(user.id);

    // 3) 気象（Open-Meteo）
    const meteo = await fetchOpenMeteo({ lat: loc.lat, lon: loc.lon });
    const current = meteo?.current || {};
    const hourly = meteo?.hourly || {};
    const { nowIdx, agoIdx } = pickNowAnd24hAgo(hourly);

    const temp = Number(current?.temperature_2m ?? hourly?.temperature_2m?.[nowIdx]);
    const humidity = Number(current?.relative_humidity_2m ?? hourly?.relative_humidity_2m?.[nowIdx]);
    const pressure = Number(current?.pressure_msl ?? hourly?.pressure_msl?.[nowIdx]);
    const wind = Number(current?.wind_speed_10m ?? hourly?.wind_speed_10m?.[nowIdx]);
    const precip = Number(current?.precipitation ?? hourly?.precipitation?.[nowIdx]);

    const pressureAgo = Number(hourly?.pressure_msl?.[agoIdx]);
    const tempAgo = Number(hourly?.temperature_2m?.[agoIdx]);
    const humidityAgo = Number(hourly?.relative_humidity_2m?.[agoIdx]);

    const d_pressure_24h =
      Number.isFinite(pressure) && Number.isFinite(pressureAgo) ? pressure - pressureAgo : null;

    const d_temp_24h =
      Number.isFinite(temp) && Number.isFinite(tempAgo) ? temp - tempAgo : null;

    const d_humidity_24h =
      Number.isFinite(humidity) && Number.isFinite(humidityAgo) ? humidity - humidityAgo : null;

    // 4) 六淫スコア（外因）
    const scores = sixinScores({
      temp: Number.isFinite(temp) ? temp : null,
      humidity: Number.isFinite(humidity) ? humidity : null,
      d_pressure_24h: Number.isFinite(d_pressure_24h) ? d_pressure_24h : null,
      d_temp_24h: Number.isFinite(d_temp_24h) ? d_temp_24h : null,
      d_humidity_24h: Number.isFinite(d_humidity_24h) ? d_humidity_24h : null,
    });

    const top_sixin = topSixin(scores);

    // 5) 決定版：Risk + Level3
    const { risk, level3, chips, breakdown } = computeRisk({
      computed,
      scores,
      top_sixin,
    });

    const reason_text = buildReasonText({
      level3,
      top_sixin,
      externalNow: { temp, humidity, pressure },
      deltas24h: { d_pressure_24h, d_temp_24h, d_humidity_24h },
      chips,
    });

    // 6) daily_external_factors 保存（0..3）
    const { error: eDef } = await supabaseServer
      .from("daily_external_factors")
      .upsert(
        [
          {
            user_id: user.id,
            date,
            lat: loc.lat,
            lon: loc.lon,

            pressure: Number.isFinite(pressure) ? pressure : null,
            temp: Number.isFinite(temp) ? temp : null,
            humidity: Number.isFinite(humidity) ? humidity : null,
            wind: Number.isFinite(wind) ? wind : null,
            precip: Number.isFinite(precip) ? precip : null,

            d_pressure_24h,
            d_temp_24h,
            d_humidity_24h,

            // DBスキーマに合わせる
            score_wind: scores.score_wind,
            score_cold: scores.score_cold,
            score_heat: scores.score_heat,
            score_damp: scores.score_damp,
            score_dry: scores.score_dry,
            top_sixin,
          },
        ],
        { onConflict: "user_id,date" }
      );

    if (eDef) throw eDef;

    // 7) daily_radar 保存（levelは3段階で 0..2 を使う）
    const { data: radarRow, error: eRadar } = await supabaseServer
      .from("daily_radar")
      .upsert(
        [
          {
            user_id: user.id,
            date,
            level: level3, // 0..2（DBは0..3許容）
            top_sixin,
            reason_text,
            recommended_main_card_id: null, // 無料版はカード辞書なし運用に合わせてまずnull
            recommended_food_card_id: null,
            generated_by: "rule_v2_risk3",
          },
        ],
        { onConflict: "user_id,date" }
      )
      .select("id, user_id, date, level, top_sixin, reason_text, created_at")
      .single();

    if (eRadar) throw eRadar;

    // 8) 次の24h：注意時間帯（返すだけ）
    // → hourlyスライスを作って、各時刻で「短期Δ（3h）」を材料に六淫とRiskを再計算する
    const slices = computeTimeWindowsNext24h({ computed, hourly, nowIdx });

    const windows = slices.map((s) => {
      const sScores = sixinScores({
        temp: s.temp,
        humidity: s.humidity,
        d_pressure_24h: s.dP_3h,   // ここだけ短期Δ（命名は互換のため）
        d_temp_24h: s.dT_3h,
        d_humidity_24h: s.dH_3h,
      });

      const sTop = topSixin(sScores);
      const out = computeRisk({ computed, scores: sScores, top_sixin: sTop });

      return {
        time: s.time,           // "YYYY-MM-DDTHH:00"
        level3: out.level3,     // 0..2
        risk: out.risk,
        top_sixin: sTop,
        chips: out.chips.slice(0, 3),
        external: {
          temp: s.temp,
          humidity: s.humidity,
          pressure: s.pressure,
          dP_3h: s.dP_3h,
          dT_3h: s.dT_3h,
          dH_3h: s.dH_3h,
        },
      };
    });

    // 注意以上だけ抽出して返してもいいが、まずは全返し（UIで間引ける）
    return NextResponse.json({
      data: {
        date,
        location: { lat: loc.lat, lon: loc.lon, is_default: !("lat" in (await getPrimaryLocation(user.id))) },
        profile: {
          symptom_focus: profile.symptom_focus || computed.symptom_focus || "fatigue",
          updated_at: profile.updated_at || null,
          latest_event_id: profile.latest_event_id || null,
          core_code: computed.core_code || null,
          sub_labels: computed.sub_labels || [],
          axes: computed.axes || {},
          env: computed.env || {},
        },
        external: {
          temp: Number.isFinite(temp) ? temp : null,
          humidity: Number.isFinite(humidity) ? humidity : null,
          pressure: Number.isFinite(pressure) ? pressure : null,
          wind: Number.isFinite(wind) ? wind : null,
          precip: Number.isFinite(precip) ? precip : null,
          d_pressure_24h,
          d_temp_24h,
          d_humidity_24h,
          scores,
          top_sixin,
        },
        radar: {
          ...radarRow,
          level_label: pickLevelLabel3(level3),
          risk,
          chips,
          breakdown,
        },
        time_windows: windows,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
