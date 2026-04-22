// lib/radar_v1/gptRadar.js
import { generateText } from "@/lib/openai/server";
import { buildRadarPromptContext } from "@/lib/radar_v1/radarPromptContext";

const DEFAULT_MODEL = process.env.OPENAI_RADAR_MODEL || "gpt-5.4";

const ACTION_LABELS = {
  generate_fluids: "うるおいを補う",
  move_blood: "滞った流れをほどく",
  move_qi: "気の巡りを動かす",
  nourish_blood: "消耗しやすい部分をいたわる",
  soothe_liver: "張りつめをゆるめる",
  strengthen_spleen: "重だるさをさばきやすくする",
  support_kidney: "土台の余力を支える",
  tonify_qi: "エネルギー切れしにくくする",
  transform_damp: "余分な重さや湿っぽさをさばく",
};

const ORGAN_LABELS = {
  kidney: "腎",
  liver: "肝",
  spleen: "脾",
};

const LINE_LABELS = {
  lung_li: "首・鎖骨まわりライン",
  heart_si: "肩〜腕ライン",
  kidney_bl: "背骨・下半身軸ライン",
  liver_gb: "体側・ねじりライン",
  spleen_st: "前面・消化軸ライン",
  pc_sj: "上肢外側ライン",
};

const SYMPTOM_LABELS = {
  dizziness: "めまい感",
  fatigue: "疲れやすさ",
  headache: "頭痛",
  low_back_pain: "腰まわりのつらさ",
  mood: "気分の張りつめ",
  neck_shoulder: "首肩のこわばり",
  sleep: "眠りの乱れ",
  swelling: "むくみ・重だるさ",
};

const SYMPTOM_MENTION_ALIASES = {
  dizziness: ["めまい", "ふらつき", "立ちくらみ"],
  fatigue: ["疲れ", "だるさ", "しんどさ", "重だるさ"],
  headache: ["頭痛", "頭", "頭まわり"],
  low_back_pain: ["腰", "腰まわり", "腰のつらさ"],
  mood: ["気分", "張りつめ", "イライラ", "気持ち"],
  neck_shoulder: ["首", "肩", "首肩"],
  sleep: ["眠り", "寝つき", "睡眠"],
  swelling: ["むくみ", "重だるさ", "腫れぼったさ"],
};

function hasSymptomMention(text, symptomCode) {
  const s = String(text || "");
  const aliases = SYMPTOM_MENTION_ALIASES[symptomCode] || [];
  return aliases.some((word) => s.includes(word));
}

function shouldRetryTsuboReasons({ symptomCode, overallReason, pointReasons, expectedCodes }) {
  if (!symptomCode) return false;
  if (!expectedCodes.length) return false;
  if (!hasSymptomMention(overallReason, symptomCode)) return true;

  for (const code of expectedCodes) {
    const reason = pointReasons.get(code) || "";
    if (!hasSymptomMention(reason, symptomCode)) {
      return true;
    }
  }

  return false;
}

function extractJson(text) {
  const raw = String(text || "").trim();
  if (!raw) {
    throw new Error("OpenAI returned empty text");
  }

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
    const sliced = raw.slice(start, end + 1);
    try {
      return JSON.parse(sliced);
    } catch {}
  }

  throw new Error(`OpenAI JSON parse failed: ${raw.slice(0, 500)}`);
}

function normalizeWhitespace(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function normalizeSentence(text) {
  return normalizeWhitespace(text)
    .replace(/。{2,}/g, "。")
    .replace(/、{2,}/g, "、")
    .trim();
}

function dedupeTargetDateLabel(summary, targetDateLabel) {
  const s = String(summary || "").trim();
  const label = String(targetDateLabel || "").trim();
  if (!s || !label) return s;

  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^(${escaped})\\s*は\\s*(${escaped})\\s*は\\s*`, "u");
  if (re.test(s)) {
    return s.replace(re, `${label}は`);
  }

  return s;
}

function normalizeBulletSummary(summary, { targetDateLabel, expectedLines }) {
  let s = normalizeWhitespace(summary);
  s = dedupeTargetDateLabel(s, targetDateLabel);

  if (!s) return "";

  let parts = s
    .replace(/\r\n/g, "\n")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    parts = s
      .split(/(?=・)/g)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  if (parts.length <= 1) {
    parts = s
      .split(/(?<=[。！？])\s*/g)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  parts = parts
    .map((line) => line.replace(/^・+\s*/u, "").trim())
    .filter(Boolean)
    .map((line) => `・${line}`);

  if (expectedLines && parts.length > expectedLines) {
    parts = parts.slice(0, expectedLines);
  }

  return parts.join("\n");
}

async function generateJsonWithRetry({
  prompt,
  maxOutputTokens = 1200,
  retries = 1,
}) {
  let lastError = null;

  for (let i = 0; i <= retries; i++) {
    const retrySuffix =
      i === 0
        ? ""
        : `

重要:
- 前回の出力は壊れていました
- 今回は必ず完全なJSONのみを返してください
- コードブロックは禁止です
- 内容は少し短めで構いません
`;

    try {
      const text = await generateText({
        model: DEFAULT_MODEL,
        input: `${prompt}${retrySuffix}`,
        max_output_tokens: maxOutputTokens + i * 200,
        reasoning: { effort: "low" },
      });
      return extractJson(text);
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error("OpenAI JSON generation failed");
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

  const isTomorrow = relativeTargetMode === "tomorrow";
  const expectedLines = 1;

  const modeSection = isTomorrow
    ? `
# このカードの役割（tomorrow）
- ユーザーは明日に向けた先回りをしたい
- ここでは「なぜ明日が注意日か」だけを短く伝える
- ツボや食養生の具体策までは踏み込まない
- 出力は1行の箇条書き
`
    : `
# このカードの役割（today）
- ユーザーは対象日をすでに迎えている
- ここでは「今日なぜ響きやすいか」だけを短く伝える
- ツボや食養生の具体策までは踏み込まない
- 出力は1行の箇条書き
`;

  const prompt = `
あなたは東洋医学を専門に20年現場でやってきたベテラン鍼灸師です。
一般ユーザーに説明するときは、専門用語をそのまま押し出さず、
体の中で何が起こりやすいかを比喩や体感に置き換えて、
「なるほど、それで今日はこう整えればいいのか」と腑に落ちる言葉にするのが得意です。

# 今回の役割
未病レーダーの予報カード用に、
対象日の天気変化とその人の体質傾向の重なりを、
一般ユーザー向けに自然で納得感のある短文へ落とし込んでください。

${modeSection}

# 書き方の方針
- まず外側の変化（天気の揺れ）をふまえ、その人の体の反応としてどう響きやすいかにつなげる
- 主訴がある場合は、その症状がなぜ出やすい流れかを自然につなぐ
- 「重さが上にたまりやすい」「巡りが渋りやすい」「冷えで動きが鈍りやすい」など、体感が浮かぶ表現を歓迎
- いかにもテンプレな注意文ではなく、その人向けに語りかける
- ケア方法や食事の具体策は書かない
- 動物名、内部コード、ラベル名は出さない
- 医療的な断定や過剰な不安あおりはしない

# 出力ルール
- 必ず「・」始まりの箇条書きにする
- tomorrow / today ともに1行のみ
- 1行は1〜2文でよい
- 前置き、見出し、番号、まとめは禁止

# 出力
出力は必ずJSONのみ:
{
  "summary": "..."
}

入力JSON:
${JSON.stringify(promptContext, null, 2)}
`.trim();

  const data = await generateJsonWithRetry({
    prompt,
    maxOutputTokens: 1400,
    retries: 1,
  });

  const summary = normalizeBulletSummary(data?.summary || "", {
    targetDateLabel: promptContext?.time_context?.target_date_label || null,
    expectedLines,
  });

  if (!summary) return null;

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
あなたは東洋医学を専門に20年現場でやってきたベテラン鍼灸師です。
一般ユーザーに食養生を伝えるときは、
難しい理屈だけで終わらせず、
「明日はこれならやれそう」「それなら食べてみたい」と思える具体性で話します。

# 今回の役割
未病レーダーで計算済みのリスク文脈をもとに、
対象日に実行しやすい食養生カードを作ってください。
判定はすでに終わっているので、あなたの仕事は
「その日向けの食べ方・選び方を、魅力と納得感のある言葉で具体化すること」です。

# 書き方の方針
- 天気の揺れと、その人に響きやすい体の反応をつなげて説明する
- 抽象論で終わらず、食材・料理・食べ方の絵が浮かぶようにする
- コンビニ、外食、自炊どれでも想像しやすい内容を歓迎
-  recommendation / how_to / avoid / reason / lifestyle_tip は少し表情があってよい
- examples は実在感のある2〜4個
- 内部コード、動物名、専門ラベルは出さない
- 医療的断定や過剰な不安あおりはしない

# 出力粒度
- title: 一言タイトル。少し惹きがあってよい
- recommendation: 何を取り入れたいか
- how_to: 取り入れ方のコツ
- avoid: 控えたい方向
- reason: なぜ合いやすいかを腑に落ちる言葉で
- examples: 食材やメニュー例を2〜4個
- lifestyle_tip: 食以外で軽く意識したいこと
- timing: 朝 / 昼 / 間食 / 夜 のどれか

# 出力
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

  const data = await generateJsonWithRetry({
    prompt,
    maxOutputTokens: 1400,
    retries: 1,
  });

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

export async function generateTsuboSelectionReasons({
  riskContext,
  radarPlan,
  targetDate = null,
  relativeTargetMode = null,
  section = "tonight",
}) {
  const tsuboSet = radarPlan?.[section]?.tsubo_set;
  const points = Array.isArray(tsuboSet?.points) ? tsuboSet.points : [];

  if (!points.length) {
    return null;
  }

  const promptContext = buildTsuboReasonPromptContext({
    riskContext,
    radarPlan,
    tsuboSet,
    targetDate,
    relativeTargetMode,
    section,
  });

  const symptomCode = promptContext?.constitution?.symptom_focus?.code || null;
  const symptomLabel = promptContext?.constitution?.symptom_focus?.label || null;
  const expectedCodes = points.map((point) => point.code);

  const buildPrompt = ({ forceSymptomMention = false } = {}) => `
あなたは東洋医学を専門に20年現場でやってきたベテラン鍼灸師です。
一般ユーザーに説明するときは、専門用語をそのまま投げず、体感や比喩に置き換えて「なるほど」と思える伝え方を得意としています。

# 今回の役割
未病レーダーですでに選ばれたツボセットについて、
「なぜそのツボが今の自分向けなのか」をユーザーが腑に落ちる文章にしてください。
選穴そのものをやり直すのではなく、選ばれた理由を言語化する仕事です。

# 最重要
- constitution.symptom_focus が、このユーザーのいちばん困りやすい不調です。必ず最優先で参照してください
- overall_reason も各 point の selection_reason も、まずこの主訴にどうつながるかを軸に説明してください
- point が手足やお腹にあって主訴の場所から離れている場合は、「なぜ離れた場所からその不調につなげるのか」を橋渡ししてください
- 中医学の知識の範囲で自由に推論して構いません
- ただし内部実装名やコード名をそのまま並べる説明にはしないでください
${forceSymptomMention && symptomLabel ? `- overall_reason と各 point.selection_reason の本文中に、「${symptomLabel}」へのつながりが分かる表現を必ず1回以上入れてください` : ""}

# 文体方針
- 一般ユーザー向けの自然な日本語
- 納得感を最優先
- テンプレ感のない文章
- 1点ごとに1〜3文
- 短すぎず、でもカードで読みやすい長さ
- 必要なら「巡り」「重さ」「のぼりやすさ」「土台」「余力」などの表現を使ってよい
- 東洋医学の考え方は使ってよいが、専門用語だけで閉じない

# 書き分けのコツ
- abdomen: まず中心から整える意味を説明しやすい
- limb: 離れた場所から流れを変える意味を説明しやすい
- head_neck: 頭痛や首肩のつらさなどの文脈では、不調の出やすい場所を直接ゆるめる意味を説明しやすい
- source=tcm は体質やその日の偏りを整える説明に寄せる
- source=mtest はその日に負担が出やすいラインを逃がす説明に寄せる
- 同じセット内の他の点と役割がかぶりすぎないよう、それぞれの持ち場を少し書き分ける
- 主訴が局所症状なら、その場所にどう波及するかまで一歩つないで書く
- symptom_focus があるのに、無関係な頭痛・首肩こり・胃腸不調などへ話題を飛ばさない

# 出力形式
出力は必ずJSONのみ:
{
  "overall_reason": "セット全体を一言でつなぐ説明。空でもよい",
  "point_reasons": [
    {
      "code": "CV12",
      "selection_reason": "..."
    }
  ]
}

入力JSON:
${JSON.stringify(promptContext, null, 2)}
`.trim();

  let data = await generateJsonWithRetry({
    prompt: buildPrompt(),
    maxOutputTokens: 1800,
    retries: 1,
  });

  let pointReasons = Array.isArray(data?.point_reasons) ? data.point_reasons : [];
  let reasonMap = new Map(
    pointReasons
      .map((item) => [String(item?.code || "").trim(), normalizeSentence(item?.selection_reason)])
      .filter(([code, reason]) => code && reason)
  );
  let overallReason = normalizeSentence(data?.overall_reason || "");

  if (
    shouldRetryTsuboReasons({
      symptomCode,
      overallReason,
      pointReasons: reasonMap,
      expectedCodes,
    })
  ) {
    data = await generateJsonWithRetry({
      prompt: buildPrompt({ forceSymptomMention: true }),
      maxOutputTokens: 1800,
      retries: 1,
    });

    pointReasons = Array.isArray(data?.point_reasons) ? data.point_reasons : [];
    reasonMap = new Map(
      pointReasons
        .map((item) => [String(item?.code || "").trim(), normalizeSentence(item?.selection_reason)])
        .filter(([code, reason]) => code && reason)
    );
    overallReason = normalizeSentence(data?.overall_reason || "");
  }

  const nextPoints = points.map((point) => {
    const currentExplanation = point?.explanation || {};
    const nextReason = reasonMap.get(point.code);

    if (!nextReason) return point;

    return {
      ...point,
      explanation: {
        ...currentExplanation,
        selection_reason_rule_based: currentExplanation.selection_reason || "",
        selection_reason: nextReason,
      },
    };
  });

  return {
    tsubo_set: {
      ...tsuboSet,
      points: nextPoints,
    },
    overall_reason: overallReason,
    model: DEFAULT_MODEL,
    generated_at: new Date().toISOString(),
  };
}

function buildTsuboReasonPromptContext({
  riskContext,
  radarPlan,
  tsuboSet,
  targetDate,
  relativeTargetMode,
  section,
}) {
  const baseContext = buildRadarPromptContext({
    riskContext,
    radarPlan,
    targetDate,
    relativeTargetMode,
  });

  const selectedLine =
    tsuboSet?.meta?.mtest_meta?.selected_line ||
    riskContext?.mtest_context?.selected_line ||
    null;

  return {
    role: section,
    time_context: baseContext?.time_context || null,

    forecast: {
      signal_label: baseContext?.forecast?.signal_label || null,
      weather_main_trigger_exact: baseContext?.forecast?.weather_main_trigger_exact || null,
      weather_main_trigger_label: baseContext?.forecast?.weather_main_trigger_label || null,
      personal_main_trigger_exact: baseContext?.forecast?.personal_main_trigger_exact || null,
      personal_main_trigger_label: baseContext?.forecast?.personal_main_trigger_label || null,
      active_peak_start: baseContext?.forecast?.active_peak_start || null,
      active_peak_end: baseContext?.forecast?.active_peak_end || null,
      risk_factors: safeArray(baseContext?.forecast?.risk_factors),
      care_tone: baseContext?.forecast?.care_tone || null,
    },

    constitution: {
      symptom_focus: {
        code: baseContext?.constitution?.symptom_focus || null,
        label:
          baseContext?.constitution?.symptom_focus_label ||
          mapSymptom(baseContext?.constitution?.symptom_focus),
      },
      core_title:
        baseContext?.constitution?.core?.metaphor_title ||
        baseContext?.constitution?.core?.short ||
        null,
      sub_labels: safeArray(baseContext?.constitution?.sub_labels).map((item) => ({
        code: item.code,
        title: item.title,
      })),
      primary_meridian: baseContext?.constitution?.primary_meridian || null,
      secondary_meridian: baseContext?.constitution?.secondary_meridian || null,
    },

    tcm_context: {
      primary_label: baseContext?.tcm_context?.primary_label || null,
      secondary_label: baseContext?.tcm_context?.secondary_label || null,
      primary_actions: safeArray(baseContext?.tcm_context?.primary_actions).map(mapAction),
      secondary_actions: safeArray(baseContext?.tcm_context?.secondary_actions).map(mapAction),
      need_abdomen: !!baseContext?.tcm_context?.need_abdomen,
      abdomen_choice: baseContext?.tcm_context?.abdomen_choice || null,
      organ_focus: safeArray(tsuboSet?.meta?.tcm_meta?.organ_focus).map(mapOrgan),
    },

    mtest_context: {
      selected_line: selectedLine,
      selected_line_label: mapLine(selectedLine),
      selected_block: tsuboSet?.meta?.mtest_meta?.selected_block || null,
      mother_child_mode: tsuboSet?.meta?.mtest_meta?.mother_child_mode || null,
      side_reason: tsuboSet?.meta?.mtest_meta?.side_reason || null,
    },

    tsubo_set: {
      point_count: Number(tsuboSet?.meta?.point_count || 0),
      points: safeArray(tsuboSet?.points).map((point) => ({
        code: point.code,
        name_ja: point.name_ja,
        reading_ja: point.reading_ja || null,
        source: point.source,
        source_label: point.source === "mtest" ? "ライン調整" : "体質調整",
        point_region: point.point_region,
        point_region_label: mapPointRegion(point.point_region),
        point_place_hint: inferPointPlaceHint(point),
        meridian_code: point.meridian_code || null,
        line_hint: mapLine(selectedLine),
        tcm_actions: safeArray(point.tcm_actions).map(mapAction),
        organ_focus: safeArray(point.organ_focus).map(mapOrgan),
        role_summary: point?.explanation?.role_summary || null,
        match_tags: safeArray(point?.explanation?.match_tags),
        rule_based_reason: point?.explanation?.selection_reason || null,
      })),
    },
  };
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function mapAction(code) {
  return ACTION_LABELS[code] || code || null;
}

function mapOrgan(code) {
  return ORGAN_LABELS[code] || code || null;
}

function mapLine(code) {
  return LINE_LABELS[code] || code || null;
}

function mapSymptom(code) {
  return SYMPTOM_LABELS[code] || code || null;
}

function mapPointRegion(region) {
  switch (region) {
    case "abdomen":
      return "お腹まわり";
    case "head_neck":
      return "頭・首まわり";
    case "limb":
      return "手足";
    default:
      return region || null;
  }
}

function inferPointPlaceHint(point) {
  const region = point?.point_region || null;
  const meridian = String(point?.meridian_code || "").toLowerCase();

  if (region === "abdomen") return "お腹から整える点";
  if (region === "head_neck") return "頭・首まわりで受け止める点";

  if (["lr", "sp", "st", "gb", "ki", "bl"].includes(meridian)) {
    return "足元〜すね側から流れを整える点";
  }

  if (["lu", "li", "pc", "ht", "si", "te"].includes(meridian)) {
    return "手元〜前腕側から流れを整える点";
  }

  return "離れた場所から流れを整える点";
}

function normalizeTiming(v) {
  const s = String(v || "").trim();
  if (["朝", "昼", "間食", "夜"].includes(s)) return s;
  return "昼";
}
