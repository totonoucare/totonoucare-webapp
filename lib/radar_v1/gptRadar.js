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

async function callOpenAIJson({ systemPrompt, userPayload, temperature = 0.7, maxTokens = 400 }) {
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
あなたは未病レーダーの短文編集者です。
役割は、明日の予報をユーザーが「自分ごと」として理解しやすい2〜3文にまとめることです。

条件:
- 日本語
- 2〜3文
- やさしいが甘すぎない
- 医学的断定や診断はしない
- 気象の引き金、崩れやすい時間帯、主訴へのつながりを自然につなぐ
- 東洋医学の専門用語はできるだけ直接出しすぎない
- 「未病レーダー」「予報」などアプリ文脈は理解したうえで、説明口調が固すぎないようにする

出力JSON:
{
  "summary": "..."
}
`.trim();

  const result = await callOpenAIJson({
    systemPrompt,
    userPayload: promptContext,
    temperature: 0.6,
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
役割は、明日に実行しやすい食養生を1つ提案することです。

重要:
- 前夜より「明日の日中に実行しやすいこと」を優先
- 食べるものだけでなく、避けたいことも1つ入れる
- 大げさな治療表現はしない
- 一般ユーザー向けに、具体的で、拘束感が強すぎない表現にする
- レシピ名を1つ固定しなくてもよいが、例は2〜3個まで
- 出力は短く、UIでそのまま使える粒度にする

timing は次のどれか:
- 朝
- 昼
- 間食
- 夜

出力JSON:
{
  "title": "...",
  "timing": "朝|昼|間食|夜",
  "focus": "...",
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
    maxTokens: 320,
  });

  const raw = result?.data || {};
  const timing = normalizeTiming(raw.timing);
  const food = {
    title: String(raw.title || "").trim() || "明日の食養生",
    timing,
    focus:
      String(raw.focus || "").trim() ||
      radarPlan?.tomorrow_food?.focus ||
      "整えやすい食事",
    avoid:
      String(raw.avoid || "").trim() ||
      radarPlan?.tomorrow_food?.avoid ||
      "食べすぎ・飲みすぎを重ねない",
    reason: String(raw.reason || "").trim(),
    examples: Array.isArray(raw.examples)
      ? raw.examples.map((x) => String(x).trim()).filter(Boolean).slice(0, 3)
      : [],
    lifestyle_tip: String(raw.lifestyle_tip || "").trim(),
    generated_by: "gpt",
    model: result.model,
    generated_at: new Date().toISOString(),
  };

  return { food };
}

function normalizeTiming(v) {
  const s = String(v || "").trim();
  if (["朝", "昼", "間食", "夜"].includes(s)) return s;
  return "昼";
}
