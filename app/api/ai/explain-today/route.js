import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 出力を“帳尻合わせ文章”に固定する（UIにそのまま貼れる）
const ExplainTodaySchema = z.object({
  headline: z.string(),        // 1行見出し
  assessment: z.string(),      // 今日の見立て（2〜4行）
  why_alert: z.string(),       // なぜ注意/警戒なのか（1〜3行）
  why_this_care: z.string(),   // なぜこの一手なのか（1〜3行）
  goal: z.string(),            // 今日のゴール（1行）
  logging_tip: z.string(),     // 記録の意味（1行）
  safety_note: z.string(),     // 安全注意（1行）
});

export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY is not set" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();

    // 期待する入力（/radarの結果をそのまま渡す想定）
    const {
      symptom_focus,     // "fatigue" | "sleep" | ...
      tcm_profile,       // { type, flow, organ } など（今は仮でもOK）
      weather_summary,   // { top_sixin, level, delta, note } など（今は仮でもOK）
      main_card,         // care_cards から選ばれたカード
      food_card,         // care_cards から選ばれたカード（おまけ）
      locale = "ja-JP",
    } = body || {};

    // 入力不足でも落ちないように最低限ガード
    if (!symptom_focus || !main_card) {
      return new Response(
        JSON.stringify({ error: "symptom_focus and main_card are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const system = `
あなたは「未病レーダー」の編集者。
ルール:
- 新しい医学知識を作らない。渡された情報の範囲で“つなぎ文”だけを書く。
- 断定しない。「治す」「診断する」表現は禁止。未病予防・セルフケアの範囲。
- カード本文（手順/注意）を勝手に改変しない。説明はカードに従属。
- 出力は必ずJSON（スキーマ準拠）。
言語: ${locale}
`;

    const user = `
【ユーザーの主訴(症状ラベル)】
${symptom_focus}

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
を、短く納得できる形で説明して。
`;

    const response = await openai.responses.parse({
      model: "gpt-5.2",
      // 速さ/コストを抑えたければ下を有効化
      reasoning: { effort: "low" },
      input: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      text: {
        format: zodTextFormat(ExplainTodaySchema, "explain_today"),
      },
    });

    return new Response(JSON.stringify(response.output_parsed), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e?.message || "unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
