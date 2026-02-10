// app/api/radar/today/route.js
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";
import { jstDateString } from "@/lib/dateJST";
import { fetchOpenMeteo, pickNowAnd24hAgo } from "@/lib/weather/openMeteo";
import { buildTimeWindowsFromHourly, levelJa, triggerJa } from "@/lib/radar/risk";
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

function buildReasonText({ todayLevel2, worstWindow, susceptibilityInfo }) {
  const lvl = levelJa(todayLevel2);

  // 最悪の時間帯から「何が主因か」だけ短く
  const main = worstWindow ? triggerJa(worstWindow.trigger) : null;

  // 体質
  const sens = susceptibilityInfo?.susceptibility ?? 0;
  const sensJa = susceptibilityLabel(sens);

  let head = `今日の変化ストレス：${lvl}`;
  if (main) head += `（主因：${main}）`;

  // ±付き（3h評価のabsはUIに出しにくいので、ここでは1hの符号付きだけ採用）
  const dp = worstWindow?.delta_1h?.p != null ? `${fmtSigned(worstWindow.delta_1h.p, 1)}hPa` : null;
  const dt = worstWindow?.delta_1h?.t != null ? `${fmtSigned(worstWindow.delta_1h.t, 1)}℃` : null;
  const dh = worstWindow?.delta_1h?.h != null ? `${fmtSigned(worstWindow.delta_1h.h, 0)}%` : null;

  const bits = [];
  const arr = [];
  if (dp) arr.push(`気圧${dp}`);
  if (dt) arr.push(`気温${dt}`);
  if (dh) arr.push(`湿度${dh}`);
  if (arr.length) bits.push(`変化の大きい時間は（1時間で）${arr.join(" / ")}`);

  if (sensJa === "受けやすい") bits.push("体質的に影響が出やすいので、山の時間は予定を詰めないのが安全");
  if (sensJa === "ふつう") bits.push("山の時間はペース配分を意識すると安定しやすい");
  if (sensJa === "受けにくい") bits.push("基本は安定。山の時間だけ丁寧に過ごせばOK");

  return `${head}\n${bits.join("。")}。`.trim();
}

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const date = jstDateString(new Date());
    const loc = await getPrimaryLocation(user.id);

    // 内因（必須）
    const { data: profile, error: eProf } = await supabaseServer
      .from("constitution_profiles")
      .select("user_id, symptom_focus, computed, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (eProf) throw eProf;
    if (!profile?.computed) {
      return NextResponse.json({
        data: { date, needs_constitution: true, message: "体質データが未設定です。" },
      });
    }

    const susceptibilityInfo = computeSusceptibility(profile);

    // 外因（Open-Meteo）
    const meteo = await fetchOpenMeteo({ lat: loc.lat, lon: loc.lon });
    const current = meteo?.current || {};
    const hourly = meteo?.hourly || {};
    const { nowIdx, agoIdx } = pickNowAnd24hAgo(hourly);

    const tempNow = safeNum(current?.temperature_2m ?? hourly?.temperature_2m?.[nowIdx]);
    const humNow = safeNum(current?.relative_humidity_2m ?? hourly?.relative_humidity_2m?.[nowIdx]);
    const presNow = safeNum(current?.pressure_msl ?? hourly?.pressure_msl?.[nowIdx]);

    // 昨日比（24h）
    const presAgo = safeNum(hourly?.pressure_msl?.[agoIdx]);
    const tempAgo = safeNum(hourly?.temperature_2m?.[agoIdx]);
    const humAgo = safeNum(hourly?.relative_humidity_2m?.[agoIdx]);

    const dP24 = presNow != null && presAgo != null ? presNow - presAgo : null;
    const dT24 = tempNow != null && tempAgo != null ? tempNow - tempAgo : null;
    const dH24 = humNow != null && humAgo != null ? humNow - humAgo : null;

    // now〜24h  windows（フル）
    const time_windows = buildTimeWindowsFromHourly(
      hourly,
      nowIdx,
      24,
      susceptibilityInfo.susceptibility
    );

    // 今日の総合：最大レベル
    const todayLevel2 = time_windows.reduce((m, w) => Math.max(m, w.level2 ?? 0), 0) ?? 0;

    // 最悪の時間帯（level→wind_score→先）
    const worstWindow =
      time_windows
        .slice()
        .sort((a, b) => {
          if ((b.level2 ?? 0) !== (a.level2 ?? 0)) return (b.level2 ?? 0) - (a.level2 ?? 0);
          return (b.wind_score ?? 0) - (a.wind_score ?? 0);
        })[0] || null;

    const reason_text = buildReasonText({ todayLevel2, worstWindow, susceptibilityInfo });

    // DB保存（互換のため wind 以外は0固定）
    const score_wind_now = time_windows?.[0]?.wind_score ?? 0;
    const top_sixin = score_wind_now >= 2 ? ["wind"] : [];

    await supabaseServer
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
            d_pressure_24h: dP24,
            d_temp_24h: dT24,
            d_humidity_24h: dH24,
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

    const { data: radarRow, error: eRadar } = await supabaseServer
      .from("daily_radar")
      .upsert(
        [
          {
            user_id: user.id,
            date,
            level: todayLevel2, // 0..2
            top_sixin,
            reason_text,
            generated_by: "rule_v4_timeline_full",
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
          susceptibility_label: susceptibilityLabel(susceptibilityInfo.susceptibility),
          susceptibility_reasons: susceptibilityInfo.reasons,
        },
        external: {
          lat: loc.lat,
          lon: loc.lon,
          now: { temp: tempNow, humidity: humNow, pressure: presNow },
          yesterday_diff: { temp: dT24, humidity: dH24, pressure: dP24 }, // ← “今日の変化ストレス”の材料
        },
        radar: radarRow,
        time_windows, // ← 24hフル
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
