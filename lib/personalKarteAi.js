import crypto from "crypto";
import { getOpenAIClient } from "@/lib/openai/server";
import { buildPersonalKarteContext } from "@/lib/personalKarte";

const PROMPT_VERSION = "personal-karte-v2.0-domain-context";
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
            minItems: 3,
            maxItems: 4,
            items: { type: "string" },
          },
          bullets: {
            type: "array",
            minItems: 0,
            maxItems: 6,
            items: { type: "string" },
          },
          steps: {
            type: "array",
            minItems: 0,
            maxItems: 4,
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

  return {
    promptVersion: PROMPT_VERSION,
    diagnosisEventId: event?.id || null,
    createdAt: event?.created_at || null,
    answers: event?.answers || {},
    computed: computedPayload,
    karteContext,
    deterministicKarte: {
      productName: baseKarte?.productName,
      subtitle: baseKarte?.subtitle,
      heroLead: baseKarte?.heroLead,
      coreTitle: baseKarte?.coreTitle,
      symptomLabel: baseKarte?.symptomLabel,
      primarySub: baseKarte?.primarySub,
      secondarySub: baseKarte?.secondarySub,
      mainWeather: baseKarte?.mainWeather,
      weatherRankings: baseKarte?.weatherRankings || [],
      sections: baseKarte?.sections || [],
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
    "あなたは『未病レーダー』のパーソナル未病カルテ編集者です。",
    "購入後に読まれる個別カルテを、体質分類データ・中医学の構造・天気相性・M-test的な身体ラインから編集します。",
    "",
    "# 未病レーダーの前提",
    "- 未病レーダーは、病名診断ではなく、体質チェック結果と気象変化の重なりから『崩れやすさ』と『先回りケア』を扱うアプリです。",
    "- 目的は、日々の不調を自分で観察し、早い段階で整えるための地図を渡すことです。医療診断・治療指示ではありません。",
    "- 東洋医学の語彙は、スピリチュアルな世界観ではなく、統計分類・現象整理・構造化された説明として扱います。",
    "",
    "# ラベル体系の前提",
    "- メインラベル（動物ラベル）は、踏みグセ（アクセル優位/ブレーキ優位）×余力（バッテリー小/標準/大）を上位レイヤーにしたメタファーです。",
    "- サブラベル（気滞・気虚・血虚・血瘀・痰湿・津液不足）は強さ順です。病機の発生順ではありません。",
    "- 文章化では、強さ順をそのまま『第一段階→第二段階』にしないでください。例：痰湿が1位で気虚が2位でも、中医学的には気虚が水分代謝を落として痰湿を生む循環として説明する方が自然な場合があります。",
    "- ただし、入力にないラベルや主訴を勝手に追加しないでください。",
    "",
    "# 天気相性の前提",
    "- karteContext.weather.ranked は、結果ページの『影響を受けやすい天気変化』と同じ計算ロジックに基づくランキングです。これを最優先します。",
    "- karteContext.weather.selfReported は、本人が質問で選んだ自覚トリガーです。ランキングとは別軸として説明します。",
    "- 『データがない』とは書かないでください。自己申告が未指定でも、体質構造から見たランキングは存在します。",
    "",
    "# 主訴とM-test/経絡ラインの前提",
    "- symptom は本人が選んだ『今いちばん困っている不調』です。",
    "- movement.primary / movement.secondary は、動作チェックから見えた負担ラインです。主訴とは別物として扱ってください。",
    "- M-test的なラインは病名ではなく、動作で負担が出やすい運動・経絡ラインです。『腰痛だから腎膀胱ライン』のように決めつけず、質問で選んだ動作を優先してください。",
    "",
    "# 文体と商品価値",
    "- ユーザーが『自分のことを言われている』と感じる密度にしてください。無料結果の焼き直しにしないでください。",
    "- ワクワクは煽りではなく、『なるほど、自分の崩れ方はこういう地図だったのか』という納得感で作ります。",
    "- やさしいが甘すぎず、専門家が読んでも破綻しにくい論理にします。",
    "- 医療診断、疾患断定、治療効果保証、薬機法的に強い表現は避けます。『治る』『改善する』『効く』ではなく『整えやすい』『先回りしやすい』『負担を減らしやすい』を使います。",
    "",
    "# 生成ルール",
    "- 日本語で書く。",
    "- deterministicKarte の読み・構造を土台にする。計算済みの天気順位や主訴を上書きしない。",
    "- section id は必ず overview, route, weather, body-line, season, avoid, minimum-care, consult の8個をこの順番で返す。",
    "- 各 section.body は3〜4段落。1段落は80〜180字程度。",
    "- preview は無料チラ見せ用。続きが読みたくなるが、過度な煽りは避ける。",
    "- bullets/steps は必要な章だけでよいが、必ず配列として返す。",
    "",
    "# 入力データ",
    JSON.stringify(source, null, 2),
    "",
    "指定されたJSON Schemaに一致するJSONだけを返してください。",
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


