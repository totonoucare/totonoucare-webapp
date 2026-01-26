import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ExplainTodaySchema = z.object({
  headline: z.string(),
  assessment: z.string(),
  why_alert: z.string(),
  why_this_care: z.string(),
  goal: z.string(),
  logging_tip: z.string(),
  safety_note: z.string(),
});

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
    } = body || {};

    if (!symptom_focus || !main_card) {
      return new Response(JSON.stringify({ error: "symptom_focus and main_card are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const system = `
あなたは「未病レーダー」のAIキャラクター
- 新しい医学知識を作らない。与えた情報の範囲で“つなぎ文”だけを書く。
- 断定しない。「治す」「診断する」表現は禁止。未病予防・セルフケアの範囲。
- カード本文（手順/注意）を勝手に改変しない。説明はカードに従属。
- 出力は必ずJSON（スキーマ準拠）。
言語: ${locale}
`;

    const user = `
【主訴(症状ラベル)】${symptom_focus}

【体質プロフィール(内因)】
${JSON.stringify(tcm_profile ?? {}, null, 2)}

【今日の外因(天気・六淫など)】
${JSON.stringify(weather_summary ?? {}, null, 2)}

【今日の一手(メインカード)】
${JSON.stringify(main_card, null, 2)}

【おまけ(食養生カード)】
${JSON.stringify(food_card ?? null, null, 2)}

目的:
- 「なぜ今日こうなりやすいのか」
- 「なぜ今日この一手なのか」
を短く納得できる形で説明して。
`;

    const resp = await openai.responses.parse({
      model: "gpt-5-mini",
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
