import crypto from "crypto";
import { getOpenAIClient } from "@/lib/openai/server";

const PROMPT_VERSION = "personal-karte-v1.1";
const DEFAULT_MODEL = process.env.OPENAI_PERSONAL_KARTE_MODEL || "gpt-5.5";

const SECTION_IDS = [
  "overview",
  "route",
  "weather",
  "avoid",
  "minimum-care",
  "season",
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
      minItems: 7,
      maxItems: 7,
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
  return {
    promptVersion: PROMPT_VERSION,
    diagnosisEventId: event?.id || null,
    createdAt: event?.created_at || null,
    answers: event?.answers || {},
    computed: computed || {},
    deterministicKarte: {
      productName: baseKarte?.productName,
      subtitle: baseKarte?.subtitle,
      heroLead: baseKarte?.heroLead,
      coreTitle: baseKarte?.coreTitle,
      symptomLabel: baseKarte?.symptomLabel,
      primarySub: baseKarte?.primarySub,
      secondarySub: baseKarte?.secondarySub,
      mainWeather: baseKarte?.mainWeather,
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
    title: clampText(section.title || fallback.title, 80),
    teaser: clampText(section.teaser || fallback.teaser || "", 100),
    preview: clampText(section.preview || fallback.preview || fallback.body?.[0] || "", 220),
    body: (Array.isArray(section.body) && section.body.length ? section.body : fallback.body || [])
      .slice(0, 4)
      .map((text) => clampText(text, 650))
      .filter(Boolean),
    bullets: (Array.isArray(section.bullets) ? section.bullets : fallback.bullets || [])
      .slice(0, 6)
      .map((text) => clampText(text, 180))
      .filter(Boolean),
    steps: (Array.isArray(section.steps) ? section.steps : fallback.steps || [])
      .slice(0, 4)
      .map((text) => clampText(text, 220))
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
    heroLead: clampText(generated?.heroLead || baseKarte?.heroLead || "", 260),
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
    "ユーザーの体質チェック結果をもとに、購入後に読ませる個別カルテ本文を作ります。",
    "",
    "# 重要な制約",
    "- 日本語で書く。",
    "- 医療診断、疾患の断定、治療効果の保証、薬機法的に強い表現は避ける。",
    "- 『治る』『改善する』『効く』ではなく、『整えやすい』『先回りしやすい』『負担を減らしやすい』のように表現する。",
    "- 伝統医学の語彙は使ってよいが、スピリチュアルに寄せない。体質分類データとして、論理的・構造的に説明する。",
    "- 決済後コンテンツなので、無料結果の焼き直しに見えない密度にする。",
    "- ただし煽りすぎない。未病レーダーの穏やかで信頼できる温度感にする。",
    "- 渡した deterministicKarte の構造・読みを土台にする。診断結果にない体質・主訴・天気要素を勝手に増やさない。",
    "- section id は必ず overview, route, weather, avoid, minimum-care, season, consult の7個をこの順番で返す。",
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

  const request = {
    model,
    input: prompt,
    reasoning: { effort: process.env.OPENAI_PERSONAL_KARTE_REASONING_EFFORT || "medium" },
    max_output_tokens: 7000,
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
      reasoning: { effort: process.env.OPENAI_PERSONAL_KARTE_REASONING_EFFORT || "medium" },
      max_output_tokens: 7000,
    });
  }

  const parsed = extractJson(response.output_text || "");
  return normalizeAiKarte(parsed, baseKarte, { model });
}

