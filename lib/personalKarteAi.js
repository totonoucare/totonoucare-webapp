import crypto from "crypto";
import { getOpenAIClient } from "@/lib/openai/server";
import { buildPersonalKarteContext } from "@/lib/personalKarte";

const PROMPT_VERSION = "personal-karte-v3.0-ai-first";
const DEFAULT_MODEL = process.env.OPENAI_PERSONAL_KARTE_MODEL || "gpt-5.5";

const SECTION_IDS = [
  "overview",
  "route",
  "weather",
  "body-line",
  "season",
  "avoid",
  "minimum-care",
  "consult",
];

const KARTE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["productName", "subtitle", "heroLead", "sections"],
  properties: {
    productName: { type: "string" },
    subtitle: { type: "string" },
    heroLead: { type: "string" },
    sections: {
      type: "array",
      minItems: 8,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "badge", "title", "teaser", "preview", "body", "bullets", "steps"],
        properties: {
          id: { type: "string", enum: SECTION_IDS },
          badge: { type: "string" },
          title: { type: "string" },
          teaser: { type: "string" },
          preview: { type: "string" },
          body: {
            type: "array",
            minItems: 2,
            maxItems: 3,
            items: { type: "string" },
          },
          bullets: {
            type: "array",
            minItems: 0,
            maxItems: 4,
            items: { type: "string" },
          },
          steps: {
            type: "array",
            minItems: 0,
            maxItems: 3,
            items: { type: "string" },
          },
        },
      },
    },
  },
};

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = stableValue(value[key]);
        return acc;
      }, {});
  }
  return value;
}

export function isPersonalKarteAiEnabled() {
  return process.env.PERSONAL_KARTE_AI_ENABLED === "true";
}

export function getPersonalKartePromptVersion() {
  return PROMPT_VERSION;
}

export function getPersonalKarteModel() {
  return DEFAULT_MODEL;
}

export function buildKarteSourcePayload({ event, computed, baseKarte }) {
  const computedPayload = computed || event?.computed || {};
  const karteContext = buildPersonalKarteContext({
    ...(event || {}),
    computed: computedPayload,
  });

  // AI生成では、ルール作文の本文を渡すとその文章に引っ張られやすい。
  // ここでは「計算結果と整理済みコンテキスト」だけを渡し、本文はAIに再編集させる。
  return {
    promptVersion: PROMPT_VERSION,
    diagnosisEventId: event?.id || null,
    createdAt: event?.created_at || null,
    karteContext,
    calculatedSnapshot: {
      core: karteContext.core,
      subLabels: karteContext.subLabels,
      symptom: karteContext.symptom,
      weather: karteContext.weather,
      movement: karteContext.movement,
      mechanism: karteContext.mechanism,
      season: karteContext.season,
    },
    rawForAuditOnly: {
      answers: event?.answers || {},
      computed: computedPayload,
    },
    outputContract: {
      productName: baseKarte?.productName || "パーソナル未病カルテ",
      sectionOrder: SECTION_IDS,
      priceLabel: "¥1,980",
    },
  };
}

export function hashKarteSource(source) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(stableValue(source)))
    .digest("hex");
}

function extractJson(text) {
  const raw = String(text || "").trim();
  if (!raw) throw new Error("OpenAI returned empty text");

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
    return JSON.parse(raw.slice(start, end + 1));
  }

  throw new Error("Failed to parse OpenAI JSON");
}

function clampText(value, max = 900) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function normalizeSection(generated, fallback) {
  const section = generated && typeof generated === "object" ? generated : {};
  return {
    id: fallback.id,
    badge: clampText(section.badge || fallback.badge, 20),
    title: clampText(section.title || fallback.title, 90),
    teaser: clampText(section.teaser || fallback.teaser || "", 120),
    preview: clampText(section.preview || fallback.preview || fallback.body?.[0] || "", 240),
    body: (Array.isArray(section.body) && section.body.length ? section.body : fallback.body || [])
      .slice(0, 4)
      .map((text) => clampText(text, 700))
      .filter(Boolean),
    bullets: (Array.isArray(section.bullets) ? section.bullets : fallback.bullets || [])
      .slice(0, 6)
      .map((text) => clampText(text, 190))
      .filter(Boolean),
    steps: (Array.isArray(section.steps) ? section.steps : fallback.steps || [])
      .slice(0, 4)
      .map((text) => clampText(text, 240))
      .filter(Boolean),
  };
}

export function normalizeAiKarte(generated, baseKarte, { model = DEFAULT_MODEL } = {}) {
  const generatedSections = Array.isArray(generated?.sections) ? generated.sections : [];
  const generatedById = new Map(generatedSections.map((section) => [section?.id, section]));
  const fallbackSections = Array.isArray(baseKarte?.sections) ? baseKarte.sections : [];

  return {
    ...baseKarte,
    productName: clampText(generated?.productName || baseKarte?.productName || "パーソナル未病カルテ", 40),
    subtitle: clampText(generated?.subtitle || baseKarte?.subtitle || "", 120),
    heroLead: clampText(generated?.heroLead || baseKarte?.heroLead || "", 280),
    sections: fallbackSections.map((fallback) => normalizeSection(generatedById.get(fallback.id), fallback)),
    meta: {
      ...(baseKarte?.meta || {}),
      version: PROMPT_VERSION,
      generatedBy: "openai",
      model,
      generatedAt: new Date().toISOString(),
    },
  };
}

function buildPrompt(source) {
  return [
    "あなたは『未病レーダー』のパーソナル未病カルテを編集する専門ライターです。",
    "目的は、体質チェックの計算結果をそのまま説明することではありません。ユーザーが『自分の崩れ方が初めて地図になった』と感じる、購入後の個別カルテを作ることです。",
    "内部理論は厳密に使いますが、本文は一般ユーザー向けの生活語で書きます。",
    "",
    "# 未病レーダーの考え方",
    "- 未病レーダーは、病名を当てるアプリではありません。体質の傾向、天気への揺さぶられ方、主訴、動きで見えた負担ポイントをつなぎ、今日から観察できるセルフケアの地図を渡すアプリです。",
    "- 東洋医学の語彙は、神秘的な説明ではなく、体調の偏りを整理する分類ラベルとして扱います。",
    "- 読者は専門家ではありません。専門語を見せるより、『朝が重い』『湿っぽい日に腰が固まる』『食後に沈む』のような体験に翻訳してください。",
    "",
    "# 内部で必ず守る解釈ルール",
    "- core は、崩れやすい方向と回復余力をまとめたメインタイプです。性格診断のように扱わないでください。",
    "- subLabels は、今目立ちやすい偏りの並びです。発生順として扱わないでください。必要なら、気虚が水分代謝を落として痰湿を生む／痰湿が残ってさらに気の立ち上がりを鈍らせる、のように循環として説明してください。",
    "- weather.ranked は、体質構造から見た注意天気です。weather.selfReported は、本人が選んだ自覚きっかけです。混ぜずに、自然な言葉で統合してください。",
    "- symptom は本人が今いちばん困っている不調です。movement は動作チェックで見えた負担ポイントです。痛い場所と動きのヒントを混ぜて決めつけないでください。",
    "- 入力にない病名・症状・天気・施術方針を勝手に足さないでください。",
    "",
    "# 本文に出してはいけない言葉",
    "次の語は、本文・見出し・箇条書きに出さないでください：ランキング、強さ順、病機、時系列、M-test、自己申告、計算ロジック、結果ページ、サブラベル、上位レイヤー、気血水の地図、経絡ライン、内部データ、ハルシネーション、プロンプト。",
    "必要な意味は生活語へ翻訳してください。例：『注意したい天気』『動きで見えた負担ポイント』『目立ちやすいサイン』『奥で重なりやすいサイン』。",
    "",
    "# 重要：AIの使い方",
    "- ルール作文の焼き直しにしないでください。各章で、少なくとも2〜3個の要素をつないだ“読み”を1つ入れてください。例：『湿気 × 冷え × 腰の重さ』『食後の重さ × 朝の立ち上がり × 予定量』など。",
    "- 同じ助言を各章で繰り返さないでください。『温かい汁物』『予定を減らす』『睡眠を守る』は必要な章にだけ置き、別の章では観察ポイントや判断基準を出してください。",
    "- 1章の中に『理解→見分け方→今日使う判断』の流れを作ってください。",
    "- 箇条書きはメモとして使います。本文の焼き直しではなく、読者が明日見返すための短いチェック項目にしてください。",
    "- 文章は具体的に。ただし怖がらせない。煽らない。医療診断や治療効果保証はしない。",
    "",
    "# 章ごとの役割",
    "1. overview：その人の崩れ方の全体像。動物タイプを入口に、主訴・余力・目立つサインを1つの地図として見せる。",
    "2. route：不調が強くなる前の前触れ。目立つ偏り同士の循環を、生活のサインとして説明する。",
    "3. weather：注意したい天気。天気名だけでなく、その天気で何が先に変わるかを書く。",
    "4. body-line：痛い場所と、動きで見えた負担ポイントを分ける。観察の仕方を具体化する。",
    "5. season：年間の波。春夏秋冬の一般論ではなく、この人にとって先に守る時期を中心に書く。",
    "6. avoid：良かれと思って逆効果になりやすい行動。禁止ではなく、弱める・短くする・翌日に回す判断を渡す。",
    "7. minimum-care：しんどい日の最小セット。食事・動き・休み方を、実行しやすい粒度にする。",
    "8. consult：相談メモ。専門家に30秒で伝える内容に整える。緊急性がある症状は医療相談を促す。",
    "",
    "# 出力の長さと形式",
    "- 日本語で書く。",
    "- section id は必ず overview, route, weather, body-line, season, avoid, minimum-care, consult の8個をこの順番で返す。",
    "- 各 section.body は2〜3段落。1段落は70〜160字程度。長くしすぎない。",
    "- bullets は各章2〜4個まで。steps は必要な章だけ0〜3個。無理に埋めない。",
    "- preview は無料チラ見せ用。本文の単純要約ではなく、続きで見える価値を短く出す。",
    "- badge は短く。title/teaser はユーザーが読みたくなる表現にするが、情報商材風に煽らない。",
    "",
    "# 入力データ",
    JSON.stringify(source, null, 2),
    "",
    "指定されたJSON Schemaに一致するJSONだけを返してください。JSON以外の文字は含めないでください。",
  ].join("\n");
}

export async function generatePersonalKarteAi({ source, baseKarte }) {
  const client = getOpenAIClient();
  const model = DEFAULT_MODEL;
  const prompt = buildPrompt(source);
  const reasoningEffort = process.env.OPENAI_PERSONAL_KARTE_REASONING_EFFORT || "medium";

  const request = {
    model,
    input: prompt,
    reasoning: { effort: reasoningEffort },
    max_output_tokens: 8000,
    text: {
      format: {
        type: "json_schema",
        name: "personal_mibyo_karte",
        strict: true,
        schema: KARTE_SCHEMA,
      },
    },
  };

  let response;
  try {
    response = await client.responses.create(request);
  } catch (error) {
    // Some SDK/runtime combinations are stricter about the Responses API structured-output shape.
    // Retry as plain JSON generation so the purchased page can still be generated instead of failing hard.
    console.warn("[personalKarteAi] structured output retrying as plain JSON:", error?.message || error);
    response = await client.responses.create({
      model,
      input: `${prompt}\n\nJSON以外の文字を絶対に含めないでください。`,
      reasoning: { effort: reasoningEffort },
      max_output_tokens: 8000,
    });
  }

  const parsed = extractJson(response.output_text || "");
  return normalizeAiKarte(parsed, baseKarte, { model });
}

