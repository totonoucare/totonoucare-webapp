// lib/radar_v1/gptRadar.js
import { generateText } from "@/lib/openai/server";
import { buildRadarPromptContext } from "@/lib/radar_v1/radarPromptContext";

const DEFAULT_MODEL = process.env.OPENAI_RADAR_MODEL || "gpt-5.2";

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

  // 最初の { から最後の } までを抜く
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

function dedupeTargetDateLabel(summary, targetDateLabel) {
  const s = String(summary || "").trim();
  const label = String(targetDateLabel || "").trim();
  if (!s || !label) return s;

  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^(${escaped})\\s*は\\s*(${escaped})\\s*は\\s*`, "u");
  if (re.test(s)) {
    return s.replace(re, `${label}は`);
  }

  return s;
}

function normalizeSummaryText(summary, { targetDateLabel }) {
  let s = normalizeWhitespace(summary);
  s = dedupeTargetDateLabel(s, targetDateLabel);
  return s;
}

async function generateJsonWithRetry({
  prompt,
  maxOutputTokens = 1200,
  retries = 1,
}) {
  let lastError = null;

  for (let i = 0; i <= retries; i++) {
    const retrySuffix =
      i === 0
        ? ""
        : `

重要:
- 前回の出力は壊れていました
- 今回は必ず完全なJSONのみを返してください
- コードブロックは禁止です
- 内容は少し短めで構いません
`;

    try {
      const text = await generateText({
        model: DEFAULT_MODEL,
        input: `${prompt}${retrySuffix}`,
        max_output_tokens: maxOutputTokens + i * 200,
        reasoning: { effort: "low" },
      });
      return extractJson(text);
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error("OpenAI JSON generation failed");
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

  const modeSection =
    relativeTargetMode === "tomorrow"
      ? `
# tomorrow の役割
- ユーザーは今日、対象日となる明日を前もって見ています
- このカードで書くべき内容は「明日なぜ注意か」「今日(特に今夜)のうちにしておくとよいこと」「明日をどう過ごすか」です
- 必ず3文構成で書いてください
  1文目: 明日なぜ注意か
  2文目: 今日(特に今夜)のうちにしておくとよい備えや意識
  3文目: 明日当日の過ごし方
`
      : `
# today の役割
- ユーザーは対象日をすでに迎えています
- このカードで書くべき内容は「今日なぜ注意か」「今日をどう過ごすか」です
- 必ず2文で書いてください
  1文目: 今日なぜ注意か
  2文目: 今日の過ごし方
`;

  const sentenceSpec =
    relativeTargetMode === "tomorrow"
      ? `
# 文章仕様
- 1文目は必ず「target_date_labelは」で始める
- 1文目では、
  気象の主な変化 → その人に一番響きやすい要素 → 主訴へのつながり
  の順で書く
- 2文目は必ず「今夜は」で始め、前夜の準備を書く
- 3文目は必ず「この日は」または「日中は」で始め、対象日当日の過ごし方を書く
- target_date_label は1文目にだけ入れる
- 文はスマホで読みやすい長さにする
`
      : `
# 文章仕様
- 1文目は必ず「target_date_labelは」で始める
- 1文目では、
  気象の主な変化 → その人に一番響きやすい要素 → 主訴へのつながり
  の順で書く
- 2文目は必ず「この日は」または「日中は」で始め、その日全体の過ごし方を書く
- target_date_label は1文目にだけ入れる
- 文はスマホで読みやすい長さにする
`;

  const prompt = `
あなたは未病レーダーの予報説明ライターです。

# このアプリの役割
未病レーダーは、天気そのものを説明するアプリではありません。
気象の変化と、その人の体質・主訴の重なりから、
「その人にとって対象日がなぜ注意日なのか」
「その人が今からどう整えると負担をためにくいか」
を伝えるセルフケア支援アプリです。

# このカードの役割
このカードは「予報カード」です。
役割は、対象日に向けた見立てと、その人が取れる対処を伝えることです。
単なる天気説明ではなく、「その人にどう響きやすいか」と「どう整えると負担をためにくいか」を書いてください。

${modeSection}

# 内容ルール
1. 「天気として強い変化」と「本人に一番響きやすい要素」は分けて考える
2. 外的な気象変化そのものと、内的な体質傾向は混同しない
3. 気象要素が強くても、対応する体質ラベルが明示されていない内因までは断定しない
4. 本人の体質ラベルと主訴に合う“響き方”を書く
5. 体質コードや内部キーは出さない
6. 診断や治療の断定はしない
7. 一般ユーザー向けの自然な日本語で書く
8. 「冷え込みやすい日です」で終わらせず、その人にとって何が起きやすいかまで書く

${sentenceSpec}

# 出力
出力は必ずJSONのみ:
{
  "summary": "..."
}

入力JSON:
${JSON.stringify(promptContext, null, 2)}
`.trim();

  const data = await generateJsonWithRetry({
    prompt,
    maxOutputTokens: 1200,
    retries: 1,
  });

  const summary = normalizeSummaryText(data?.summary || "", {
    targetDateLabel: promptContext?.time_context?.target_date_label || null,
  });

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

# このアプリの役割
未病レーダーは、気象の変化と体質・主訴の重なりから、
その人に合うセルフケアを提案するアプリです。
食養生カードでは、対象日に無理なく実行しやすい工夫を伝えてください。

# カードの役割
このカードでは、対象日に実行しやすい食養生を分かりやすく伝えます。
抽象論ではなく、食材や料理のイメージが湧く形で具体化してください。

# 内容ルール
1. 天気として強い変化と、本人に響きやすい要素は分けて考える
2. 外的な気象変化そのものと、内的な体質傾向は混同しない
3. 気象要素が強くても、対応する体質ラベルが明示されていない内因までは断定しない
4. 体質と主訴に合う形で、無理なく実行できる内容にする
5. 医療的断定や治療表現はしない
6. recommendation, how_to, avoid, reason, lifestyle_tip はそれぞれ短めに書く
7. examples は2〜3個までにする
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

  const data = await generateJsonWithRetry({
    prompt,
    maxOutputTokens: 1200,
    retries: 1,
  });

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
