// lib/radar_v1/gptRadar.js
import { generateText } from "@/lib/openai/server";
import { buildRadarPromptContext } from "@/lib/radar_v1/radarPromptContext";

const DEFAULT_MODEL = process.env.OPENAI_RADAR_MODEL || "gpt-5.2";

function extractJson(text) {
  const raw = String(text || "").trim();
  if (!raw) throw new Error("OpenAI returned empty text");

  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }
    throw new Error(`OpenAI JSON parse failed: ${raw.slice(0, 300)}`);
  }
}

export async function generateRadarSummary({ riskContext, radarPlan }) {
  const promptContext = buildRadarPromptContext({ riskContext, radarPlan });

  const prompt = `
あなたは未病レーダーの予報説明ライターです。
役割は、「天気の説明」ではなく「このユーザーにとって、なぜ明日が注意日なのか」を2文で伝えることです。

重要:
- 一般ユーザー向けの日本語
- 2文まで
- 1文目で、体質と気象がどう重なって崩れやすさにつながるかを説明する
- 2文目で、今夜または明日意識するとよい方向性を1つ示す
- 体質コードをそのまま出さない
- 専門用語はできるだけユーザー語に変える
- 「冷え込みやすい日です」だけで終わらせない
- 主訴があるなら、そのつながりを自然に含める
- 診断や治療の断定はしない
- おどしすぎないが、ちゃんと個別感を出す

出力は必ずJSONのみ:
{
  "summary": "..."
}

入力JSON:
${JSON.stringify(promptContext, null, 2)}
`.trim();

  const text = await generateText({
    model: DEFAULT_MODEL,
    input: prompt,
    max_output_tokens: 400,
    reasoning: { effort: "low" },
  });

  const data = extractJson(text);
  const summary = String(data?.summary || "").trim();
  if (!summary) return null;

  return {
    text: summary,
    model: DEFAULT_MODEL,
    generated_at: new Date().toISOString(),
  };
}

export async function generateTomorrowFood({ riskContext, radarPlan }) {
  const promptContext = buildRadarPromptContext({ riskContext, radarPlan });

  const prompt = `
あなたは未病レーダーの食養生提案ライターです。
役割は、明日に実行しやすい食養生を、一般ユーザー向けに具体化することです。

考え方:
- 明日に実行しやすい内容を優先する
- 単なる抽象論ではなく、食材や料理のイメージが湧くこと
- 「何を」「どう取り入れるか」「何を控えるか」が分かること
- 体質と主訴を踏まえた個別感を出す
- 医療的な断定や治療表現はしない

UIで使うので、次の粒度で返す:
- title: 一言タイトル
- recommendation: 何を取り入れたいか
- how_to: 取り入れ方
- avoid: 控えたいこと
- reason: なぜ合うのか
- examples: 食材やメニュー例を2〜3個
- lifestyle_tip: 食以外に軽く意識したいこと1つ
- timing: 朝 / 昼 / 間食 / 夜 のどれか

出力は必ずJSONのみ:
{
  "title": "...",
  "timing": "朝|昼|間食|夜",
  "recommendation": "...",
  "how_to": "...",
  "avoid": "...",
  "reason": "...",
  "examples": ["...", "..."],
  "lifestyle_tip": "..."
}

入力JSON:
${JSON.stringify(promptContext, null, 2)}
`.trim();

  const text = await generateText({
    model: DEFAULT_MODEL,
    input: prompt,
    max_output_tokens: 700,
    reasoning: { effort: "low" },
  });

  const data = extractJson(text);

  return {
    food: {
      title: String(data?.title || "").trim() || "明日の食養生",
      timing: normalizeTiming(data?.timing),
      recommendation: String(data?.recommendation || "").trim(),
      how_to: String(data?.how_to || "").trim(),
      avoid: String(data?.avoid || "").trim(),
      reason: String(data?.reason || "").trim(),
      examples: Array.isArray(data?.examples)
        ? data.examples.map((x) => String(x).trim()).filter(Boolean).slice(0, 3)
        : [],
      lifestyle_tip: String(data?.lifestyle_tip || "").trim(),
      generated_by: "gpt",
      model: DEFAULT_MODEL,
      generated_at: new Date().toISOString(),
    },
  };
}

function normalizeTiming(v) {
  const s = String(v || "").trim();
  if (["朝", "昼", "間食", "夜"].includes(s)) return s;
  return "昼";
}
