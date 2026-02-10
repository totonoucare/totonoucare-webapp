// app/api/radar/today/route.js
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";
import { jstDateString } from "@/lib/dateJST";
import { fetchOpenMeteo, pickNowAnd24hAgo } from "@/lib/weather/openMeteo";
import {
  buildTimeWindowsFromHourly,
  pickHighlightWindows,
  levelJa,
} from "@/lib/radar/risk";
import { computeSusceptibility, susceptibilityLabel } from "@/lib/radar/constitution";

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

  // 未設定時のデフォルト（明石あたりに寄せるならここで）
  return data || { lat: 34.6413, lon: 134.9992 };
}

function safeNum(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function fmtSigned(v, digits = 1) {
  const x = safeNum(v);
  if (x == null) return null;
  const sign = x > 0 ? "+" : "";
  return `${sign}${x.toFixed(digits)}`;
}

function buildReasonText({ todayLevel2, highlights, susceptibilityInfo }) {
  const lvl = levelJa(todayLevel2);

  // いちばん大きい山の trigger を使う（なければ空）
  const top = Array.isArray(highlights) && highlights.length ? highlights[0] : null;

  let head = `今日の変化ストレス：${lvl}`;
  if (top?.abs?.p != null) head += `（気圧の変化が目立つ）`;
  else if (top?.abs?.t != null) head += `（気温の変化が目立つ）`;
  else if (top?.abs?.h != null) head += `（湿度の変化が目立つ）`;

  const bodyBits = [];

  if (top?.back_hours) {
    // “何時間でどれくらい動くか” を短く
    const bh = top.back_hours;
    const dp = top.abs?.p != null ? `${top.abs.p.toFixed(1)}hPa` : null;
    const dt = top.abs?.t != null ? `${top.abs.t.toFixed(1)}℃` : null;
    const dh = top.abs?.h != null ? `${top.abs.h.toFixed(0)}%` : null;

    const arr = [];
    if (dp) arr.push(`気圧${dp}`);
    if (dt) arr.push(`気温${dt}`);
    if (dh) arr.push(`湿度${dh}`);

    if (arr.length) bodyBits.push(`${bh}時間で ${arr.join(" / ")}`);
  }

  // 内因：受けやすさを一文で（難語を避ける）
  if (susceptibilityInfo?.susceptibility != null) {
    const sensJa = susceptibilityLabel(susceptibilityInfo.susceptibility);
    if (sensJa === "受けやすい") {
      bodyBits.push(`あなたは環境の変化を受けやすい傾向。無理に詰めないのが安全`);
    } else if (sensJa === "ふつう") {
      bodyBits.push(`変化が大きい時間はペース配分を意識すると安定しやすい`);
    } else {
      bodyBits.push(`基本は安定。大きく動く時間だけ丁寧に過ごせばOK`);
    }
  }

  return {
    headline: head,
    summary: bodyBits.filter(Boolean).join("。") + (bodyBits.length ? "。" : ""),
  };
}

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const date = jstDateString(new Date());
    const loc = await getPrimaryLocation(user.id);

    // 1) 体質（内因）を取得（必須）
    const { data: profile, error: eProf } = await supabaseServer
      .from("constitution_profiles")
      .select("user_id, symptom_focus, computed, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (eProf) throw eProf;
    if (!profile?.computed) {
      return NextResponse.json({
        data: {
          date,
          needs_constitution: true,
          message: "体質データが未設定です（体質チェックを先に行ってください）。",
        },
      });
    }

    const susceptibilityInfo = computeSusceptibility(profile);

    // 2) 天気（Open-Meteo）
    const meteo = await fetchOpenMeteo({ lat: loc.lat, lon: loc.lon });
    const current = meteo?.current || {};
    const hourly = meteo?.hourly || {};
    const { nowIdx, agoIdx } = pickNowAnd24hAgo(hourly);

    const tempNow = safeNum(current?.temperature_2m ?? hourly?.temperature_2m?.[nowIdx]);
    const humNow = safeNum(current?.relative_humidity_2m ?? hourly?.relative_humidity_2m?.[nowIdx]);
    const presNow = safeNum(current?.pressure_msl ?? hourly?.pressure_msl?.[nowIdx]);
    const windNow = safeNum(current?.wind_speed_10m ?? hourly?.wind_speed_10m?.[nowIdx]);
    const precipNow = safeNum(current?.precipitation ?? hourly?.precipitation?.[nowIdx]);

    // 24h差（表示用・保存用）
    const presAgo = safeNum(hourly?.pressure_msl?.[agoIdx]);
    const tempAgo = safeNum(hourly?.temperature_2m?.[agoIdx]);
    const humAgo = safeNum(hourly?.relative_humidity_2m?.[agoIdx]);

    const d_pressure_24h = presNow != null && presAgo != null ? presNow - presAgo : null;
    const d_temp_24h = tempNow != null && tempAgo != null ? tempNow - tempAgo : null;
    const d_humidity_24h = humNow != null && humAgo != null ? humNow - humAgo : null;

    // 1h差（UIの矢印用）
    const pres1h = nowIdx - 1 >= 0 ? safeNum(hourly?.pressure_msl?.[nowIdx - 1]) : null;
    const temp1h = nowIdx - 1 >= 0 ? safeNum(hourly?.temperature_2m?.[nowIdx - 1]) : null;
    const hum1h = nowIdx - 1 >= 0 ? safeNum(hourly?.relative_humidity_2m?.[nowIdx - 1]) : null;

    const d_pressure_1h = presNow != null && pres1h != null ? presNow - pres1h : null;
    const d_temp_1h = tempNow != null && temp1h != null ? tempNow - temp1h : null;
    const d_humidity_1h = humNow != null && hum1h != null ? humNow - hum1h : null;

    // 3) タイムウィンドウ（外因×内因）
    const time_windows = buildTimeWindowsFromHourly(
      hourly,
      nowIdx,
      24,
      susceptibilityInfo.susceptibility
    );

    const highlight_windows = pickHighlightWindows(time_windows, 3);

    // 4) 今日の総合レベル（0..2）
    const todayLevel2 =
      time_windows.reduce((m, w) => Math.max(m, w.level2 ?? 0), 0) ?? 0;

    // 5) reason（短文。羅列しない。難語を避ける）
    const reason = buildReasonText({
      todayLevel2,
      highlights: highlight_windows,
      susceptibilityInfo,
    });

    // 6) DB保存（daily_external_factors）
    // - スキーマ上 score_* があるが、無料版では wind 以外は 0 固定
    // - top_sixin は wind のみ（>=2なら）
    const score_wind_now = time_windows?.[0]?.wind_score ?? 0;
    const top_sixin = score_wind_now >= 2 ? ["wind"] : [];

    const { error: eDef } = await supabaseServer
      .from("daily_external_factors")
      .upsert(
        [
          {
            user_id: user.id,
            date,
            lat: loc.lat,
            lon: loc.lon,

            pressure: presNow,
            temp: tempNow,
            humidity: humNow,
            wind: windNow,
            precip: precipNow,

            d_pressure_24h,
            d_temp_24h,
            d_humidity_24h,

            score_wind: score_wind_now,
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

    // 7) DB保存（daily_radar）
    const { data: radarRow, error: eRadar } = await supabaseServer
      .from("daily_radar")
      .upsert(
        [
          {
            user_id: user.id,
            date,
            level: todayLevel2, // 0..2（スキーマは0..3許容）
            top_sixin,
            reason_text: `${reason.headline}\n${reason.summary}`.trim(),
            recommended_main_card_id: null,
            recommended_food_card_id: null,
            generated_by: "rule_v3_wind_x_constitution",
          },
        ],
        { onConflict: "user_id,date" }
      )
      .select("id, user_id, date, level, top_sixin, reason_text, created_at")
      .single();

    if (eRadar) throw eRadar;

    return NextResponse.json({
      data: {
        date,
        constitution: {
          symptom_focus: profile?.symptom_focus || "fatigue",
          susceptibility: susceptibilityInfo.susceptibility,
          susceptibility_reasons: susceptibilityInfo.reasons,
        },
        external: {
          lat: loc.lat,
          lon: loc.lon,
          temp: tempNow,
          humidity: humNow,
          pressure: presNow,
          wind: windNow,
          precip: precipNow,

          d_pressure_24h,
          d_temp_24h,
          d_humidity_24h,

          d_pressure_1h,
          d_temp_1h,
          d_humidity_1h,
        },
        radar: radarRow,
        time_windows,
        highlight_windows,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
