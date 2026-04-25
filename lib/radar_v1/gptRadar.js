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


function buildForecastTruthPromptSection(promptContext, purpose = "general") {
  const truth = promptContext?.forecast_truth || {};
  const forecast = promptContext?.forecast || {};
  const primaryLabel = truth.primary_label || forecast.personal_main_trigger_label || "計算済みの主因";
  const primaryExact = truth.primary_exact || forecast.personal_main_trigger_exact || "none";
  const weatherLabel = forecast.weather_main_trigger_label || null;
  const weatherExact = forecast.weather_main_trigger_exact || null;
  const peak = truth.peak_time || null;
  const forbidden = Array.isArray(truth.forbidden_primary_phrases)
    ? truth.forbidden_primary_phrases
    : [];
  const allowed = Array.isArray(truth.allowed_sub_effects)
    ? truth.allowed_sub_effects
    : [];

  const purposeRule =
    purpose === "food"
      ? "食養生の理由・おすすめ・避けたい方向も、この主因に合わせる。食材や食べ方の提案で別の気象要素を主因にしない。"
      : purpose === "tsubo"
        ? "ツボの overall_reason と各 selection_reason も、この主因に合わせる。選穴理由を東洋医学的に補足してよいが、主因を別の気象要素へ変えない。"
        : "注意点の本文は、この主因を中心に書く。";

  return `
# 最重要ルール：計算済み主因を上書きしない
- forecast.personal_main_trigger_exact / forecast_truth.primary_exact は、アプリが計算済みの「この人に一番影響しやすい要素」です。
- 今回の主因は「${primaryLabel}」です。内部キーは ${primaryExact} です。
${peak ? `- 注意時間帯は ${peak} です。文脈が自然なら、この時間帯に合う表現にしてください。` : ""}
- weather_main_trigger_exact${weatherExact ? `（${weatherLabel} / ${weatherExact}）` : ""} は天気単体で目立つ変化です。本人向けの主因とは限らないので、本文の主因にしないでください。
- tcm_context、sub_labels、symptom_focus は、主因を説明するための補助情報です。これらから別の気象主因を再推論しないでください。
- ${purposeRule}
${truth.main_effect ? `- 主因の解釈: ${truth.main_effect}` : ""}
${allowed.length ? `- 使ってよい副次表現: ${allowed.join("、")}` : ""}
${forbidden.length ? `- 禁止: ${forbidden.join("。")}` : ""}
- もっともらしい東洋医学的な統合より、計算済みの主因・時間帯・選択済みケアとの一貫性を最優先してください。
`.trim();
}

function hasPrimaryTriggerContradiction(text, promptContext) {
  const exact = promptContext?.forecast_truth?.primary_exact || promptContext?.forecast?.personal_main_trigger_exact || null;
  const t = String(text || "");
  if (!t || !exact) return false;

  if (exact === "heat") {
    return /(外の冷え|冷え込みの揺れ|冷えで体|冷えが主因|寒さで|縮こまりやすい一方)/u.test(t);
  }
  if (exact === "cold") {
    return /(気温上昇が主因|暑さが主因|暑さで|熱こもりが主因|熱っぽさが主因)/u.test(t);
  }
  if (exact === "damp") {
    return /(乾燥が主因|乾きが主因)/u.test(t);
  }
  if (exact === "dry") {
    return /(湿っぽさが主因|湿が主因)/u.test(t);
  }
  if (exact === "pressure_down") {
    return /(気圧上昇が主因|上がる気圧が主因)/u.test(t);
  }
  if (exact === "pressure_up") {
    return /(気圧低下が主因|下がる気圧が主因)/u.test(t);
  }

  return false;
}

function buildFallbackSummary(promptContext) {
  const label = promptContext?.time_context?.target_date_label || "対象日";
  const truth = promptContext?.forecast_truth || {};
  const exact = truth.primary_exact || promptContext?.forecast?.personal_main_trigger_exact || "none";
  const peak = truth.peak_time ? `${truth.peak_time}ごろの` : "";
  const subs = Array.isArray(promptContext?.constitution?.sub_labels)
    ? promptContext.constitution.sub_labels.map((x) => x?.code).filter(Boolean)
    : [];
  const has = (code) => subs.includes(code);

  if (exact === "heat") {
    const tail = has("qi_stagnation")
      ? "張りつめや巡りの詰まりが上に出やすい日です。"
      : "内側に熱っぽさやこもり感が出やすい日です。";
    return `・${label}は${peak}気温上昇で、${tail}`;
  }

  if (exact === "cold") {
    const tail = has("qi_deficiency") || has("fluid_damp")
      ? "重だるさや動き出しにくさが出やすい日です。"
      : "体がこわばり、巡りが鈍りやすい日です。";
    return `・${label}は${peak}冷え込みで、${tail}`;
  }

  if (exact === "pressure_down") {
    return `・${label}は${peak}気圧低下で、重さやだるさ、巡りの停滞が出やすい日です。`;
  }

  if (exact === "pressure_up") {
    return `・${label}は${peak}気圧上昇で、張りつめや力みが上に出やすい日です。`;
  }

  if (exact === "damp") {
    return `・${label}は${peak}湿っぽさで、重だるさやさばきにくさが出やすい日です。`;
  }

  if (exact === "dry") {
    return `・${label}は${peak}乾燥で、乾きやこわばりが出やすい日です。`;
  }

  return `・${label}は小さな負担をためこまず、早めに整えておきたい日です。`;
}

function joinGeneratedFoodText(food) {
  if (!food) return "";
  return [
    food.title,
    food.recommendation,
    food.how_to,
    food.avoid,
    food.reason,
    Array.isArray(food.examples) ? food.examples.join("、") : "",
    food.lifestyle_tip,
  ]
    .filter(Boolean)
    .join(" ");
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
  const forecastTruthSection = buildForecastTruthPromptSection(promptContext, "summary");

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

${forecastTruthSection}

# 書き方の方針
- まず forecast.personal_main_trigger_exact の変化をふまえ、その人の体の反応としてどう響きやすいかにつなげる
- 主訴がある場合は、その症状がなぜ出やすい流れかを自然につなぐ
- 「重さが上にたまりやすい」「巡りが渋りやすい」「体の動きが鈍りやすい」など、主因に合った体感表現を歓迎
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

  let summary = normalizeBulletSummary(data?.summary || "", {
    targetDateLabel: promptContext?.time_context?.target_date_label || null,
    expectedLines,
  });

  if (!summary) return null;

  if (hasPrimaryTriggerContradiction(summary, promptContext)) {
    summary = buildFallbackSummary(promptContext);
  }

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
  const forecastTruthSection = buildForecastTruthPromptSection(promptContext, "food");

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

${forecastTruthSection}

# 書き方の方針
- forecast.personal_main_trigger_exact の揺れと、その人に響きやすい体の反応をつなげて説明する
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

  const food = {
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
  };

  if (hasPrimaryTriggerContradiction(joinGeneratedFoodText(food), promptContext)) {
    return null;
  }

  return { food };
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
  const forecastTruthSection = buildForecastTruthPromptSection(promptContext, "tsubo");

  const prompt = `
あなたは東洋医学を専門に20年現場でやってきたベテラン鍼灸師です。
一般ユーザーに説明するときは、専門用語をそのまま投げず、体感や比喩に置き換えて「なるほど」と思える伝え方を得意としています。

# 今回の役割
未病レーダーですでに選ばれたツボセットについて、
「なぜそのツボが今の自分向けなのか」をユーザーが腑に落ちる文章にしてください。
選穴そのものをやり直すのではなく、選ばれた理由を言語化する仕事です。

${forecastTruthSection}

# 大事な考え方
- いちばん先に説明したいのは「forecast.personal_main_trigger_exact の天気変化」と「その人の体質傾向」が重なったとき、体のどこにどう負担が出やすいかです
- 主訴（constitution.symptom_focus）は大事ですが、毎文の主役にはしなくて構いません
- まずは根本側の説明、つまり「重さがさばけない」「上に集まりやすい」「土台が弱って支えにくい」「ライン上で渋滞しやすい」などを自然に説明してください
- そのうえで必要なら、主訴には「だから結果として腰の重さにつながりやすい」「こういう日は頭のつらさにも波及しやすい」など、着地点として軽くつなげてください
- 主訴を無理に毎回書かない。無理やり感が出るくらいなら、体質・天気・点の役割を優先してください
- point が手足やお腹にあって主訴の場所から離れている場合は、「なぜ離れた場所から整えるのか」の橋渡しを丁寧にしてください
- 中医学の知識は、計算済みの主因・選穴ロジックを自然に説明する範囲で使ってください
- 主因と矛盾する気象要素を、もっともらしく補ってはいけません
- ただし内部実装名やコード名をそのまま並べる説明にはしないでください

# 文体方針
- 一般ユーザー向けの自然な日本語
- 納得感を最優先
- テンプレ感のない文章
- 1点ごとに1〜3文
- 短すぎず、でもカードで読みやすい長さ
- 必要なら「巡り」「重さ」「のぼりやすさ」「土台」「余力」「さばく力」などの表現を使ってよい
- 東洋医学の考え方は使ってよいが、専門用語だけで閉じない

# 書き分けのコツ
- abdomen: まず中心から整える意味を説明しやすい
- limb: 離れた場所から流れを変える意味を説明しやすい
- head_neck: 不調の出やすい場所を直接ゆるめる意味を説明しやすい
- source=tcm は体質やその日の偏りを整える説明に寄せる
- source=mtest はその日に負担が出やすいラインを逃がす説明に寄せる
- 同じセット内の他の点と役割がかぶりすぎないよう、それぞれの持ち場を少し書き分ける
- overall_reason は「このセット全体で何を立て直したいのか」を一段高い視点でまとめる
- symptom_focus があっても、それだけに話を狭めず、体質や天気との関係を必ず残す

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

  const generatedText = [
    data?.overall_reason || "",
    ...[...reasonMap.values()],
  ].join(" ");

  if (hasPrimaryTriggerContradiction(generatedText, promptContext)) {
    return null;
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

    forecast_truth: baseContext?.forecast_truth || null,

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

