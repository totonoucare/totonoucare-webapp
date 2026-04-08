// lib/radar_v1/gptRadar.js
import { generateText } from "@/lib/openai/server";
import { buildRadarPromptContext } from "@/lib/radar_v1/radarPromptContext";

const DEFAULT_MODEL = process.env.OPENAI_RADAR_MODEL || "gpt-5.4";

function extractJson(text) {
  const raw = String(text || "").trim();
  if (!raw) {
    throw new Error("OpenAI returned empty text");
  }

  try {
    return JSON.parse(raw);
  } catch {}

  const fenceStripped = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(fenceStripped);
  } catch {}

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

function normalizeBulletSummary(summary, { targetDateLabel, expectedLines }) {
  let s = normalizeWhitespace(summary);
  s = dedupeTargetDateLabel(s, targetDateLabel);

  if (!s) return "";

  // bullet / 改行ゆれを整える
  let parts = s
    .replace(/\r\n/g, "\n")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    parts = s
      .split(/(?=・)/g)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  if (parts.length <= 1) {
    parts = s
      .split(/(?<=[。！？])\s*/g)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  parts = parts
    .map((line) => line.replace(/^・+\s*/u, "").trim())
    .filter(Boolean)
    .map((line) => `・${line}`);

  if (expectedLines && parts.length > expectedLines) {
    parts = parts.slice(0, expectedLines);
  }

  return parts.join("\n");
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

  const isTomorrow = relativeTargetMode === "tomorrow";
  const expectedLines = isTomorrow ? 3 : 2;

  const modeSection = isTomorrow
    ? `
# このカードの役割（tomorrow）
- ユーザーは今日、明日の崩れやすさを前もって見ています
- 書くべき内容は「明日なぜ注意か」「今夜のうちにしておく備え」「明日の過ごし方」です
- 必ず3項目の箇条書きで書いてください
- 各項目は1文、合計3文にしてください
`
    : `
# このカードの役割（today）
- ユーザーは対象日をすでに迎えています
- 書くべき内容は「今日なぜ注意か」「今日の過ごし方」です
- 必ず2項目の箇条書きで書いてください
- 各項目は1文、合計2文にしてください
`;

  const sentenceSpec = isTomorrow
    ? `
# 文章仕様
- 1項目目は必ず「target_date_labelは」で始める
- 1項目目では、
  気象の主な変化 → 本人に一番響きやすい要素 → 主訴へのつながり
  の順で書く
- 2項目目は必ず「今夜は」で始める
- 3項目目は必ず「明日は」または「日中は」で始める
- target_date_label は1項目目にだけ入れる
- 各項目は必ず「・」で始める
- スマホで読みやすい長さにする
`
    : `
# 文章仕様
- 1項目目は必ず「target_date_labelは」で始める
- 1項目目では、
  気象の主な変化 → 本人に一番響きやすい要素 → 主訴へのつながり
  の順で書く
- 2項目目は必ず「この日は」または「日中は」で始める
- target_date_label は1項目目にだけ入れる
- 各項目は必ず「・」で始める
- スマホで読みやすい長さにする
`;

  const prompt = `
あなたは未病レーダーの予報説明ライターです。

# アプリの役割
未病レーダーは、天気そのものを説明するアプリではありません。
気象の変化と、その人の体質・主訴の重なりから、
「その人にとって対象日がなぜ注意日なのか」
「今からどう整えると負担をためにくいか」
を短く伝えるセルフケア支援アプリです。

${modeSection}

# 重要ルール
1. 「天気として強い変化」と「本人に一番響きやすい要素」は分けて考える
2. 外的な気象変化そのものと、内的な体質傾向は混同しない
3. 気象要素が強くても、対応する体質ラベルが明示されていない内因までは断定しない
4. 主訴がある場合は、その症状につながる響き方を自然につなぐ
5. 体質コードや内部キーは出さない
6. 動物名や比喩タイトル（core.title）は本文に使わない。必ず「体の反応」として言い換える
7. 診断や治療の断定はしない
8. 一般ユーザー向けの自然な日本語で書く
9. 「冷えやすい日です」で終わらせず、その人にとって何が起きやすいかまで書く

${sentenceSpec}

# 出力形式
- summary には箇条書き本文のみを入れる
- 各項目は改行で区切る
- tomorrow は必ず3行、today は必ず2行
- 前置き、見出し、番号、まとめは入れない

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

  const summary = normalizeBulletSummary(data?.summary || "", {
    targetDateLabel: promptContext?.time_context?.target_date_label || null,
    expectedLines,
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

# アプリの役割
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
5. core.title の動物名や比喩は出さない
6. 医療的断定や治療表現はしない
7. recommendation, how_to, avoid, reason, lifestyle_tip はそれぞれ短めに書く
8. examples は2〜3個までにする
9. 実行しやすさを優先する

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
