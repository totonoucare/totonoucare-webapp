import crypto from "crypto";
import { getOpenAIClient } from "@/lib/openai/server";
import { buildPersonalKarteContext } from "@/lib/personalKarte";
import { buildKartePlusLoopProfile } from "@/lib/karte_plus/loopAnalysis";

const PROMPT_VERSION = "personal-karte-plus-v5.1-loop-tools";
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
  "my-torisetsu-card",
  "loop-core",
  "early-signs",
  "ng-combo-checker",
  "body-lines",
  "season-guard",
  "forecast-bridge",
  "consultation-sheet",
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

function getPlusIntakeFromEvent(event) {
  return (
    event?.karte_plus_intake ||
    event?.kartePlusIntake ||
    event?.plus_intake ||
    event?.plusIntake ||
    event?.answers?.karte_plus_intake ||
    event?.answers?.kartePlusIntake ||
    {}
  );
}

function buildPlusLoopForSource({ event, computed, ctx }) {
  const intake = getPlusIntakeFromEvent(event);
  const diagnosis = {
    sub_labels: [ctx?.subLabels?.primary?.code, ctx?.subLabels?.secondary?.code].filter(Boolean),
    env_vectors: Array.isArray(ctx?.weather?.selfReported)
      ? ctx.weather.selfReported.map((item) => item.key).filter(Boolean)
      : computed?.env?.vectors || [],
  };

  return {
    intakeProvided: Boolean(intake && Object.keys(intake).length > 0),
    intake,
    profile: buildKartePlusLoopProfile({ diagnosis, intake }),
  };
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
      methodNote: "M-testの要領で、動作時の張り・重さ・動きづらさから、不調の背景にある経絡ラインの負担を探る材料。経絡ラインは、気血水の過不足・偏り、姿勢、冷え、生活負担などが表に出る通り道として扱う。movementChecks.first/second/concernArea には経絡名と読み仮名つきの meridianNamesWithReadings が入る。経絡章では、まず mainConcern.label と concernArea を確認し、次に first/second が同じラインなのか、違うラインなのかを読み分ける。違うラインが出ている場合は、前面・後面・側面など別の通り道の張りや縮こまりが、今お困りの不調へどう関わり得るかを自然に説明する。経絡名の臓腑説明だけで終わらせず、身体のつながり・動きやすさ・体質の偏りとの関係まで書く。予報ページのラインケアのツボには、体質・注意天気に加えて、この動作負担チェックで見えた経絡ラインの情報も反映される。",
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
  const plusLoop = buildPlusLoopForSource({ event, computed: computedPayload, ctx: karteContext });

  return {
    promptVersion: PROMPT_VERSION,
    diagnosisEventId: event?.id || null,
    createdAt: event?.created_at || null,
    facts: buildAiKarteFacts(karteContext),
    plusLoop,
    outputContract: {
      productName: baseKarte?.productName || "わたしのトリセツ Plus",
      sectionOrder: SECTION_IDS,
      sectionTitles: (baseKarte?.sections || []).map((section) => ({ id: section.id, title: section.title })),
      priceLabel: "¥1,980",
      extraColumn: "同梱ツール・相談メモの使い方",
      toolCards: {
        ngCombinations: baseKarte?.kartePlusLoop?.ngCombinationCards || [],
        mtestPointCards: baseKarte?.mtestPointCards || [],
      },
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
    .replace(/不調名を決めるものではなく、?/g, "")
    .replace(/診断名を決めるものではなく、?/g, "")
    .replace(/このチェックは、不調そのものを決めつけるものではありません。?/g, "")
    .replace(/不調そのものを決めつけるものではありません。?/g, "")
    .replace(/原因を断定するものではありません。?/g, "")
    .replace(/その日の天気とこの経絡ラインを組み合わせて確認してください/g, "その日の天気・体質・経絡ラインを反映したツボ提案を確認してください")
    .replace(/予報ページのツボ提案は、その日の天気とこの経絡ラインを組み合わせて確認してください/g, "予報ページのラインケアのツボは、その日の天気・体質・動作負担チェックで見えた経絡ラインを反映して提案されます。")
    .replace(/予報ページでその日のツボ提案を確認し、軽いケアにつなげてください/g, "予報ページでは、その日の天気・体質・動作負担チェックで見えた経絡ラインを反映したラインケアのツボも提案されます。")
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
    cards: Array.isArray(fallback.cards) ? fallback.cards : [],
  };
}


function normalizeBeautyColumn(generated, fallback = {}) {
  const source = generated && typeof generated === "object" ? generated : {};
  return {
    badge: clampText(polishUserText(source.badge || fallback.badge || "コラム"), 20),
    title: clampText(polishUserText(source.title || fallback.title || "肌・むくみ・顔色を内側から整えるポイント3選"), 90),
    teaser: clampText(polishUserText(source.teaser || fallback.teaser || "相談前に見返す要点と実践チェックをまとめます。"), 150),
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
    productName: clampText(polishUserText(generated?.productName || baseKarte?.productName || "わたしのトリセツ Plus"), 40),
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
    "WEBアプリ『未病レーダー』内の有料コンテンツ『わたしのトリセツ Plus』を書きます。",
    "今回の完成物は、無料トリセツの延長ではなく『不調ループ見える化レポート＋同梱ツール』です。",
    "あなたの役割は、体質チェック結果・天気感受性・動作負担チェック・Plus深掘りチェックを統合し、ユーザーが自分の不調のくり返し方を理解し、避けたい組み合わせ・身体ライン・相談メモまで見返せる読み物へ編集することです。",
    "",
    "# 商品の位置づけ",
    "- 商品名は『わたしのトリセツ Plus』。中身は『不調ループ見える化レポート』。同梱ツールとして重ねすぎ注意カードと身体ラインのツボ候補カードを含む。",
    "- 無料のわたしのトリセツは、体質・気血水・天気相性・経絡ライン・今日明日のケアの入口を示す。",
    "- Plusは、そこに時間帯・悪化条件・楽になる条件・生活負荷・睡眠/食事・続けやすさを重ねて、なぜ不調がくり返されるのか、どの組み合わせを避けると崩れにくいのかを整理する。",
    "- 予報ページは『今日・明日の作戦表』。Plusは『なぜその作戦が必要になりやすいかを理解する保存版』。",
    "",
    "# 未病レーダーの前提",
    "- 未病レーダーは、中医学的体質傾向、天気変化感受性、今お困りの不調、動作負担チェック（M-testの要領）を合わせて、天気で体調が揺れやすい日の見立てとセルフケアの手がかりを整理するアプリです。",
    "- 動物タイプ（アクセル優位・ブレーキ優位×余力の大・中・小）は、陰陽の傾きやすさ、気血の総量、回復力をまとめたメタファーです。キャラ診断として盛らず、崩れ方と回復余力の説明に使います。",
    "- 気血津液（きけつしんえき）の偏りは、体に出やすいサインを読む材料です。気虚（ききょ）・痰湿（たんしつ）などの用語は読み仮名つきで出し、説明は生活語で行います。",
    "- 天気シグナルは、体質から見た注意天気と本人の自覚を合わせて読む材料です。湿気・冷え込み・気圧低下・乾燥・暑さなど、現代の天気の言葉で説明します。",
    "- 動作負担チェックは、動作時の張り・重さ・動きづらさから、不調の背景にある経絡（けいらく）ラインの負担を探る材料です。経絡名の臓腑説明だけで終わらせず、姿勢・冷え・生活負担が表に出る通り道として扱います。",
    "- 7方針（しずめる・ゆるめる・めぐらせる・ながす・うるおす・ぬくめる・ささえる）は、本文では背景の編集材料として使う。章タイトルや本文で「固定の優先順位」を主役にしない。日々の予報ページの7方針と衝突させない。",
    "- plusLoop.intakeProvided が false の場合は、Plus深掘りチェック未回答の暫定トリセツとして、体質チェック結果から見える仮説にとどめ、断定を弱めて書きます。",
    "",
    "# 絶対に守る表現ルール",
    "- 医学的な診断、治療、改善保証、原因の断定はしない。",
    "- 『治る』『改善する』『原因はこれです』『病気です』と書かない。",
    "- 『主訴』という表現は使わず、『今お困りの不調』または具体的な不調名で書く。",
    "- 不安を煽らない。『危険』『放置すると悪化』のような煽りは使わない。",
    "- 『〇〇するべき』ではなく、『まずは〇〇から』『〇〇を目安に』『〇〇が合いやすい』と書く。",
    "- 専門用語だけで終わらせず、体感・時間帯・天気・食事・姿勢・予定量に翻訳する。",
    "- 詳しいツボケアや食養生はその日の気象データで変わるため、予報ページで今日・明日の内容を確認する使い方につなげる。Plus側のツボ候補カードは「保存版の候補」であり、当日使う1点は予報ページを優先する。",
    "- 強い痛み、しびれ、麻痺、発熱、転倒後から続く症状、胸痛、息苦しさ、排尿・排便異常などは医療機関相談の文脈で自然に触れる。",
    "",
    "# 文章の基本構造",
    "- まず『この人は何が重なると崩れやすいのか』を説明する。",
    "- 次に『前触れ→悪化条件→避けたい組み合わせ→戻しやすい条件』をつなげる。",
    "- 最後に『警戒日前に外す負担』『予報ページを見るタイミング』『相談時に伝えること』へ落とし込む。",
    "- 同じ助言を繰り返さず、章ごとに役割を分ける。",
    "- 語り口は、専門家が隣で整理してくれるような、落ち着いた自然な日本語にする。",
    "",
    "# 8章の狙い",
    "my-torisetsu-card：私の未病トリセツカード。動物タイプ・今お困りの不調・注意天気・前触れを1枚で見返せるようにする。",
    "loop-core：不調ループの核。体質・天気・時間帯・生活負荷がどう重なり、今お困りの不調として出やすいかを1本の流れで説明する。",
    "early-signs：強くなる前のサイン。不調そのものではなく、手前のサインをユーザーが観察できる言葉にする。",
    "ng-combo-checker：重ねすぎ注意カード。Plus深掘りチェックの悪化条件・睡眠/食事/作業負荷を使い、避けたい習慣・飲食の組み合わせを示す。",
    "body-lines：からだの負担ラインとツボ候補。動作負担チェックで見えたラインを説明し、ツボ候補カードは保存版、当日の1点は予報ページ優先と明記する。",
    "season-guard：季節・天気の先回り。季節別パックや読み物ページにつなげられるよう、注意時期と守り方を整理する。",
    "forecast-bridge：今日・明日の予報ページの使いどころ。Plusと予報ページの役割を分け、混乱しない使い方にする。",
    "consultation-sheet：相談メモ。鍼灸・整体・漢方・医療機関などに相談する際、体質・天気・不調・時間帯・悪化条件・楽になる条件・動作ラインを短く共有できる形にする。",
    "beautyColumn：名称は既存UI互換のため beautyColumn だが、中身は『同梱ツール・相談メモの使い方』として書く。美容コラムにはしない。",
    "",
    "# 出力",
    "- 指定JSON Schemaに一致するJSONだけを返します。",
    "- section id は my-torisetsu-card, loop-core, early-signs, ng-combo-checker, body-lines, season-guard, forecast-bridge, consultation-sheet の8個をこの順番にします。",
    "- section.title は outputContract.sectionTitles の章名に合わせます。本文は入力データに合わせて書き直します。",
    "- 各 section.body は2段落。1段落は短めにします。",
    "- bullets は見返し用のチェック項目を0〜2個に絞ります。",
    "- steps は実行手順が本当に必要な章だけ、0〜2個に絞ります。",
    "- beautyColumn は sections とは別に作り、body は2〜3段落、points は3個にします。中身は「同梱ツール・相談メモの使い方」にしてください。",
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



