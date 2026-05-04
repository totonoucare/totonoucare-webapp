import crypto from "crypto";
import { getOpenAIClient } from "@/lib/openai/server";
import { buildPersonalKarteContext } from "@/lib/personalKarte";

const PROMPT_VERSION = "personal-karte-v3.6-weather-signals-editor";
const DEFAULT_MODEL = process.env.OPENAI_PERSONAL_KARTE_MODEL || "gpt-5.5";


const SUB_TCM_TERMS = {
  qi_stagnation: { term: "気滞", reading: "きたい" },
  qi_deficiency: { term: "気虚", reading: "ききょ" },
  blood_deficiency: { term: "血虚", reading: "けっきょ" },
  blood_stasis: { term: "血瘀", reading: "けつお" },
  fluid_damp: { term: "痰湿", reading: "たんしつ" },
  fluid_deficiency: { term: "津液不足", reading: "しんえきぶそく" },
};

function termForSub(code) {
  return SUB_TCM_TERMS[code] || SUB_TCM_TERMS.qi_stagnation;
}


const SECTION_IDS = [
  "weather-map",
  "inner-pattern",
  "weather-rokuin",
  "symptom-signs",
  "meridian-line",
  "forecast-guide",
  "advance-care",
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
            maxItems: 2,
            items: { type: "string" },
          },
          bullets: {
            type: "array",
            minItems: 0,
            maxItems: 2,
            items: { type: "string" },
          },
          steps: {
            type: "array",
            minItems: 0,
            maxItems: 2,
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
    tcmTerm: termForSub(pattern.code),
    plainMeaning: pattern.short,
    visibleSigns: mechanism.surface,
    earlySigns: mechanism.earlySigns,
  });
}

function compactWeatherItem(item) {
  if (!item) return null;
  return cleanObject({
    rank: item.rank,
    key: item.key,
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
      tcmHint: ctx?.core?.tcmHint,
      careBoundary: ctx?.core?.strategy?.boundary,
      rescueCare: ctx?.core?.strategy?.rescue,
    },
    mainConcern: {
      label: ctx?.symptom?.label,
      usualArea: ctx?.symptom?.bodySign,
      commonTrigger: ctx?.symptom?.watch,
      consultHint: ctx?.symptom?.consultation,
    },
    patterns: {
      primary: primaryPattern,
      second: secondaryPattern,
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
      methodNote: "M-testの要領で、動作時の張り・重さ・動きづらさから負担がかかる経絡ラインを見る材料。今お困りの不調とは分けて扱い、予報ページのツボ提案にもつなげる。",
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
      .slice(0, 2)
      .map((text) => clampText(text, 620))
      .filter(Boolean),
    bullets: (Array.isArray(section.bullets) ? section.bullets : fallback.bullets || [])
      .slice(0, 2)
      .map((text) => clampText(text, 170))
      .filter(Boolean),
    steps: (Array.isArray(section.steps) ? section.steps : fallback.steps || [])
      .slice(0, 2)
      .map((text) => clampText(text, 210))
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
    heroLead: clampText(generated?.heroLead || baseKarte?.heroLead || "", 190),
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
    "あなたの役割は、入力データをもとに、その人の体調のくせを今後の生活で使える価値のある読み物へ編集することです。",
    "章ごとに、発見・観察ポイント・明日からの判断基準が残る文章にします。",
    "",
    "# 未病レーダーの前提",
    "- 未病レーダーは、中医学的体質傾向、天気変化感受性、今お困りの不調、動作のチェック（M-testの要領）を合わせて、天気で体調が揺れやすい日の見立てとセルフケアの手がかりを整理するアプリです。",
    "- 動物タイプ（アクセル優位・ブレーキ優位×余力の大・中・小）は、陰陽の傾きやすさ、気血の総量、回復力をまとめたメタファーです。",
    "- 気血津液（きけつしんえき）の偏りは、体に出やすいサインを読む材料です。気虚（ききょ）・痰湿（たんしつ）などの用語は必要な箇所で読み仮名つきで出し、説明は生活語で行います。",
    "- 天気シグナルは、体質から見た注意天気と本人の自覚を合わせて読む材料です。湿気・冷え込み・気圧低下・乾燥・暑さなど、現代の天気の言葉で説明します。",
    "- 動作チェックは、その人のお困りの不調とは別に、負担が表れやすい動作から推察できる経絡（けいらく）ラインを見る材料です。",
    "- このカルテは、今お困りの不調だけの説明書ではなく、今後出やすい軽い不調や前触れも含めて読み返せる整理です。",
    "- 詳しいツボケアや食養生は、その日の気象データで変わるため予報ページで確認する、という使い方につなげます。",
    "",
    "# 書き方",
    "- その人の一日を想像し、前触れ、崩れやすい場面、戻し方を自然につなげます。",
    "- 説明は、体感、時間帯、天気、食事、予定量、動きの変化に落とし込みます。",
    "- コア体質 → 気血津液の偏り → 注意したい天気 → 表に出るサイン → 今日の予報で見ること、という順番を意識します。",
    "- 章ごとに役割を分け、同じ助言が続く場合は観察点か判断基準を変えます。",
    "- 語り口は、専門家が隣で整理してくれるような、落ち着いた自然な日本語にします。",
    "",
    "# 章の狙い",
    "weather-map：体質・天気・不調をひとつながりで見せる章。今お困りの不調だけで終わらせない。",
    "inner-pattern：気血津液（きけつしんえき）の偏りを扱う章。東洋医学用語と生活語の両方で理解させる。",
    "weather-rokuin：注意したい天気を扱う章。湿気・冷え・気圧などを、その人の体質と結びつけて読む。",
    "symptom-signs：今お困りの不調と、次に出やすい軽いサインを扱う章。今後も見返せる価値を作る。",
    "meridian-line：負担がかかる経絡（けいらく）ラインを扱う章。今お困りの不調と動作チェックをつなげる。",
    "forecast-guide：カルテと毎日の予報ページの使い分けを扱う章。ツボ・食養生は予報ページで確認する使い方につなげる。",
    "advance-care：注意天気の日に先回りする章。完璧なケアではなく最小の判断基準に落とす。",
    "consult：鍼灸・整体・漢方などで相談するときに伝えやすいメモの章。",
    "",
    "# 出力",
    "- 指定JSON Schemaに一致するJSONを返します。",
    "- section id は weather-map, inner-pattern, weather-rokuin, symptom-signs, meridian-line, forecast-guide, advance-care, consult の8個をこの順番にします。",
    "- 各 section.body は2段落。1段落は短めにします。",
    "- bullets は見返し用のチェック項目を1〜2個に絞ります。",
    "- steps は実行手順が本当に必要な章だけ、1〜2個に絞ります。",
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


