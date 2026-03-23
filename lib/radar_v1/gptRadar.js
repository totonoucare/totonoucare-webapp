// lib/radar_v1/gptRadar.js
import { generateText } from "@/lib/openai/server";
import { buildRadarPromptContext } from "@/lib/radar_v1/radarPromptContext";

const DEFAULT_MODEL = process.env.OPENAI_RADAR_MODEL || "gpt-5.4";

function extractJson(text) {
  const raw = String(text || "").trim();
  if (!raw) {
    throw new Error("OpenAI returned empty text");
  }

  // そのままJSON
  try {
    return JSON.parse(raw);
  } catch {}

  // ```json ... ``` を剥がす
  const fenceStripped = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(fenceStripped);
  } catch {}

  // 最初の { 〜 最後の } を抜く
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const sliced = raw.slice(start, end + 1);
    try {
      return JSON.parse(sliced);
    } catch {}
  }

  throw new Error(`OpenAI JSON parse failed: ${raw.slice(0, 500)}`);
}

function normalizeWhitespace(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function normalizeSummaryText(summary) {
  return normalizeWhitespace(summary);
}

export async function generateRadarSummary({
  riskContext,
  radarPlan,
  targetDate = null,
  relativeTargetMode = null,
}) {
  const promptContext = buildRadarPromptContext({
    riskContext,
    radarPlan,
    targetDate,
    relativeTargetMode,
  });

  const prompt = `
あなたは未病レーダーの予報説明ライターです。

# このアプリの役割
未病レーダーは、天気そのものを説明するアプリではありません。
気象の変化と、その人の体質・主訴の重なりから、
「その人にとって対象日がなぜ注意日なのか」
「対象日をどう過ごすと負担をためにくいか」
を伝えるセルフケア支援アプリです。

# このカードの役割
このカードは「予報カード」です。
役割は、対象日の注意点と、その日の過ごし方を伝えることです。
単なる天気の説明ではなく、「その人にどう響きやすいか」を伝えてください。

# today / tomorrow の役割の違い
## relative_target_mode = "today"
- ユーザーは対象日をすでに迎えています
- 書くべき内容は「今日なぜ注意か」と「今日をどう過ごすか」です
- 2文目は、その日を通して意識したいこと・日中に気をつけたいことを書いてください

## relative_target_mode = "tomorrow"
- ユーザーは対象日を前もって見ています
- ただし、この予報カードで書くべき内容は「明日なぜ注意か」「明日をどう過ごすか」です
- tomorrow では、前夜の準備も価値があります
- そのため tomorrow のときは、必ず3文で書いてください
  1文目: 明日なぜ注意か
  2文目: 今夜のうちにしておくとよい準備
  3文目: 明日当日の過ごし方

# 内容ルール
1. 「天気として強い変化」と「本人に一番響きやすい要素」は分けて考える
2. 外的な気象変化そのものと、内的な体質傾向は混同しない
3. 気象要素が強くても、対応する体質ラベルが明示されていない内因までは断定しない
4. 本人の体質ラベルと主訴に合う“響き方”を書く
5. 体質コードや内部キーは出さない
6. 診断や治療の断定はしない
7. 一般ユーザー向けの自然な日本語で書く
8. 「冷え込みやすい日です」で終わらせず、その人にとって何が起きやすいかまで書く

# 文章仕様
- relative_target_mode = "today" のときは必ず2文
- relative_target_mode = "tomorrow" のときは必ず3文
- 1文目は必ず「target_date_labelは」で始める
- 1文目では、
  気象の主な変化 → その人に一番響きやすい要素 → 主訴へのつながり
  の順で書く
- today の2文目は「この日は」または「日中は」で始め、その日全体の過ごし方を書く
- tomorrow の2文目は「今夜は」で始め、前夜の準備を書く
- tomorrow の3文目は「この日は」または「日中は」で始め、対象日当日の過ごし方を書く
- target_date_label は1文目にだけ入れる
- 文は長すぎず、スマホで読みやすい長さにする

# 出力
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
    max_output_tokens: 600,
    reasoning: { effort: "medium" },
  });

  const data = extractJson(text);
  const summary = normalizeSummaryText(data?.summary || "");

  if (!summary) return null;

  return {
    text: summary,
    model: DEFAULT_MODEL,
    generated_at: new Date().toISOString(),
  };
}

export async function generateTomorrowFood({
  riskContext,
  radarPlan,
  targetDate = null,
  relativeTargetMode = null,
}) {
  const promptContext = buildRadarPromptContext({
    riskContext,
    radarPlan,
    targetDate,
    relativeTargetMode,
  });

  const prompt = `
あなたは未病レーダーの食養生提案ライターです。
役割は、対象日に実行しやすい食養生を、一般ユーザー向けに具体化することです。

# このアプリの役割
未病レーダーは、気象の変化と体質・主訴の重なりから、
その人に合うセルフケアを提案するアプリです。
食養生カードでは、対象日に無理なく実行しやすい工夫を伝えてください。

# today / tomorrow の役割の違い
## relative_target_mode = "today"
- ユーザーは対象日をすでに迎えています
- 今日これから実行しやすい内容を優先してください

## relative_target_mode = "tomorrow"
- ユーザーは対象日を前もって見ています
- ただし、このカードの役割は対象日当日の食養生を分かりやすくすることです
- 前夜の準備より、対象日当日に実行しやすい内容を優先してください

# 内容ルール
1. 天気として強い変化と、本人に響きやすい要素は分けて考える
2. 外的な気象変化そのものと、内的な体質傾向は混同しない
3. 気象要素が強くても、対応する体質ラベルが明示されていない内因までは断定しない
4. 体質と主訴に合う形で、無理なく実行できる内容にする
5. 医療的断定や治療表現はしない
6. 抽象論だけでなく、食材や料理のイメージが湧く内容にする
7. 例は2〜3個まで
8. 実行しやすさを優先する

# 出力粒度
- title: 一言タイトル
- recommendation: 何を取り入れたいか
- how_to: 取り入れ方
- avoid: 控えたいこと
- reason: なぜ合うのか
- examples: 食材やメニュー例を2〜3個
- lifestyle_tip: 食以外に軽く意識したいこと1つ
- timing: 朝 / 昼 / 間食 / 夜 のどれか

# 出力
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
    reasoning: { effort: "medium" },
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
