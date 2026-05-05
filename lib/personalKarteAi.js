import crypto from "crypto";
import { getOpenAIClient } from "@/lib/openai/server";
import { buildPersonalKarteContext } from "@/lib/personalKarte";

const PROMPT_VERSION = "personal-karte-v4.1-meridian-names-editor";
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
  "core-pattern",
  "inner-pattern",
  "weather-switch",
  "early-signs",
  "meridian-care",
  "alert-day-care",
  "season-care",
  "consult-list",
];

const KARTE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["productName", "subtitle", "heroLead", "sections", "beautyColumn"],
  properties: {
    productName: { type: "string" },
    subtitle: { type: "string" },
    heroLead: { type: "string" },
    beautyColumn: {
      type: "object",
      additionalProperties: false,
      required: ["badge", "title", "teaser", "preview", "body", "points"],
      properties: {
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
        points: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: { type: "string" },
        },
      },
    },
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
    movementMeaning: item.movementMeaning,
    bodyZone: item.bodyArea,
    lineName: item.lineTitle,
    meridianCode: item.meridianCode,
    meridianNames: item.meridians,
    meridianNamesWithReadings: item.meridiansWithReadings,
    meridianText: item.meridianText,
    organHint: item.organHint || item.organsHint,
    description: item.description,
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
      methodNote: "M-testの要領で、動作時の張り・重さ・動きづらさから、不調の背景にある経絡ラインの負担を探る材料。経絡ラインは、気血水の過不足・偏り、姿勢、冷え、生活負担などが表に出る通り道として扱う。movementChecks.first/second/concernArea には経絡名と読み仮名つきの meridianNamesWithReadings が入る。動作負担チェックの動きは軽いセルフチェックとして使え、予報ページのツボ提案にもつながる。",
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
      sectionTitles: (baseKarte?.sections || []).map((section) => ({ id: section.id, title: section.title })),
      priceLabel: "¥1,980",
      extraColumn: "肌・むくみ・顔色を内側から整えるポイント3選",
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

function polishUserText(value) {
  return String(value || "")
    .replace(/主訴/g, "今お困りの不調")
    .replace(/六淫（ろくいん）|六淫/g, "天気の負担")
    .replace(/湿邪（しつじゃ）|寒邪（かんじゃ）|風邪（ふうじゃ）|暑邪（しょじゃ）|燥邪（そうじゃ）/g, "天気の負担")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSection(generated, fallback) {
  const section = generated && typeof generated === "object" ? generated : {};
  return {
    id: fallback.id,
    badge: clampText(polishUserText(fallback.badge || section.badge), 20),
    title: clampText(polishUserText(fallback.title || section.title), 90),
    teaser: clampText(polishUserText(section.teaser || fallback.teaser || ""), 120),
    preview: clampText(polishUserText(section.preview || fallback.preview || fallback.body?.[0] || ""), 240),
    body: (Array.isArray(section.body) && section.body.length ? section.body : fallback.body || [])
      .slice(0, 2)
      .map((text) => clampText(polishUserText(text), 620))
      .filter(Boolean),
    bullets: (Array.isArray(section.bullets) ? section.bullets : fallback.bullets || [])
      .slice(0, 2)
      .map((text) => clampText(polishUserText(text), 170))
      .filter(Boolean),
    steps: (Array.isArray(section.steps) ? section.steps : fallback.steps || [])
      .slice(0, 2)
      .map((text) => clampText(polishUserText(text), 210))
      .filter(Boolean),
  };
}


function normalizeBeautyColumn(generated, fallback = {}) {
  const source = generated && typeof generated === "object" ? generated : {};
  return {
    badge: clampText(polishUserText(source.badge || fallback.badge || "コラム"), 20),
    title: clampText(polishUserText(source.title || fallback.title || "肌・むくみ・顔色を内側から整えるポイント3選"), 90),
    teaser: clampText(polishUserText(source.teaser || fallback.teaser || "体調のくせを、美容面のサインにもつなげて見ます。"), 150),
    preview: clampText(polishUserText(source.preview || fallback.preview || "肌・むくみ・顔色に出やすい変化を、内側から整えるヒントとしてまとめます。"), 240),
    body: (Array.isArray(source.body) && source.body.length ? source.body : fallback.body || [])
      .slice(0, 3)
      .map((text) => clampText(polishUserText(text), 520))
      .filter(Boolean),
    points: (Array.isArray(source.points) && source.points.length ? source.points : fallback.points || [])
      .slice(0, 3)
      .map((text) => clampText(polishUserText(text), 80))
      .filter(Boolean),
  };
}

export function normalizeAiKarte(generated, baseKarte, { model = DEFAULT_MODEL } = {}) {
  const generatedSections = Array.isArray(generated?.sections) ? generated.sections : [];
  const generatedById = new Map(generatedSections.map((section) => [section?.id, section]));
  const fallbackSections = Array.isArray(baseKarte?.sections) ? baseKarte.sections : [];

  return {
    ...baseKarte,
    productName: clampText(polishUserText(generated?.productName || baseKarte?.productName || "パーソナル未病カルテ"), 40),
    subtitle: clampText(polishUserText(generated?.subtitle || baseKarte?.subtitle || ""), 120),
    heroLead: clampText(polishUserText(generated?.heroLead || baseKarte?.heroLead || ""), 190),
    sections: fallbackSections.map((fallback) => normalizeSection(generatedById.get(fallback.id), fallback)),
    beautyColumn: normalizeBeautyColumn(generated?.beautyColumn, baseKarte?.beautyColumn),
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
    "WEBアプリ『未病レーダー』内の有料コンテンツ『パーソナル未病カルテ』を書きます。",
    "あなたの役割は、入力データをもとに、その人が今後の生活で使える体調の読み物へ編集することです。",
    "読み終わった後に、発見・観察ポイント・警戒日の判断基準が残る文章にします。",
    "",
    "# 未病レーダーの前提",
    "- 未病レーダーは、中医学的体質傾向、天気変化感受性、今お困りの不調、動作負担チェック（M-testの要領）を合わせて、天気で体調が揺れやすい日の見立てとセルフケアの手がかりを整理するアプリです。",
    "- 動物タイプ（アクセル優位・ブレーキ優位×余力の大・中・小）は、陰陽の傾きやすさ、気血の総量、回復力をまとめたメタファーです。",
    "- 気血津液（きけつしんえき）の偏りは、体に出やすいサインを読む材料です。気虚（ききょ）・痰湿（たんしつ）などの用語は読み仮名つきで出し、説明は生活語で行います。",
    "- 天気シグナルは、体質から見た注意天気と本人の自覚を合わせて読む材料です。湿気・冷え込み・気圧低下・乾燥・暑さなど、現代の天気の言葉で説明します。天気だけの一般論にせず、気血津液（きけつしんえき）の偏りや動物タイプと重ねて読みます。",
    "- 動作負担チェックは、不調そのものを聞く質問ではなく、動作時の張り・重さ・動きづらさから、不調の背景にある経絡（けいらく）ラインの負担を探る材料です。経絡ラインは、気血水の過不足・偏り、姿勢、冷え、生活負担などが表に出る通り道として扱い、日々のセルフチェックと予報ページのツボ提案につなげます。経絡名が入力データにある場合は、体の場所だけで終わらせず、経絡名（読み仮名つき）も自然に添えて説明します。",
    "- このカルテは、今お困りの不調だけの説明書ではなく、今後出やすい軽い不調や前触れも含めて読み返せる整理です。",
    "- 詳しいツボケアや食養生は、その日の気象データで変わるため、予報ページで今日・明日の内容を確認する使い方につなげます。",
    "",
    "# 書き方",
    "- その人の一日を想像し、前触れ、崩れやすい場面、戻し方を自然につなげます。",
    "- 説明は、体感、時間帯、天気、食事、予定量、動きの変化に落とし込みます。",
    "- コア体質 → 気血津液の偏り → 注意したい天気 → 表に出るサイン → 警戒日の判断、というつながりを大切にします。",
    "- 同じ助言を繰り返さず、章ごとに役割を分けます。",
    "- 語り口は、専門家が隣で整理してくれるような、落ち着いた自然な日本語にします。",
    "- ユーザー向けの不調名は mainConcern.label を使います。mainConcern.usualArea や movementChecks の bodyZone は観察範囲として扱い、不調名として言い換えません。",
    "- 『主訴』という表現は使わず、『今お困りの不調』または具体的な不調名で書きます。",
    "- 『地図』『流れ』『方向』などの抽象語に頼りすぎず、何を見るのか、どう判断するのかが分かる文章にします。",
    "",
    "# 章の狙い",
    "core-pattern：あなたの体質タイプから見る『崩れ方のクセ』。動物タイプを起点に、天気や生活負担にどう反応しやすいかを書く。",
    "inner-pattern：『気・血・水』で読み解く、あなたの内側の偏り。東洋医学用語と生活語の両方で理解できるように書く。",
    "weather-switch：注意すべき天気と、不調スイッチの入り方。注意天気を単独で説明せず、気血津液の偏りと結びつける。",
    "early-signs：不調が強くなる前に気づきたい『前触れサイン』。今の不調だけでなく、今後注意したい軽い不調も扱う。",
    "meridian-care：動作負担チェックで探る、不調の背景にある経絡（けいらく）ラインとケア。movementChecks.first/second の meridianNamesWithReadings を使い、経絡ラインを不調と同格に並べず、背景にある負担の通り道として説明する。動作チェックの意味、軽いセルフチェック、予報ページのツボ提案との関係まで書く。",
    "alert-day-care：警戒日の前日〜当日に、何を足して何を減らすのか。予報ページで今日・明日の点数、主因、ツボ、食養生を確認する話もここに含める。",
    "season-care：あなたが特に注意したい季節と、季節別の守り方。年間の中で先に守る時期を書く。",
    "consult-list：専門家に相談するときに便利な『伝えることリスト』。体質・天気・不調・動作チェックを短く伝える形にする。",
    "beautyColumn：肌・むくみ・顔色を内側から整えるポイント3選。体質と天気が美容面に出るサインを、軽いコラムとして書く。",
    "",
    "# 出力",
    "- 指定JSON Schemaに一致するJSONを返します。",
    "- section id は core-pattern, inner-pattern, weather-switch, early-signs, meridian-care, alert-day-care, season-care, consult-list の8個をこの順番にします。",
    "- section.title は outputContract.sectionTitles の章名に合わせます。本文は入力データに合わせて書き直します。",
    "- 各 section.body は2段落。1段落は短めにします。",
    "- bullets は見返し用のチェック項目を0〜2個に絞ります。",
    "- steps は実行手順が本当に必要な章だけ、0〜2個に絞ります。",
    "- beautyColumn は sections とは別に作り、body は2〜3段落、points は3個にします。",
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

