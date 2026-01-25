import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";
import { jstDateString } from "@/lib/dateJST";
import { fetchOpenMeteo, pickNowAnd24hAgo } from "@/lib/weather/openMeteo";
import { sixinScores, topSixin, applyFlowBonus, radarLevel, reasonText } from "@/lib/radar/rules";

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

  // 無ければ大阪駅付近を仮（あなたが後でUIで設定できる）
  return data || { lat: 34.7025, lon: 135.4959 };
}

async function getLatestAssessment(userId) {
  const { data, error } = await supabaseServer
    .from("assessments")
    .select("id, created_at, result_type, symptom, payload")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function getTodayCheckin(userId, date) {
  const { data, error } = await supabaseServer
    .from("daily_checkins")
    .select("condition_am, condition_pm")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();
  if (error) throw error;
  return data || {};
}

async function pickRecommendedCard({ userId, symptomFocus, flowType, organType, top_sixin }) {
  // main: breathing/tsubo/stretch
  const { data, error } = await supabaseServer
    .from("care_cards")
    .select("id, kind, title, body_steps, illustration_url, cautions, tags_symptom, tags_flow, tags_organ, tags_sixin, priority_base")
    .eq("is_active", true)
    .in("kind", ["breathing", "tsubo", "stretch"])
    .limit(300);

  if (error) throw error;

  const candidates = data || [];
  const score = (card) => {
    let s = card.priority_base || 0;

    const has = (arr, v) => Array.isArray(arr) && arr.includes(v);

    if (symptomFocus && has(card.tags_symptom, symptomFocus)) s += 3;
    if (flowType && card.tags_flow?.some((x) => String(flowType).includes(x))) s += 2; // 仮：後でマッピング厳密化
    if (organType && card.tags_organ?.some((x) => String(organType).includes(x))) s += 2;

    if (Array.isArray(top_sixin) && top_sixin.length) {
      if (has(card.tags_sixin, top_sixin[0])) s += 3;
      if (top_sixin[1] && has(card.tags_sixin, top_sixin[1])) s += 2;
    }
    return s;
  };

  const sorted = candidates
    .map((c) => ({ c, s: score(c) }))
    .sort((a, b) => b.s - a.s);

  return sorted[0]?.c || null;
}

async function pickFoodCard({ symptomFocus, top_sixin }) {
  const { data, error } = await supabaseServer
    .from("care_cards")
    .select("id, kind, title, body_steps, illustration_url, cautions, tags_symptom, tags_sixin, priority_base")
    .eq("is_active", true)
    .eq("kind", "food")
    .limit(300);

  if (error) throw error;

  const candidates = data || [];
  const has = (arr, v) => Array.isArray(arr) && arr.includes(v);

  const score = (card) => {
    let s = card.priority_base || 0;
    if (symptomFocus && has(card.tags_symptom, symptomFocus)) s += 2;
    if (Array.isArray(top_sixin) && top_sixin.length) {
      if (has(card.tags_sixin, top_sixin[0])) s += 2;
      if (top_sixin[1] && has(card.tags_sixin, top_sixin[1])) s += 1;
    }
    return s;
  };

  const sorted = candidates
    .map((c) => ({ c, s: score(c) }))
    .sort((a, b) => b.s - a.s);

  return sorted[0]?.c || null;
}

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const date = jstDateString(new Date());
    const loc = await getPrimaryLocation(user.id);

    // 1) assessment（内因）
    const assessment = await getLatestAssessment(user.id);
    const payload = assessment?.payload || {};
    const symptomFocus =
      payload?.answers?.symptom_focus ||
      payload?.answers?.symptomFocus ||
      assessment?.symptom ||
      null;

    const flowType = payload?.flowType || payload?.flow || null;
    const organType = payload?.organType || payload?.organ || null;

    // 2) 今日のcheckin（朝補正）
    const checkin = await getTodayCheckin(user.id, date);
    const condition_am = checkin?.condition_am ?? null;

    // 3) 外因（Open-Meteo）
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

    const d_pressure_24h = Number.isFinite(pressure) && Number.isFinite(pressureAgo) ? pressure - pressureAgo : null;
    const d_temp_24h = Number.isFinite(temp) && Number.isFinite(tempAgo) ? temp - tempAgo : null;
    const d_humidity_24h = Number.isFinite(humidity) && Number.isFinite(humidityAgo) ? humidity - humidityAgo : null;

    // 4) 六淫スコア
    let scores = sixinScores({
      temp,
      humidity,
      wind,
      d_pressure_24h: d_pressure_24h ?? 0,
    });
    scores = applyFlowBonus(scores, flowType);

    const top_sixin = topSixin(scores);
    const level = radarLevel({ scores, condition_am });
    const reason = reasonText({ level, top_sixin, d_pressure_24h, temp, humidity });

    // 5) DB保存（外因）
    const { error: eDef } = await supabaseServer
      .from("daily_external_factors")
      .upsert(
        [{
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
          ...scores,
          top_sixin,
        }],
        { onConflict: "user_id,date" }
      );

    if (eDef) throw eDef;

    // 6) 今日の一手（固定辞書から選ぶ）
    const mainCard = await pickRecommendedCard({
      userId: user.id,
      symptomFocus,
      flowType,
      organType,
      top_sixin,
    });

    const foodCard = await pickFoodCard({
      symptomFocus,
      top_sixin,
    });

    // 7) DB保存（レーダー）
    const { data: radarRow, error: eRadar } = await supabaseServer
      .from("daily_radar")
      .upsert(
        [{
          user_id: user.id,
          date,
          level,
          top_sixin,
          reason_text: reason,
          recommended_main_card_id: mainCard?.id || null,
          recommended_food_card_id: foodCard?.id || null,
          generated_by: "rule_v1",
        }],
        { onConflict: "user_id,date" }
      )
      .select("id, user_id, date, level, top_sixin, reason_text, recommended_main_card_id, recommended_food_card_id, created_at")
      .single();

    if (eRadar) throw eRadar;

    return NextResponse.json({
      date,
      assessment: assessment ? { id: assessment.id, created_at: assessment.created_at } : null,
      symptom_focus: symptomFocus,
      flowType,
      organType,
      external: {
        lat: loc.lat,
        lon: loc.lon,
        temp,
        humidity,
        pressure,
        wind,
        precip,
        d_pressure_24h,
        scores,
        top_sixin,
      },
      radar: radarRow,
      cards: {
        main: mainCard,
        food: foodCard,
      },
      checkin: checkin || null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
