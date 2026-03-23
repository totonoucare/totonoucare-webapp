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

function splitJapaneseSentences(text) {
  const src = String(text || "").trim();
  if (!src) return [];
  const matches = src.match(/[^。！？!?]+[。！？!?]?/g) || [];
  return matches.map((s) => s.trim()).filter(Boolean);
}

function stripLeadingTimePhrase(text) {
  return String(text || "")
    .trim()
    .replace(
      /^(今日は|明日は|今夜は|この日は|当日は|当日朝は|朝は|日中は|前夜は|3\/\d+\([日月火水木金土]\)は|4\/\d+\([日月火水木金土]\)は|5\/\d+\([日月火水木金土]\)は|6\/\d+\([日月火水木金土]\)は|7\/\d+\([日月火水木金土]\)は|8\/\d+\([日月火水木金土]\)は|9\/\d+\([日月火水木金土]\)は|10\/\d+\([日月火水木金土]\)は|11\/\d+\([日月火水木金土]\)は|12\/\d+\([日月火水木金土]\)は)\s*/u,
      ""
    );
}

function ensureSentenceEnd(text) {
  const s = String(text || "").trim();
  if (!s) return s;
  if (/[。！？!?]$/.test(s)) return s;
  return `${s}。`;
}

function normalizeSummaryText(summary, { targetDateLabel, relativeTargetMode }) {
  const sentences = splitJapaneseSentences(summary);
  if (!sentences.length) return summary;

  const firstBody = stripLeadingTimePhrase(sentences[0]).replace(/^は/u, "").trim();
  const normalized = [];

  if (targetDateLabel) {
    normalized.push(
      ensureSentenceEnd(`${targetDateLabel}は${firstBody}`)
    );
  } else {
    normalized.push(ensureSentenceEnd(sentences[0]));
  }

  if (sentences[1]) {
    const secondBody = stripLeadingTimePhrase(sentences[1]).replace(/^は/u, "").trim();

    if (relativeTargetMode === "tomorrow") {
      normalized.push(ensureSentenceEnd(`前夜は${secondBody}`));
    } else if (relativeTargetMode === "today") {
      normalized.push(ensureSentenceEnd(`この日は${secondBody}`));
    } else {
      normalized.push(ensureSentenceEnd(`この日は${secondBody}`));
    }
  }

  return normalized.join("");
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
役割は、ユーザーに「なぜ自分が注意なのか」を短く納得できる形で伝えることです。

最重要ルール:
1. 「天気として強い変化」と「本人に一番響きやすい要素」を分けて考えること
2. weather_main が damp でも、sub_labels に fluid_damp が無ければ『湿体質』『水分代謝が弱い体質』とは断定しないこと
3. 本人の体質ラベルと主訴に合う“響き方”を書くこと
4. 体質コードや内部キーは出さないこと
5. 診断・治療の断定はしないこと
6. 相対表現の『今日は』『明日は』『今夜は』を原則使わないこと
7. 1文目は必ず target_date_label を主語にすること
8. 2文目は relative_target_mode が tomorrow なら前夜の準備、today ならその日を通しての注意を書くこと
9. today のときは『当日朝』だけに限定しないこと

書き方:
- 日本語
- 必ず2文
- 1文目は「target_date_label は」で始める
- 2文目は tomorrow なら前夜の準備、today ならその日全体の過ごし方
- 一般ユーザー向けの自然な言い回しにする
- 「冷え込みやすい日です」だけで終わらせない

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
  const rawSummary = String(data?.summary || "").trim();
  if (!rawSummary) return null;

  const summary = normalizeSummaryText(rawSummary, {
    targetDateLabel: promptContext?.time_context?.target_date_label || null,
    relativeTargetMode,
  });

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

最重要ルール:
1. 天気として強い変化と、本人に響きやすい要素は分けて考えること
2. weather_main が damp でも fluid_damp が無ければ、体内の水滞を断定しすぎないこと
3. 体質と主訴に合う形で、無理なく実行できる内容にすること
4. 医療的断定や治療表現はしないこと
5. today ならその日中に実行しやすいもの、tomorrow なら前夜から意識しやすい準備も踏まえること

考え方:
- 単なる抽象論ではなく、食材や料理のイメージが湧くこと
- 「何を」「どう取り入れるか」「何を控えるか」が分かること
- 体質と主訴を踏まえた個別感を出すこと
- 例は2〜3個まで
- 実行しやすい内容を優先

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
