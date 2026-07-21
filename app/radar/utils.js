// app/radar/utils.js

import { flattenRadarLocationPresets } from "@/lib/radar_v1/locationPresets";
import { getLifestylePlan as getLifestylePlanFromRules } from "@/lib/radar_v1/careRules/lifestyleRules";
import { buildTodayCarePlanCore } from "@/lib/radar_v1/careRules/todayCarePlan";

export function safeArray(v) {
  return Array.isArray(v) ? v : [];
}


export function formatTargetDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  if (Number.isNaN(d.getTime())) return dateStr;

  const weekday = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}(${weekday})`;
}

export function getJstTodayTomorrow() {
  const now = new Date();

  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const today = `${get("year")}-${get("month")}-${get("day")}`;
  const hour = Number(get("hour"));

  const d = new Date(`${today}T00:00:00+09:00`);
  d.setDate(d.getDate() + 1);

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const tomorrow = `${yyyy}-${mm}-${dd}`;

  return { today, tomorrow, hour };
}


export function addDaysToIsoDate(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function compareIsoDate(a, b) {
  const aa = String(a || "");
  const bb = String(b || "");
  if (!aa || !bb) return 0;
  if (aa < bb) return -1;
  if (aa > bb) return 1;
  return 0;
}

export function buildRadarDateTabs() {
  const { today, tomorrow } = getJstTodayTomorrow();
  return [
    {
      key: today,
      date: today,
      mode: "today",
      label: "今日",
      subLabel: "整える",
      locked: false,
    },
    {
      key: tomorrow,
      date: tomorrow,
      mode: "tomorrow",
      label: "明日",
      subLabel: "備える",
      locked: false,
    },
  ];
}

export function inferModeFromSelectedDate(targetDate) {
  const { today, tomorrow } = getJstTodayTomorrow();
  if (targetDate === today) return "today";
  if (targetDate === tomorrow) return "tomorrow";
  if (compareIsoDate(targetDate, tomorrow) > 0) return "future";
  return inferModeFromTargetDate(targetDate);
}

export function getDefaultDateModeJST() {
  // 未病レーダーの主役は「今日の崩れやすさ」。明日タブは備えとして扱う。
  return "today";
}

export function inferModeFromTargetDate(targetDate) {
  const { today, tomorrow } = getJstTodayTomorrow();
  if (targetDate === today) return "today";
  if (targetDate === tomorrow) return "tomorrow";
  return null;
}

export function getDateModeLabel(mode) {
  if (mode === "today") return "今日";
  if (mode === "future") return "週間";
  return "明日";
}

export function buildScoreCardTitle(mode, targetDate) {
  if (mode === "today") return "今日の体調ゆらぎ予報";
  if (mode === "future") return `${formatTargetDate(targetDate)}の体調ゆらぎ予報`;
  return `${getDateModeLabel(mode)}(${formatTargetDate(targetDate)})の体調ゆらぎ予報`;
}

export function getSectionLabels(mode) {
  if (mode === "today") {
    return {
      noticeTitle: "このあとの注意時間",
      tsuboTitle: "今日これから使えるツボケア",
      tsuboSubtitle: "このあとの不調に合わせた実用寄りの3点セット",
      foodTitle: "今日これからの食べ方",
    };
  }

  return {
    noticeTitle: "明日の注意点",
    tsuboTitle: "今夜からできるツボケア",
    tsuboSubtitle: "今夜から明日にかけて整えておきたい3点セット",
    foodTitle: "今夜から使える食べ方",
  };
}

export function signalLabel(signal) {
  return getForecastModeLabel(signal);
}

export function getForecastModeLabel(signal) {
  const level = Number(signal);
  if (level === 2) return "守りモード";
  if (level === 1) return "いたわりモード";
  return "安定モード";
}

export function getForecastModeShortLabel(signal) {
  const level = Number(signal);
  if (level === 2) return "守り";
  if (level === 1) return "いたわり";
  return "安定";
}

export function signalBadgeClass(signal) {
  if (signal === 2) {
    return "bg-[#FFF6EF] text-[#B86430] ring-1 ring-inset ring-[#ECD6C5]";
  }
  if (signal === 1) {
    return "bg-[#FFF9ED] text-[#AD7A18] ring-1 ring-inset ring-[#EAD8A6]";
  }
  return "bg-[#F3FBF8] text-[#2F816E] ring-1 ring-inset ring-[#C8E4DB]";
}

export function signalDotClass(signal) {
  if (signal === 2) {
    return "bg-[#E38949] shadow-[0_0_10px_rgba(227,137,73,0.20)]";
  }
  if (signal === 1) {
    return "bg-[#E2AE45] shadow-[0_0_10px_rgba(226,174,69,0.20)]";
  }
  return "bg-[#66B9A3] shadow-[0_0_10px_rgba(102,185,163,0.18)]";
}

export function signalPanelClass(signal) {
  if (signal === 2) {
    return "ring-1 ring-[#ECD6C5] bg-[linear-gradient(135deg,#FFF9F5_0%,#FFF4EC_100%)] text-[#8E522B]";
  }
  if (signal === 1) {
    return "ring-1 ring-[#E9D8A9] bg-[linear-gradient(135deg,#FFFCF4_0%,#FFF7E8_100%)] text-[#8C6215]";
  }
  return "ring-1 ring-[#CBE5DC] bg-[linear-gradient(135deg,#F6FCF9_0%,#EFF9F5_100%)] text-[#2F7767]";
}

export function signalPanelSubtext(signal) {
  if (signal === 2) return "無理を詰め込みすぎず、早めのケアを意識したい日です。";
  if (signal === 1) return "少し崩れやすさがあるので、予定を詰めすぎず、先に休憩を入れたい日です。";
  return "天気の影響は少なめ。注意したい時間だけ軽く見ておきたい日です。";
}

export function sourceLabel(source) {
  if (source === "today_rule") return "今日の天気と不調から選んだケア";
  if (source === "mtest") return "動きから選んだケア";
  if (source === "tcm") return "体質と天気から選んだケア";
  return "この日の状態から選んだケア";
}

const HAND_ARM_POINT_PREFIXES = new Set(["LI", "LU", "PC", "HT", "SI", "TE", "SJ"]);
const LEG_FOOT_POINT_PREFIXES = new Set(["ST", "SP", "LR", "GB", "KI", "BL"]);
const TRUNK_POINT_PREFIXES = new Set(["CV", "GV"]);

function getPointCodePrefix(point) {
  const code = String(point?.code || "").trim().toUpperCase();
  const codePrefix = code.match(/^[A-Z]+/)?.[0] || "";
  if (codePrefix) return codePrefix;

  const meridian = String(point?.meridian_code || "").trim().toUpperCase();
  if (meridian === "SJ") return "TE";
  return meridian;
}

export function inferPointTouchArea(pointOrRegion, codeMaybe = null) {
  const point =
    pointOrRegion && typeof pointOrRegion === "object"
      ? pointOrRegion
      : { point_region: pointOrRegion, code: codeMaybe };

  const region = String(point?.point_region || "").trim().toLowerCase();
  const bodyRegion = String(point?.body_region || "").trim().toLowerCase();
  const prefix = getPointCodePrefix(point);

  // point_region/body_region を優先する。GV20のように、経脈コードだけでは
  // 体幹扱いできないツボが今後増えても崩れにくくするため。
  if (region === "head_neck" || /head|neck|face|temple|scalp/.test(bodyRegion)) {
    return "head_neck";
  }

  if (
    ["abdomen", "chest_abdomen", "trunk"].includes(region) ||
    /abdomen|belly|chest|trunk|lower_abdomen|upper_abdomen/.test(bodyRegion)
  ) {
    return "abdomen_trunk";
  }

  if (HAND_ARM_POINT_PREFIXES.has(prefix) || /hand|wrist|forearm|arm|elbow/.test(bodyRegion)) {
    return "hand_arm";
  }

  if (LEG_FOOT_POINT_PREFIXES.has(prefix) || /foot|ankle|leg|knee|thigh|toe/.test(bodyRegion)) {
    return "leg_foot";
  }

  if (TRUNK_POINT_PREFIXES.has(prefix)) {
    return "abdomen_trunk";
  }

  if (region === "limb") return "limb";
  return "general";
}

export function getPointRegionLabel(pointOrRegion, codeMaybe = null) {
  const area = inferPointTouchArea(pointOrRegion, codeMaybe);
  if (area === "head_neck") return "頭・首まわり";
  if (area === "abdomen_trunk") return "お腹・体幹まわり";
  if (area === "hand_arm") return "手・腕まわり";
  if (area === "leg_foot") return "脚・足まわり";
  if (area === "limb") return "手足まわり";
  return "ほぐしやすい場所";
}

export const HIDDEN_LOCATION_LABELS = new Set(["primary", "current", "home"]);

export const MATCH_TAG_LABELS = {
  // 既存の日本語タグ / 旧ロジック由来の専門語を生活語に変換する
  "気を補う": "疲れやすさを残しにくくする",
  "腎を支える": "腰腹まわりの冷えを残しにくくする",
  "脾胃を支える": "食後の重さを残しにくくする",
  "湿をさばく": "重だるさ・むくみを残しにくくする",
  "血の巡りを動かす": "こわばりを残しにくくする",
  "うるおいを補う": "乾きやほてりを残しにくくする",
  "血を補う": "休みに入りにくい感じを残しにくくする",
  "巡りを動かす": "張りや詰まり感を残しにくくする",
  "張りをゆるめる": "緊張や力みを抜きやすくする",
  "気圧低下も補助": "気圧低下も少し見る",
  "気圧上昇も補助": "気圧上昇も少し見る",
  "冷え込みも補助": "冷え込みも少し見る",
  "気温上昇も補助": "暑さも少し見る",
  "湿気も補助": "湿気も少し見る",
  "乾燥も補助": "乾燥も少し見る",
  "脾を意識": "食後の重さやだるさを見ておく",
  "脾": "食後の重さやだるさを見ておく",
  "肝を意識": "緊張や巡りの滞りを見ておく",
  "肝・胆ライン": "緊張や巡りの滞りを見ておく",
  "肝胆ライン": "緊張や巡りの滞りを見ておく",
  "湿": "重だるさ・むくみを残しにくくする",
  "腹部から整える": "お腹まわりから整える",
  "やさしく支える": "動き出しを支える",
  "詰まりをゆるめる": "張りを残しにくくする",
  "体質ケア": "明日の天気に合わせたケア",
  "ラインケア": "動きの負担に向くケア",

  // 今日タブのルール選定で使う内部キーを、ユーザー向けの言葉に変換する
  fatigue: "今見ている不調：だるさ・疲労",
  sleep: "今見ている不調：睡眠",
  digestion: "今見ている不調：胃腸の調子",
  neck_shoulder: "今見ている不調：首肩のつらさ",
  low_back_pain: "今見ている不調：腰のつらさ",
  swelling: "今見ている不調：むくみ",
  headache: "今見ている不調：頭痛",
  dizziness: "今見ている不調：めまい",
  mood: "今見ている不調：気分の浮き沈み",
  pressure_down: "天気の影響：低気圧",
  pressure_up: "天気の影響：気圧上昇",
  temp_shift: "天気の影響：気温差",
  damp: "天気の影響：湿気",
  humidity: "天気の影響：湿気",
  cold: "天気の影響：冷え",
  heat: "天気の影響：暑さ",
  dry: "天気の影響：乾燥",
  temp: "天気の影響：気温差",
};

const LEGACY_TSUBO_REASON_TARGETS = {
  "気を補う": "疲れやすさ",
  "腎を支える": "腰腹まわりの冷え",
  "脾胃を支える": "食後の重さ",
  "湿をさばく": "重だるさ・むくみ",
  "血の巡りを動かす": "こわばり",
  "うるおいを補う": "乾きやほてり",
  "血を補う": "休みに入りにくい感じ",
  "巡りを動かす": "張りや詰まり感",
  "張りをゆるめる": "緊張や力み",
};

function joinPointReasonTargets(items) {
  const arr = Array.from(new Set(safeArray(items).filter(Boolean)));
  if (!arr.length) return "重さやこわばり";
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]}や${arr[1]}`;
  return `${arr.slice(0, -1).join("・")}や${arr[arr.length - 1]}`;
}

function humanizeLegacyPointSelectionReason(reason, point = null) {
  const raw = String(reason || "").trim();
  if (!raw) return "";

  const code = String(point?.code || "").trim().toUpperCase();

  if (raw === "明日は、お腹まわりの冷えや重さが全体に残りやすい日です。まず腹部を軽くほぐし、翌朝に重さを残しにくくするために選んでいます。") {
    if (code === "CV12") {
      return "明日は湿気や食後の重さが残りやすい見込みです。中脘はお腹の中央から胃腸まわりを軽くゆるめるツボなので、今夜のうちに食後の重さを持ち越しにくくする準備として選んでいます。";
    }
    if (code === "CV6") {
      return "明日は冷えやだるさが腰腹まわりに残りやすい見込みです。気海は下腹部を軽くゆるめるツボなので、今夜のうちに冷えや重さを持ち越しにくくする準備として選んでいます。";
    }
    return "明日は、お腹まわりの冷えや重さが残りやすい見込みです。今夜のうちに腹部を軽くゆるめ、翌朝に重さを持ち越しにくくするために選んでいます。";
  }

  const mtestMotherMatch = raw.match(/^この日は、?(.+?)をやさしく支えたい流れです。?(.*)$/);
  if (mtestMotherMatch) {
    const line = String(mtestMotherMatch[1] || "負担が出やすいライン").trim();
    const rest = String(mtestMotherMatch[2] || "").trim();
    return `明日は${line}に負担が出やすい見込みです。${rest || "今夜のうちに軽く整える目的で、このツボを選んでいます。"}`;
  }

  const mtestChildMatch = raw.match(/^この日は、?(.+?)の詰まりをゆるめたい流れです。?(.*)$/);
  if (mtestChildMatch) {
    const line = String(mtestChildMatch[1] || "負担が出やすいライン").trim();
    const rest = String(mtestChildMatch[2] || "").trim();
    return `明日は${line}に張りや引っかかりが残りやすい見込みです。${rest || "こわばりを持ち越しにくくする目的で、このツボを選んでいます。"}`;
  }

  const secondaryMatch = raw.match(/^(.+?)の影響も少し重なりそうなため、(.+?)ケアも少し入れられるように選んでいます。?$/);
  if (secondaryMatch) {
    const trigger = secondaryMatch[1];
    const targets = String(secondaryMatch[2] || "")
      .split("・")
      .map((part) => LEGACY_TSUBO_REASON_TARGETS[part] || part)
      .filter(Boolean);
    return `明日は${trigger}の影響も少し重なる見込みです。${joinPointReasonTargets(targets)}を翌朝に残しにくくするために、このツボを選んでいます。`;
  }

  const primaryMatch = raw.match(/^(.+?)ケアがこの日の体質ケアに合うため選んでいます。?$/);
  if (primaryMatch) {
    const targets = String(primaryMatch[1] || "")
      .split("・")
      .map((part) => LEGACY_TSUBO_REASON_TARGETS[part] || part)
      .filter(Boolean);
    return `${joinPointReasonTargets(targets)}を翌朝に残しにくくするために、このツボを選んでいます。`;
  }

  const secondarySimpleMatch = raw.match(/^(.+?)ケアも、この日の整え方に合うため選んでいます。?$/);
  if (secondarySimpleMatch) {
    const targets = String(secondarySimpleMatch[1] || "")
      .split("・")
      .map((part) => LEGACY_TSUBO_REASON_TARGETS[part] || part)
      .filter(Boolean);
    return `${joinPointReasonTargets(targets)}も翌朝に残しにくくするために、このツボを選んでいます。`;
  }

  return raw;
}

export const RADAR_LOADING_HINTS = [
  "体質データを読み込んでいます…",
  "明日の気圧・気温・湿度の変化を照合しています…",
  "あなた向けの注意ポイントをまとめています…",
];

export function humanizeMatchTag(tag) {
  const raw = String(tag || "").trim();
  if (!raw) return "";
  return MATCH_TAG_LABELS[raw] || raw;
}

export function getPointReading(point) {
  return String(point?.reading_ja || "").trim();
}

export function getForecastText(bundle) {
  return (
    bundle?.forecast?.gpt_summary ||
    bundle?.forecast?.computed?.forecast_snapshot?.gpt_summary ||
    bundle?.forecast?.why_short ||
    "気象の変化と体質の重なりを見て、崩れやすさを出しています。"
  );
}

export function getForecastLines(bundle) {
  const text = String(getForecastText(bundle) || "").trim();
  if (!text) return [];

  const lines = text
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[・•●\-]\s*/, "").trim())
    .filter(Boolean);

  if (lines.length >= 2) return lines;

  return text
    .split(/(?<=[。！？])/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[・•●\-]\s*/, "").trim())
    .filter(Boolean);
}

export function getRiskContext(bundle) {
  return bundle?.forecast?.computed?.radar_plan_meta?.risk_context || null;
}

export function getCompatTriggerLabel(mainTrigger, triggerDir) {
  if (mainTrigger === "pressure" && triggerDir === "down") return "気圧低下";
  if (mainTrigger === "pressure" && triggerDir === "up") return "気圧上昇";
  if (mainTrigger === "temp" && triggerDir === "down") return "冷え込み";
  if (mainTrigger === "temp" && triggerDir === "up") return "気温上昇";
  if (mainTrigger === "temp" && ["change", "mixed", "steady"].includes(triggerDir)) return "気温差";
  if (mainTrigger === "humidity" && triggerDir === "up") return "湿気";
  if (mainTrigger === "humidity" && triggerDir === "down") return "乾燥";
  return "気象変化";
}

export function exactFromCompat(mainTrigger, triggerDir) {
  if (mainTrigger === "pressure" && triggerDir === "down") return "pressure_down";
  if (mainTrigger === "pressure" && triggerDir === "up") return "pressure_up";
  if (mainTrigger === "temp" && triggerDir === "down") return "cold";
  if (mainTrigger === "temp" && triggerDir === "up") return "heat";
  if (mainTrigger === "temp" && ["change", "mixed", "steady"].includes(triggerDir)) return "temp_shift";
  if (mainTrigger === "humidity" && triggerDir === "up") return "damp";
  if (mainTrigger === "humidity" && triggerDir === "down") return "dry";
  return "pressure_down";
}

export function compatFromExact(exact) {
  if (exact === "pressure_down") return { main_trigger: "pressure", trigger_dir: "down" };
  if (exact === "pressure_up") return { main_trigger: "pressure", trigger_dir: "up" };
  if (exact === "cold") return { main_trigger: "temp", trigger_dir: "down" };
  if (exact === "heat") return { main_trigger: "temp", trigger_dir: "up" };
  if (exact === "temp_shift") return { main_trigger: "temp", trigger_dir: "change" };
  if (exact === "damp") return { main_trigger: "humidity", trigger_dir: "up" };
  if (exact === "dry") return { main_trigger: "humidity", trigger_dir: "down" };
  return { main_trigger: "pressure", trigger_dir: "down" };
}

export function getForecastSnapshot(forecast) {
  return forecast?.computed?.forecast_snapshot || null;
}

export function getRiskSummaryFromForecast(forecast) {
  return forecast?.computed?.radar_plan_meta?.risk_context?.summary || null;
}

export function getForecastTriggerKey(forecast) {
  if (!forecast) return "pressure_down";
  const snapshot = getForecastSnapshot(forecast);
  const riskSummary = getRiskSummaryFromForecast(forecast);
  return (
    forecast.personal_main_trigger_exact ||
    snapshot?.personal_main_trigger_exact ||
    riskSummary?.main_trigger_exact ||
    exactFromCompat(forecast.main_trigger, forecast.trigger_dir)
  );
}

export function normalizeForecastTriggerFactor(item, index, forecast) {
  const exact = item?.exact || item?.key || null;
  const compat = exact ? compatFromExact(exact) : {
    main_trigger: item?.main_trigger || forecast?.main_trigger,
    trigger_dir: item?.trigger_dir || forecast?.trigger_dir,
  };
  const key = exact || exactFromCompat(compat.main_trigger, compat.trigger_dir);
  const snapshot = getForecastSnapshot(forecast);
  const riskSummary = getRiskSummaryFromForecast(forecast);
  const channelPeaks =
    forecast?.channel_peaks ||
    forecast?.channelPeaks ||
    snapshot?.channel_peaks ||
    snapshot?.channelPeaks ||
    riskSummary?.channel_peaks ||
    riskSummary?.channelPeaks ||
    null;
  const peak = channelPeaks?.[key] || null;
  const peakStart = item?.peakStart ?? item?.peak_start ?? item?.peak?.start ?? peak?.start ?? null;
  const peakEnd = item?.peakEnd ?? item?.peak_end ?? item?.peak?.end ?? peak?.end ?? null;

  return {
    key,
    exact: key,
    role: item?.role || (index === 0 ? "primary" : "secondary"),
    main_trigger: item?.main_trigger || compat.main_trigger,
    trigger_dir: item?.trigger_dir || compat.trigger_dir,
    label: getCompatTriggerLabel(item?.main_trigger || compat.main_trigger, item?.trigger_dir || compat.trigger_dir),
    effective_load: item?.effective_load,
    effectiveLoad: item?.effectiveLoad ?? item?.effective_load,
    weather_strength: item?.weather_strength,
    weatherStrength: item?.weatherStrength ?? item?.weather_strength,
    affinity_weight: item?.affinity_weight,
    affinityWeight: item?.affinityWeight ?? item?.affinity_weight,
    peak_start: peakStart,
    peak_end: peakEnd,
    peakStart,
    peakEnd,
  };
}

export function getForecastTriggerFactors(forecast) {
  if (!forecast) return [];

  const snapshot = getForecastSnapshot(forecast);
  const riskSummary = getRiskSummaryFromForecast(forecast);
  const raw =
    (Array.isArray(forecast.trigger_factors) && forecast.trigger_factors.length ? forecast.trigger_factors : null) ||
    (Array.isArray(snapshot?.trigger_factors) && snapshot.trigger_factors.length ? snapshot.trigger_factors : null) ||
    (Array.isArray(riskSummary?.trigger_factors) && riskSummary.trigger_factors.length ? riskSummary.trigger_factors : null) ||
    null;

  if (raw) {
    return raw.slice(0, 2).map((item, index) => normalizeForecastTriggerFactor(item, index, forecast));
  }

  const primaryExact = getForecastTriggerKey(forecast);
  const secondaryExact =
    forecast.personal_secondary_trigger_exact ||
    snapshot?.personal_secondary_trigger_exact ||
    riskSummary?.secondary_trigger_exact ||
    null;

  const factors = [normalizeForecastTriggerFactor({ exact: primaryExact, role: "primary" }, 0, forecast)];
  if (secondaryExact && secondaryExact !== primaryExact) {
    factors.push(normalizeForecastTriggerFactor({ exact: secondaryExact, role: "secondary" }, 1, forecast));
  }

  return factors.slice(0, 2);
}



const BODY_SIGN_LABELS = {
  pressure_down: ["頭が重くなりやすい", "首肩がこわばりやすい", "だるさが抜けにくい"],
  pressure_up: ["張りつめ感が出やすい", "首肩に力が入りやすい", "気分が落ち着きにくい"],
  damp: ["体が重だるくなりやすい", "眠気が出やすい", "胃腸が重く感じやすい"],
  humidity: ["体が重だるくなりやすい", "眠気が出やすい", "胃腸が重く感じやすい"],
  cold: ["手足やお腹が冷えやすい", "腰・首肩がこわばりやすい", "動き出しにくさが出やすい"],
  heat: ["熱がこもって疲れやすい", "のぼせ・イライラが出やすい", "汗で消耗しやすい"],
  dry: ["喉・肌・目が乾きやすい", "疲れがカサつきとして出やすい", "呼吸が浅くなりやすい"],
};

const PEAK_PREP_ITEMS = {
  pressure_down: ["首肩を固めたまま注意時間に入らない", "目・耳まわりを一度ゆるめる", "大事な作業は早めに寄せる"],
  pressure_up: ["予定を詰め込みすぎない", "肩の力を抜いて呼吸を一度整える", "刺激の強い飲食を控える"],
  damp: ["昼食を重くしすぎない", "甘いものと冷たい飲み物ばかりにしない", "食後に少しだけ歩く"],
  humidity: ["昼食を重くしすぎない", "甘いものと冷たい飲み物ばかりにしない", "食後に少しだけ歩く"],
  cold: ["足首かお腹を先に守る", "冷たい飲み物を続けない", "外に出る前に首元・腰元を確認する"],
  heat: ["暑さを我慢しすぎない", "水分を一気飲みせずこまめに入れる", "熱がこもる前に休憩を挟む"],
  dry: ["喉が渇く前に少しずつ潤す", "目と喉を使いすぎない", "夜更かしで消耗を重ねない"],
};

// 予報カード本文では、気象背景をそのまま雑に混ぜず、
// 「気象変化 → 東洋医学的な偏り → 不調文脈 → 生活語」の順で通す。
// 基本は上位1位の背景だけを本文に反映し、2位以降は背景タグに留める。
function normalizeWeatherContextKey(key) {
  if (key === "humidity") return "damp";
  return key || "pressure_down";
}

function getPrimaryWeatherKey(keys) {
  return normalizeWeatherContextKey(keys?.[0]);
}

const WEATHER_PAIR_LABELS = {
  damp_heat: "湿気と気温上昇",
  damp_cold: "湿気と冷え込み",
  dry_heat: "乾燥と気温上昇",
  dry_cold: "乾燥と冷え込み",
  pressure_down_damp: "気圧低下と湿気",
  pressure_up_heat: "気圧上昇と気温上昇",
};

// 2位背景は、東洋医学的な説明に通しやすい組み合わせだけ本文に使う。
// それ以外は背景タグに留め、本文は1位背景だけで作文する。
function getAllowedWeatherPairKey(keys) {
  const set = new Set(safeArray(keys).map(normalizeWeatherContextKey).filter(Boolean));
  if (set.has("damp") && set.has("heat")) return "damp_heat";
  if (set.has("damp") && set.has("cold")) return "damp_cold";
  if (set.has("dry") && set.has("heat")) return "dry_heat";
  if (set.has("dry") && set.has("cold")) return "dry_cold";
  if (set.has("pressure_down") && set.has("damp")) return "pressure_down_damp";
  if (set.has("pressure_up") && set.has("heat")) return "pressure_up_heat";
  return null;
}

function getSymptomWeatherCopyKey(dictionary, symptomFocus, keys) {
  const pairKey = getAllowedWeatherPairKey(keys);
  if (pairKey && dictionary?.[symptomFocus]?.[pairKey]) return pairKey;
  return getPrimaryWeatherKey(keys);
}

function getWeatherCopyLabel(copyKey, factors) {
  if (WEATHER_PAIR_LABELS[copyKey]) return WEATHER_PAIR_LABELS[copyKey];
  const primary = safeArray(factors)[0];
  return primary?.label || "天気変化";
}

const SYMPTOM_WEATHER_LEADS = {
  fatigue: {
    pressure_down: "頭や体が重く、だるさが抜けにくくなりそうです。",
    pressure_up: "張りつめが続き、あとから疲れを感じやすくなりそうです。",
    damp: "湿気で体が重く、だるさが残りやすくなりそうです。",
    cold: "冷えで動き出しが重くなりやすそうです。",
    heat: "暑さで消耗し、疲れが出やすくなりそうです。",
    dry: "乾燥で目やのどに負担がかかり、疲れを感じやすくなりそうです。",
    damp_heat: "湿気と暑さで体が重く、消耗も重なりやすそうです。",
    damp_cold: "湿気と冷え込みで体が重く、動き出しが鈍りやすくなりそうです。",
    dry_heat: "乾燥と暑さで消耗し、疲れが出やすくなりそうです。",
    dry_cold: "乾燥と冷え込みで体がこわばり、疲れが残りやすくなりそうです。",
    pressure_down_damp: "気圧低下と湿気で、重だるさが残りやすくなりそうです。",
    pressure_up_heat: "気圧上昇と暑さで、張りつめと消耗が重なりやすそうです。",
  },
  sleep: {
    pressure_down: "頭の重さや日中の眠気が、夜まで残りやすくなりそうです。",
    pressure_up: "張りつめが残って、寝る前に力が抜けにくくなりそうです。",
    damp: "湿気で体が重く、眠気や寝起きのだるさが残りやすくなりそうです。",
    cold: "冷えで体がこわばり、休みに入りにくくなりそうです。",
    heat: "暑さがこもって、寝つきや眠りの浅さに響きやすくなりそうです。",
    dry: "目やのどの乾燥で、夜に休まりにくくなりそうです。",
    damp_heat: "湿気と暑さで体は重いのに熱がこもり、休みに入りにくくなりそうです。",
    damp_cold: "湿気と冷え込みで体が重く冷えやすく、眠気や寝起きのだるさが残りやすくなりそうです。",
    dry_heat: "乾燥と暑さで目やのどに負担がかかり、寝る前まで頭が冴えやすくなりそうです。",
    dry_cold: "乾燥と冷え込みで体がこわばり、休まりにくさが残りやすくなりそうです。",
    pressure_down_damp: "気圧低下と湿気で、眠気や体の重さが残りやすくなりそうです。",
    pressure_up_heat: "気圧上昇と暑さで、張りつめや熱のこもりが残りやすくなりそうです。",
  },
  digestion: {
    pressure_down: "お腹の張りや胃もたれを感じやすくなりそうです。",
    pressure_up: "張りつめが胃腸にも出て、食後の重さにつながりやすそうです。",
    damp: "湿気で胃腸まわりが重く感じやすく、もたれや張りが出やすくなりそうです。",
    cold: "冷えで胃腸の動きが鈍り、重さが残りやすくなりそうです。",
    heat: "暑さで冷たいものが増えると、胃腸の負担が出やすくなりそうです。",
    dry: "乾燥でのどや便通のリズムにも負担が出やすくなりそうです。",
    damp_heat: "湿気と暑さで胃腸まわりが重く、冷たいものの負担も出やすくなりそうです。",
    damp_cold: "湿気と冷え込みで胃腸が冷えやすく、食後の重さが残りやすくなりそうです。",
    dry_heat: "乾燥と暑さでのどが渇きやすく、冷たい飲み物が胃腸に響きやすくなりそうです。",
    dry_cold: "乾燥と冷え込みで、胃腸のリズムが乱れやすくなりそうです。",
    pressure_down_damp: "気圧低下と湿気で、胃腸の重さや張りが残りやすくなりそうです。",
    pressure_up_heat: "気圧上昇と暑さで、張りつめや冷たい飲み物の負担が胃腸に出やすくなりそうです。",
  },
  neck_shoulder: {
    pressure_down: "頭や首肩まわりに重さが残りやすくなりそうです。",
    pressure_up: "張りつめが首肩の力みに出やすくなりそうです。",
    damp: "湿気で重だるさが首肩に残りやすくなりそうです。",
    cold: "冷えで首肩がこわばりやすくなりそうです。",
    heat: "暑さで力みが抜けにくく、首肩に疲れが残りやすくなりそうです。",
    dry: "目やのどの乾燥から、首肩の緊張が残りやすくなりそうです。",
    damp_heat: "湿気と暑さで、重だるさと力みが首肩に残りやすくなりそうです。",
    damp_cold: "湿気と冷え込みで首肩が冷えて重く、こわばりやすくなりそうです。",
    dry_heat: "乾燥と暑さで目やのどに負担がかかり、首肩の力みが抜けにくくなりそうです。",
    dry_cold: "乾燥と冷え込みで、首肩がこわばりやすくなりそうです。",
    pressure_down_damp: "気圧低下と湿気で、頭から首肩に重さが残りやすくなりそうです。",
    pressure_up_heat: "気圧上昇と暑さで、首肩の力みや熱っぽさが出やすくなりそうです。",
  },
  low_back_pain: {
    pressure_down: "体の重さが腰やお腹まわりにも残りやすくなりそうです。",
    pressure_up: "張りつめが腰まわりの力みに出やすくなりそうです。",
    damp: "湿気で腰や下半身に重だるさが残りやすくなりそうです。",
    cold: "冷えで腰やお腹まわりがこわばりやすくなりそうです。",
    heat: "暑さで消耗すると、腰まわりの支えが抜けやすくなりそうです。",
    dry: "乾燥や疲れで、腰まわりのこわばりが残りやすくなりそうです。",
    damp_heat: "湿気と暑さで、腰や下半身に重だるさが残りやすくなりそうです。",
    damp_cold: "湿気と冷え込みで、腰や下半身が冷えて重くなりやすそうです。",
    dry_heat: "乾燥と暑さで消耗し、腰まわりの支えが抜けやすくなりそうです。",
    dry_cold: "乾燥と冷え込みで、腰まわりがこわばりやすくなりそうです。",
    pressure_down_damp: "気圧低下と湿気で、腰や下半身に重さが残りやすくなりそうです。",
    pressure_up_heat: "気圧上昇と暑さで、張りつめと消耗が腰まわりに出やすくなりそうです。",
  },
  swelling: {
    pressure_down: "体の水分バランスが重く感じられ、むくみ感が残りやすくなりそうです。",
    pressure_up: "張りつめが続くと、足元の重さやむくみ感につながりやすそうです。",
    damp: "湿気で体が重く、顔や脚のむくみ感が出やすくなりそうです。",
    cold: "冷えで足元が重く、むくみ感が残りやすくなりそうです。",
    heat: "暑さで水分のとり方が乱れると、むくみ感が残りやすくなりそうです。",
    dry: "乾燥で水分のとり方が偏り、むくみ感も残りやすくなりそうです。",
    damp_heat: "湿気と暑さで水分のとり方が乱れ、むくみ感が残りやすくなりそうです。",
    damp_cold: "湿気と冷え込みで足元が重く、むくみ感が残りやすくなりそうです。",
    dry_heat: "乾燥と暑さで水分のとり方が乱れ、むくみ感が残りやすくなりそうです。",
    dry_cold: "乾燥と冷え込みで、足元の重さやむくみ感につながりやすそうです。",
    pressure_down_damp: "気圧低下と湿気で、体の重さやむくみ感が出やすくなりそうです。",
    pressure_up_heat: "気圧上昇と暑さで、張りつめと水分バランスの乱れが重なりやすそうです。",
  },
  headache: {
    pressure_down: "頭・耳・首肩まわりに重さが出やすくなりそうです。",
    pressure_up: "張りつめた感じが、頭まわりの重さや痛みにつながりやすそうです。",
    damp: "湿気で重だるさが残ると、頭まわりも重く感じやすくなりそうです。",
    cold: "冷えで首肩がこわばると、頭まわりにも響きやすくなりそうです。",
    heat: "暑さがこもると、頭の重さやのぼせ感につながりやすそうです。",
    dry: "乾燥で目やのどに負担がかかり、頭まわりに疲れが出やすくなりそうです。",
    damp_heat: "湿気と暑さで、重だるさと熱っぽさが頭まわりに出やすくなりそうです。",
    damp_cold: "湿気と冷え込みで首肩が冷えて重く、頭まわりにも響きやすくなりそうです。",
    dry_heat: "乾燥と暑さで目やのどに負担がかかり、頭まわりに疲れが出やすくなりそうです。",
    dry_cold: "乾燥と冷え込みで首肩がこわばり、頭に響きやすくなりそうです。",
    pressure_down_damp: "気圧低下と湿気で、頭・耳・首肩まわりに重さが出やすくなりそうです。",
    pressure_up_heat: "気圧上昇と暑さで、張りつめや熱っぽさが出やすくなりそうです。",
  },
  dizziness: {
    pressure_down: "頭が重く、立ち上がりのふわつきに気づきやすくなりそうです。",
    pressure_up: "張りつめやのぼせ感が、ふわつきにつながりやすくなりそうです。",
    damp: "湿気で体が重く、動き出しのふわつきに気づきやすくなりそうです。",
    cold: "冷えで首肩がこわばると、動き出しに揺れを感じやすくなりそうです。",
    heat: "暑さで消耗すると、ふわつきが出やすくなりそうです。",
    dry: "乾燥や水分不足で、ふわつきに気づきやすくなりそうです。",
    damp_heat: "湿気と暑さで体が重く、消耗によるふわつきにも気づきやすくなりそうです。",
    damp_cold: "湿気と冷え込みで体が重く冷えやすく、動き出しのふわつきに気づきやすくなりそうです。",
    dry_heat: "乾燥と暑さで消耗し、ふわつきにつながりやすくなりそうです。",
    dry_cold: "乾燥と冷え込みで、動き出しの揺れにつながりやすくなりそうです。",
    pressure_down_damp: "気圧低下と湿気で、頭の重さやふわつきに気づきやすくなりそうです。",
    pressure_up_heat: "気圧上昇と暑さで、張りつめや消耗がふわつきにつながりやすくなりそうです。",
  },
  mood: {
    pressure_down: "頭の重さや沈み込みが、気分にも出やすくなりそうです。",
    pressure_up: "張りつめが強いと、焦りや落ち着かなさが出やすくなりそうです。",
    damp: "湿気で体や胃腸まわりが重くなると、気分の重さも出やすくなりそうです。",
    cold: "冷えで動き出しが重いと、気分も内向きになりやすくなりそうです。",
    heat: "暑さがこもると、そわそわ感や焦りが出やすくなりそうです。",
    dry: "目やのどの乾燥で集中が切れ、気分も揺れやすくなりそうです。",
    damp_heat: "湿気と暑さで、気分の重さと高ぶりが重なりやすくなりそうです。",
    damp_cold: "湿気と冷え込みで体が重く冷えやすく、気分も内向きになりやすくなりそうです。",
    dry_heat: "乾燥と暑さで目やのどに負担がかかり、そわそわ感が出やすくなりそうです。",
    dry_cold: "乾燥と冷え込みで、集中が切れやすくなりそうです。",
    pressure_down_damp: "気圧低下と湿気で重だるさが強まり、気分も沈みやすくなりそうです。",
    pressure_up_heat: "気圧上昇と暑さで、張りつめや高ぶりが出やすくなりそうです。",
  },
};

const SYMPTOM_WEATHER_BODY_SIGN_LABELS = {
  fatigue: {
    pressure_down: ["頭や体が重く、だるさが抜けにくい", "動き出しに時間がかかりやすい"],
    pressure_up: ["張りつめた後に疲れが出やすい", "肩の力みで消耗しやすい"],
    damp: ["体が重だるく感じやすい", "眠気やだるさが残りやすい"],
    cold: ["冷えで動き出しが重くなりやすい", "手足やお腹の冷えで疲れやすい"],
    heat: ["暑さで消耗しやすい", "汗や暑さで疲れが出やすい"],
    dry: ["乾きで疲れが抜けにくい", "のどや目の乾きで集中が切れやすい"],
    damp_heat: ["体は重いのに暑さで消耗しやすい", "だるさと熱こもりが重なりやすい"],
    damp_cold: ["体が重く冷えて、動き出しが鈍りやすい", "だるさと冷えが重なりやすい"],
    dry_heat: ["乾きと暑さで消耗感が出やすい", "のどや目の乾きで疲れやすい"],
    dry_cold: ["冷えと乾きで疲れが残りやすい", "体がこわばって休まりにくい"],
    pressure_down_damp: ["重だるさが強まりやすい", "眠気やだるさが残りやすい"],
    pressure_up_heat: ["張りつめと暑さで疲れやすい", "急いだ後の消耗が出やすい"],
  },
  sleep: {
    pressure_down: ["日中の眠気が夜のリズムにも残りやすい", "頭の重さで寝起きが重くなりやすい"],
    pressure_up: ["張りつめが残って眠りに入りにくい", "肩の力が抜けにくい"],
    damp: ["湿で眠気や寝起きのだるさが残りやすい", "食後の重さが夜まで残りやすい"],
    cold: ["冷えで体が休みに入りにくい", "朝のだるさにつながりやすい"],
    heat: ["熱がこもって寝つきに響きやすい", "寝る前まで頭が冴えやすい"],
    dry: ["目やのどの乾きで休まりにくい", "乾きで眠りが浅く感じやすい"],
    damp_heat: ["体は重いのに熱がこもって寝つきに響きやすい", "眠気と寝苦しさが重なりやすい"],
    damp_cold: ["体が重く冷えて、休みに入りにくい", "寝起きのだるさが残りやすい"],
    dry_heat: ["乾きと熱こもりで頭が冴えやすい", "目やのどの疲れが夜まで残りやすい"],
    dry_cold: ["冷えと乾きで体が休まりにくい", "寝る前にこわばりが残りやすい"],
    pressure_down_damp: ["眠気と体の重さが残りやすい", "寝起きのだるさにつながりやすい"],
    pressure_up_heat: ["張りつめと熱こもりが残りやすい", "寝る前まで頭が冴えやすい"],
  },
  digestion: {
    pressure_down: ["胃腸の動きが重く感じやすい", "お腹の張りやもたれが残りやすい"],
    pressure_up: ["張りつめが胃腸の重さに出やすい", "急いで食べると負担が出やすい"],
    damp: ["胃腸まわりが重く感じやすい", "食後のもたれが残りやすい"],
    cold: ["冷えで胃腸の動きが鈍りやすい", "冷たいものが響きやすい"],
    heat: ["冷たいものが増えると胃腸に負担が出やすい", "暑さで食べ方が乱れやすい"],
    dry: ["のどや便通の乾きに気づきやすい", "水分の入れ方が乱れやすい"],
    damp_heat: ["胃腸の重さと冷たい飲み物の負担が重なりやすい", "もたれや張りが出やすい"],
    damp_cold: ["胃腸が冷えて重くなりやすい", "食後のもたれが残りやすい"],
    dry_heat: ["のどの渇きで冷たい飲み物に寄りやすい", "冷たいものが胃腸に響きやすい"],
    dry_cold: ["冷えと乾きで胃腸のリズムが乱れやすい", "温かい水分が不足しやすい"],
    pressure_down_damp: ["胃腸の重さや張りが残りやすい", "食後のだるさが出やすい"],
    pressure_up_heat: ["張りつめや暑さで食べ方が乱れやすい", "冷たい飲み物が胃腸に響きやすい"],
  },
  neck_shoulder: {
    pressure_down: ["頭から首肩に重さが残りやすい", "首肩のこわばりが出やすい"],
    pressure_up: ["張りつめが首肩の力みに出やすい", "肩に力が入りやすい"],
    damp: ["首肩に重だるさが残りやすい", "肩まわりがすっきりしにくい"],
    cold: ["冷えで首肩がこわばりやすい", "首元を冷やすと固まりやすい"],
    heat: ["暑さで力みが抜けにくい", "汗冷えの後に首肩が固まりやすい"],
    dry: ["目やのどの乾きから首肩が緊張しやすい", "画面作業の疲れが首肩に残りやすい"],
    damp_heat: ["首肩に重だるさと力みが重なりやすい", "汗や暑さで肩の力が抜けにくい"],
    damp_cold: ["首肩が冷えて重くなりやすい", "こわばりと重だるさが重なりやすい"],
    dry_heat: ["目の乾きと熱こもりで首肩が張りやすい", "画面疲れが首肩に出やすい"],
    dry_cold: ["冷えと乾きで首肩がこわばりやすい", "目の疲れと首元の冷えが重なりやすい"],
    pressure_down_damp: ["頭から首肩に重さが出やすい", "首肩の重だるさが残りやすい"],
    pressure_up_heat: ["上にのぼる力みが首肩に出やすい", "肩の力みと暑さの消耗が重なりやすい"],
  },
  low_back_pain: {
    pressure_down: ["腰腹まわりに重さが残りやすい", "下半身の動き出しが重くなりやすい"],
    pressure_up: ["張りつめが腰まわりの力みに出やすい", "急いだ動きで腰に負担が出やすい"],
    damp: ["腰腹・下半身に重だるさが残りやすい", "座りっぱなしで腰が重くなりやすい"],
    cold: ["冷えで腰腹がこわばりやすい", "足元の冷えが腰に響きやすい"],
    heat: ["暑さで消耗すると腰まわりの支えが抜けやすい", "汗冷えで腰が固まりやすい"],
    dry: ["乾きや疲れで腰まわりのこわばりが残りやすい", "水分不足で体が固まりやすい"],
    damp_heat: ["腰腹・下半身に重だるさが残りやすい", "暑さの消耗で腰まわりの支えが抜けやすい"],
    damp_cold: ["腰腹・下半身が冷えて重くなりやすい", "腰のこわばりと重だるさが重なりやすい"],
    dry_heat: ["暑さと乾きで消耗し、腰まわりの支えが抜けやすい", "水分不足で体が固まりやすい"],
    dry_cold: ["冷えと乾きで腰まわりがこわばりやすい", "足元の冷えが腰に響きやすい"],
    pressure_down_damp: ["腰腹・下半身に重さが残りやすい", "座りっぱなしで腰が重くなりやすい"],
    pressure_up_heat: ["張りつめと暑さで腰まわりが疲れやすい", "急いだ動きで腰に負担が出やすい"],
  },
  swelling: {
    pressure_down: ["水の巡りが重く感じやすい", "顔や脚のむくみ感が残りやすい"],
    pressure_up: ["張りつめで足元の巡りが鈍りやすい", "同じ姿勢でむくみ感が出やすい"],
    damp: ["顔や脚のむくみ感が出やすい", "足首まわりが重だるくなりやすい"],
    cold: ["冷えで足元の巡りが鈍りやすい", "足首まわりが重くなりやすい"],
    heat: ["水分の入れ方が乱れるとむくみ感が残りやすい", "暑さでだるさが脚に出やすい"],
    dry: ["水分の入れ方が偏りやすい", "乾きと塩気でむくみ感が残りやすい"],
    damp_heat: ["湿気と暑さでむくみ感が残りやすい", "冷たい飲み物に寄ると脚が重くなりやすい"],
    damp_cold: ["冷えと湿気で足元の巡りが鈍りやすい", "足首まわりに重だるさが残りやすい"],
    dry_heat: ["乾きと暑さで水分の入れ方が乱れやすい", "塩気や冷たい飲み物に寄りやすい"],
    dry_cold: ["冷えと乾きで足元の巡りが鈍りやすい", "水分の入れ方が偏りやすい"],
    pressure_down_damp: ["水の巡りが重く感じやすい", "顔や脚のむくみ感が残りやすい"],
    pressure_up_heat: ["張りつめと暑さで水分の入れ方が乱れやすい", "脚のだるさが残りやすい"],
  },
  headache: {
    pressure_down: ["頭・耳まわりが重くなりやすい", "首肩のこわばりが頭に響きやすい"],
    pressure_up: ["頭まわりに張りを感じやすい", "焦りや力みが頭に響きやすい"],
    damp: ["重だるさが頭まわりにも残りやすい", "頭がすっきりしにくい"],
    cold: ["冷えで首肩がこわばり、頭に響きやすい", "首元の冷えで頭が重くなりやすい"],
    heat: ["熱がこもって頭が重く感じやすい", "のぼせ感が出やすい"],
    dry: ["目の乾きや疲れが頭に響きやすい", "のどや目の乾きで頭が疲れやすい"],
    damp_heat: ["重だるさと熱こもりが頭まわりに出やすい", "冷たい飲み物や刺激に寄りやすい"],
    damp_cold: ["首肩が冷えて重く、頭まわりにも響きやすい", "頭の重さとこわばりが重なりやすい"],
    dry_heat: ["目やのどの乾きと熱こもりが頭に響きやすい", "頭まわりが冴えて疲れやすい"],
    dry_cold: ["冷えと乾きで首肩がこわばり、頭に響きやすい", "目の疲れと首元の冷えが重なりやすい"],
    pressure_down_damp: ["頭・耳・首肩まわりに重さが出やすい", "頭がすっきりしにくい"],
    pressure_up_heat: ["上にのぼる力みや熱こもりが出やすい", "頭まわりに張りを感じやすい"],
  },
  dizziness: {
    pressure_down: ["頭が重く、立ち上がりでふわつきやすい", "動き出しに時間がかかりやすい"],
    pressure_up: ["張りつめや上にのぼる感じでふわつきやすい", "急いで動くと揺れやすい"],
    damp: ["体が重く、動き出しでふわつきやすい", "重だるさで足取りが乱れやすい"],
    cold: ["冷えで首肩がこわばり、動き出しで揺れやすい", "足元の冷えでふわつきやすい"],
    heat: ["暑さで消耗するとふわつきやすい", "汗や暑さで立ち上がりが不安定になりやすい"],
    dry: ["乾きや水分不足でふわつきやすい", "のどの渇きや目の疲れが出やすい"],
    damp_heat: ["体の重さと暑さの消耗でふわつきやすい", "冷たい飲み物に寄ると動き出しが乱れやすい"],
    damp_cold: ["体が重く冷えて、動き出しでふわつきやすい", "足元の冷えと重だるさが重なりやすい"],
    dry_heat: ["乾きと暑さで消耗し、ふわつきやすい", "水分不足に気づきやすい"],
    dry_cold: ["冷えと乾きで体がこわばり、動き出しで揺れやすい", "足元の冷えがふわつきに響きやすい"],
    pressure_down_damp: ["頭の重さやふわつきに気づきやすい", "動き出しに時間がかかりやすい"],
    pressure_up_heat: ["張りつめや暑さの消耗でふわつきやすい", "急いで動くと揺れやすい"],
  },
  mood: {
    pressure_down: ["頭の重さから気分が沈みやすい", "動き出しに時間がかかりやすい"],
    pressure_up: ["焦りや落ち着かなさが出やすい", "肩の力みが気分にも出やすい"],
    damp: ["胃腸まわりの重さから気分も重く感じやすい", "だるさで動き出しが遅れやすい"],
    cold: ["冷えで動き出しが重くなりやすい", "気分が内向きになりやすい"],
    heat: ["そわそわ感や焦りが出やすい", "甘いもの・カフェインで無理に上げたくなりやすい"],
    dry: ["目やのどの疲れで集中が切れやすい", "小さな刺激が気になりやすい"],
    damp_heat: ["体は重いのに気分が落ち着きにくい", "甘いもの・冷たい飲み物に寄りやすい"],
    damp_cold: ["体が重く冷えて、動き出しが遅れやすい", "気分が内向きになりやすい"],
    dry_heat: ["目やのどの疲れでそわそわしやすい", "小さな刺激が気になりやすい"],
    dry_cold: ["体が冷えて、目やのどの疲れも出やすい", "集中が切れやすい"],
    pressure_down_damp: ["重だるさから気分が沈みやすい", "動き出しに時間がかかりやすい"],
    pressure_up_heat: ["焦りや落ち着かなさが出やすい", "肩の力みが気分にも出やすい"],
  },
};

const SYMPTOM_WEATHER_PEAK_PREP_ITEMS = {
  fatigue: {
    pressure_down: ["最初の作業を一つに絞る", "早めに一度休憩を入れる"],
    pressure_up: ["急いで片付けようとせず、休憩を先に入れる", "肩の力を抜いて一呼吸置く"],
    damp: ["昼食を重くしすぎない", "食後に少しだけ歩く"],
    cold: ["足元かお腹を冷やさない", "動き出す前に体を軽く温める"],
    heat: ["涼しさと水分を先に入れる", "暑い場所で粘りすぎない"],
    dry: ["喉が渇く前に少しずつ潤す", "目を休ませる時間を作る"],
    damp_heat: ["涼しさと水分を先に入れる", "昼食を重くしすぎない"],
    damp_cold: ["足元かお腹を冷やさない", "食後に少しだけ歩く"],
    dry_heat: ["涼しさと水分を先に入れる", "目と喉を休ませる"],
    dry_cold: ["温かい飲み物を少し足す", "足元を冷やさない"],
    pressure_down_damp: ["最初の作業を一つに絞る", "食後に少しだけ歩く"],
    pressure_up_heat: ["急いで片付けようとしない", "涼しさと水分を先に入れる"],
  },
  sleep: {
    pressure_down: ["昼寝を長くしすぎない", "寝る前に首肩と目を休ませる"],
    pressure_up: ["寝る前に肩の力を抜く時間を作る", "夜に急ぎの作業を増やさない"],
    damp: ["夜の食べすぎ・飲みすぎを軽くする", "寝る前に胃腸を重くしすぎない"],
    cold: ["寝る前に足元とお腹を冷やさない", "首元を冷やしたまま寝ない"],
    heat: ["寝る前に熱がこもる行動を減らす", "入浴後は少し涼んでから寝る"],
    dry: ["目と喉を休ませてから寝る", "温かい飲み物を少し足す"],
    damp_heat: ["寝る前に熱がこもる行動を減らす", "夜の食べすぎ・飲みすぎを軽くする"],
    damp_cold: ["足元とお腹を冷やさない", "夜の食べすぎを軽くする"],
    dry_heat: ["画面作業を早めに区切る", "入浴後は少し涼んでから寝る"],
    dry_cold: ["目と喉を休ませる", "足元とお腹を冷やさない"],
    pressure_down_damp: ["夜の食べすぎ・飲みすぎを軽くする", "昼寝を長くしすぎない"],
    pressure_up_heat: ["夜に急ぎの作業を増やさない", "寝る前に熱がこもる行動を減らす"],
  },
  digestion: {
    pressure_down: ["食事量を少し軽くする", "急いで食べず、食後に少し歩く"],
    pressure_up: ["急いで食べず、食事前に一呼吸置く", "刺激の強い飲食を控える"],
    damp: ["食べすぎと冷たい飲み物を重ねない", "食後に少しだけ歩く"],
    cold: ["冷たいものを続けず、温かい汁物を足す", "お腹を冷やさない"],
    heat: ["冷たい飲み物を一気に入れず、こまめに潤す", "刺激の強い飲食を控える"],
    dry: ["温かい飲み物を少し足す", "食事を急がずよく噛む"],
    damp_heat: ["冷たい飲み物を一気に入れない", "食べすぎと甘いものを重ねない"],
    damp_cold: ["温かい汁物を足す", "冷たいものを続けない"],
    dry_heat: ["冷たい飲み物を一気に入れず、こまめに潤す", "刺激の強い飲食を控える"],
    dry_cold: ["温かい飲み物を少し足す", "お腹を冷やさない"],
    pressure_down_damp: ["食事量を少し軽くする", "食後に少しだけ歩く"],
    pressure_up_heat: ["急いで食べず、食事前に一呼吸置く", "冷たい飲み物を一気に入れない"],
  },
  neck_shoulder: {
    pressure_down: ["首・耳・目まわりを先にゆるめる", "画面姿勢を一度リセットする"],
    pressure_up: ["肩の力を抜いて一呼吸置く", "急いで片付けようとしない"],
    damp: ["肩甲骨まわりを軽く動かす", "食後に少しだけ歩く"],
    cold: ["首元を冷やさない", "肩を一度落としてから動く"],
    heat: ["汗冷えする前に首元を整える", "涼しさと水分を先に入れる"],
    dry: ["目を休ませて首肩をゆるめる", "喉が渇く前に少し潤す"],
    damp_heat: ["涼しさと水分を先に入れる", "肩甲骨まわりを軽く動かす"],
    damp_cold: ["首元を冷やさない", "肩甲骨まわりを軽く動かす"],
    dry_heat: ["画面作業を区切って目を休ませる", "首肩を一度ゆるめる"],
    dry_cold: ["首元を冷やさない", "目を休ませて首肩をゆるめる"],
    pressure_down_damp: ["首・耳・目まわりを先にゆるめる", "肩甲骨まわりを軽く動かす"],
    pressure_up_heat: ["肩の力を抜いて一呼吸置く", "涼しさと水分を先に入れる"],
  },
  low_back_pain: {
    pressure_down: ["座りっぱなしを一度切る", "立ち上がる前に腰を小さく動かす"],
    pressure_up: ["急に立ち上がらない", "力んだ姿勢を続けすぎない"],
    damp: ["座りっぱなしを一度切る", "食後に少しだけ歩く"],
    cold: ["腰腹か足首を冷やさない", "深く座る前に骨盤を小さく動かす"],
    heat: ["暑い場所で粘りすぎない", "水分をこまめに入れる"],
    dry: ["水分を少しずつ入れる", "同じ姿勢を続けすぎない"],
    damp_heat: ["座りっぱなしを一度切る", "涼しさと水分を先に入れる"],
    damp_cold: ["腰腹か足首を冷やさない", "座りっぱなしを一度切る"],
    dry_heat: ["水分を少しずつ入れる", "暑い場所で粘りすぎない"],
    dry_cold: ["腰腹か足首を冷やさない", "同じ姿勢を続けすぎない"],
    pressure_down_damp: ["座りっぱなしを一度切る", "立ち上がる前に腰を小さく動かす"],
    pressure_up_heat: ["急に立ち上がらない", "涼しさと水分を先に入れる"],
  },
  swelling: {
    pressure_down: ["同じ姿勢を長く続けず、足首を動かす", "塩気と甘いものを重ねない"],
    pressure_up: ["力んだ姿勢を続けすぎない", "足首を小さく動かす"],
    damp: ["甘いもの・塩気・冷たい飲み物を重ねない", "足首を小さく動かす"],
    cold: ["足元を冷やさず、同じ姿勢を続けすぎない", "足首を小さく動かす"],
    heat: ["水分を一気飲みせず、こまめに入れる", "塩気と冷たい飲み物を重ねない"],
    dry: ["水分を少しずつ入れる", "塩気を重ねすぎない"],
    damp_heat: ["水分を一気飲みせず、こまめに入れる", "甘いもの・塩気・冷たい飲み物を重ねない"],
    damp_cold: ["足元を冷やさない", "足首を小さく動かす"],
    dry_heat: ["水分を少しずつ入れる", "塩気と冷たい飲み物を重ねない"],
    dry_cold: ["足元を冷やさない", "水分を少しずつ入れる"],
    pressure_down_damp: ["同じ姿勢を長く続けず、足首を動かす", "甘いもの・塩気・冷たい飲み物を重ねない"],
    pressure_up_heat: ["力んだ姿勢を続けすぎない", "水分を一気飲みせず、こまめに入れる"],
  },
  headache: {
    pressure_down: ["首・耳・目まわりを先にゆるめる", "空腹のまま画面作業を続けない"],
    pressure_up: ["急ぎすぎず、肩の力を一度抜く", "刺激の強い飲食を控える"],
    damp: ["脂っこいものとお酒をとりすぎない", "首肩を一度ゆるめる"],
    cold: ["首元を冷やさず、肩を一度落とす", "耳まわりを軽く動かす"],
    heat: ["熱がこもる前に涼しさと水分を入れる", "刺激の強い飲食を控える"],
    dry: ["目を休ませ、喉が渇く前に少し潤す", "画面作業を区切る"],
    damp_heat: ["熱がこもる前に涼しさと水分を入れる", "脂っこいものとお酒をとりすぎない"],
    damp_cold: ["首元を冷やさず、肩を一度落とす", "脂っこいものとお酒をとりすぎない"],
    dry_heat: ["目を休ませ、涼しさと水分を入れる", "刺激の強い飲食を控える"],
    dry_cold: ["首元を冷やさない", "目を休ませてから作業に戻る"],
    pressure_down_damp: ["首・耳・目まわりを先にゆるめる", "脂っこいものとお酒をとりすぎない"],
    pressure_up_heat: ["急ぎすぎず、肩の力を一度抜く", "熱がこもる前に涼しさと水分を入れる"],
  },
  dizziness: {
    pressure_down: ["立ち上がる前に一呼吸置く", "空腹のまま急に動かない"],
    pressure_up: ["急いで動かず、一呼吸置く", "肩や首の力を抜く"],
    damp: ["食後に少しだけ歩く", "動き出しをゆっくりにする"],
    cold: ["足元と首元を冷やさない", "動き出しをゆっくりにする"],
    heat: ["涼しさと水分を先に入れる", "暑い場所で粘りすぎない"],
    dry: ["水分を少しずつ入れる", "目を休ませる"],
    damp_heat: ["涼しさと水分を先に入れる", "動き出しをゆっくりにする"],
    damp_cold: ["足元と首元を冷やさない", "動き出しをゆっくりにする"],
    dry_heat: ["水分を少しずつ入れる", "暑い場所で粘りすぎない"],
    dry_cold: ["足元と首元を冷やさない", "水分を少しずつ入れる"],
    pressure_down_damp: ["立ち上がる前に一呼吸置く", "動き出しをゆっくりにする"],
    pressure_up_heat: ["急いで動かず、一呼吸置く", "涼しさと水分を先に入れる"],
  },
  mood: {
    pressure_down: ["最初の予定を一つに絞る", "甘いもの・カフェインで無理に上げない"],
    pressure_up: ["急いで片付けようとせず、休憩を先に入れる", "肩の力を抜いて一呼吸置く"],
    damp: ["予定を詰めすぎず、軽く体を動かして気分を変える", "甘いものと冷たい飲み物ばかりにしない"],
    cold: ["首元や足元を冷やさず、最初の予定を軽めにする"],
    heat: ["涼しさと水分を先に入れて、無理に上げない", "甘いもの・カフェインで勢いをつけすぎない"],
    dry: ["画面作業を区切り、温かい飲み物で休憩を入れる"],
    damp_heat: ["涼しさと水分を先に入れる", "甘いものと冷たい飲み物ばかりにしない", "一度に片付けようとしない"],
    damp_cold: ["首元や足元を冷やさない", "最初の予定を一つに絞る"],
    dry_heat: ["画面作業を区切って目を休ませる", "涼しさと水分を先に入れる"],
    dry_cold: ["首元や足元を冷やさない", "温かい飲み物で休憩を入れる"],
    pressure_down_damp: ["最初の予定を一つに絞る", "軽く体を動かして気分を変える"],
    pressure_up_heat: ["急いで片付けようとせず、休憩を先に入れる", "甘いもの・カフェインで勢いをつけすぎない"],
  },
};


function getSymptomWeatherLead(symptomFocus, keys) {
  const copyKey = getSymptomWeatherCopyKey(SYMPTOM_WEATHER_LEADS, symptomFocus, safeArray(keys));
  return SYMPTOM_WEATHER_LEADS[symptomFocus]?.[copyKey] || null;
}

function getSymptomWeatherItems(dictionary, symptomFocus, keys) {
  const copyKey = getSymptomWeatherCopyKey(dictionary, symptomFocus, keys);
  const items = dictionary[symptomFocus]?.[copyKey] || [];
  return safeArray(items);
}


const FORECAST_SYMPTOM_LABELS = {
  fatigue: "だるさ",
  sleep: "睡眠",
  digestion: "胃腸",
  neck_shoulder: "首肩",
  low_back_pain: "腰",
  swelling: "むくみ",
  headache: "頭痛",
  dizziness: "めまい",
  mood: "気分",
};

function getSymptomFocusLabel(symptomFocus) {
  return FORECAST_SYMPTOM_LABELS[symptomFocus] || "今気になる不調";
}

const SYMPTOM_BODY_SIGN_LABELS = {
  fatigue: ["だるさが残りやすい", "動き出しが重くなりやすい", "休んでも抜けにくく感じやすい"],
  sleep: ["画面・光の影響が夜まで残りやすい", "寝る前に体が休みに入りにくい", "朝のだるさにつながりやすい"],
  digestion: ["胃もたれやお腹の張りが残りやすい", "食後の重さが出やすい", "冷たいものや食べすぎが負担になりやすい"],
  neck_shoulder: ["首元・肩甲骨まわりがこわばりやすい", "画面姿勢で肩の力が抜けにくい", "頭〜首の重さとして感じやすい"],
  low_back_pain: ["腰腹・骨盤まわりが重くなりやすい", "座りっぱなしで腰に残りやすい", "動き出しでこわばりを感じやすい"],
  swelling: ["顔や脚の重さが残りやすい", "足首まわりが重く感じやすい", "冷たさ・甘さ・塩気が重なりやすい"],
  headache: ["頭・目・耳まわりにこもりやすい", "首肩のこわばりが頭に響きやすい", "空腹・画面刺激のあとに頭が重くなりやすい"],
  dizziness: ["ふわつき感が出やすい", "立ち上がりで揺れを感じやすい", "首や耳まわりの緊張が残りやすい"],
  mood: ["気分の重さや焦りが出やすい", "甘いもの・カフェインで無理に上げたくなりやすい", "予定の詰め込みが負担になりやすい"],
};

const SYMPTOM_STABLE_BODY_POINTS = {
  fatigue: ["午後に残る小さな重だるさ", "動き出しの重さ", "休んでも抜けにくい感じ"],
  sleep: ["夕方以降の目・頭の冴え", "画面を見た後の休まりにくさ", "朝に残るだるさ"],
  digestion: ["食後に残る小さな重さ", "お腹の張り感", "朝の胃腸の重さ"],
  neck_shoulder: ["首元・肩甲骨まわりのこわばり感", "画面姿勢が続いた後の肩の重さ", "頭〜首に残る重さ"],
  low_back_pain: ["腰腹・骨盤まわりの重さ", "座りっぱなしの後のこわばり感", "動き出しの腰の重さ"],
  swelling: ["夕方の足首まわりの重だるさ", "顔や脚のむくみ感", "冷たさ・甘さ・塩気の残りやすさ"],
  headache: ["頭・目・耳まわりの重さ", "首肩から頭にかけてのこわばり感", "空腹・画面刺激のあとに残る頭の重さ"],
  dizziness: ["立ち上がりのふわつき", "動き出しの揺れ感", "首や耳まわりの緊張感"],
  mood: ["気分の重さや焦り", "あれこれ同時に進めた後の疲れ", "予定を詰めた後の余裕のなさ"],
};

const SYMPTOM_PEAK_PREP_ITEMS = {
  fatigue: ["午後の作業を一つ減らす", "空腹と食べすぎの差を小さくする", "休憩を一つ先に入れる"],
  sleep: ["夕方以降の画面・光を少し減らす", "寝る前に首肩と目を休ませる", "夜の食べすぎ・飲みすぎを避ける"],
  digestion: ["冷たいものを続けない", "食べすぎを一つ減らす", "温かい汁物かお茶を足す"],
  neck_shoulder: ["首元を冷やしたまま固めない", "画面から目を離して肩を落とす", "耳まわりと肩甲骨まわりを一度ゆるめる"],
  low_back_pain: ["座りっぱなしを一度切る", "腰腹か足首を冷やさない", "深く座る前に骨盤を小さく動かす"],
  swelling: ["足首を小さく動かす", "甘いもの・塩気・冷たい飲み物を重ねない", "同じ姿勢を長く続けない"],
  headache: ["首・耳・目まわりを先にゆるめる", "脂っこさやお酒でこもらせない", "画面姿勢を一度リセットする"],
  dizziness: ["立ち上がる前に一呼吸置く", "空腹のまま急に動かない", "首を急に振らず、動き出しをゆっくりにする"],
  mood: ["予定を一つに絞って始める", "途中で別件を増やさない", "甘いもの・カフェインで無理に上げない"],
};

const SYMPTOM_STABLE_PEAK_PREP_ITEMS = {
  fatigue: ["午後の予定を詰めすぎない", "空腹と食べすぎの差を大きくしない", "休憩を一つ先に入れる"],
  sleep: ["夕方以降の画面・光を少し控えめにする", "寝る前に目と首肩を一度休ませる", "夜の食べすぎ・飲みすぎを重ねすぎない"],
  digestion: ["冷たい飲み物を続けすぎない", "食事量を少し軽くする", "温かい汁物かお茶を一つ足す"],
  neck_shoulder: ["首元が冷えていないか確認する", "画面が続いたら肩を一度落とす", "耳まわりを軽く動かす"],
  low_back_pain: ["座りっぱなしを一度だけ切る", "腰腹か足首の冷えを確認する", "深く座る前に骨盤を小さく動かす"],
  swelling: ["足首を小さく動かす", "甘いもの・塩気・冷たい飲み物を重ねすぎない", "同じ姿勢を続けすぎない"],
  headache: ["首・耳・目まわりを一度ゆるめる", "脂っこいものとお酒をとりすぎない", "画面姿勢を一度リセットする"],
  dizziness: ["立ち上がる前に一呼吸置く", "空腹のまま急に動きすぎない", "首を急に振らず、動き出しをゆっくりにする"],
  mood: ["最初の予定を一つに絞る", "一度に片付けようとしない", "甘いもの・カフェインで無理に上げすぎない"],
};

const SYMPTOM_HIGH_PEAK_PREP_ITEMS = {
  fatigue: ["注意時間の前に作業量を一つ減らしておく", "空腹と食べすぎの差を小さくしておく", "注意時間の前に休憩を一つ入れておく"],
  sleep: ["夕方以降の画面・光を先に減らす", "寝る前に首肩と目をしっかり休ませる", "夜の食べすぎ・飲みすぎを避ける"],
  digestion: ["注意時間の前に冷たいものを続けない", "食べすぎを先に避ける", "温かい汁物かお茶を早めにとる"],
  neck_shoulder: ["注意時間の前に首元を冷やしたままにしない", "注意時間の前に画面姿勢を切って肩を落とす", "耳まわりと肩甲骨まわりを先にゆるめる"],
  low_back_pain: ["注意時間の前に座りっぱなしを一度切る", "腰腹か足首を先に冷やさない", "深く座る前に骨盤を小さく動かす"],
  swelling: ["注意時間の前に足首を小さく動かす", "甘いもの・塩辛いもの・冷たい飲み物ばかりにしない", "同じ姿勢を長く続けない"],
  headache: ["注意時間の前に首・耳・目まわりをゆるめる", "脂っこいものとお酒をとりすぎない", "画面姿勢を先にリセットする"],
  dizziness: ["動き出す前に一呼吸置く", "空腹のまま急に動かない", "首を急に振らず、動き出しをゆっくりにする"],
  mood: ["注意時間の前に予定を一つに絞る", "注意時間の前に途中で別件を増やさない", "甘いもの・カフェインで無理に上げない"],
};

const SYMPTOM_MODE_HINTS = {
  fatigue: {
    today: "だるさを見ているなら、動きを増やすより疲れを増やさないことを優先します。",
    tomorrow: "だるさを見ているなら、今夜のうちに予定を一つ軽くしておくと安心です。",
  },
  sleep: {
    today: "睡眠を見ているなら、夜まで画面・光や食後の重さを持ち越さない流れに寄せます。",
    tomorrow: "睡眠を見ているなら、今夜から明朝にかけて冷え・画面時間・食べすぎを残さない準備が合います。",
  },
  digestion: {
    today: "胃腸を見ているなら、冷たいもの・食べすぎ・急いで食べる流れを少し軽くします。",
    tomorrow: "胃腸を見ているなら、今夜の重さを軽くして、明朝に胃腸の負担を残さない準備が合います。",
  },
  neck_shoulder: {
    today: "首肩を見ているなら、首元を冷やしたまま固めないことを優先します。",
    tomorrow: "首肩を見ているなら、今夜から首元と画面姿勢を軽く整えておくと安心です。",
  },
  low_back_pain: {
    today: "腰を見ているなら、腰腹・足首を冷やさず、座りっぱなしを切ることを優先します。",
    tomorrow: "腰を見ているなら、今夜から腰腹・下半身を冷やさない準備が合います。",
  },
  swelling: {
    today: "むくみを見ているなら、冷たさ・甘さ・塩気を重ねすぎないことを優先します。",
    tomorrow: "むくみを見ているなら、今夜の重ね方を軽くして、明朝の重さを増やさない準備が合います。",
  },
  headache: {
    today: "頭痛を見ているなら、首・耳・目まわりにこもらせないことを優先します。",
    tomorrow: "頭痛を見ているなら、今夜から首肩と耳まわりを固めない準備が合います。",
  },
  dizziness: {
    today: "めまいを見ているなら、空腹や急な姿勢変更を避けて、動き出しをゆっくりにします。",
    tomorrow: "めまいを見ているなら、明朝の動き出しを急がない準備をしておくと安心です。",
  },
  mood: {
    today: "気分を見ているなら、甘いものやカフェインで無理に上げるより、予定を一つ軽くします。",
    tomorrow: "気分を見ているなら、今夜は予定を一つ軽くし、画面時間も早めに区切る準備が合います。",
  },
};

function getSymptomModeHint(symptomFocus, mode = "today") {
  return SYMPTOM_MODE_HINTS[symptomFocus]?.[mode] || null;
}

const FORECAST_SYMPTOM_LEAD_CLAUSES = {
  fatigue: {
    low: "だるさは注意したい時間に少し残る見込み",
    middle: "だるさが残りやすい",
    high: "だるさが強く残りやすい",
  },
  sleep: {
    low: "画面・光の影響が睡眠に少し残る見込み",
    middle: "睡眠に響きやすい",
    high: "睡眠に強く響きやすい",
  },
  digestion: {
    low: "胃腸の重さは注意したい時間に少し残る見込み",
    middle: "胃腸に重さが出やすい",
    high: "胃腸の重さが強く出やすい",
  },
  neck_shoulder: {
    low: "首肩は注意したい時間に少し固まりやすい",
    middle: "首肩がこわばりやすい",
    high: "首肩が強くこわばりやすい",
  },
  low_back_pain: {
    low: "腰まわりは注意したい時間に少し重さが出る見込み",
    middle: "腰まわりが重くなりやすい",
    high: "腰まわりが強く重くなりやすい",
  },
  swelling: {
    low: "むくみは夕方に少し残る見込み",
    middle: "むくみが残りやすい",
    high: "むくみが強く残りやすい",
  },
  headache: {
    low: "頭まわりは注意したい時間に少し重さが出る見込み",
    middle: "頭まわりが重くなりやすい",
    high: "頭まわりが強く重くなりやすい",
  },
  dizziness: {
    low: "ふわつきは動き出しに少し出る見込み",
    middle: "ふわつきが出やすい",
    high: "ふわつきが強く出やすい",
  },
  mood: {
    low: "気分の重さや焦りが少し出る見込み",
    middle: "気分が揺れやすい",
    high: "気分が強く揺れやすい",
  },
};

function getSignalTone(signal) {
  const level = Number(signal ?? 0);
  if (level >= 2) return "high";
  if (level >= 1) return "middle";
  return "low";
}

function getForecastSymptomLeadClause(symptomFocus, signal = 0) {
  const tone = getSignalTone(signal);
  return FORECAST_SYMPTOM_LEAD_CLAUSES[symptomFocus]?.[tone] || null;
}

function qualifyBodySignForSignal(text, signal = 0) {
  const raw = String(text || "").trim();
  if (!raw) return "";

  const level = Number(signal ?? 0);
  if (level === 0) {
    if (raw.includes("少し")) return raw;
    if (raw.includes("が")) return raw.replace("が", "が少し");
    if (raw.includes("に")) return raw.replace("に", "に少し");
    return `少し${raw}`;
  }

  if (level >= 2) {
    if (raw.includes("強く")) return raw;
    if (raw.includes("が")) return raw.replace("が", "が強く");
    if (raw.includes("に")) return raw.replace("に", "に強く");
    return `強く${raw}`;
  }

  return raw;
}

function uniqueTake(items, limit = 3) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const text = String(item || "").trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
    if (result.length >= limit) break;
  }
  return result;
}

function toWeatherIconKey(key) {
  if (key === "humidity") return "damp";
  if (key === "temp") return "cold";
  return key || "pressure_down";
}

function clamp01Number(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1, n));
}

function getWeatherStressLevelLabel(value, role) {
  const n = clamp01Number(value);
  if (n == null) {
    if (role === "primary") return "大";
    if (role === "secondary") return "中";
    return "";
  }
  if (n >= 0.67) return "大";
  if (n >= 0.34) return "中";
  return "小";
}

function getWeatherStressLevelTone(value, role) {
  const n = clamp01Number(value);
  if (n == null) {
    return role === "primary" ? "high" : role === "secondary" ? "middle" : "low";
  }
  if (n >= 0.67) return "high";
  if (n >= 0.34) return "middle";
  return "low";
}

export function getForecastBackgroundFactors(triggerFactors) {
  return safeArray(triggerFactors).slice(0, 2).map((factor) => {
    const key = factor?.key || factor?.exact || "pressure_down";
    // 表示は「天気ストレス」なので、純粋な weather_strength を優先。
    // 旧データや一部経路で無い場合だけ、体質込みの effective_load を fallback にする。
    const stressValue =
      factor?.weather_strength ??
      factor?.weatherStrength ??
      factor?.weather_load ??
      factor?.effective_load ??
      factor?.effectiveLoad ??
      null;

    return {
      key: toWeatherIconKey(key),
      label: factor?.label || "気象変化",
      role: factor?.role || null,
      stressValue: clamp01Number(stressValue),
      stressPercent: clamp01Number(stressValue) == null ? null : Math.round(clamp01Number(stressValue) * 100),
      levelLabel: getWeatherStressLevelLabel(stressValue, factor?.role),
      levelTone: getWeatherStressLevelTone(stressValue, factor?.role),
      peakStart: factor?.peak_start ?? factor?.peakStart ?? factor?.peak?.start ?? null,
      peakEnd: factor?.peak_end ?? factor?.peakEnd ?? factor?.peak?.end ?? null,
    };
  });
}

const WEATHER_LOAD_GROUP_ORDER = ["temperature", "moisture", "pressure"];

const WEATHER_LOAD_GROUP_LABELS = {
  temperature: "気温負荷",
  moisture: "湿度負荷",
  pressure: "気圧負荷",
};

function weatherLoadGroupFromExact(exact) {
  if (["cold", "heat", "temp_shift", "temperature_shift"].includes(exact)) return "temperature";
  if (["damp", "dry", "humidity"].includes(exact)) return "moisture";
  if (["pressure_down", "pressure_up", "pressure_shift"].includes(exact)) return "pressure";
  return null;
}

function weatherLoadIconKey(exact, direction) {
  if (exact === "temp_shift" || exact === "temperature_shift") {
    return direction === "down" ? "cold" : "heat";
  }
  if (exact === "pressure_shift") return direction === "up" ? "pressure_up" : "pressure_down";
  return toWeatherIconKey(exact);
}

function weatherLoadDetailLabel({ group, exact, direction, weatherStrength, load }) {
  const meaningful = Number(weatherStrength || 0) > 0.05 || Number(load || 0) > 0.05;
  if (!meaningful) return "大きな変化なし";
  if (group === "temperature") {
    if (exact === "cold") return "冷え込み";
    if (exact === "heat") return "気温上昇";
    return "寒暖差";
  }
  if (group === "moisture") return exact === "dry" ? "乾燥" : "湿気";
  if (direction === "mixed") return "上下変動";
  return exact === "pressure_up" || direction === "up" ? "気圧上昇" : "気圧低下";
}

/**
 * Forecast UI representation for all three weather groups.
 *
 * V2 snapshots expose personal_load (weather x affinity x reserve). Older
 * snapshots are kept renderable by filling known primary/secondary factors and
 * showing an em dash for groups that were not stored at the time.
 */
export function getForecastWeatherLoadGroups(forecast) {
  if (!forecast) return [];
  const snapshot = getForecastSnapshot(forecast);
  const riskContext = forecast?.computed?.radar_plan_meta?.risk_context || null;
  const riskSummary = riskContext?.summary || null;
  const personalizedMeta = riskContext?.meta?.personalized_meta || null;
  const rawGroups =
    forecast?.weather_load_groups ||
    snapshot?.weather_load_groups ||
    riskSummary?.weather_load_groups ||
    riskContext?.weather_context?.weather_load_groups ||
    personalizedMeta?.weather_load_groups ||
    personalizedMeta?.effective_weather_groups ||
    null;

  const byGroup = {};
  if (Array.isArray(rawGroups)) {
    rawGroups.forEach((item) => {
      const group = item?.group || weatherLoadGroupFromExact(item?.exact || item?.key);
      if (group) byGroup[group] = item;
    });
  } else if (rawGroups && typeof rawGroups === "object") {
    Object.entries(rawGroups).forEach(([entryKey, item]) => {
      const group = item?.group || (WEATHER_LOAD_GROUP_ORDER.includes(entryKey) ? entryKey : weatherLoadGroupFromExact(item?.exact || item?.key));
      if (group) byGroup[group] = item;
    });
  }

  // Compatibility for forecasts generated before the three-group UI existed.
  if (Object.keys(byGroup).length === 0) {
    getForecastTriggerFactors(forecast).forEach((factor) => {
      const exact = factor?.exact || factor?.key;
      const group = weatherLoadGroupFromExact(exact);
      if (group && !byGroup[group]) byGroup[group] = factor;
    });
  }

  const channelPeaks =
    forecast?.channel_peaks ||
    snapshot?.channel_peaks ||
    riskSummary?.channel_peaks ||
    riskContext?.weather_context?.channel_peaks ||
    null;
  const reserveScalar = Number(personalizedMeta?.reserve_scalar || 1);

  return WEATHER_LOAD_GROUP_ORDER.map((group) => {
    const item = byGroup[group] || null;
    const exact = item?.exact || item?.key || (
      group === "temperature" ? "temp_shift" : group === "moisture" ? "damp" : "pressure_down"
    );
    const direction = item?.direction || item?.trigger_dir || null;
    const effective = clamp01Number(item?.effective_load ?? item?.effectiveLoad);
    const storedPersonal = clamp01Number(item?.personal_load ?? item?.display_load);
    const load = storedPersonal ?? (effective == null ? null : clamp01Number(effective * reserveScalar));
    const weatherStrength = clamp01Number(item?.weather_strength ?? item?.weatherStrength);
    const iconKey = weatherLoadIconKey(exact, direction);
    const peak = channelPeaks?.[exact] || channelPeaks?.[iconKey] || null;
    const peakStart = item?.peak_start ?? item?.peakStart ?? peak?.start ?? null;
    const peakEnd = item?.peak_end ?? item?.peakEnd ?? peak?.end ?? null;
    const showPeak = load != null && load >= 0.08;

    return {
      group,
      key: iconKey,
      exact,
      direction,
      label: WEATHER_LOAD_GROUP_LABELS[group],
      detailLabel: weatherLoadDetailLabel({ group, exact, direction, weatherStrength, load }),
      load,
      loadPercent: load == null ? null : Math.round(load * 100),
      weatherStrength,
      peakStart: showPeak ? peakStart : null,
      peakEnd: showPeak ? peakEnd : null,
      personalized: item?.personalized !== false,
    };
  });
}

function softenPeakPrepItem(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  return raw
    .replace("午後の作業を一つ減らす", "午後の予定を詰めすぎない")
    .replace("空腹と食べすぎの差を小さくする", "空腹と食べすぎの差を大きくしない")
    .replace("休憩を一つ先に入れる", "休憩を一つ先に入れる")
    .replace("夕方以降の画面・光を少し減らす", "夕方以降の画面・光を少し控えめにする")
    .replace("寝る前に首肩と目を休ませる", "寝る前に目と首肩を一度休ませる")
    .replace("夜の食べすぎ・飲みすぎを避ける", "夜の食べすぎ・飲みすぎを重ねすぎない")
    .replace("首元を冷やしたまま固めない", "注意時間の前に首元の冷えだけ確認する")
    .replace("画面から目を離して肩を落とす", "画面姿勢が続いたら肩を一度落とす")
    .replace("耳まわりと肩甲骨まわりを一度ゆるめる", "耳まわりか肩甲骨まわりを軽くゆるめる")
    .replace("座りっぱなしを一度切る", "座りっぱなしを一度だけ切る")
    .replace("腰腹か足首を冷やさない", "腰腹か足首の冷えだけ確認する")
    .replace("深く座る前に骨盤を小さく動かす", "深く座る前に骨盤を小さく動かす")
    .replace("足首を小さく動かす", "足首を小さく動かす")
    .replace("甘いもの・塩気・冷たい飲み物を重ねない", "甘いもの・塩気・冷たい飲み物を重ねすぎない")
    .replace("同じ姿勢を長く続けない", "同じ姿勢を続けすぎない")
    .replace("首・耳・目まわりを先にゆるめる", "首・耳・目まわりを一度ゆるめる")
    .replace("脂っこさやお酒でこもらせない", "脂っこいものとお酒をとりすぎない")
    .replace("画面姿勢を一度リセットする", "画面姿勢を一度リセットする")
    .replace("立ち上がる前に一呼吸置く", "立ち上がる前に一呼吸置く")
    .replace("空腹のまま急に動かない", "空腹のまま急に動きすぎない")
    .replace("首を急に振らず、動き出しをゆっくりにする", "首を急に振らず、動き出しをゆっくりにする")
    .replace("予定を一つに絞って始める", "最初の予定を一つに絞る")
    .replace("途中で別件を増やさない", "一度に片付けようとしない")
    .replace("甘いもの・カフェインで無理に上げない", "甘いもの・カフェインで無理に上げすぎない");
}

function strengthenPeakPrepItem(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  if (raw.includes("先に") || raw.includes("注意時間の前に")) return raw;
  if (raw.includes("一度")) return raw.replace("一度", "注意時間の前に一度");
  return `注意時間の前に${raw}`;
}


// v7.44: 未病レーダー文体。比喩は使いすぎず、初見でも体感が伝わる言葉を優先する。\n// v7.30: 正論の健康アドバイスではなく、
// 「体のクセを少し面白く読めるトリセツ」として出す。
const RADAR_NARRATIVE_LEADS = {
  fatigue: {
    default: ["体の立ち上がりが、いつもよりゆっくりになりやすい日", "だるさは気合い不足というより、体が省エネ運転に入りやすいサインかもしれません", "まずは動く量を増やすより、重さを増やさない一手から始めましょう"],
    damp: ["体が湿気を吸った布団みたいに重くなりやすい日", "胃腸まわりがもたつくと、だるさまで長引きやすくなります", "まずは空気・食べ方・足もとを軽くして、体の起動を助けましょう"],
    pressure_down: ["頭と体の立ち上がりが、少しスローモーションになりやすい日", "気圧低下でこもり感が出ると、休んでも抜けにくいだるさに感じやすくなります", "目・首・呼吸を短く切り替えて、ぼんやりをため込まないようにしましょう"],
    pressure_up: ["体が知らないうちに前のめりになりやすい日", "張りつめたまま進むと、あとからどっと疲れとして出やすくなります", "用事を急いで全部進めるより、肩の力を一度抜いてから動きましょう"],
    cold: ["体のエンジンが冷えたまま始まりやすい日", "足元やお腹が冷えると、だるさが“動き出せなさ”として出やすくなります", "まずは一か所だけ温めて、体の起動条件を整えましょう"],
    heat: ["暑さで体力を消耗しやすい日", "熱がこもると、動く前から消耗しているように感じやすくなります", "がんばる前に涼しさと水分を入れて、残量を守りましょう"],
    dry: ["体のうるおいが少し削られやすい日", "目やのどの乾きが続くと、疲れがカサついた感じで残りやすくなります", "水分・目の休憩・深い息を先に入れて、消耗を増やさないようにしましょう"],
  },
  sleep: {
    default: ["夜の休み方まで、日中の過ごし方が残りやすい日", "体は疲れているのに、頭だけ閉店準備に入れないことがあります", "夕方以降は光・胃腸の重さ・考えごとを少しずつ減らしましょう"],
    damp: ["体が湿気を抱えて、眠気とだるさが混ざりやすい日", "重いまま夜に入ると、寝ても抜けにくい感じにつながりやすくなります", "寝る前に空気と胃腸を軽くして、休む準備を早めに始めましょう"],
    pressure_down: ["昼のぼんやりが、夜の休まりにくさまで残りやすい日", "頭・首・耳まわりの重さが残ると、眠気はあるのに休みに入りにくくなります", "画面と首のこわばりを早めに切って、夜の入口を軽くしましょう"],
    pressure_up: ["体のスイッチが切れにくくなりやすい日", "張りつめが残ると、布団に入っても頭の中だけ休みに入りにくくなりがちです", "寝る前に通知と予定確認を終わらせ、体を休むモードへ寄せましょう"],
    cold: ["冷えが残ると、体が休みに入りにくい日", "足元やお腹が冷えたままだと、眠りの入口で体が身構えやすくなります", "寝る前は足首・お腹・首元のどこか一つを守りましょう"],
    heat: ["熱がこもると、眠りの入口が遠くなりやすい日", "体は疲れているのに、頭や胸まわりだけ少し熱っぽく残ることがあります", "寝る前に部屋と体の熱を逃がして、クールダウンしてから休みましょう"],
    dry: ["乾きが夜の小さな不快感になりやすい日", "目やのどが乾いたままだと、眠りの浅さとして気づきやすくなります", "枕元の水分と風の向きを整えて、乾きを増やさない夜にしましょう"],
  },
  digestion: {
    default: ["胃腸の重さが、体全体に影響しやすい日", "食べ方が重なると、体全体の動きまで少し渋滞しやすくなります", "量を減らすより、冷たい・甘い・脂っこいの重なりをほどきましょう"],
    damp: ["胃腸が水を含んだスポンジみたいに重く感じやすい日", "湿気の日は、冷たいものや甘いものが続くとお腹まわりがもたつきやすくなります", "今日は“軽く流れる食べ方”に寄せて、胃腸を止めっぱなしにしないようにしましょう"],
    pressure_down: ["胃腸の動きまで少しスローになりやすい日", "気圧低下で体が重い時は、食後のもたれも長引いて感じやすくなります", "食べる量より、食後に動き出せる軽さを目安にしましょう"],
    pressure_up: ["急ぎモードが胃腸にも入りやすい日", "張りつめたまま食べると、量は普通でも重く感じやすくなります", "食べ始める前に一呼吸置いて、胃腸を置き去りにしないようにしましょう"],
    cold: ["お腹まわりが冷えると、胃腸が省エネ運転になりやすい日", "冷たいものが続くと、食後の重さや張りとして出やすくなります", "温かい汁物や飲み物を一つ挟んで、内側を固めすぎないようにしましょう"],
    heat: ["暑さで冷たいものに寄りたくなる日", "一気に冷やすと、その場は楽でも胃腸があとから重く感じやすくなります", "冷たさだけで押し切らず、常温や温かい一口も混ぜましょう"],
    dry: ["乾きで胃腸のリズムも少しカサつきやすい日", "水分の入り方が偏ると、のど・お腹・便通の小さな違和感につながりやすくなります", "汁物や水分のある食べものを足して、流れを止めないようにしましょう"],
  },
  neck_shoulder: {
    default: ["首肩まわりが、いつもより荷物を背負いやすい日", "首本人を直接がんばらせるより、胸・肩甲骨・目の使い方が影響しやすくなります", "首を回す前に、まず肩甲骨と胸からほどきましょう"],
    damp: ["首肩まわりに、湿った上着を一枚かぶったような重さが出やすい日", "湿気で体がもたつくと、肩だけでなく頭まわりまで重く感じやすくなります", "首をがんばって回すより、肩甲骨と胸からほどきましょう"],
    pressure_down: ["頭から首肩に、重さが降りてきやすい日", "気圧低下で耳・首・後頭部がこもると、肩まで負担が残りやすくなります", "耳まわりと肩甲骨を軽く動かして、首だけに仕事を背負わせないようにしましょう"],
    pressure_up: ["肩に力が入りっぱなしになりやすい日", "張りつめが上にのぼると、首肩が“待機中”のまま固まりやすくなります", "急いで伸ばすより、息を吐いて肩をストンと落としましょう"],
    cold: ["首元が冷えると、肩が防御モードに入りやすい日", "冷えで首肩が縮むと、頭まわりまで重く感じやすくなります", "首元を守りつつ、肩甲骨を小さく動かして固まる前にほどきましょう"],
    heat: ["暑さで首の後ろに熱と力みが残りやすい日", "汗冷えや画面姿勢が重なると、肩の力が抜けにくくなります", "首の後ろを短く整え、肩をすくめて落とすくらいから始めましょう"],
    dry: ["目とのどの乾きが、首肩の緊張にまわりやすい日", "画面を見続けると、目の疲れが首の後ろに回収されがちです", "目を閉じる時間を作って、首肩の仕事量を減らしましょう"],
  },
  low_back_pain: {
    default: ["腰まわりが、体の土台として余分に働きやすい日", "腰だけを責めるより、足元・お腹・座り方の影響が出やすくなります", "腰をいきなり伸ばすより、骨盤と足首から小さく動かしましょう"],
    damp: ["腰から下半身に、湿った重さが残りやすい日", "座りっぱなしが続くと、腰まわりに水袋を乗せたような重さとして出やすくなります", "立ち上がる前に骨盤を小さく動かして、下半身の渋滞を切りましょう"],
    pressure_down: ["体の重さが腰まわりに沈みやすい日", "気圧低下で姿勢が崩れると、腰が支え役を引き受けすぎることがあります", "深く座り込む前に、骨盤の位置を一度だけリセットしましょう"],
    pressure_up: ["急ぎモードが腰の力みに出やすい日", "立つ・座る・かがむ動きが雑になると、腰に負担が集まりやすくなります", "急に動くより、一呼吸置いてから腰を使いましょう"],
    cold: ["腰腹まわりが冷えて、動き出しが重くなりやすい日", "足首やお腹の冷えが残ると、腰が守りに入りやすくなります", "腰だけでなく足元かお腹を一つ温めて、土台から守りましょう"],
    heat: ["暑さで体力が削られ、腰の支えが抜けやすい日", "汗や消耗が重なると、いつもの姿勢でも腰が疲れやすくなります", "水分を小分けに入れて、重い動きは短く区切りましょう"],
    dry: ["体のしなやかさが少し乾きやすい日", "水分不足や同じ姿勢が続くと、腰まわりがきしむように感じやすくなります", "水分と体勢変更を小さく入れて、固まる前にほどきましょう"],
  },
  swelling: {
    default: ["体の水はけが、いつもよりのんびりしやすい日", "同じ姿勢や冷たさが続くと、顔や脚に重さとして残りやすくなります", "足首を小さく動かして、ため込む前に流れを作りましょう"],
    damp: ["体が湿気を抱えて、顔や脚に重さが出やすい日", "湿気の日は、甘いもの・塩気・冷たい飲み物が重なると、水はけがさらにのんびりしがちです", "足首を動かし、冷たさと塩気の重なりを少し減らしましょう"],
    pressure_down: ["下半身に重さが沈みやすい日", "気圧低下で体が重い時は、脚の巡りもゆっくりになりやすくなります", "ふくらはぎと足首を小さく動かして、重さを足元で止めないようにしましょう"],
    pressure_up: ["体が力み、水の巡りまで固まりやすい日", "同じ姿勢でいると、足元に重さが残りやすくなります", "肩の力を抜きつつ、足首だけでも小さく動かしましょう"],
    cold: ["足元が冷えると、水はけまでゆっくりになりやすい日", "冷えと同じ姿勢が重なると、脚の重さとして気づきやすくなります", "足首を冷やさず、つま先を数回動かして流れを止めないようにしましょう"],
    heat: ["暑さで水分の入れ方が乱れやすい日", "一気飲みや塩気が重なると、脚のだるさとして残りやすくなります", "水分はこまめに、足首は小さく動かして、ため込まない方向へ寄せましょう"],
    dry: ["乾きと水分の偏りが、むくみ感にもつながりやすい日", "足りないのに偏る、という少しややこしい水分バランスになりがちです", "水分を少しずつ入れ、塩気と冷たさを重ねすぎないようにしましょう"],
  },
  headache: {
    default: ["頭まわりが、首・目・耳の影響を拾いやすい日", "頭だけを見るより、首肩と画面刺激の負担が出やすくなります", "首・耳・目を先にゆるめて、頭に仕事を集めすぎないようにしましょう"],
    damp: ["頭に湿気がまとわりつくような重さが出やすい日", "体の重だるさが上に残ると、頭まわりもすっきりしにくくなります", "空気を入れ替え、首肩をゆるめて、こもりを逃がしましょう"],
    pressure_down: ["頭・耳・首肩がセットで重くなりやすい日", "気圧低下の日は、頭だけでなく耳まわりと首のこわばりも一緒に見たいところです", "耳まわりを軽く動かし、画面姿勢を一度リセットしましょう"],
    pressure_up: ["頭の上の方に、張りつめが集まりやすい日", "焦りや力みが続くと、頭まわりに圧がかかるように感じやすくなります", "刺激を増やすより、肩を落として呼吸を長めに吐きましょう"],
    cold: ["首元の冷えが、頭まわりに響きやすい日", "首肩が縮むと、後頭部から頭の重さにつながりやすくなります", "首元を守って、肩をすくめて落とすくらいから始めましょう"],
    heat: ["熱が上にこもって、頭まわりが重く感じやすい日", "暑さ・刺激・水分不足が重なると、頭の中が混み合いやすくなります", "涼しさと水分を先に入れて、熱を上にためないようにしましょう"],
    dry: ["目とのどの乾きが、頭まわりの疲れに変わりやすい日", "画面や乾いた空気が続くと、頭の奥が疲れたように感じやすくなります", "目を閉じる時間と水分を先に入れて、乾いた疲れを増やさないようにしましょう"],
  },
  dizziness: {
    default: ["体の向きが変わる瞬間に、揺れを感じやすい日", "急いで動くほど、頭と体のタイミングがずれやすくなります", "立つ・振り向く・歩き出す前に、一呼吸だけ挟みましょう"],
    damp: ["体が重く、動き出しでふわっとしやすい日", "湿気で足取りが重い時は、頭だけ先に動かすと揺れを感じやすくなります", "急に立たず、足元からゆっくり起動しましょう"],
    pressure_down: ["頭と耳まわりが重く、ふわつきに気づきやすい日", "気圧低下の日は、動き出しの一拍目を急がない方が合います", "耳まわりを軽くゆるめて、立ち上がる前に一呼吸置きましょう"],
    pressure_up: ["上にのぼる力みで、ふわつきやすい日", "急いで動くと、頭だけ前に出て体が追いつきにくくなることがあります", "肩の力を抜いて、動き出しを一段ゆっくりにしましょう"],
    cold: ["足元や首元が冷えると、動き出しが不安定になりやすい日", "冷えで体が固まると、立つ瞬間の揺れに気づきやすくなります", "足指を数回動かしてから、ゆっくり立ち上がりましょう"],
    heat: ["暑さで消耗し、ふわつきに気づきやすい日", "我慢して動き続けると、体力が急に抜けたように感じることがあります", "涼しさと水分を先に入れて、粘りすぎないようにしましょう"],
    dry: ["乾きと水分不足で、ふわつきに気づきやすい日", "のどや目の乾きが出る前から、水分不足のサインが出ていることがあります", "少しずつ潤して、動き出しをゆっくりにしましょう"],
  },
  mood: {
    default: ["気分だけでなく、体の状態に気持ちが引っぱられやすい日", "やる気の問題に見えても、胃腸・呼吸・首肩の重さが背景にあるかもしれません", "気分を直接上げるより、体の負担を一つ減らすところから始めましょう"],
    damp: ["気分だけが落ちているというより、体の重さに気分が引っぱられやすい日", "湿気で胃腸まわりがもたつくと、考えることまで少し重く感じやすくなります", "無理にテンションを上げるより、空気・食べ方・体の動きを軽くしていきましょう"],
    pressure_down: ["頭の重さに、気分まで引っぱられやすい日", "ぼんやり感が続くと、気持ちまで少し沈んだように感じやすくなります", "やる気を責めるより、首・目・呼吸を短く切り替えていきましょう"],
    pressure_up: ["頭だけ前のめりになり、気分が急かされやすい日", "張りつめが続くと、焦りや落ち着かなさとして出やすくなります", "急いで整えようとせず、肩を落として息を長めに吐きましょう"],
    cold: ["体が縮こまると、気分も内向きになりやすい日", "手足や首元の冷えが続くと、気持ちまで小さく固まりやすくなります", "まずは一か所温めて、体から少し外向きに戻しましょう"],
    heat: ["熱がこもると、気分も少しそわそわしやすい日", "暑さや刺激が重なると、焦りやイライラが前に出やすくなります", "甘いものやカフェインで上げる前に、涼しさと水分を入れましょう"],
    dry: ["小さな乾きが、気分のざらつきに変わりやすい日", "目やのどの不快感が続くと、集中が切れて気持ちも揺れやすくなります", "画面を区切り、温かい飲み物で内側を少し落ち着かせましょう"],
  },
  default: {
    default: ["体の小さなサインに気づきやすい日", "天気の変化が、いつもの弱いところに少し出るかもしれません", "強い対策より、今できる一手で軽く整えましょう"],
  },
};

const RADAR_NARRATIVE_SIGN_BY_SYMPTOM = {
  fatigue: ["目は覚めているのに、体の立ち上がりが遅く感じやすい", "少し動いただけで、だるさが戻りやすい", "休んでも体の重さが抜けにくい"],
  sleep: ["眠いのに、頭だけ休む準備に入りにくい", "夕方以降の光や画面が、夜まで残りやすい", "胃腸の重さが、休まりにくさに変わりやすい"],
  digestion: ["胃腸が重いと、体全体の動きも鈍くなりやすい", "食後に“もう少し座っていたい”が出やすい", "冷たい・甘い・脂っこいが重なると、もたつきが残りやすい"],
  neck_shoulder: ["首肩が“重い服”を着たみたいに感じやすい", "頭を支えるだけで、首すじが疲れやすい", "肩を回しても、すぐ戻る感じが出やすい"],
  low_back_pain: ["腰まわりが、体の土台として余分に働きやすい", "座りっぱなしの後、立ち上がりが重くなりやすい", "腰だけでなく、足元やお腹の冷えも響きやすい"],
  swelling: ["顔や脚に、水分の重さを感じやすい", "足首まわりが、夕方にぼんやり重くなりやすい", "冷たさ・甘さ・塩気が重なると、重さが残りやすい"],
  headache: ["頭だけでなく、首・耳・目まわりもセットで重くなりやすい", "画面刺激のあと、頭の中が混み合いやすい", "首肩のこわばりが、頭まわりに回収されやすい"],
  dizziness: ["立ち上がりや振り向きで、体の向きが一拍遅れやすい", "頭だけ先に動いて、体があとから追いつく感じが出やすい", "空腹・急な動き・首のこわばりが重なると揺れを感じやすい"],
  mood: ["胃腸が重い日は、気分にも湿気がたまりやすい", "体がまだ切り替わらないのに、頭だけ先に焦りやすい", "やる気がないというより、体が動き出すまでに時間がかかりやすい"],
  default: ["いつもより体の小さな違和感に気づきやすい", "注意時間に向けて、重さやこわばりが少し出やすい", "無理に押すより、軽く整える方が合いやすい"],
};

const RADAR_NARRATIVE_STABLE_SIGN_BY_SYMPTOM = {
  // 安定の日は断定しすぎず、「少し〜かも」で小さな観察ポイントとして出す。
  fatigue: ["体の立ち上がりが少しゆっくりになるかも", "少し動いた後に、だるさが戻るかも", "休んだあとも重さが少し残るかも"],
  sleep: ["頭だけ休む準備に入りにくいかも", "夕方以降の光や画面が少し残るかも", "胃腸の重さが夜まで少し残るかも"],
  digestion: ["食後に“もう少し座っていたい”が出るかも", "胃腸の動きが少しゆっくりになるかも", "冷たい・甘い・脂っこいが重なると、少しもたつくかも"],
  neck_shoulder: ["首肩が“重い服”を着たように少し重く感じるかも", "頭を支えるだけで、首すじが少し疲れるかも", "肩を回しても、すぐ戻るかも"],
  low_back_pain: ["腰まわりが土台として少し働きすぎるかも", "座りっぱなしの後、立ち上がりが少し重いかも", "足元やお腹の冷えが、腰に少し回るかも"],
  swelling: ["顔や脚に水分の重さが少し残るかも", "足首まわりが夕方にぼんやり重いかも", "冷たさ・甘さ・塩気が重なると、少し残るかも"],
  headache: ["頭だけでなく首・耳・目も少し重いかも", "画面を見た後、頭の中が少し混み合うかも", "首肩のこわばりが、頭に少し回るかも"],
  dizziness: ["立ち上がりや振り向きで、体の向きが一拍遅れるかも", "頭だけ先に動いて、体があとから追いつくかも", "空腹・急な動き・首のこわばりが重なると、少し揺れるかも"],
  mood: ["胃腸の重さが、気分に少し移るかも", "体がまだ切り替わらないのに、頭だけ先に焦るかも", "やる気がないというより、体が動き出すまで少し時間がかかるかも"],
  default: ["いつもより小さな違和感が出るかも", "注意時間に向けて、重さが少し残るかも", "無理に押すより、軽く整える方が合うかも"],
};

const RADAR_NARRATIVE_STABLE_WEATHER_POINT = {
  damp: "体に湿気の重い膜が、少しかかるかも",
  pressure_down: "頭・耳・首まわりに、少しこもるかも",
  pressure_up: "体が知らないうちに、少し前のめりになるかも",
  cold: "体の入口が、少しきゅっと縮むかも",
  heat: "熱が上にこもって、少しそわつくかも",
  dry: "目・のど・肌のカサつきが、少し疲れに変わるかも",
};

const RADAR_NARRATIVE_WEATHER_SIGN = {
  damp: "体に湿気の重い膜がかかったように感じやすい",
  pressure_down: "頭・耳・首まわりに、こもる重さが出やすい",
  pressure_up: "体が知らないうちに前のめりになりやすい",
  cold: "体の入口がきゅっと縮んで、動き出しが重くなりやすい",
  heat: "熱が上にこもって、消耗やそわつきが出やすい",
  dry: "目・のど・肌の乾きが、疲れやこわばりに変わりやすい",
};

const RADAR_NARRATIVE_WEATHER_ACTIONS = {
  damp: "部屋の空気を5分だけ入れ替えて、体にまとわりつく重さを外へ逃がす",
  pressure_down: "耳まわりと首の後ろを10秒だけゆるめて、頭のこもりを逃がす",
  pressure_up: "肩をすくめてストンと落とし、前のめりの力みを一度ほどく",
  cold: "足首・お腹・首元のどこか一つを温め、冷えを防ぐ",
  heat: "暑さを我慢で突破せず、涼しさと水分を先に入れる",
  dry: "喉が渇く前に一口入れて、目を10秒だけ閉じる",
};

const RADAR_NARRATIVE_WEATHER_AVOIDS = {
  damp: "甘いものとキンキンの飲み物だけで、気分や体を無理やり起こそうとしない",
  pressure_down: "ぼんやりをカフェインだけで押し切らず、首と耳の重さも一緒に逃がす",
  pressure_up: "用事を急いで進めるほど、肩と頭に力が集まりやすいので一呼吸置く",
  cold: "冷たい飲み物で内側まで冷やして、こわばりに追い打ちをかけない",
  heat: "辛いもの・濃い味・カフェインで、熱とそわつきを上乗せしない",
  dry: "乾いたお菓子とコーヒーだけで、内側のカサつきを増やさない",
};

const RADAR_NARRATIVE_TOMORROW_WEATHER_ACTIONS = {
  damp: "今夜のうちに部屋の空気を一度入れ替えて、明日の重さを持ち越しにくくする",
  pressure_down: "寝る前に耳まわりと首の後ろを軽くゆるめて、明日のこもり感を増やさない",
  pressure_up: "明日の前のめり感に備えて、今夜は肩を落として終わる時間を作る",
  cold: "足首・お腹・首元のどこか一つを守って、明日のこわばりを増やさない",
  heat: "涼しさと水分を先に入れて、明日の消耗を持ち越しにくくする",
  dry: "寝る前の一口と目の休憩で、明日の乾いた疲れを増やさない",
};

const RADAR_NARRATIVE_TOMORROW_SYMPTOM_ACTIONS = {
  fatigue: "明日の起動を軽くするため、寝る前に足首か肩を30秒だけ動かす",
  sleep: "明日の夜まで引きずらないよう、今夜は画面と光を少し早めに区切る",
  digestion: "明日の胃腸を重くしないよう、夜は冷たい・甘い・脂っこいの重なりを一つ外す",
  neck_shoulder: "明日の首肩を固めないよう、寝る前に肩甲骨をゆっくり寄せて離す",
  low_back_pain: "明日の立ち上がりを軽くするため、寝る前に骨盤を小さく揺らす",
  swelling: "明日の水はけを助けるため、足首をゆっくり回してから休む",
  headache: "明日の頭まわりを軽くするため、首・耳・目を短くゆるめておく",
  dizziness: "明日の動き出しに備えて、足元からゆっくり起動する準備をしておく",
  mood: "明日の気分を直接上げようとする前に、今夜は体の負担を一つ減らす",
  default: "明日の自分が動き出しやすいよう、体のどこか一つを30秒だけゆるめる",
};

const RADAR_NARRATIVE_TOMORROW_AVOIDS = {
  damp: "冷たいものと甘いものを重ねすぎず、明日の胃腸に湿気を残しすぎない",
  pressure_down: "夜の画面とカフェインで頭を起こしっぱなしにせず、首と耳を軽く休ませる",
  pressure_up: "明日のことを考えすぎて、頭だけ前のめりのまま眠らない",
  cold: "寝る前に内側まで冷やして、明日のこわばりを増やさない",
  heat: "辛いもの・濃い味・カフェインで、熱とそわつきを夜に残しすぎない",
  dry: "乾いたお菓子とコーヒーだけで終わらせず、一口だけ潤いを足す",
};

const RADAR_NARRATIVE_STABLE_AVOIDS = {
  damp: "冷たいものと甘いものが重なりすぎないよう、どこか一つだけ外す",
  pressure_down: "ぼんやりをカフェインだけで押し切らず、首か耳を一度だけゆるめる",
  pressure_up: "用事を急いで進める前に、肩を一度ストンと落とす",
  cold: "冷たい飲み物で内側まで冷やしすぎない",
  heat: "暑さを我慢で通さず、水分と涼しさを一度だけ先に入れる",
  dry: "乾いたお菓子とコーヒーだけで、内側のカサつきを増やさない",
};

const RADAR_NARRATIVE_SYMPTOM_ACTIONS = {
  fatigue: "やる気を待つより、足踏み30秒で体のスイッチを先に入れる",
  sleep: "夜のために、夕方の画面と光を一度だけ区切る",
  digestion: "胃腸を止めっぱなしにしないよう、食後に2〜3分だけ歩く",
  neck_shoulder: "首本人をいきなり回さず、肩甲骨をゆっくり寄せて離す",
  low_back_pain: "立ち上がる前に骨盤を小さく揺らして、腰の起動準備をする",
  swelling: "足首をゆっくり回して、水はけのスイッチを入れる",
  headache: "首・耳・目まわりを先にゆるめて、頭だけに仕事を集めない",
  dizziness: "立つ・振り向く・歩き出す前に、一呼吸だけ入れる",
  mood: "気分を直接上げようとせず、肩か足首を30秒だけ動かす",
  default: "考える前に、体のどこか一つを30秒だけ動かす",
};

const RADAR_STABLE_WEATHER_LEAD_PREFIX = {
  damp: "湿気の重さが少し残る時間だけ",
  pressure_down: "気圧の変化を感じる時間だけ",
  pressure_up: "体が少し前のめりになりそうな時間だけ",
  cold: "冷えを感じる場面だけ",
  heat: "熱がこもりやすい時間だけ",
  dry: "乾きが気になる場面だけ",
};

const RADAR_STABLE_SYMPTOM_LEAD_TAIL = {
  fatigue: "体を急に起こさず、足踏み30秒くらいから始めると過ごしやすそうです",
  sleep: "夕方以降の光と画面を少し区切ると、夜に持ち越しにくそうです",
  digestion: "食後に2〜3分だけ歩くと、胃腸を止めっぱなしにせずに済みそうです",
  neck_shoulder: "首を直接回すより、肩甲骨を軽く動かしておくとよさそうです",
  low_back_pain: "立ち上がる前に骨盤を小さく揺らすと、腰まわりが動き出しやすそうです",
  swelling: "足首をゆっくり回すと、水はけのスイッチを入れやすそうです",
  headache: "首・耳・目まわりを短くゆるめると、頭に仕事を集めすぎずに済みそうです",
  dizziness: "立ち上がりや振り向きをゆっくりにすると、体が追いつきやすそうです",
  mood: "気分を上げようとする前に、空気と体の動きを軽くしておくとよさそうです",
  default: "体のどこか一つを30秒だけ動かすと、小さく整えやすそうです",
};

function getStableNarrativeLead(triggerFactors, mode = "today", symptomFocus = null) {
  const key = getNarrativePrimaryKey(triggerFactors);
  const target = mode === "today" ? "今日は" : "明日は";
  const weatherPrefix = RADAR_STABLE_WEATHER_LEAD_PREFIX[key] || "天気の変化を感じる時間だけ";
  const symptomTail = RADAR_STABLE_SYMPTOM_LEAD_TAIL[symptomFocus] || RADAR_STABLE_SYMPTOM_LEAD_TAIL.default;
  const base = mode === "today" ? "大きく崩れにくい日" : "大きく崩れにくそうな日";
  return `${target}${base}。${weatherPrefix}、${symptomTail}。`;
}

function adaptNarrativeActionForMode(action, mode = "today") {
  const text = String(action || "").trim();
  if (!text) return "";
  if (mode === "today") return text;
  return text
    .replace(/^まずは/, "今夜は")
    .replace(/^今日は/, "今夜は")
    .replace(/^急に立たず、/, "明日に備えて、")
    .replace(/^立つ・振り向く・歩き出す前に、/, "明日に備えて、動き出しの前に");
}

function getNarrativePrimaryKey(triggerFactors) {
  const first = safeArray(triggerFactors)[0];
  return normalizeWeatherContextKey(first?.key || first?.exact || "pressure_down");
}

function getNarrativeLeadText(triggerFactors, signal = 0, mode = "today", symptomFocus = null) {
  const key = getNarrativePrimaryKey(triggerFactors);
  const target = mode === "today" ? "今日は" : "明日は";
  const record = RADAR_NARRATIVE_LEADS[symptomFocus] || RADAR_NARRATIVE_LEADS.default;
  const parts = record?.[key] || record?.default || RADAR_NARRATIVE_LEADS.default.default;
  const level = Number(signal ?? 0);

  if (level <= 0) {
    return getStableNarrativeLead(triggerFactors, mode, symptomFocus);
  }

  const state = String(parts[0] || "体の小さなサインに気づきやすい日").trim();
  const action = adaptNarrativeActionForMode(parts[2], mode);
  const normalizedState = level >= 2
    ? state.replace(/少し/g, "").replace(/小さな/g, "")
    : state;

  return action
    ? `${target}${normalizedState}。${action}。`
    : `${target}${normalizedState}。`;
}

function getNarrativeBodySigns(triggerFactors, signal = 0, symptomFocus = null, mode = "today") {
  const key = getNarrativePrimaryKey(triggerFactors);
  const level = Number(signal ?? 0);

  if (level === 0) {
    const symptomPoints = RADAR_NARRATIVE_STABLE_SIGN_BY_SYMPTOM[symptomFocus] || RADAR_NARRATIVE_STABLE_SIGN_BY_SYMPTOM.default;
    const weatherPoint = RADAR_NARRATIVE_STABLE_WEATHER_POINT[key];
    return uniqueTake([weatherPoint, ...symptomPoints], 3);
  }

  const symptomSigns = RADAR_NARRATIVE_SIGN_BY_SYMPTOM[symptomFocus] || RADAR_NARRATIVE_SIGN_BY_SYMPTOM.default;
  const weatherSign = RADAR_NARRATIVE_WEATHER_SIGN[key];

  // 見出し側で「今日/明日」を出すため、本文はサイン単体として読める形にする。
  return uniqueTake([weatherSign, ...symptomSigns], 3);
}

function getNarrativePeakPrepItems(triggerFactors, signal = 0, symptomFocus = null, mode = "today") {
  const key = getNarrativePrimaryKey(triggerFactors);
  const level = Number(signal ?? 0);

  if (mode !== "today") {
    const weatherAction = RADAR_NARRATIVE_TOMORROW_WEATHER_ACTIONS[key] || RADAR_NARRATIVE_TOMORROW_WEATHER_ACTIONS.pressure_down;
    const symptomAction = RADAR_NARRATIVE_TOMORROW_SYMPTOM_ACTIONS[symptomFocus] || RADAR_NARRATIVE_TOMORROW_SYMPTOM_ACTIONS.default;
    const avoid = RADAR_NARRATIVE_TOMORROW_AVOIDS[key] || "夜のうちに一つだけ軽く整えて、明日に重さを持ち越しすぎない";
    return uniqueTake([weatherAction, symptomAction, avoid], 3);
  }

  const weatherAction = RADAR_NARRATIVE_WEATHER_ACTIONS[key] || RADAR_NARRATIVE_WEATHER_ACTIONS.pressure_down;
  const symptomAction = RADAR_NARRATIVE_SYMPTOM_ACTIONS[symptomFocus] || RADAR_NARRATIVE_SYMPTOM_ACTIONS.default;
  const strongAvoid = RADAR_NARRATIVE_WEATHER_AVOIDS[key] || "無理に押し切るより、体の重いサインを一つ減らす";
  const stableAvoid = RADAR_NARRATIVE_STABLE_AVOIDS[key] || "いつもの調子を崩さないよう、重さを増やす要素を一つだけ外す";
  const avoid = level === 0 ? stableAvoid : strongAvoid;
  const first = level >= 2 && !weatherAction.startsWith("注意時間") ? `注意時間の前に、${weatherAction}` : weatherAction;
  return uniqueTake([first, symptomAction, avoid], 3);
}

const CARE_STRATEGY_WEATHER_FEEL = {
  damp: "体にまとわりつく重さ",
  pressure_down: "頭・耳・首まわりのこもり",
  pressure_up: "前のめりの力み",
  cold: "冷えからくるこわばり",
  heat: "上にこもる熱と消耗",
  dry: "乾きからくる小さな不快感",
  default: "天気で出やすい小さなゆらぎ",
};

const CARE_ITEM_HINTS = {
  today: {
    live: {
      damp: "家にあるなら、除湿・換気・通気を助けるものを使う日。空気を軽くすると、体の重さも少し逃がしやすくなります。",
      pressure_down: "首・耳・目まわりを休ませる日。温めるもの、アイピロー、首肩をゆるめる小物があると使いやすいです。",
      pressure_up: "肩と胸の力を抜く日。香り・温かい飲み物・手首や足首をゆるめる道具があるなら、短く使うのが合います。",
      cold: "冷えを入口で止める日。カイロ、腹巻き、レッグウォーマーなど“冷える前に守るもの”が使いやすいです。",
      heat: "熱を逃がす日。冷感タオル、日よけ、麦茶など、がんばる前に熱を抜く候補があると便利です。",
      dry: "乾きを増やさない日。加湿・保湿・のどを守るもの、目を休ませるものが候補になります。",
      default: "家にある道具を一つだけ使って、体の負担を軽くする日。足すより“軽くする”ものを選びます。",
    },
    eat: {
      damp: "飲み物や汁物を選ぶなら、冷たく甘いものより、ほうじ茶・とうもろこし茶・温かい汁物が候補です。",
      pressure_down: "ぼんやりをカフェインだけで押すより、軽い主食・味噌汁・ほうじ茶など、あとで重くなりにくいものが候補です。",
      pressure_up: "刺激で押すより、麦茶・ルイボスティー・軽い汁物など、前のめりを足さないものが候補です。",
      cold: "冷たいものを続けるより、白湯・ほうじ茶・温かい汁物など、内側を冷やしすぎない候補を選びます。",
      heat: "辛さや濃い味で押すより、麦茶・豆腐・軽い汁物など、熱をこもらせにくい候補が使いやすいです。",
      dry: "乾いた菓子とコーヒーだけでつなぐより、ルイボスティー・白湯・汁物・ごま系のちょい足しが候補です。",
      default: "食材を完璧に選ぶより、飲み物・汁物・主食を一つだけ軽くする候補を見ます。",
    },
    loosen: {
      damp: "強くほぐすより、足元やお腹まわりを軽く流す日。ツボ押し棒や温める道具があれば短時間で十分です。",
      pressure_down: "耳・首・後頭部を休ませる日。首肩を温めるものや、目を休ませるものが候補になります。",
      pressure_up: "肩と胸の力みを抜く日。押し込む道具より、手首・足首・香りなど“力を抜くきっかけ”を選びます。",
      cold: "冷えて固まる前に守る日。温熱系や足元を冷やさないものを使うなら、短く早めが合います。",
      heat: "熱を上にこもらせない日。冷やしすぎず、首の後ろを短く整えるものが候補になります。",
      dry: "乾きで目・首肩がこわばる日。目を休めるもの、首肩をやさしくゆるめるものが使いやすいです。",
      default: "ほぐす道具は“効かせる”より、力を抜くきっかけとして短く使うのが合います。",
    },
  },
  tomorrow: {
    live: {
      damp: "明日の湿気に備えるなら、今夜は除湿・通気・寝具まわりの候補を先に見ておくと選びやすいです。",
      pressure_down: "明日のこもり感に備えるなら、首肩を休ませるもの、耳・目まわりをゆるめるものを今夜の候補にします。",
      pressure_up: "明日の力みに備えるなら、香り・温かい飲み物・通知を切る工夫など、前のめりをほどく候補を見ておきます。",
      cold: "明日の冷えに備えるなら、足首・お腹・首元を守るアイテムを今夜のうちに出しておくと楽です。",
      heat: "明日の暑さに備えるなら、冷感タオル・日よけ・水分補給まわりを今夜の候補に入れておきます。",
      dry: "明日の乾燥に備えるなら、加湿・保湿・のど/目を守るものを寝る前に準備しておくと選びやすいです。",
      default: "明日の自分が迷わないよう、使う道具を一つだけ先に決めておくとケアにつながりやすいです。",
    },
    eat: {
      damp: "明日の朝に重さを残したくない日は、はとむぎ茶・とうもろこし茶・温かい汁物などを今夜の候補にします。",
      pressure_down: "明日の低気圧に備えるなら、ほうじ茶・味噌汁・軽い主食など、朝に重くなりにくい候補を見ておきます。",
      pressure_up: "明日の前のめり感に備えるなら、麦茶・ルイボスティー・豆腐や軽い汁物など、刺激を足さない候補を選びます。",
      cold: "明日の冷えに備えるなら、白湯・ほうじ茶・温かい汁物など、朝の内側を冷やさない候補を先に見ます。",
      heat: "明日の暑さに備えるなら、麦茶・豆腐・トマト・軽い汁物など、熱をこもらせにくい候補を見ておきます。",
      dry: "明日の乾燥に備えるなら、白湯・ルイボスティー・汁物・ごま系など、うるおいを足す候補を用意します。",
      default: "明日の予報に合わせて、飲み物・汁物・朝食候補を先に見ておくと、朝の選択が楽になります。",
    },
    loosen: {
      damp: "明日は重さが残りやすい見込み。足元・お腹・胃腸まわりを短く整える道具を、今夜の候補にしておきます。",
      pressure_down: "明日は頭・耳・首まわりがこもりやすい見込み。首肩を休めるものやアイピロー系を先に出しておくと使いやすいです。",
      pressure_up: "明日は肩や胸が力みやすい見込み。強く押す道具より、手首・足首・香りなど力を抜く候補が合います。",
      cold: "明日は冷えで固まりやすい見込み。温熱系や足元を守るものを、寝る前の候補にします。",
      heat: "明日は熱が上に残りやすい見込み。首の後ろを短く整えるもの、熱を逃がすものを候補にします。",
      dry: "明日は乾きで目・首肩がこわばりやすい見込み。目を休めるもの、首肩をやさしくゆるめるものが候補です。",
      default: "明日の注意時間の前に使えるよう、ほぐす場所と道具を一つだけ先に決めておきます。",
    },
  },
};

function getNarrativeCareLead(triggerFactors, signal = 0, mode = "today", symptomFocus = null) {
  const key = getNarrativePrimaryKey(triggerFactors);
  const labels = safeArray(triggerFactors).map((f) => f?.label).filter(Boolean);
  const joined = labels.length >= 2 ? `${labels[0]}と${labels[1]}` : labels[0] || "天気変化";
  const symptom = getSymptomFocusLabel(symptomFocus);
  const feel = CARE_STRATEGY_WEATHER_FEEL[key] || CARE_STRATEGY_WEATHER_FEEL.default;
  const level = Number(signal ?? 0);

  if (mode === "today") {
    if (level <= 0) {
      return `今日は${joined}の影響は小さめ。${feel}だけ軽く見ながら、暮らす・食べる・ほぐすを“足しすぎないケア”にします。`;
    }
    return `今日は${joined}で、${feel}が出やすい日。${symptom}に合わせて、暮らす・食べる・ほぐすで負担を増やさない方針です。`;
  }

  if (level <= 0) {
    return `明日は${joined}の影響は小さめ。今夜のうちに、睡眠・飲み物・ほぐす場所を少し整えて、安定を崩さない方針です。`;
  }
  return `明日は${joined}で、${feel}が出やすい見込み。今夜のうちに、空間・食べもの・ほぐす道具の候補まで軽く決めておく方針です。`;
}

export function getCareItemHint(category = "live", triggerFactors = [], mode = "today", symptomFocus = null) {
  const key = getNarrativePrimaryKey(triggerFactors);
  const safeMode = mode === "tomorrow" ? "tomorrow" : "today";
  const safeCategory = ["live", "eat", "loosen"].includes(category) ? category : "live";
  const hints = CARE_ITEM_HINTS[safeMode]?.[safeCategory] || CARE_ITEM_HINTS.today.live;
  return hints[key] || hints.default || "";
}

export function getForecastBodySigns(triggerFactors, signal = 0, symptomFocus = null, mode = "today") {
  const narrative = getNarrativeBodySigns(triggerFactors, signal, symptomFocus, mode);
  if (narrative.length) return narrative;

  const level = Number(signal ?? 0);
  const keys = safeArray(triggerFactors).map((factor) => factor?.key || factor?.exact).filter(Boolean);
  const focusedWeatherSigns = getSymptomWeatherItems(SYMPTOM_WEATHER_BODY_SIGN_LABELS, symptomFocus, keys);

  if (level === 0) {
    const stablePoints = SYMPTOM_STABLE_BODY_POINTS[symptomFocus] || [];
    const weatherPoints = keys.flatMap((key) => BODY_SIGN_LABELS[normalizeWeatherContextKey(key)] || [])
      .map((item) => String(item || "").replace(/感じやすい/g, "感じ").replace(/なりやすい/g, "なりそうな場面").replace(/出やすい/g, "出そうな場面"));
    return uniqueTake(
      [
        ...focusedWeatherSigns,
        ...stablePoints,
        ...weatherPoints,
        "注意したい時間に、小さな違和感が出るかも",
        "だるさがいつもより少し残るかも",
        "動き出しで少しこわばるかも",
      ],
      3
    );
  }

  const symptomSigns = (SYMPTOM_BODY_SIGN_LABELS[symptomFocus] || [])
    .map((item) => qualifyBodySignForSignal(item, level));
  const signs = [
    ...focusedWeatherSigns,
    ...symptomSigns,
    ...keys.flatMap((key) => BODY_SIGN_LABELS[normalizeWeatherContextKey(key)] || []),
  ];
  return uniqueTake(signs.length ? signs : ["重だるさが出やすい", "首肩がこわばりやすい", "疲れが残りやすい"], 3);
}

export function getForecastPeakPrepItems(triggerFactors, signal = 0, symptomFocus = null, mode = "today") {
  const narrative = getNarrativePeakPrepItems(triggerFactors, signal, symptomFocus, mode);
  if (narrative.length) return narrative;

  const level = Number(signal ?? 0);
  const keys = safeArray(triggerFactors).map((factor) => factor?.key || factor?.exact).filter(Boolean);
  const weatherItems = keys.flatMap((key) => PEAK_PREP_ITEMS[normalizeWeatherContextKey(key)] || []);
  const focusedWeatherItems = getSymptomWeatherItems(SYMPTOM_WEATHER_PEAK_PREP_ITEMS, symptomFocus, keys);

  if (level === 0) {
    const stableItems = SYMPTOM_STABLE_PEAK_PREP_ITEMS[symptomFocus] || [];
    return uniqueTake(
      [
        ...focusedWeatherItems.map(softenPeakPrepItem),
        ...stableItems,
        ...weatherItems.map(softenPeakPrepItem),
        "注意時間の前に一度だけ体勢を変える",
        "食事と休憩のリズムを大きく崩さない",
        "違和感が出たら早めに一息入れる",
      ],
      3
    );
  }

  if (level >= 2) {
    const highSymptomItems = SYMPTOM_HIGH_PEAK_PREP_ITEMS[symptomFocus] || [];
    const normalSymptomItems = SYMPTOM_PEAK_PREP_ITEMS[symptomFocus] || [];
    const highWeatherItems = weatherItems.map(strengthenPeakPrepItem);
    return uniqueTake(
      [
        ...focusedWeatherItems.map(strengthenPeakPrepItem),
        ...highSymptomItems,
        ...normalSymptomItems.map(strengthenPeakPrepItem),
        ...highWeatherItems,
        "注意時間の前に首肩をゆるめる",
        "注意時間の前に食事を重くしすぎない",
        "予定を一つ減らす",
      ],
      3
    );
  }

  const symptomItems = SYMPTOM_PEAK_PREP_ITEMS[symptomFocus] || [];
  return uniqueTake(
    [
      ...focusedWeatherItems,
      ...symptomItems,
      ...weatherItems,
      "注意時間の前に首肩をゆるめる",
      "食事を重くしすぎない",
      "予定を一つ減らす",
    ],
    3
  );
}

export function getForecastModeLead(triggerFactors, signal = 0, mode = "today", symptomFocus = null) {
  const narrative = getNarrativeLeadText(triggerFactors, signal, mode, symptomFocus);
  if (narrative) return narrative;

  const level = Number(signal ?? 0);
  const factors = getForecastBackgroundFactors(triggerFactors);
  const primary = factors[0] || { key: "pressure_down", label: "天気変化" };
  const factorKeys = factors.map((factor) => factor?.key).filter(Boolean);
  const copyKey = getSymptomWeatherCopyKey(SYMPTOM_WEATHER_LEADS, symptomFocus, factorKeys);
  const primaryLabel = primary.label || "天気変化";
  const copyLabel = getWeatherCopyLabel(copyKey, factors) || primaryLabel;
  const target = mode === "today" ? "今日は" : "明日は";
  const symptomClause = getForecastSymptomLeadClause(symptomFocus, level);
  const symptomWeatherLead = getSymptomWeatherLead(symptomFocus, factorKeys);

  if (level >= 2) {
    return symptomWeatherLead
      ? `${target}${copyLabel}の影響が強め。${symptomWeatherLead}`
      : symptomClause
        ? `${target}${copyLabel}の影響が強め。${symptomClause}です。`
        : `${target}${copyLabel}の影響が強め。守り気味に過ごしたい日です。`;
  }

  if (level >= 1) {
    return symptomWeatherLead
      ? `${target}${copyLabel}が少し響きそう。${symptomWeatherLead}`
      : symptomClause
        ? `${target}${copyLabel}が少し響きそう。${symptomClause}です。`
        : `${target}${copyLabel}が少し響きそう。早めに軽く整えたい日です。`;
  }

  return symptomWeatherLead
    ? `${target}${copyLabel}の影響は少なめ。ただ、${symptomWeatherLead}`
    : symptomClause
      ? `${target}${copyLabel}の影響は少なめ。ただ、${symptomClause}です。`
      : `${target}${copyLabel}の影響は少なめ。ただ、注意したい時間だけ軽く見ておきたい日です。`;
}

export function getMoodHeadline(triggerKey, signal) {
  if (signal === 2) {
    if (triggerKey === "pressure_down") return "低気圧による重だるさ対策を優先";
    if (triggerKey === "damp") return "湿気による重さ・むくみ対策を優先";
    if (triggerKey === "cold") return "冷えによるこわばり対策を優先";
    if (triggerKey === "heat") return "熱こもりによる消耗対策を優先";
    if (triggerKey === "dry") return "乾燥による荒れ対策を優先";
    if (triggerKey === "pressure_up") return "高気圧による張りつめ対策を優先";
  }

  if (signal === 1) {
    if (triggerKey === "pressure_down") return "低気圧による重だるさ対策を意識";
    if (triggerKey === "damp") return "湿気による重さ・むくみ対策を意識";
    if (triggerKey === "cold") return "冷えによるこわばり対策を意識";
    if (triggerKey === "heat") return "熱こもり対策を意識";
    if (triggerKey === "dry") return "乾燥対策を意識";
    if (triggerKey === "pressure_up") return "高気圧による張りつめ対策を意識";
  }

  return "影響は比較的小さめ";
}

export function getHeroPanelClass(signal) {
  if (signal === 2) {
    return "bg-[linear-gradient(135deg,#FFF9F5_0%,#FFF5EE_100%)] ring-1 ring-[#EBD7C8]";
  }
  if (signal === 1) {
    return "bg-[linear-gradient(135deg,#FFFDF5_0%,#FFF8EC_100%)] ring-1 ring-[#E9DAB0]";
  }
  return "bg-[linear-gradient(135deg,#F6FCF9_0%,#FBFFFD_100%)] ring-1 ring-[#CCE6DD]";
}

export function getHeroAccentClass(signal) {
  if (signal === 2) return "text-[#C06A34]";
  if (signal === 1) return "text-[#B37D18]";
  return "text-[#3C8C78]";
}

export function getHeroScoreClass(signal) {
  if (signal === 2) return "text-[#C06A34]";
  if (signal === 1) return "text-[#B37D18]";
  return "text-[#3C8C78]";
}

export function getHeroDecorClass(signal) {
  if (signal === 2) {
    return "from-[#D96C7C24] to-[#D96C7C08] border-[#D96C7C33]";
  }
  if (signal === 1) {
    return "from-[#E2AB4326] to-[#E2AB4308] border-[#E2AB4333]";
  }
  return "from-[#63B89E24] to-[#63B89E08] border-[#63B89E30]";
}

export function getTsuboRoleLabel(point, index) {
  if (point?.source === "today_rule") {
    return index === 0 ? "今日まずほぐしたいケア" : "今日の候補ケア";
  }
  if (point?.source === "mtest") {
    return index === 0 ? "まず整えたいラインケア" : "ラインケア";
  }
  return index === 0 ? "まず整えたい体質ケア" : "体質ケア";
}

function humanizeLegacyPointRoleSummary(summary, point = null) {
  const raw = String(summary || "").trim();
  if (!raw) return "";

  const code = String(point?.code || "").trim().toUpperCase();

  if (raw === "お腹まわりから、全体の余力を支えるツボです") {
    if (code === "CV12") {
      return "食後の重さを翌朝に残しにくくするため、今夜のうちにお腹の中央を軽く整えるツボです";
    }
    if (code === "CV6") {
      return "腰腹まわりの冷えやだるさを持ち越しにくくするため、今夜のうちに下腹部を軽く整えるツボです";
    }
    return "翌朝に残りやすいお腹の重さを、今夜のうちに軽く整えるツボです";
  }

  return raw;
}

export function getPointRoleSummary(point) {
  return humanizeLegacyPointRoleSummary(
    point?.explanation?.role_summary || "この日の整え方に合わせて選んだツボです。",
    point
  );
}

export function getCareStrategyTitle(triggerKey, signal, mode = "tomorrow") {
  if (mode === "today") {
    if (signal === 0) return "今日の調子を崩さない軽いケア";
    if (triggerKey === "damp") return "重さをためない日中ケア";
    if (triggerKey === "pressure_down") return "こもりを逃がす日中ケア";
    if (triggerKey === "cold") return "冷えをこわばりに変えない";
    if (triggerKey === "heat") return "熱をこもらせない過ごし方";
    if (triggerKey === "dry") return "乾きを疲れに変えない";
    if (triggerKey === "pressure_up") return "前のめりの力みをほどく";
    return "今日これから整える一手";
  }
  if (signal === 0) return "明日の安定を崩さない前夜ケア";
  if (triggerKey === "damp") return "明日の重さを逃がす前夜ケア";
  if (triggerKey === "pressure_down") return "明日のこもりを抜く前夜ケア";
  if (triggerKey === "cold") return "明日の冷えを残さない支度";
  if (triggerKey === "heat") return "明日の熱をためない支度";
  if (triggerKey === "dry") return "明日の乾きを増やさない支度";
  if (triggerKey === "pressure_up") return "明日の力みをほどく前夜ケア";
  return "明日に持ち越さない前夜ケア";
}

export function getCareStrategyLead(triggerFactors, signal, mode = "tomorrow", symptomFocus = null) {
  const narrative = getNarrativeCareLead(triggerFactors, signal, mode, symptomFocus);
  if (narrative) return narrative;

  const labels = safeArray(triggerFactors).map((f) => f?.label).filter(Boolean);
  const joined = labels.length >= 2 ? `${labels[0]}と${labels[1]}` : labels[0] || "気象変化";

  if (mode === "today") {
    if (signal === 0) return `今日の天気では、${joined}の影響が少しだけある見込みです。強い対策より、いつもの調子を崩さない軽い一手にします。`;
    if (signal === 2) return `${joined}がこのあと響きやすい時間があります。注意時間の前に、ほぐす・食べる・暮らすを今日用に少し調整します。`;
    return `${joined}が少し響きやすい見込みです。今からできる範囲で、こもり・冷え・重さを残さないようにします。`;
  }

  if (signal === 0) {
    return `明日の天気では、${joined}の影響が少しだけある見込みです。強い対策より、いつもの調子を崩さない軽い整え方を選びます。`;
  }
  if (signal === 2) {
    return `${joined}の影響が出やすい日です。明日は注意時間の前に疲れすぎないよう、今夜のうちに体を軽く動かしておきます。`;
  }
  return `${joined}が少し響きやすい日です。大きく構えすぎず、今夜のうちに一手だけ先回りしておきます。`;
}


export const CARE_POLICY_DEFINITIONS = {
  shizumeru: {
    key: "shizumeru",
    label: "しずめる",
    short: "高ぶりを落ち着ける",
    guide: "熱や高ぶりを落ち着ける",
  },
  yurumeru: {
    key: "yurumeru",
    label: "ゆるめる",
    short: "力みをやわらげる",
    guide: "力みやこわばりをやわらげる",
  },
  meguraseru: {
    key: "meguraseru",
    label: "めぐらせる",
    short: "巡りを保つ",
    guide: "巡りを保つ",
  },
  nagasu: {
    key: "nagasu",
    label: "ながす",
    short: "重だるさをためない",
    guide: "重だるさやむくみをためない",
  },
  uruosu: {
    key: "uruosu",
    label: "うるおす",
    short: "乾きを補う",
    guide: "乾きと消耗を補う",
  },
  nukumeru: {
    key: "nukumeru",
    label: "ぬくめる",
    short: "冷えを防ぐ",
    guide: "冷えを防ぐ",
  },
  sasaeru: {
    key: "sasaeru",
    label: "ささえる",
    short: "疲れを増やさない",
    guide: "疲れや消耗を増やさない",
  },
};

const TRIGGER_POLICY_SCORES = {
  pressure_down: { meguraseru: 3, yurumeru: 3, sasaeru: 1.6, nagasu: 0.6 },
  pressure_up: { yurumeru: 3, meguraseru: 3, sasaeru: 1.6, shizumeru: 0.6 },
  temp_shift: { yurumeru: 4.2, sasaeru: 2.4, meguraseru: 1.8 },
  damp: { nagasu: 6, sasaeru: 2.1 },
  humidity: { nagasu: 6, sasaeru: 2.1 },
  cold: { nukumeru: 6, sasaeru: 2.2 },
  heat: { shizumeru: 6, uruosu: 3.5 },
  dry: { uruosu: 6, sasaeru: 2.1 },
};

const TCM_ACTION_POLICY_SCORES = {
  move_qi: { yurumeru: 1.5, meguraseru: 1.2 },
  move_blood: { meguraseru: 2 },
  soothe_liver: { yurumeru: 1.6, shizumeru: 1 },
  transform_damp: { nagasu: 2 },
  strengthen_spleen: { sasaeru: 1.4, nagasu: 1 },
  tonify_qi: { sasaeru: 2 },
  nourish_blood: { uruosu: 1.6, sasaeru: 1 },
  generate_fluids: { uruosu: 2 },
  support_kidney: { nukumeru: 1.6, sasaeru: 1.3 },
};

const SUB_LABEL_POLICY_SCORES = {
  qi_stagnation: { yurumeru: 1.2, meguraseru: 0.9 },
  qi_deficiency: { sasaeru: 1.3, nukumeru: 0.6 },
  blood_deficiency: { uruosu: 1.2, sasaeru: 0.8 },
  blood_stasis: { meguraseru: 1.4, yurumeru: 0.6 },
  fluid_damp: { nagasu: 1.4, sasaeru: 0.8 },
  fluid_deficiency: { uruosu: 1.4, shizumeru: 0.8 },
};

const SYMPTOM_POLICY_SCORES = {
  fatigue: { sasaeru: 1.1, nagasu: 0.4 },
  sleep: { shizumeru: 1.0, sasaeru: 0.7, uruosu: 0.5 },
  digestion: { sasaeru: 1.25, nukumeru: 0.75, nagasu: 0.55 },
  neck_shoulder: { yurumeru: 1.0, meguraseru: 0.8 },
  low_back_pain: { nukumeru: 0.9, meguraseru: 0.6, sasaeru: 0.6 },
  swelling: { nagasu: 1.2 },
  headache: { yurumeru: 0.9, meguraseru: 0.8, shizumeru: 0.5 },
  dizziness: { sasaeru: 0.8, meguraseru: 0.6, uruosu: 0.5 },
  mood: { yurumeru: 0.9, shizumeru: 0.8, meguraseru: 0.5 },
};

const ENV_VECTOR_POLICY_SCORES = {
  pressure_shift: { yurumeru: 0.45, meguraseru: 0.45 },
  temp_swing: { nukumeru: 0.35, sasaeru: 0.3, uruosu: 0.2 },
  humidity_up: { nagasu: 0.55, sasaeru: 0.25 },
  dryness_up: { uruosu: 0.55, sasaeru: 0.25 },
  wind_strong: { yurumeru: 0.35, shizumeru: 0.3 },
};

const POLICY_PAIR_SUMMARIES = {
  "nagasu+sasaeru": "重だるさをためず、疲れを増やさないように整えます。",
  "sasaeru+nagasu": "重だるさをためず、疲れを増やさないように整えます。",
  "nagasu+meguraseru": "重だるさをためず、巡りを保つように整えます。",
  "meguraseru+nagasu": "重だるさをためず、巡りを保つように整えます。",
  "yurumeru+sasaeru": "力みやこわばりをやわらげ、疲れを増やさないように整えます。",
  "sasaeru+yurumeru": "力みやこわばりをやわらげ、疲れを増やさないように整えます。",
  "yurumeru+meguraseru": "力みやこわばりをやわらげ、巡りを保つように整えます。",
  "meguraseru+yurumeru": "力みやこわばりをやわらげ、巡りを保つように整えます。",
  "shizumeru+yurumeru": "熱や高ぶりを落ち着け、力みやこわばりをやわらげるように整えます。",
  "yurumeru+shizumeru": "熱や高ぶりを落ち着け、力みやこわばりをやわらげるように整えます。",
  "nukumeru+sasaeru": "冷えを防ぎ、疲れを増やさないように整えます。",
  "sasaeru+nukumeru": "冷えを防ぎ、疲れを増やさないように整えます。",
  "uruosu+sasaeru": "乾きと消耗を補うように整えます。",
  "sasaeru+uruosu": "乾きと消耗を補うように整えます。",
};

const ALLOWED_POLICY_PAIRS = new Set(Object.keys(POLICY_PAIR_SUMMARIES));


function getCarePolicyTriggerKeys(triggerFactors) {
  return getForecastBackgroundFactors(triggerFactors)
    .map((factor) => normalizeCarePolicyTriggerKey(factor?.key || factor?.exact))
    .filter(Boolean);
}

function buildCarePolicySymptomContext({ symptomFocus, triggerFactors, mode = "today" } = {}) {
  const keys = getCarePolicyTriggerKeys(triggerFactors);
  if (!symptomFocus || !keys.length) return "";

  const has = (...targets) => targets.some((target) => keys.includes(target));
  const today = mode === "today";
  const weatherLead = (() => {
    const pairKey = getAllowedWeatherPairKey(keys);
    if (pairKey) return WEATHER_PAIR_LABELS[pairKey];
    if (has("pressure_down")) return "気圧低下";
    if (has("pressure_up")) return "気圧上昇";
    if (has("damp")) return "湿気";
    if (has("cold")) return "冷え込み";
    if (has("heat")) return "気温上昇";
    if (has("dry")) return "乾燥";
    return "天気変化";
  })();

  const todaySentence = (body) => `${getSymptomFocusLabel(symptomFocus)}を見ている場合は、${weatherLead}で${body}`;
  const tomorrowSentence = (body) => `${getSymptomFocusLabel(symptomFocus)}を見ている場合は、明日の${weatherLead}に備えて、今夜は${body}`;
  const sentence = (todayBody, tomorrowBody) => today ? todaySentence(todayBody) : tomorrowSentence(tomorrowBody);

  switch (symptomFocus) {
    case "fatigue":
      return sentence(
        "消耗やだるさが残りやすいため、重さをため込まない方向で整えます。",
        "食べすぎ・冷え・予定の詰め込みを軽くし、明朝のだるさを残さない方向で整えます。",
      );

    case "sleep":
      if (has("heat") || has("pressure_up")) {
        return sentence(
          "頭の冴えや熱が夜まで残りやすいため、刺激をこもらせない方向で整えます。",
          "光・刺激・食後の重さを控えめにし、寝つきに響く冴えを残さない方向で整えます。",
        );
      }
      return sentence(
        "冷えや食後の重さが夜まで残りやすいため、寝る前まで重だるさを残しにくくします。",
        "冷えと食後の重さを軽くし、明朝のだるさを残しにくくします。",
      );

    case "digestion":
      if (has("cold")) {
        return sentence(
          "胃腸まわりが冷えで重くなりやすいため、冷たいものを続けず内側を守る方向で整えます。",
          "冷たいものや夜の食べすぎを控えめにし、明朝の胃腸の重さを残さない方向で整えます。",
        );
      }
      if (has("damp") || has("pressure_down")) {
        return sentence(
          "湿気や気圧低下で胃腸の重さが残りやすいため、詰め込みすぎない方向で整えます。",
          "冷たいもの・甘いもの・食後の重さを控えめにし、明朝の胃腸を軽くする方向で整えます。",
        );
      }
      if (has("heat")) {
        return sentence(
          "暑さで冷たいものが増えやすいため、胃腸を冷やしすぎない方向で整えます。",
          "冷たい飲み物や刺激を控えめにし、胃腸に重さを残さない方向で整えます。",
        );
      }
      return sentence(
        "食後の重さやお腹の張りを残しやすいため、胃腸に負担を重ねない方向で整えます。",
        "食べすぎや冷えを軽くし、明朝の胃腸の重さを残さない方向で整えます。",
      );

    case "neck_shoulder":
      if (has("cold")) {
        return sentence(
          "首元・肩甲骨まわりが固まりやすいため、冷やしてこわばらせない方向で整えます。",
          "首元を冷やしたまま寝ないようにし、明朝のこわばりを残さない方向で整えます。",
        );
      }
      if (has("pressure_down")) {
        return sentence(
          "首肩から後頭部にこもりが残りやすいため、力みをためない方向で整えます。",
          "首肩と耳まわりを軽くゆるめ、明朝のこもりを残さない方向で整えます。",
        );
      }
      return sentence(
        "首元・肩甲骨まわりが固まりやすいため、力みをためない方向で整えます。",
        "画面姿勢と首元の冷えを残さず、明朝のこわばりを軽くする方向で整えます。",
      );

    case "low_back_pain":
      if (has("cold")) {
        return sentence(
          "腰腹まわりと下半身が冷えて固まりやすいため、冷えを入口で止める方向で整えます。",
          "腰腹まわりを冷やしたまま寝ないようにし、明朝の動き出しを重くしない方向で整えます。",
        );
      }
      if (has("damp")) {
        return sentence(
          "腰まわり・下半身に重だるさが残りやすいため、重さをため込まない方向で整えます。",
          "冷たいものや食後の重さを控えめにし、腰まわりの重だるさを持ち越さない方向で整えます。",
        );
      }
      return sentence(
        "腰腹・下半身に重さが残りやすいため、動き出しを重くしない方向で整えます。",
        "冷えや食後の重さを軽くし、明朝の動き出しに重さを残さない方向で整えます。",
      );

    case "swelling":
      if (has("damp")) {
        return sentence(
          "顔や脚のむくみ感が出やすいため、冷たいもの・甘いもの・塩気を重ねすぎないようにします。",
          "冷たいもの・甘いもの・塩気を重ねすぎず、明朝の顔や脚の重さを増やしにくくします。",
        );
      }
      return sentence(
        "顔や脚に重さが残りやすいため、ため込まない方向で整えます。",
        "食後の重さと冷えを軽くし、明朝の顔・脚の重さを増やさない方向で整えます。",
      );

    case "headache":
      if (has("pressure_down")) {
        return sentence(
          "首・耳・目まわりが固まりやすいため、先にゆるめて頭の重さを残しにくくします。",
          "お酒・脂っこさ・画面の刺激を控えめにし、頭の重さを持ち越しにくくします。",
        );
      }
      if (has("heat") || has("pressure_up")) {
        return sentence(
          "熱や頭の冴えがこもりやすいため、刺激を増やしすぎない方向で整えます。",
          "刺激と夜更かしを控えめにし、頭の冴えを残さない方向で整えます。",
        );
      }
      return sentence(
        "首・耳・目まわりが固まりやすいため、頭の重さにつながる前にゆるめます。",
        "首肩と耳まわりを固めず、頭の重さを持ち越しにくくします。",
      );

    case "dizziness":
      if (has("pressure_down") || has("pressure_up")) {
        return sentence(
          "急な動きや立ち上がりが負担になりやすいため、動き出しを急がない方向で整えます。",
          "寝不足や食後の重さを控えめにし、明朝の動き出しを急がない方向で整えます。",
        );
      }
      return sentence(
        "冷えや重さで動き出しが乱れやすいため、立ち上がりを急がない方向で整えます。",
        "冷えと食後の重さを軽くし、明朝の立ち上がりを急がない方向で整えます。",
      );

    case "mood":
      if (has("heat") && has("cold")) {
        return sentence(
          "頭の冴えと身構えが残りやすいため、予定を詰めすぎず、情報量を少し軽くする方向で整えます。",
          "画面時間を早めに区切り、明日の動き出しを重くしない形で整えます。",
        );
      }
      if (has("heat") || has("pressure_up")) {
        return sentence(
          "頭の冴えや高ぶりが残りやすいため、急いで片付けようとせず、休憩を先に入れる方向で整えます。",
          "刺激と情報量を控えめにし、明日の始まりを軽くする方向で整えます。",
        );
      }
      if (has("damp") || has("pressure_down")) {
        return sentence(
          "気分の重さや動き出しにくさが出やすいため、予定を詰めすぎず、体を軽く動かして気分を変える方向で整えます。",
          "食後の重さと情報量を控えめにし、明日の動き出しを重くしない方向で整えます。",
        );
      }
      return sentence(
        "気分を変えるのに負担が出やすいため、予定を一つ減らして、休憩を先に入れる方向で整えます。",
        "刺激を減らし、予定を一つ軽くして明日の始まりを重くしない形で整えます。",
      );

    default:
      return "";
  }
}

const SINGLE_POLICY_SUMMARIES = {
  shizumeru: "高ぶりを落ち着けるように整えます。",
  yurumeru: "力みやこわばりをやわらげるように整えます。",
  meguraseru: "巡りを保つように整えます。",
  nagasu: "重だるさをためないように整えます。",
  uruosu: "乾きと消耗を補うように整えます。",
  nukumeru: "冷えを防ぐように整えます。",
  sasaeru: "疲れを増やさないように整えます。",
};

function addPolicyScores(scores, weights, multiplier = 1) {
  Object.entries(weights || {}).forEach(([key, value]) => {
    if (!Object.prototype.hasOwnProperty.call(scores, key)) return;
    scores[key] += Number(value || 0) * multiplier;
  });
}

function normalizeCarePolicyTriggerKey(value) {
  const key = String(value || "").trim();
  if (key === "humidity") return "damp";
  if (key === "temp") return "cold";
  if (key === "temperature_shift") return "temp_shift";
  return key || "pressure_down";
}

function getRiskContextTriggerFactors(riskContext) {
  const summary = riskContext?.summary || {};
  const raw = Array.isArray(summary.trigger_factors) && summary.trigger_factors.length
    ? summary.trigger_factors
    : [
        summary.personal_main_trigger_exact || summary.main_trigger_exact,
        summary.personal_secondary_trigger_exact || summary.secondary_trigger_exact,
      ]
        .filter(Boolean)
        .map((exact, index) => ({ exact, key: exact, role: index === 0 ? "primary" : "secondary" }));

  return safeArray(raw).map((factor, index) => {
    const key = normalizeCarePolicyTriggerKey(factor?.key || factor?.exact);
    return {
      ...factor,
      key,
      exact: key,
      role: factor?.role || (index === 0 ? "primary" : "secondary"),
      label: factor?.label || getCompatTriggerLabel(factor?.main_trigger, factor?.trigger_dir),
    };
  });
}

function toCarePolicyDirection(text) {
  const normalized = String(text || "").trim();
  if (!normalized) return "いつもの調子を崩さない方針です。";
  return normalized
    .replace(/ケアが合います。$/, "方針です。")
    .replace(/ケアが合います$/, "方針です。")
    .replace(/ケアです。$/, "方針です。")
    .replace(/ケアです$/, "方針です。");
}

function getPolicySummary({ policies, triggerFactors, signal, mode, symptomFocus }) {
  const keys = safeArray(policies).map((p) => p.key).filter(Boolean);
  const detail =
    keys.length >= 2
      ? POLICY_PAIR_SUMMARIES[`${keys[0]}+${keys[1]}`] || `${policies[0].short}、${policies[1].short}方針です。`
      : SINGLE_POLICY_SUMMARIES[keys[0]] || "いつもの調子を崩さないケアが合います。";
  return toCarePolicyDirection(detail);
}

function getContinuousCareConstitution(constitutionContext) {
  const axes = constitutionContext?.axes && typeof constitutionContext.axes === "object"
    ? constitutionContext.axes
    : null;
  const split = constitutionContext?.split_scores && typeof constitutionContext.split_scores === "object"
    ? constitutionContext.split_scores
    : null;
  return {
    available: Boolean(axes || split),
    yin_yang_score: Math.max(-1, Math.min(1, Number(axes?.yin_yang_score || 0))),
    drive_score: Math.max(-1, Math.min(1, Number(axes?.drive_score || 0))),
    obstruction_score: Math.max(0, Math.min(1, Number(axes?.obstruction_score || 0))),
    material: {
      qi_deficiency: Number(split?.qi?.deficiency || 0),
      qi_stagnation: Number(split?.qi?.stagnation || 0),
      blood_deficiency: Number(split?.blood?.deficiency || 0),
      blood_stasis: Number(split?.blood?.stasis || 0),
      fluid_deficiency: Number(split?.fluid?.deficiency || 0),
      fluid_damp: Number(split?.fluid?.damp || 0),
    },
  };
}

function addContinuousCarePolicyScores(scores, continuous) {
  if (!continuous?.available) return;
  if (continuous.yin_yang_score > 0) {
    addPolicyScores(scores, { yurumeru: 0.9, shizumeru: 0.55 }, continuous.yin_yang_score);
  }
  if (continuous.yin_yang_score < 0) {
    addPolicyScores(scores, { nagasu: 0.75, meguraseru: 0.7 }, Math.abs(continuous.yin_yang_score));
  }
  addPolicyScores(scores, { sasaeru: 1.35 }, Math.max(0, -continuous.drive_score));
  addPolicyScores(scores, { meguraseru: 0.75, yurumeru: 0.4 }, continuous.obstruction_score);
  Object.entries(continuous.material).forEach(([key, raw]) => {
    const value = Math.max(0, Number(raw || 0));
    addPolicyScores(scores, SUB_LABEL_POLICY_SCORES[key], value / (value + 2.5));
  });
}

export function deriveCarePolicies({ forecast, triggerFactors, riskContext, mode = "tomorrow", symptomFocus = null } = {}) {
  const scores = Object.fromEntries(
    Object.keys(CARE_POLICY_DEFINITIONS).map((key) => [key, 0])
  );

  const personalizedTriggerFactors = safeArray(triggerFactors).length
    ? safeArray(triggerFactors)
    : forecast
      ? getForecastTriggerFactors(forecast)
      : getRiskContextTriggerFactors(riskContext);

  const normalizedTriggerFactors = safeArray(personalizedTriggerFactors).map((factor, index) => ({
    ...factor,
    key: normalizeCarePolicyTriggerKey(factor?.key || factor?.exact),
    exact: normalizeCarePolicyTriggerKey(factor?.exact || factor?.key),
    role: factor?.role || (index === 0 ? "primary" : "secondary"),
  })).slice(0, 2);

  normalizedTriggerFactors.forEach((factor, index) => {
    const key = normalizeCarePolicyTriggerKey(factor?.key || factor?.exact);
    const multiplier = index === 0 ? 1 : 0.42;
    addPolicyScores(scores, TRIGGER_POLICY_SCORES[key], multiplier);
  });

  const tcmContext = riskContext?.tcm_context || forecast?.computed?.radar_plan_meta?.risk_context?.tcm_context || {};
  safeArray(tcmContext.primary_actions).forEach((action) => {
    addPolicyScores(scores, TCM_ACTION_POLICY_SCORES[action], 1.25);
  });
  safeArray(tcmContext.secondary_actions).forEach((action) => {
    addPolicyScores(scores, TCM_ACTION_POLICY_SCORES[action], 0.65);
  });

  const constitutionContext =
    riskContext?.constitution_context || forecast?.computed?.radar_plan_meta?.risk_context?.constitution_context || {};

  safeArray(constitutionContext.sub_labels).forEach((label, index) => {
    addPolicyScores(scores, SUB_LABEL_POLICY_SCORES[label], index === 0 ? 1 : 0.62);
  });

  const activeSymptomFocus = symptomFocus || constitutionContext.symptom_focus || null;
  addPolicyScores(scores, SYMPTOM_POLICY_SCORES[activeSymptomFocus], 1);

  const coreCode = String(constitutionContext.core_code || "");
  const continuous = getContinuousCareConstitution(constitutionContext);
  addContinuousCarePolicyScores(scores, continuous);
  if (!continuous.available) {
    if (coreCode.includes("batt_small")) addPolicyScores(scores, { sasaeru: 0.8, nukumeru: 0.25 });
    if (coreCode.includes("batt_large")) addPolicyScores(scores, { yurumeru: 0.25, meguraseru: 0.25 });
    if (coreCode.startsWith("accel_")) addPolicyScores(scores, { yurumeru: 0.35, shizumeru: 0.3 });
    if (coreCode.startsWith("brake_")) addPolicyScores(scores, { nagasu: 0.35, meguraseru: 0.25 });
  }

  const env = constitutionContext.env || {};
  safeArray(env.vectors).forEach((vector) => {
    addPolicyScores(scores, ENV_VECTOR_POLICY_SCORES[vector], 0.75);
  });

  const signal = Number(
    forecast?.signal ??
      riskContext?.target?.signal ??
      forecast?.computed?.radar_plan_meta?.risk_context?.target?.signal ??
      0
  );
  if (signal >= 2) addPolicyScores(scores, { sasaeru: 0.45 }, 1);
  if (signal === 1) addPolicyScores(scores, { sasaeru: 0.15 }, 1);

  // The primary policy should stay anchored to the personalized forecast trigger.
  // Constitution, symptoms, and TCM actions only translate that trigger into care language.
  const primaryTriggerKey = normalizeCarePolicyTriggerKey(normalizedTriggerFactors[0]?.key || normalizedTriggerFactors[0]?.exact);
  const primaryTriggerPolicies = Object.keys(TRIGGER_POLICY_SCORES[primaryTriggerKey] || {});
  primaryTriggerPolicies.forEach((key, index) => {
    const isPressure = primaryTriggerKey === "pressure_down" || primaryTriggerKey === "pressure_up";
    scores[key] += isPressure ? 0.15 : index === 0 ? 0.9 : 0.35;
  });

  let ranked = Object.entries(scores)
    .map(([key, score]) => ({ key, score }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!ranked.length) {
    ranked = [{ key: "sasaeru", score: 1 }];
  }

  const selected = [ranked[0]];
  const second = ranked.find((item) =>
    item.key !== ranked[0].key && ALLOWED_POLICY_PAIRS.has(`${ranked[0].key}+${item.key}`)
  );
  const shouldShowSecond =
    Number(signal) > 0 &&
    second &&
    second.score >= Math.max(2.15, ranked[0].score * 0.48) &&
    !(ranked[0].key === "shizumeru" && second.key === "nukumeru") &&
    !(ranked[0].key === "nukumeru" && second.key === "shizumeru");

  if (shouldShowSecond) selected.push(second);

  const policies = selected
    .map((item) => CARE_POLICY_DEFINITIONS[item.key])
    .filter(Boolean);

  return {
    policies,
    scores,
    summary: getPolicySummary({
      policies,
      triggerFactors: normalizedTriggerFactors,
      signal,
      mode,
      symptomFocus: activeSymptomFocus,
    }),
  };
}


export function getLifestylePlan(primaryKey, secondaryKey, signal, mode = "tomorrow", symptomFocus = null) {
  return getLifestylePlanFromRules(primaryKey, secondaryKey, signal, mode, symptomFocus);
}


export function getPointSelectionReason(point) {
  return humanizeLegacyPointSelectionReason(
    point?.explanation?.selection_reason ||
      "明日の天気で出やすい重さやこわばりを、今夜のうちに整えやすいツボとして選んでいます。",
    point
  );
}

export function hasAiPointSelectionReason(point) {
  const explanation = point?.explanation || {};
  return Boolean(explanation.selection_reason_rule_based);
}

export function getPointMatchTags(point) {
  return Array.from(
    new Set(
      safeArray(point?.explanation?.match_tags)
        .map((tag) => humanizeMatchTag(tag))
        .map((tag) => String(tag || "").trim())
        .filter(Boolean)
    )
  ).slice(0, 3);
}

export function getPointPressGuide(point) {
  const area = inferPointTouchArea(point);
  const name = String(point?.name_ja || point?.code || "このツボ").trim();

  if (area === "head_neck") {
    return `${name}は頭・首まわりのツボです。人差し指か中指の腹で、押し込まずに軽く触ります。息を吐きながら、小さく円を描くくらいで十分です。20〜30秒を1〜2回。痛みを探して強く押さないでください。`;
  }

  if (area === "abdomen_trunk") {
    return `${name}はお腹・体幹まわりのツボです。親指で押し込まず、手のひらか2〜3本の指の腹を置くように触ります。息を吐きながら、お腹が軽く動くくらいのやさしい圧で小さく円を描きます。20〜30秒を1〜2回。苦しさや痛みがあればやめてください。`;
  }

  if (area === "hand_arm") {
    return `${name}は手・腕まわりのツボです。反対の手の親指の腹で、痛くない強さでゆっくり触ります。押し込むより、息を吐きながら小さく円を描くくらいで十分です。左右ある場所は片側20〜30秒を1〜2回。`;
  }

  if (area === "leg_foot") {
    return `${name}は脚・足まわりのツボです。親指の腹で、冷えやこわばりを確認するように軽く触ります。強く押し込まず、息を吐きながら小さく円を描くくらいで十分です。左右ある場所は片側20〜30秒を1〜2回。`;
  }

  return `${name}は指の腹で軽く触ります。息を吐きながら、痛くない範囲で小さく円を描くくらいで十分です。20〜30秒を1〜2回。強く押し込まないでください。`;
}


function buildPointImageSearchQuery(point) {
  // Programmable Search Engine側でツボ図鑑系サイトに絞っているため、
  // 「ツボ」「位置」「手」などを足すと別ツボや関連症状の画像が混ざりやすい。
  // DBから渡ってくるツボ名そのものを検索語にすることで、
  // radar_tsubo_points に登録済みの全ツボと今後の追加ツボをコード追加なしで扱う。
  const name = String(point?.name_ja || "").trim();
  if (name) return name;

  const reading = String(point?.reading_ja || "").trim();
  if (reading) return reading;

  return String(point?.code || "").trim().toUpperCase();
}

export function getPointImageSearchQuery(point) {
  return buildPointImageSearchQuery(point);
}

export function getPointImageCandidates(point) {
  const out = [];

  if (point?.image_path) {
    const clean = String(point.image_path).replace(/^\/+/, "");
    if (clean) out.push(`/${clean}`);
  }

  const rawCode = String(point?.code || "").trim();
  if (rawCode) {
    const upper = rawCode.toUpperCase();
    const lower = rawCode.toLowerCase();

    out.push(`/illust/points/${upper}.webp`);
    out.push(`/illust/points/${upper}.png`);
    out.push(`/illust/points/${upper}.jpg`);

    out.push(`/illust/points/${lower}.webp`);
    out.push(`/illust/points/${lower}.png`);
    out.push(`/illust/points/${lower}.jpg`);
  }

  return Array.from(new Set(out));
}

export function getPointCautions(point) {
  return safeArray(point?.cautions)
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") return item.text || item.label || item.title || "";
      return "";
    })
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 3);
}


export function buildTodayCarePlan({ forecast, riskContext, symptomFocus: explicitSymptomFocus = null } = {}) {
  if (!forecast) return null;
  const triggerFactors = getForecastTriggerFactors(forecast);
  const triggerKey = triggerFactors[0]?.key || getForecastTriggerKey(forecast);
  const secondaryKey = triggerFactors[1]?.key || null;
  const signal = Number(forecast?.signal ?? 0);
  const symptomFocus = explicitSymptomFocus || riskContext?.constitution_context?.symptom_focus || null;
  const fallbackTriggerKey = getForecastTriggerKey({ main_trigger: triggerKey });

  return buildTodayCarePlanCore({
    forecast,
    triggerKey,
    secondaryKey,
    signal,
    symptomFocus,
    subLabels: riskContext?.constitution_context?.sub_labels || [],
    fallbackTriggerKey,
    riskContext,
  });
}


export const FLAT_PRESETS = flattenRadarLocationPresets();

export function getLocationDisplayLabel(location) {
  if (!location) return "設定中の地域";

  const directLabel = [location.display_name, location.label]
    .map((v) => String(v || "").trim())
    .find((v) => v && !HIDDEN_LOCATION_LABELS.has(v.toLowerCase()));
  if (directLabel) return directLabel;

  const matched = FLAT_PRESETS.find(
    (opt) =>
      Number(opt.lat).toFixed(4) === Number(location.lat).toFixed(4) &&
      Number(opt.lon).toFixed(4) === Number(location.lon).toFixed(4)
  );
  if (matched?.label) return matched.label;

  if (location.lat != null && location.lon != null) {
    return `緯度${Number(location.lat).toFixed(2)} / 経度${Number(location.lon).toFixed(2)}`;
  }

  return "設定中の地域";
}
