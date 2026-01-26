import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * 短文固定：アプリの「つなぎ文」専用
 * - 長文化を防ぐため、文字数ルールをsystemで強制
 */
const ExplainTodaySchema = z.object({
  mascot_name: z.string(),     // 例: "トトノウくん"
  headline: z.string(),        // 40字以内
  bridge: z.string(),          // 180字以内（2〜3文）
  why_this_care: z.string(),   // 120字以内（1〜2文）
  today_goal: z.string(),      // 60字以内（1文）
  log_prompt: z.string(),      // 40字以内（1行）
  safety_note: z.string(),     // 60字以内（1文）
});

function safeString(x, fallback = "") {
  if (typeof x === "string") return x;
  return fallback;
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
      symptom_focus,     // "fatigue" | "sleep" | ...
      tcm_profile,       // { type/flow/organ など }（今は仮でもOK）
      weather_summary,   // { level/top_sixin/d_pressure_24h/temp/humidity... }
      main_card,         // care_cards: { title, body_steps, cautions, tags_* }
      food_card,         // optional
      locale = "ja-JP",
      mascot_name = "トトノウくん",
      tone = "friendly_expert", // 将来切替用
    } = body || {};

    if (!symptom_focus || !main_card) {
      return new Response(JSON.stringify({ error: "symptom_focus and main_card are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 使っていい情報を最小限に絞る（AI暴走防止）
    const allowed = {
      symptom_focus,
      tcm_profile: tcm_profile ?? {},
      weather_summary: weather_summary ?? {},
      main_card: {
        kind: main_card?.kind ?? null,
        title: main_card?.title ?? null,
        body_steps: main_card?.body_steps ?? [],
        cautions: main_card?.cautions ?? [],
        tags_symptom: main_card?.tags_symptom ?? [],
        tags_flow: main_card?.tags_flow ?? [],
        tags_organ: main_card?.tags_organ ?? [],
        tags_sixin: main_card?.tags_sixin ?? [],
      },
      food_card: food_card
        ? {
            title: food_card?.title ?? null,
            body_steps: food_card?.body_steps ?? [],
            tags_sixin: food_card?.tags_sixin ?? [],
            tags_symptom: food_card?.tags_symptom ?? [],
          }
        : null,
    };

    // system（キャラ口調＋禁則＋短文ルール）
    const system = `
あなたは「未病レーダー」公式キャラクターの案内役：${mascot_name}。
キャラ: 愛嬌がある、でも中身はプロっぽく端的。語尾は柔らかく、押しつけない。
役割: 「症状(主訴)×体質×今日の外因×今日の一手」をつなぐ短い説明文だけを書く。

【重要ルール】
- 新しい医学知識や治療効果を作らない。与えた情報だけで“つなぎ”を書く。
- 「診断」「治療」「治す」「効果がある」「改善する」「薬効」等の断定表現は禁止。
- 受診/専門家推奨は原則書かない（危険サインが入力にないため）。安全注意はカード注意の範囲で。
- カード手順や注意の内容を改変しない。説明はカードに従属。
- 文章は短く、読みやすく。

【文字数制限（必ず守る）】
headline: 40字以内
bridge: 180字以内（2〜3文）
why_this_care: 120字以内（1〜2文）
today_goal: 60字以内（1文）
log_prompt: 40字以内（1行）
safety_note: 60字以内（1文）

言語: ${locale}
トーン: ${tone}
出力: JSON（スキーマ準拠）
`;

    // user（入力は allowed のみ）
    const user = `
以下の情報だけを根拠に、ユーザーが「なるほど、だから今日これね」と思える“つなぎ文”を書いて。

入力（根拠）:
${JSON.stringify(allowed, null, 2)}

補足:
- food_cardがあれば「おまけ」としてbridgeかwhy_this_careに一言だけ触れてOK（長くしない）
- ログはアプリ実装に合わせて簡単に：
  「一手（◎/△/×）＋体調（良/普/不調）」程度に収める
`;

    const resp = await openai.responses.parse({
      model: "gpt-5.2-mini",
      reasoning: { effort: "low" },
      input: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      text: {
        format: zodTextFormat(ExplainTodaySchema, "explain_today_v2"),
      },
    });

    const out = resp.output_parsed || {};

    // 最低限のフォールバック（UIが崩れないように）
    const result = {
      mascot_name: safeString(out.mascot_name, mascot_name),
      headline: safeString(out.headline, "きょうの見立て"),
      bridge: safeString(out.bridge, ""),
      why_this_care: safeString(out.why_this_care, ""),
      today_goal: safeString(out.today_goal, "1分だけ整えて、崩れ幅を小さく。"),
      log_prompt: safeString(out.log_prompt, "記録：一手(◎/△/×)＋体調(良/普/不調)"),
      safety_note: safeString(
        out.safety_note,
        // できればカードcautionsの先頭を短く使う
        (Array.isArray(allowed.main_card.cautions) && allowed.main_card.cautions[0]) ? String(allowed.main_card.cautions[0]).slice(0, 55) : "無理のない範囲で。"
      ),
    };

    return new Response(JSON.stringify(result), {
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
