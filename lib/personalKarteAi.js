import crypto from "crypto";
import { getOpenAIClient } from "@/lib/openai/server";
import { buildPersonalKarteContext } from "@/lib/personalKarte";

const PROMPT_VERSION = "personal-karte-v3.1-insight-narrative";
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

  // AIにはルール作文の本文も、生の回答・計算ログも渡さない。
  // 渡すのは「解釈に必要な整理済みコンテキスト」だけにして、
  // ユーザー向け本文はAIにゼロから編集させる。
  const { answers: contextAnswers, computed: _computed, ...contextWithoutRaw } = karteContext;
  const karteContextForAi = {
    ...contextWithoutRaw,
    answers: {
      readable: contextAnswers?.readable || {},
    },
  };

  return {
    promptVersion: PROMPT_VERSION,
    diagnosisEventId: event?.id || null,
    createdAt: event?.created_at || null,
    karteContext: karteContextForAi,
    calculatedSnapshot: {
      core: karteContext.core,
      subLabels: karteContext.subLabels,
      symptom: karteContext.symptom,
      weather: karteContext.weather,
      movement: karteContext.movement,
      mechanism: karteContext.mechanism,
      season: karteContext.season,
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
    "あなたは『未病レーダー』のパーソナル未病カルテを執筆する編集者です。",
    "役割は、計算結果を説明することではなく、ユーザーが『だから自分はこう崩れやすいのか』と腑に落ちる“謎解きカルテ”にすることです。",
    "読者は東洋医学や体の専門知識をほぼ持たない一般ユーザーです。内部理論は裏で使い、本文には生活の言葉・身体感覚・比喩として出してください。",
    "この入力にAIなし版の本文は含まれていません。もし定型文のような言い回しを思いついても捨て、構造データからゼロから書いてください。",
    "",
    "# 未病レーダーの前提",
    "- 未病レーダーは、病名を当てるアプリではありません。体質のクセ、天気への揺れ方、今困っている不調、動きで見えた負担ポイントをつないで、今日から観察できる体調管理の地図を渡すアプリです。",
    "- 動物タイプは性格診断ではありません。崩れる方向と回復余力をまとめた入口です。ユーザーには『こういう時に守りに入る』『ここで反動が残りやすい』のように説明してください。",
    "- 東洋医学の分類語は、本文に出すための言葉ではなく、読み解くための裏側のタグです。ユーザーには『水を含んだスポンジのような重さ』『電池残量が少ない状態』『熱がこもったエンジン』などの比喩に変換してください。",
    "",
    "# 絶対に守る解釈ルール",
    "- subLabels は、目立ちやすい偏りの並びです。発生順として扱わないでください。必要なら『動かす力が落ちる→水分が残る→さらに体が重くなる』のような循環として説明します。",
    "- weather.ranked は体質から見た注意天気です。weather.selfReported は本人が自覚しているきっかけです。用語で区別せず、『アプリ上で注意したい天気』『本人が実感しやすいきっかけ』として自然に統合してください。",
    "- symptom は今いちばん困っている不調です。movement は動きのチェックで見えた負担ポイントです。痛い場所と負担ポイントが違う場合こそ、読みどころです。",
    "- 入力にない病名・症状・重症度・治療方針を勝手に足さないでください。原因を断定せず、『こういう見方ができます』『この流れが起きやすい』と表現してください。",
    "",
    "# 本文に出してはいけない言葉",
    "次の語は本文・見出し・箇条書きに出さないでください：痰湿、気虚、気滞、血虚、血瘀、津液不足、サブラベル、気血水、病機、ランキング、強さ順、時系列、M-test、経絡、経絡ライン、自己申告、計算ロジック、結果ページ、上位レイヤー、内部データ、ハルシネーション、プロンプト。",
    "『専門的には〇〇と呼ばれます』『〇〇という分類です』のような前置きも禁止です。専門語を紹介せず、意味だけを日常語に溶かしてください。",
    "",
    "# 文章の価値：説明ではなく“謎解き”にする",
    "- 各章で、最低1つは『AがあるからBが起き、結果としてCに出る』というドミノを描いてください。事実の羅列は禁止です。",
    "- overview / route / weather / body-line には、必ず情景が浮かぶ比喩を1つ入れてください。例：ドミノ倒しの最初の1枚、水を含んだスポンジ、残量の少ないバッテリー、湿った布を背負う感じ、固くなった前側が腰を引っ張る、など。比喩は使いすぎず、1章1個までを目安にします。",
    "- 身体ラインの章では、痛い場所と動きで見えた場所が違う場合、『なぜそこがつながるように見えるのか』を必ず説明してください。例：腰が気になるのに反らす動きで前側が出るなら、前側のこわばりが腰の後ろ側を引っ張る、という見方ができます。断定ではなく観察仮説として書いてください。",
    "- 同じ助言を繰り返さないでください。『温かい汁物』『予定を減らす』『睡眠を守る』は必要な章だけに置き、他の章では見分け方・観察ポイント・判断基準を出してください。",
    "- 各章は『理解 → 見分け方 → 今日使う判断』の流れを持たせてください。",
    "",
    "# トーン＆マナー",
    "- 一流の鍼灸師・登録販売者・トレーナーが、専門知識を噛み砕いて横で説明する口調にしてください。偉そうにしない。占いっぽくしない。情報商材風に煽らない。",
    "- 機械的な『〜です。〜ます。』の連発を避け、『ここを合図にしてください』『まずはここだけ守りましょう』『この日に無理を重ねないのがコツです』のように語りかけてください。",
    "- 読後感は『怖い』ではなく『明日見るポイントがわかった』にしてください。",
    "- 医療診断や治療効果保証はしない。強い痛み、しびれ、力が入りにくい、発熱、排尿・排便の異常などは相談メモで医療相談を促してください。",
    "",
    "# 章ごとの役割",
    "1. overview：その人の崩れ方の全体像。動物タイプを入口に、主訴・余力・目立つサインを1つの地図として見せる。最初の段落で『自分のことだ』と思わせる。",
    "2. route：不調が強くなる前の前触れ。体の重さ・消耗・こわばりなどがどうつながって主訴へ向かうかを、ドミノとして描く。",
    "3. weather：注意したい天気。天気名だけでなく、その天気で体のどこが先に変わるか、前日・当日に何を見るかを書く。",
    "4. body-line：痛い場所と、動きで見えた負担ポイントを分ける。違う場所が出た場合は、そこが商品価値なので、身体のつながりとして謎解きする。",
    "5. season：年間の波。春夏秋冬の一般論ではなく、この人にとって先に守る時期と、その理由を中心に書く。",
    "6. avoid：良かれと思って逆効果になりやすい行動。禁止ではなく、弱める・短くする・翌日に回す判断を渡す。",
    "7. minimum-care：しんどい日の最小セット。食事・動き・休み方を、実行しやすい粒度にする。完璧主義をほどく。",
    "8. consult：相談メモ。専門家に30秒で伝える内容に整える。本文は一般語で、必要なら『重さ』『冷え』『動き出し』のように伝える。",
    "",
    "# 出力の長さと形式",
    "- 日本語で書く。",
    "- section id は必ず overview, route, weather, body-line, season, avoid, minimum-care, consult の8個をこの順番で返す。",
    "- 各 section.body は2〜3段落。1段落は90〜190字程度。説明不足より、短い謎解きを優先する。",
    "- bullets は各章2〜4個まで。本文の焼き直しではなく、翌日に見返すチェック項目にする。",
    "- steps は必要な章だけ0〜3個。無理に埋めない。",
    "- preview は無料チラ見せ用。本文の単純要約ではなく、続きで見える価値を短く出す。",
    "- badge は短く。title/teaser は読みたくなる表現にするが、煽らない。",
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
