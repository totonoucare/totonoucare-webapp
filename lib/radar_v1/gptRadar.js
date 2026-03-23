// lib/radar_v1/gptRadar.js
import { generateText } from "@/lib/openai/server";
import { buildRadarPromptContext } from "@/lib/radar_v1/radarPromptContext";

const DEFAULT_MODEL = process.env.OPENAI_RADAR_MODEL || "gpt-5.4";

function extractJson(text) {
  const raw = String(text || "").trim();
  if (!raw) throw new Error("OpenAI returned empty text");

  // まずそのまま
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

  // 文章の中の最初の { から最後の } までを取る
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

  // 例:
  // 3/23(月)は3/23(月) は...
  // 3/23(月)は 3/23(月)は...
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
役割は、ユーザーに「なぜ自分が注意なのか」と「いつ何を意識するとよいか」を、自然な日本語で短く伝えることです。

# 最重要
あなたが返すのは、UIにそのまま出る完成済みの最終文です。
コード側で文章を補完しません。
そのため、あなた自身が時制・主語・日付を含めて完成させてください。

# この機能の根本意図
未病レーダーには today タブ と tomorrow タブ があります。

## relative_target_mode = "today" の根本意図
- ユーザーは対象日をすでに迎えている
- 知りたいのは「この日をどう乗り切るか」
- 2文目は「当日朝だけ」に限定しない
- その日を通して意識したいこと、日中に気をつけたいこと、こまめにできることを書く
- 2文目の書き出しは「この日は」または「日中は」が自然
- 「前夜は」は使わない

## relative_target_mode = "tomorrow" の根本意図
- ユーザーは対象日の前夜または前もって見ている
- 知りたいのは「明日に備えて前夜から何をしておくとよいか」
- 2文目は“前夜にできる準備・予防”を書く
- 2文目の書き出しは「前夜は」が自然
- tomorrow なのに「この日は」「当日朝は」で2文目を始めない
- 明日当日の心構えではなく、前夜の準備を優先する

# 内容ルール
1. 「天気として強い変化」と「本人に一番響きやすい要素」は分けて考える
2. 外的な気象変化そのものと、内的な体質傾向は分けて書く
3. 気象要素が強くても、対応する体質ラベルが明示されていない内因までは断定しない
4. 本人の体質ラベルと主訴に合う“響き方”を書く
5. 体質コードや内部キーは出さない
6. 診断や治療の断定はしない
7. 一般ユーザー向けの自然な日本語で書く
8. 「冷え込みやすい日です」で終わらせず、その人にとって何が起きやすいかまで書く

# 文章仕様
- 必ず2文
- 1文目は必ず「target_date_labelは」で始める
- 1文目では、
  天気の主変化 → その人に響きやすい要素 → 主訴へのつながり
  の順で書く
- target_date_label は1回だけ書く
- 2文目は today / tomorrow の根本意図に従う
- relative_target_mode=today なら、2文目は「この日は」または「日中は」で始め、その日全体の過ごし方を書く
- relative_target_mode=tomorrow なら、2文目は「前夜は」で始め、前夜の準備を書く

# 禁止
- 1文目で target_date_label を2回書く
- today なのに 2文目を「前夜は」で始める
- tomorrow なのに 2文目を「この日は」「当日朝は」で始める
- 湿があるだけで湿体質と決めつける
- 内部コードをそのまま出す

# 出力前の自己確認
- 文は2文か
- 1文目は target_date_labelは で始まっているか
- target_date_label の出現は1回だけか
- relative_target_mode=tomorrow なら、2文目は「前夜は」で始まっているか
- relative_target_mode=today なら、2文目は「この日は」または「日中は」で始まっているか

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
    max_output_tokens: 500,
    reasoning: { effort: "low" },
  });

  const data = extractJson(text);
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
役割は、対象日に実行しやすい食養生を、一般ユーザー向けに具体化することです。

# 根本意図
## relative_target_mode = "today"
- ユーザーは対象日をすでに迎えている
- 今日これから実行しやすい内容を優先する

## relative_target_mode = "tomorrow"
- ユーザーは対象日の前夜または前もって見ている
- 明日の食養生が中心だが、前夜に避けること・前夜から整えることも自然に踏まえてよい

# 内容ルール
1. 天気として強い変化と、本人に響きやすい要素は分けて考える
2. 外的な気象変化そのものと、内的な体質傾向は分けて考える
3. 気象要素が強くても、対応する体質ラベルが明示されていない内因までは断定しない
4. 体質と主訴に合う形で、無理なく実行できる内容にする
5. 医療的断定や治療表現はしない
6. 抽象論だけでなく、食材や料理のイメージが湧く内容にする
7. 例は2〜3個まで
8. 実行しやすさを優先する

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
