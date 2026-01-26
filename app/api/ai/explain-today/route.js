import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ExplainTodaySchema = z.object({
  headline: z.string(),        // 1行
  assessment: z.string(),      // 2〜4行
  why_alert: z.string(),       // 1〜2行
  why_this_care: z.string(),   // 1〜2行
  goal: z.string(),            // 1行
  logging_tip: z.string(),     // 1行
  safety_note: z.string(),     // 1行
});

function round0(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return Math.round(n);
}

function sixinJa(x) {
  const map = { wind: "風（変化）", cold: "冷え", heat: "暑さ", damp: "湿", dry: "乾燥" };
  return map[x] || x;
}

function symptomJa(x) {
  const map = {
    fatigue: "だるさ・疲労",
    sleep: "睡眠",
    neck_shoulder: "首肩の重さ",
    swelling: "むくみ",
    headache: "頭痛",
    low_back_pain: "腰の重さ",
  };
  return map[x] || x;
}

function buildSafeInput({ symptom_focus, tcm_profile, weather_summary, main_card, food_card }) {
  const top = Array.isArray(weather_summary?.top_sixin) ? weather_summary.top_sixin : [];
  const topJa = top.map(sixinJa);

  // 内因：ここは現状仮でもOK。将来 type/flow/organ を日本語に置換して渡す
  const flowType = tcm_profile?.flowType || null;
  const organType = tcm_profile?.organType || null;

  const safe = {
    symptom: symptomJa(symptom_focus),
    // 体質（現状は仮。将来あなたのtype/flow/organを日本語で入れる）
    constitution: {
      flow: flowType,
      organ: organType,
    },
    // 外因（ユーザー向けに整形）
    today_weather: {
      level: weather_summary?.level ?? null,
      tendency: topJa, // 例: ["冷え","湿"]
      temp_c: round0(weather_summary?.temp),
      humidity_pct: round0(weather_summary?.humidity),
      pressure_change_24h_hpa: round0(weather_summary?.d_pressure_24h),
    },
    // カード（ユーザーに見せて良い部分だけ）
    care_today: {
      main: {
        title: main_card?.title,
        kind: main_card?.kind,
        steps: main_card?.body_steps || [],
        cautions: main_card?.cautions || [],
      },
      food: food_card
        ? {
            title: food_card?.title,
            steps: food_card?.body_steps || [],
          }
        : null,
    },
  };

  return safe;
}

export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY is not set" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      symptom_focus,
      tcm_profile,
      weather_summary,
      main_card,
      food_card,
      locale = "ja-JP",
      // モデル切替したい時だけ指定（例: "gpt-5.2"）
      model = "gpt-5-mini",
    } = body || {};

    if (!symptom_focus || !main_card) {
      return new Response(JSON.stringify({ error: "symptom_focus and main_card are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const safeInput = buildSafeInput({
      symptom_focus,
      tcm_profile,
      weather_summary,
      main_card,
      food_card,
    });

    const system = `
あなたは「未病レーダー」の編集者。
目的は「症状×体質×今日の外因」から、今日の状態と今日の一手に“納得感”を出す短い橋渡し文を作ること。

厳守:
- 新しい医学知識を作らない。入力にある事実だけで書く。
- 断定しない（治療・診断ワード禁止）。セルフケアの範囲。
- 専門用語・英語タグ（cold/damp/spleen等）を使わない。必ず自然な日本語に言い換える。
- 冗長禁止。短く。

文章量:
- headline: 1行
- assessment: 2〜4行
- why_alert: 1〜2行
- why_this_care: 1〜2行
- goal/logging_tip/safety_note: 各1行

言語: ${locale}
`;

    const user = `
入力（ユーザー表示用に整形済み）:
${JSON.stringify(safeInput, null, 2)}

出力は、ユーザーが「なるほど、だから今日はこれなんだ」と思えるように。
`;

    const resp = await openai.responses.parse({
      model,
      reasoning: { effort: "low" },
      input: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      text: { format: zodTextFormat(ExplainTodaySchema, "explain_today") },
    });

    return new Response(JSON.stringify(resp.output_parsed), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || "unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
