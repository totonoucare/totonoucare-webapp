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

export async function generateRadarSummary({
  riskContext,
  radarPlan,
  targetDate = null,
  targetMode = null,
}) {
  const promptContext = buildRadarPromptContext({
    riskContext,
    radarPlan,
    targetDate,
    targetMode,
  });

  const prompt = `
あなたは未病レーダーの予報説明ライターです。
役割は、ユーザーに「なぜ自分が注意なのか」を短く納得できる形で伝えることです。

最重要ルール:
1. 「天気として強い変化」と「本人に一番響きやすい要素」を分けて考えること
2. weather_main が damp でも、sub_labels に fluid_damp が無ければ『湿体質』『水分代謝が弱い体質』とは断定しないこと
3. 本人の体質ラベルと主訴に合う“響き方”を書くこと
4. 体質コードや内部キーは出さないこと
5. 診断・治療の断定はしないこと
6. 相対表現の『今日は』『明日は』『今夜は』を原則使わないこと
7. 対象日は target_date_label を使って明示すること
8. ケア提案は『前夜』『当日朝』『日中』のように、target_date 基準で書くこと

書き方:
- 日本語
- 2文まで
- 1文目:
  target_date_label を主語にして、天気の主変化 → その人に響きやすい要素 → 主訴へのつながり
- 2文目:
  target_date に対する前夜/当日朝/日中で意識するとよい方向性を1つ
- 『冷え込みやすい日です』だけで終わらせない
- 一般ユーザー向けの自然な言い回しにする

悪い例:
- 「今日は湿っぽくて…今夜は…」
- 「明日は…今日は…」
- 「今夜は…」だけで、どの夜か分からない

良い例:
- 「4/4(金)は湿っぽい重さが強く…」
- 「前夜は首元とお腹を冷やしすぎず…」
- 「当日朝は冷たいものを重ねすぎず…」

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
  const summary = String(data?.summary || "").trim();
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
  targetMode = null,
}) {
  const promptContext = buildRadarPromptContext({
    riskContext,
    radarPlan,
    targetDate,
    targetMode,
  });

  const prompt = `
あなたは未病レーダーの食養生提案ライターです。
役割は、対象日に実行しやすい食養生を、一般ユーザー向けに具体化することです。

最重要ルール:
1. 天気として強い変化と、本人に響きやすい要素は分けて考えること
2. weather_main が damp でも fluid_damp が無ければ、体内の水滞を断定しすぎないこと
3. 体質と主訴に合う形で、無理なく実行できる内容にすること
4. 医療的断定や治療表現はしないこと
5. 相対表現の『今日は』『明日は』『今夜は』を原則使わないこと
6. 対象日は target_date_label を前提に考え、必要なら『前夜』『当日朝』『日中』で書くこと

考え方:
- 単なる抽象論ではなく、食材や料理のイメージが湧くこと
- 「何を」「どう取り入れるか」「何を控えるか」が分かること
- 体質と主訴を踏まえた個別感を出すこと
- 例は2〜3個まで
- 日中に実行しやすい内容を優先

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
