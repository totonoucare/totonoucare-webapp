// lib/radar_v1/gptRadar.js
import { generateText } from "@/lib/openai/server";
import { buildRadarPromptContext } from "@/lib/radar_v1/radarPromptContext";

// ここは env があればそれを最優先。
// 未設定時は、現時点で公式 docs 上の確認が取りやすい安価モデルを既定にする。
const DEFAULT_MODEL = process.env.OPENAI_RADAR_MODEL || "gpt-5.4";

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

function ensureSentenceEnd(text) {
  const s = String(text || "").trim();
  if (!s) return s;
  if (/[。！？!?]$/.test(s)) return s;
  return `${s}。`;
}

function stripTrailingPunctuation(text) {
  return String(text || "").trim().replace(/[。！？!?]+$/g, "");
}

function stripLeadingTemporalPhrase(text) {
  return String(text || "")
    .trim()
    .replace(
      /^(?:\d{1,2}\/\d{1,2}\([日月火水木金土]\)\s*は|今日は|明日は|今夜は|前夜は|この日は|当日朝は|日中は|朝は|夜は)\s*/u,
      ""
    );
}

function stripLeadingParticle(text) {
  return String(text || "").trim().replace(/^は\s*/u, "");
}

function normalizeCoreSentence(text) {
  const s = stripLeadingTemporalPhrase(text);
  return stripLeadingParticle(stripTrailingPunctuation(s));
}

function composeSummary({ sentence1, sentence2 }, { targetDateLabel, relativeTargetMode }) {
  const s1 = normalizeCoreSentence(sentence1);
  const s2 = normalizeCoreSentence(sentence2);

  const first = targetDateLabel
    ? ensureSentenceEnd(`${targetDateLabel}は${s1}`)
    : ensureSentenceEnd(s1);

  if (!s2) return first;

  const secondPrefix = relativeTargetMode === "tomorrow" ? "前夜は" : "この日は";
  const second = ensureSentenceEnd(`${secondPrefix}${s2}`);

  return `${first}${second}`;
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

重要:
- 返すのは完成した文章ではなく、2文の“中身”だけ
- 1文目の中身:
  天気の主変化 → 本人に一番響きやすい要素 → 主訴へのつながり
- 2文目の中身:
  行動提案の中身だけ
- 日付は書かない
- 「今日は」「明日は」「今夜は」「前夜は」「この日は」などの時間主語は書かない
- 1文目の中身に target_date_label を含めない
- 2文目の中身に target_date_label を含めない
- 体質コードや内部キーは出さない
- weather_main が damp でも、sub_labels に fluid_damp が無ければ『湿体質』『水分代謝が弱い体質』と断定しない
- 診断・治療の断定はしない
- 一般ユーザー向けで自然な日本語
- 1文目は原因説明、2文目は対策
- relative_target_mode=today の場合、2文目は「当日朝だけ」ではなく、その日を通して意識したい内容
- relative_target_mode=tomorrow の場合、2文目は前夜にできる準備や予防につながる内容

返却JSON:
{
  "sentence1": "1文目の中身だけ",
  "sentence2": "2文目の中身だけ"
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

  const sentence1 = String(data?.sentence1 || "").trim();
  const sentence2 = String(data?.sentence2 || "").trim();

  if (!sentence1) return null;

  const summary = composeSummary(
    { sentence1, sentence2 },
    {
      targetDateLabel: promptContext?.time_context?.target_date_label || null,
      relativeTargetMode,
    }
  );

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

重要:
- 天気として強い変化と、本人に響きやすい要素は分けて考える
- weather_main が damp でも fluid_damp が無ければ、体内の水滞を断定しすぎない
- 体質と主訴に合う形で、無理なく実行できる内容にする
- today ならその日中に実行しやすいもの
- tomorrow なら前夜から意識しやすい準備も踏まえる
- 医療的断定や治療表現はしない

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
