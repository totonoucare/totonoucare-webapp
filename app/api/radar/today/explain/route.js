// app/api/radar/today/explain/route.js
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";
import { jstDateString } from "@/lib/dateJST";
import { fetchOpenMeteo, pickNowAnd24hAgo } from "@/lib/weather/openMeteo";
import { sixinScores, topSixin } from "@/lib/radar/rules";
import { computeRisk, computeTimeWindowsNext24h } from "@/lib/radar/risk";
import { generateText } from "@/lib/openai/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const DEFAULT_LOC = { lat: 34.6431, lon: 134.9974 }; // 明石

function safeArr(v) {
  return Array.isArray(v) ? v : [];
}

function mapSixinJa(code) {
  const map = {
    wind: "ゆらぎ（変化ストレス）",
    cold: "冷え",
    heat: "暑さ",
    damp: "湿気",
    dry: "乾燥",
  };
  return map[code] || code;
}

function levelJa3(level3) {
  return ["安定", "注意", "要警戒"][level3] || "—";
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
  return data || DEFAULT_LOC;
}

async function getProfile(userId) {
  const { data, error } = await supabaseServer
    .from("constitution_profiles")
    .select("user_id, symptom_focus, computed, latest_event_id, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function getTodayRows(userId, date) {
  const { data: radar, error: e1 } = await supabaseServer
    .from("daily_radar")
    .select("level, top_sixin, reason_text, created_at")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();
  if (e1) throw e1;

  const { data: def, error: e2 } = await supabaseServer
    .from("daily_external_factors")
    .select(
      "pressure,temp,humidity,wind,precip,d_pressure_24h,d_temp_24h,d_humidity_24h,score_wind,score_cold,score_heat,score_damp,score_dry,top_sixin"
    )
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();
  if (e2) throw e2;

  return { radar: radar || null, def: def || null };
}

function summarizeWindows(windows = []) {
  // windows: [{time, level3, top_sixin, chips...}, ...]
  // 重要な“山”だけ抽出して文章材料にする
  const hits = windows.filter((w) => (w?.level3 ?? 0) >= 1);
  if (!hits.length) return { has: false, text: "大きな山は見当たりません（1日の中で急に悪化しやすい時間帯は小さめ）。" };

  // 上位6個だけ
  const top = hits
    .slice()
    .sort((a, b) => (b.risk ?? 0) - (a.risk ?? 0))
    .slice(0, 6)
    .map((w) => {
      const hh = String(w.time || "").slice(11, 16); // "HH:MM"
      const lv = levelJa3(w.level3);
      const s = safeArr(w.top_sixin).map(mapSixinJa).join("・") || "—";
      return `- ${hh}頃：${lv}（${s}）`;
    })
    .join("\n");

  return { has: true, text: `注意が出やすい時間帯（次の24時間の山）\n${top}` };
}

async function fetchTomorrowForecast({ lat, lon }) {
  // 明日の“日次”レベルの材料だけ欲しいので、同じOpen-Meteoを使い、24h後の差分を作る
  const meteo = await fetchOpenMeteo({ lat, lon });
  const hourly = meteo?.hourly || {};
  const times = hourly?.time || [];
  if (!times.length) return null;

  const { nowIdx } = pickNowAnd24hAgo(hourly);
  const idxTomorrow = Math.min(times.length - 1, Math.max(0, nowIdx + 24));

  const num = (arr, i) => (Array.isArray(arr) ? Number(arr[i]) : NaN);

  const temp = num(hourly.temperature_2m, idxTomorrow);
  const humidity = num(hourly.relative_humidity_2m, idxTomorrow);
  const pressure = num(hourly.pressure_msl, idxTomorrow);

  // 24h変化は “今日のidxTomorrow - 今日のnowIdx”
  const tempNow = num(hourly.temperature_2m, nowIdx);
  const humNow = num(hourly.relative_humidity_2m, nowIdx);
  const presNow = num(hourly.pressure_msl, nowIdx);

  const d_temp_24h = Number.isFinite(temp) && Number.isFinite(tempNow) ? temp - tempNow : null;
  const d_humidity_24h = Number.isFinite(humidity) && Number.isFinite(humNow) ? humidity - humNow : null;
  const d_pressure_24h = Number.isFinite(pressure) && Number.isFinite(presNow) ? pressure - presNow : null;

  const scores = sixinScores({
    temp: Number.isFinite(temp) ? temp : null,
    humidity: Number.isFinite(humidity) ? humidity : null,
    d_pressure_24h: Number.isFinite(d_pressure_24h) ? d_pressure_24h : null,
    d_temp_24h: Number.isFinite(d_temp_24h) ? d_temp_24h : null,
    d_humidity_24h: Number.isFinite(d_humidity_24h) ? d_humidity_24h : null,
  });

  const top_sixin = topSixin(scores);

  return {
    temp: Number.isFinite(temp) ? temp : null,
    humidity: Number.isFinite(humidity) ? humidity : null,
    pressure: Number.isFinite(pressure) ? pressure : null,
    d_pressure_24h,
    d_temp_24h,
    d_humidity_24h,
    scores,
    top_sixin,
  };
}

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const date = jstDateString(new Date());

    const profile = await getProfile(user.id);
    if (!profile?.computed) {
      return NextResponse.json({ error: "体質情報が未設定です（体質チェックを先に行ってください）" }, { status: 400 });
    }

    const computed = profile.computed;
    const loc = await getPrimaryLocation(user.id);

    // 今日のDB行（無ければ today API を先に叩いてもらう想定だが、無くても作れる）
    const { radar: radarRow, def: defRow } = await getTodayRows(user.id, date);

    // 今日の気象を直接取得（DBが無いケースも救う）
    const meteo = await fetchOpenMeteo({ lat: loc.lat, lon: loc.lon });
    const current = meteo?.current || {};
    const hourly = meteo?.hourly || {};
    const { nowIdx, agoIdx } = pickNowAnd24hAgo(hourly);

    const tempNow = Number(current?.temperature_2m ?? hourly?.temperature_2m?.[nowIdx]);
    const humNow = Number(current?.relative_humidity_2m ?? hourly?.relative_humidity_2m?.[nowIdx]);
    const presNow = Number(current?.pressure_msl ?? hourly?.pressure_msl?.[nowIdx]);

    const presAgo = Number(hourly?.pressure_msl?.[agoIdx]);
    const tempAgo = Number(hourly?.temperature_2m?.[agoIdx]);
    const humAgo = Number(hourly?.relative_humidity_2m?.[agoIdx]);

    const dP = Number.isFinite(presNow) && Number.isFinite(presAgo) ? presNow - presAgo : null;
    const dT = Number.isFinite(tempNow) && Number.isFinite(tempAgo) ? tempNow - tempAgo : null;
    const dH = Number.isFinite(humNow) && Number.isFinite(humAgo) ? humNow - humAgo : null;

    const todayScores = defRow
      ? {
          score_wind: defRow.score_wind,
          score_cold: defRow.score_cold,
          score_heat: defRow.score_heat,
          score_damp: defRow.score_damp,
          score_dry: defRow.score_dry,
        }
      : sixinScores({
          temp: Number.isFinite(tempNow) ? tempNow : null,
          humidity: Number.isFinite(humNow) ? humNow : null,
          d_pressure_24h: Number.isFinite(dP) ? dP : null,
          d_temp_24h: Number.isFinite(dT) ? dT : null,
          d_humidity_24h: Number.isFinite(dH) ? dH : null,
        });

    const todayTop = defRow?.top_sixin?.length ? defRow.top_sixin : topSixin(todayScores);

    const todayRisk = computeRisk({
      computed,
      scores: todayScores,
      top_sixin: todayTop,
    });

    // 注意時間帯（次の24h）
    const slices = computeTimeWindowsNext24h({ computed, hourly, nowIdx });
    const windows = slices.map((s) => {
      const sScores = sixinScores({
        temp: s.temp,
        humidity: s.humidity,
        d_pressure_24h: s.dP_3h,
        d_temp_24h: s.dT_3h,
        d_humidity_24h: s.dH_3h,
      });
      const sTop = topSixin(sScores);
      const out = computeRisk({ computed, scores: sScores, top_sixin: sTop });
      return {
        time: s.time,
        level3: out.level3,
        risk: out.risk,
        top_sixin: sTop,
        chips: out.chips.slice(0, 3),
      };
    });

    const winSummary = summarizeWindows(windows);

    // 明日（ざっくり）
    const tomorrow = await fetchTomorrowForecast({ lat: loc.lat, lon: loc.lon });
    const tomorrowRisk = tomorrow
      ? computeRisk({ computed, scores: tomorrow.scores, top_sixin: tomorrow.top_sixin })
      : null;

    const model = process.env.OPENAI_RADAR_EXPLAIN_MODEL || process.env.OPENAI_DIAG_EXPLAIN_MODEL || "gpt-5.2";

    // --- prompt（無料版：基本対策。具体性は“栄養素/水分/衣服/睡眠/入浴/環境調整”までOK） ---
    const prompt = `
あなたは「未病レーダー」の案内役AI。日本語で、読み物として自然な文章を作る。
怖がらせないが、曖昧に逃げず、根拠→具体策の順で“役に立つ”内容にする。

【出力形式（必須）】
見出しはこの3つだけ。装飾記号（#, **, 「」など）禁止。

今日の予報（3段階）
注意が必要な時間帯
基本対策（無料版）

【制約（重要）】
- 医療行為の指示はしない。診断・治療・薬の指示禁止。
- 危険サインは短く触れるのはOK（例：強い症状が続くなら受診検討）だが、煽らない。
- 具体性はOK：衣食住の留意点、栄養素・水分・睡眠・入浴・温冷、作業負荷の調整、カフェイン/アルコールの扱い等。
- ただし「レシピ手順」「特定食材の大量列挙」「ツボ名」「ストレッチ手順の回数分量」は“無料版”では書かない（有料要素のため）。
- 体質（core_code / sub_labels / env）と、今日＋明日の外因（六淫）と、注意時間帯の山を“つなげて”説明する（箇条書き羅列だけにしない）。

【あなたが使う入力（体質）】
- core_code: ${computed.core_code}
- sub_labels: ${(computed.sub_labels || []).join(",") || "なし"}
- axes:
  - yin_yang_label_internal: ${computed?.axes?.yin_yang_label_internal}
  - def_ex_label_internal: ${computed?.axes?.def_ex_label_internal}
  - recovery_score: ${computed?.axes?.recovery_score}
- env:
  - sensitivity: ${computed?.env?.sensitivity ?? 0}
  - vectors: ${(computed?.env?.vectors || []).join(",") || "なし"}

【今日の外因（六淫）】
- top: ${(todayTop || []).map(mapSixinJa).join("・") || "不明"}
- scores: wind=${todayScores.score_wind}, cold=${todayScores.score_cold}, heat=${todayScores.score_heat}, damp=${todayScores.score_damp}, dry=${todayScores.score_dry}
- risk: ${todayRisk.risk}, level: ${levelJa3(todayRisk.level3)}
- 現在: 気温 ${Number.isFinite(tempNow) ? tempNow.toFixed(1) : "?"}℃ / 湿度 ${Number.isFinite(humNow) ? humNow.toFixed(0) : "?"}% / 気圧 ${Number.isFinite(presNow) ? presNow.toFixed(1) : "?"}hPa
- 24h差: 気圧 ${typeof dP === "number" ? dP.toFixed(1) : "?"}hPa / 気温 ${typeof dT === "number" ? dT.toFixed(1) : "?"}℃ / 湿度 ${typeof dH === "number" ? dH.toFixed(0) : "?"}%

【注意時間帯（次の24hの山）】
${winSummary.text}

【明日（ざっくり）】
${tomorrow ? `- top: ${(tomorrow.top_sixin || []).map(mapSixinJa).join("・")}\n- level: ${levelJa3(tomorrowRisk?.level3)}\n- 現在想定: 気温 ${tomorrow.temp ?? "?"}℃ / 湿度 ${tomorrow.humidity ?? "?"}% / 気圧 ${tomorrow.pressure ?? "?"}hPa` : "- 取得できず"}

`.trim();

    const text = await generateText({
      model,
      input: prompt,
      max_output_tokens: 900,
      reasoning: { effort: "low" },
    });

    return NextResponse.json({
      data: {
        date,
        model,
        text: (text || "").trim(),
        meta: {
          today: {
            level3: todayRisk.level3,
            risk: todayRisk.risk,
            top_sixin: todayTop,
            chips: todayRisk.chips,
          },
          tomorrow: tomorrow
            ? {
                level3: tomorrowRisk?.level3 ?? null,
                risk: tomorrowRisk?.risk ?? null,
                top_sixin: tomorrow.top_sixin,
              }
            : null,
          windows: windows.filter((w) => (w.level3 ?? 0) >= 1).slice(0, 24),
        },
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
