import crypto from "crypto";
import { getOpenAIClient } from "@/lib/openai/server";
import { buildPersonalKarteContext } from "@/lib/personalKarte";

const PROMPT_VERSION = "personal-karte-v3.3-open-editor";
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

function cleanObject(value) {
  if (Array.isArray(value)) {
    const cleaned = value.map(cleanObject).filter((item) => {
      if (item == null) return false;
      if (Array.isArray(item)) return item.length > 0;
      if (typeof item === "object") return Object.keys(item).length > 0;
      if (typeof item === "string") return item.trim().length > 0;
      return true;
    });
    return cleaned;
  }
  if (value && typeof value === "object") {
    return Object.entries(value).reduce((acc, [key, item]) => {
      const cleaned = cleanObject(item);
      if (cleaned == null) return acc;
      if (Array.isArray(cleaned) && cleaned.length === 0) return acc;
      if (typeof cleaned === "object" && !Array.isArray(cleaned) && Object.keys(cleaned).length === 0) return acc;
      if (typeof cleaned === "string" && cleaned.trim().length === 0) return acc;
      acc[key] = cleaned;
      return acc;
    }, {});
  }
  if (typeof value === "string") return value.trim();
  return value ?? null;
}

function compactPattern(pattern) {
  if (!pattern) return null;
  const mechanism = pattern.mechanism || {};
  return cleanObject({
    code: pattern.code,
    label: pattern.title || pattern.label || pattern.short,
    plainMeaning: pattern.short,
    visibleSigns: mechanism.surface,
    earlySigns: mechanism.earlySigns,
  });
}

function compactWeatherItem(item) {
  if (!item) return null;
  return cleanObject({
    rank: item.rank,
    label: item.label,
    dayLabel: item.day,
    bodySignal: item.note,
    seasonHint: item.season,
  });
}

function compactMovement(item) {
  if (!item) return null;
  return cleanObject({
    selectedMovement: item.movementLabel,
    bodyZone: item.bodyArea,
    lineName: item.lineTitle,
    order: item.order,
  });
}

function buildAiKarteFacts(ctx) {
  const readable = ctx?.answers?.readable || {};
  const primaryPattern = compactPattern(ctx?.subLabels?.primary);
  const secondaryPattern = compactPattern(ctx?.subLabels?.secondary);
  const weatherRanked = Array.isArray(ctx?.weather?.ranked)
    ? ctx.weather.ranked.map(compactWeatherItem).filter(Boolean)
    : [];

  return cleanObject({
    profile: {
      animalType: ctx?.core?.title,
      animalTypeShort: ctx?.core?.short,
      tendencyAxis: ctx?.core?.yinYangText,
      recoveryReserve: ctx?.core?.driveText,
    },
    mainConcern: {
      label: ctx?.symptom?.label,
      usualArea: ctx?.symptom?.bodySign,
      commonTrigger: ctx?.symptom?.watch,
      consultHint: ctx?.symptom?.consultation,
    },
    patterns: {
      mostVisible: primaryPattern,
      supporting: secondaryPattern,
      earlySigns: ctx?.mechanism?.earlySigns,
    },
    weatherSignals: {
      appAttentionWeather: weatherRanked,
      userFeltTriggers: ctx?.weather?.selfReportedText,
    },
    movementChecks: {
      concernArea: compactMovement(ctx?.movement?.symptomLine),
      first: compactMovement(ctx?.movement?.primary),
      second: compactMovement(ctx?.movement?.secondary),
      zonesAreDifferent: Boolean(
        ctx?.movement?.primary?.lineTitle &&
        ctx?.movement?.symptomLine?.lineTitle &&
        ctx.movement.primary.lineTitle !== ctx.movement.symptomLine.lineTitle
      ),
    },
    seasonSignals: {
      focus: ctx?.season?.headline,
      primary: ctx?.season?.body,
      secondary: ctx?.season?.secondary,
    },
    questionnaire: readable,
  });
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
    facts: buildAiKarteFacts(karteContext),
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
    "WEBアプリ『未病レーダー』内の『パーソナル未病カルテ』というコンテンツ購入者に向けた読み物を書きます。",
    "あなたの役割は、入力データをもとに、その人の体調のくせを今後の生活で使えるような価値のある読み物へ編集することです。",
    "章ごとに、発見・観察ポイント・明日からの判断基準が残る文章にします。",
    "",
    "# 未病レーダーの前提",
    "- 未病レーダーは、中医学的体質傾向、天気変化感受性、動作のチェック（M-testの要領）を合わせて、崩れやすさとセルフケアの手がかりを整理するアプリです。",
    "- 動物タイプ（アクセル優位・ブレーキ優位×余力の大・中・小）は、陰陽の傾きやすさや気血の総量や回復力をまとめたメタファーです。",
    "- サインの偏り(気血津液の偏り)は、体に出やすい傾向を読む材料です。本文では専門名より、日常で気づける体感に翻訳します。",
    "- 天気シグナルは、体質から見た注意天気と本人の自覚を合わせて読む材料です。",
    "- 動作のチェックは、その人のお困りの不調とは別に、負担が表れやすい動作から推察できる異常経絡(身体の通り道)を見る材料です。",
    "",
    "# 書き方",
    "- その人の一日を想像し、前触れ、崩れやすい場面、戻し方を自然につなげます。",
    "- 説明は、体感、時間帯、天気、食事、予定量、動きの変化に落とし込みます。",
    "- 比喩や謎解き(不調に対しての体質や異常経絡との関係性など)は、文章として必要なところで自然に使います。",
    "- 章ごとに役割を分け、同じ助言が続く場合は観察点か判断基準を変えます。",
    "- 語り口は、専門家が隣で整理してくれるような、落ち着いた自然な日本語にします。",
    "",
    "# 章の狙い",
    "overview：最初に全体像をつかむ章。その人らしい崩れ方の輪郭を描く。",
    "route：不調が強くなる前の前触れを扱う章。早めに止める場所を見つける。",
    "weather：注意したい天気と、その日に先に出やすい身体のサインを扱う章。",
    "body-line：困っている場所と、動きで見えた負担ポイントの関係を扱う章。",
    "season：一年の中で先に守りたい時期と、季節ごとの軽い対策を扱う章。",
    "avoid：良かれと思って続けがちな行動を、弱め方まで含めて扱う章。",
    "minimum-care：しんどい日の最小セット。食事・動き・休み方を実行しやすくする章。",
    "consult：鍼灸・整体・漢方などで相談するときに伝えやすいメモの章。",
    "",
    "# 出力",
    "- 指定JSON Schemaに一致するJSONを返します。",
    "- section id は overview, route, weather, body-line, season, avoid, minimum-care, consult の8個をこの順番にします。",
    "- 各 section.body は2〜3段落。1段落は短めにします。",
    "- bullets は見返し用のチェック項目にします。",
    "- steps は実行手順がある章だけに入れます。",
    "",
    "# 入力データ",
    JSON.stringify(source, null, 2),
  ].join("\n");
}

export async function generatePersonalKarteAi({ source, baseKarte }) {
  const client = getOpenAIClient();
  const model = DEFAULT_MODEL;
  const prompt = buildPrompt(source);
  const reasoningEffort = process.env.OPENAI_PERSONAL_KARTE_REASONING_EFFORT || "high";

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

