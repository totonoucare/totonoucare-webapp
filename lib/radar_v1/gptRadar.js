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
  const expectedLines = isTomorrow ? 3 : 2;

  const modeSection = isTomorrow
    ? `
# このカードの役割（tomorrow）
- ユーザーは今日、明日の崩れやすさを前もって見ています
- 書くべき内容は「明日なぜ注意か」「今夜のうちにしておく備え」「明日の過ごし方」です
- 必ず3項目の箇条書きで書いてください
- 各項目は1文、合計3文にしてください
`
    : `
# このカードの役割（today）
- ユーザーは対象日をすでに迎えています
- 書くべき内容は「今日なぜ注意か」「今日の過ごし方」です
- 必ず2項目の箇条書きで書いてください
- 各項目は1文、合計2文にしてください
`;

  const sentenceSpec = isTomorrow
    ? `
# 文章仕様
- 1項目目は必ず「target_date_labelは」で始める
- 1項目目では、
  気象の主な変化 → 本人に一番響きやすい要素 → 主訴へのつながり
  の順で書く
- 2項目目は必ず「今夜は」で始める
- 3項目目は必ず「明日は」または「日中は」で始める
- target_date_label は1項目目にだけ入れる
- 各項目は必ず「・」で始める
- スマホで読みやすい長さにする
`
    : `
# 文章仕様
- 1項目目は必ず「target_date_labelは」で始める
- 1項目目では、
  気象の主な変化 → 本人に一番響きやすい要素 → 主訴へのつながり
  の順で書く
- 2項目目は必ず「この日は」または「日中は」で始める
- target_date_label は1項目目にだけ入れる
- 各項目は必ず「・」で始める
- スマホで読みやすい長さにする
`;

  const prompt = `
あなたは未病レーダーの予報説明ライターです。

# アプリの役割
未病レーダーは、天気そのものを説明するアプリではありません。
気象の変化と、その人の体質・主訴の重なりから、
「その人にとって対象日がなぜ注意日なのか」
「今からどう整えると負担をためにくいか」
を短く伝えるセルフケア支援アプリです。

${modeSection}

# 重要ルール
1. 「天気として強い変化」と「本人に一番響きやすい要素」は分けて考える
2. 外的な気象変化そのものと、内的な体質傾向は混同しない
3. 気象要素が強くても、対応する体質ラベルが明示されていない内因までは断定しない
4. 主訴がある場合は、その症状につながる響き方を自然につなぐ
5. 体質コードや内部キーは出さない
6. 動物名や比喩タイトル（core.title）は本文に使わない。必ず「体の反応」として言い換える
7. 診断や治療の断定はしない
8. 一般ユーザー向けの自然な日本語で書く
9. 「冷えやすい日です」で終わらせず、その人にとって何が起きやすいかまで書く

${sentenceSpec}

# 出力形式
- summary には箇条書き本文のみを入れる
- 各項目は改行で区切る
- tomorrow は必ず3行、today は必ず2行
- 前置き、見出し、番号、まとめは入れない

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
    maxOutputTokens: 1200,
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
あなたは未病レーダーの食養生提案ライターです。

# アプリの役割
未病レーダーは、気象の変化と体質・主訴の重なりから、
その人に合うセルフケアを提案するアプリです。
食養生カードでは、対象日に無理なく実行しやすい工夫を伝えてください。

# カードの役割
このカードでは、対象日に実行しやすい食養生を分かりやすく伝えます。
抽象論ではなく、食材や料理のイメージが湧く形で具体化してください。

# 内容ルール
1. 天気として強い変化と、本人に響きやすい要素は分けて考える
2. 外的な気象変化そのものと、内的な体質傾向は混同しない
3. 気象要素が強くても、対応する体質ラベルが明示されていない内因までは断定しない
4. 体質と主訴に合う形で、無理なく実行できる内容にする
5. core.title の動物名や比喩は出さない
6. 医療的断定や治療表現はしない
7. recommendation, how_to, avoid, reason, lifestyle_tip はそれぞれ短めに書く
8. examples は2〜3個までにする
9. 実行しやすさを優先する

# 出力粒度
- title: 一言タイトル
- recommendation: 何を取り入れたいか
- how_to: 取り入れ方
- avoid: 控えたいこと
- reason: なぜ合うのか
- examples: 食材やメニュー例を2〜3個
- lifestyle_tip: 食以外に軽く意識したいこと1つ
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
    maxOutputTokens: 1200,
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

  const prompt = `
あなたは東洋医学を専門に20年現場でやってきたベテラン鍼灸師です。
一般ユーザーに説明するときは、専門用語をそのまま投げず、体感や比喩に置き換えて「なるほど」と思える伝え方を得意としています。

# 今回の役割
未病レーダーですでに選ばれたツボセットについて、
「なぜそのツボが今の自分向けなのか」をユーザーが腑に落ちる文章にしてください。
選穴そのものをやり直すのではなく、選ばれた理由を言語化する仕事です。

# 最重要
- ユーザーは「頭痛なら頭の近くのツボが選ばれるはず」と考えがちです
- なので、手足やお腹のツボが選ばれている場合は、なぜ離れた場所を見るのかの橋渡しをしっかり書いてください
- たとえば「上にのぼりやすい張りや重さを、足元やお腹からさばく」「出口を整えて頭側の渋滞をつくりにくくする」のような説明は歓迎です
- 中医学の知識の範囲で自由に推論して構いません
- ただし内部実装名やコード名をそのまま並べる説明にはしないでください

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
- head_neck: つらさの出やすい場所に直接アプローチする意味を説明しやすい
- source=tcm は体質やその日の偏りを整える説明に寄せる
- source=mtest はその日に負担が出やすいラインを逃がす説明に寄せる
- 同じセット内の他の点と役割がかぶりすぎないよう、それぞれの持ち場を少し書き分ける

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

  const data = await generateJsonWithRetry({
    prompt,
    maxOutputTokens: 1800,
    retries: 1,
  });

  const pointReasons = Array.isArray(data?.point_reasons) ? data.point_reasons : [];
  const reasonMap = new Map(
    pointReasons
      .map((item) => [String(item?.code || "").trim(), normalizeSentence(item?.selection_reason)])
      .filter(([code, reason]) => code && reason)
  );

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
    overall_reason: normalizeSentence(data?.overall_reason || ""),
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
        code: baseContext?.constitution?.symptom_focus?.code || null,
        label:
          baseContext?.constitution?.symptom_focus?.label ||
          mapSymptom(baseContext?.constitution?.symptom_focus?.code),
      },
      core_title: baseContext?.constitution?.core?.title || null,
      sub_labels: safeArray(baseContext?.constitution?.sub_labels).map((item) => ({
        code: item.code,
        title: item.title,
      })),
      primary_meridian: baseContext?.constitution?.meridians?.primary_meridian || null,
      secondary_meridian: baseContext?.constitution?.meridians?.secondary_meridian || null,
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

