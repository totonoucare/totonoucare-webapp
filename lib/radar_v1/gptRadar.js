// lib/radar_v1/gptRadar.js
import { buildRadarPromptContext } from "@/lib/radar_v1/radarPromptContext";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = process.env.OPENAI_RADAR_MODEL || "gpt-5-mini";

function getApiKey() {
  return process.env.OPENAI_API_KEY || "";
}

function hasApiKey() {
  return !!getApiKey();
}

async function callOpenAIJson({
  systemPrompt,
  userPayload,
  temperature = 0.7,
  maxTokens = 500,
}) {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `${systemPrompt}\n\n必ずJSONのみを返してください。`,
        },
        {
          role: "user",
          content: `以下のJSONを読んで処理してください。\n\nJSON:\n${JSON.stringify(
            userPayload
          )}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;

  if (!content || typeof content !== "string") {
    throw new Error("OpenAI API returned empty content");
  }

  let parsed = null;
  try {
    parsed = JSON.parse(content);
  } catch {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start >= 0 && end > start) {
      parsed = JSON.parse(content.slice(start, end + 1));
    } else {
      throw new Error("OpenAI JSON parse failed");
    }
  }

  return {
    data: parsed,
    model: json?.model || DEFAULT_MODEL,
  };
}

export async function generateRadarSummary({ riskContext, radarPlan }) {
  if (!hasApiKey()) return null;

  const promptContext = buildRadarPromptContext({ riskContext, radarPlan });

  const systemPrompt = `
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
- 主訴（頭痛など）があるなら、そこへのつながりを自然に含める
- 診断や治療の断定はしない
- おどしすぎないが、ちゃんと個別感を出す

出力JSON:
{
  "summary": "..."
}
`.trim();

  const result = await callOpenAIJson({
    systemPrompt,
    userPayload: promptContext,
    temperature: 0.55,
    maxTokens: 220,
  });

  const summary = String(result?.data?.summary || "").trim();
  if (!summary) return null;

  return {
    text: summary,
    model: result.model,
    generated_at: new Date().toISOString(),
  };
}

export async function generateTomorrowFood({ riskContext, radarPlan }) {
  if (!hasApiKey()) return null;

  const promptContext = buildRadarPromptContext({ riskContext, radarPlan });

  const systemPrompt = `
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
- how_to: 取り入れ方（朝/昼/間食などの現実的な方法）
- avoid: 控えたいこと
- reason: なぜ合うのかの短い理由
- examples: 食材やメニュー例を2〜3個
- lifestyle_tip: 食以外に軽く意識したいこと1つ
- timing: 朝 / 昼 / 間食 / 夜 のどれか

出力JSON:
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
`.trim();

  const result = await callOpenAIJson({
    systemPrompt,
    userPayload: promptContext,
    temperature: 0.8,
    maxTokens: 360,
  });

  const raw = result?.data || {};

  return {
    food: {
      title: String(raw.title || "").trim() || "明日の食養生",
      timing: normalizeTiming(raw.timing),
      recommendation:
        String(raw.recommendation || "").trim() ||
        radarPlan?.tomorrow_food?.recommendation ||
        radarPlan?.tomorrow_food?.focus ||
        "体に負担をためにくいものを意識する",
      how_to:
        String(raw.how_to || "").trim() ||
        radarPlan?.tomorrow_food?.how_to ||
        "食事に一品足す形で無理なく取り入れる",
      avoid:
        String(raw.avoid || "").trim() ||
        radarPlan?.tomorrow_food?.avoid ||
        "食べすぎ・飲みすぎを重ねない",
      reason:
        String(raw.reason || "").trim() ||
        radarPlan?.tomorrow_food?.reason ||
        "",
      examples: Array.isArray(raw.examples)
        ? raw.examples.map((x) => String(x).trim()).filter(Boolean).slice(0, 3)
        : [],
      lifestyle_tip:
        String(raw.lifestyle_tip || "").trim() ||
        radarPlan?.tomorrow_food?.lifestyle_tip ||
        "",
      generated_by: "gpt",
      model: result.model,
      generated_at: new Date().toISOString(),
    },
  };
}

function normalizeTiming(v) {
  const s = String(v || "").trim();
  if (["朝", "昼", "間食", "夜"].includes(s)) return s;
  return "昼";
}
