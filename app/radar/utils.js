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
  // 未病レーダーの主役は「今日の過ごし方」。明日タブは備えとして扱う。
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
  if (mode === "today") return "今日の過ごし方";
  if (mode === "future") return `${formatTargetDate(targetDate)}の過ごし方`;
  return `${getDateModeLabel(mode)}(${formatTargetDate(targetDate)})の過ごし方`;
}

export function getSectionLabels(mode) {
  if (mode === "today") {
    return {
      noticeTitle: "このあとの山場",
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
  if (signal === 1) return "少し崩れやすさがあるので、余白を持って過ごしたい日です。";
  return "大きく崩れにくい見込みですが、普段どおりのケアは続けると安心です。";
}

export function sourceLabel(source) {
  if (source === "mtest") return "動きから選んだケア";
  return "体質から選んだケア";
}

export function getPointRegionLabel(region) {
  if (region === "abdomen") return "お腹まわり";
  if (region === "head_neck") return "頭・首まわり";
  return "手足まわり";
}

export const HIDDEN_LOCATION_LABELS = new Set(["primary", "current", "home"]);

export const MATCH_TAG_LABELS = {
  // 既存の日本語タグ
  "脾を意識": "消化吸収や重だるさに関わるはたらき",
  "脾": "消化吸収や重だるさに関わるはたらき",
  "肝を意識": "緊張や巡りの滞りに関わりやすいはたらき",
  "肝・胆ライン": "緊張や巡りの滞りに関わりやすいはたらき",
  "肝胆ライン": "緊張や巡りの滞りに関わりやすいはたらき",
  "湿": "重だるさ・むくみ・べたつく不調につながりやすい状態",
  "腹部から整える": "お腹まわりから整えたい日に向く考え方",
  "やさしく支える": "土台を支えて崩れにくくしたい日に向く考え方",
  "体質ケア": "体質に合わせたケア",
  "ラインケア": "動きの負担に向くケア",

  // 今日タブのルール選定で使う内部キーを、ユーザー向けの言葉に変換する
  fatigue: "今見ている不調：だるさ・疲労",
  sleep: "今見ている不調：睡眠",
  neck_shoulder: "今見ている不調：首肩のつらさ",
  low_back_pain: "今見ている不調：腰のつらさ",
  swelling: "今見ている不調：むくみ",
  headache: "今見ている不調：頭痛",
  dizziness: "今見ている不調：めまい",
  mood: "今見ている不調：気分の浮き沈み",
  pressure_down: "天気の影響：低気圧",
  pressure_up: "天気の影響：気圧上昇",
  damp: "天気の影響：湿気",
  humidity: "天気の影響：湿気",
  cold: "天気の影響：冷え",
  heat: "天気の影響：暑さ",
  dry: "天気の影響：乾燥",
  temp: "天気の影響：気温差",
};
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
  if (mainTrigger === "humidity" && triggerDir === "up") return "湿気";
  if (mainTrigger === "humidity" && triggerDir === "down") return "乾燥";
  return "気象変化";
}

export function exactFromCompat(mainTrigger, triggerDir) {
  if (mainTrigger === "pressure" && triggerDir === "down") return "pressure_down";
  if (mainTrigger === "pressure" && triggerDir === "up") return "pressure_up";
  if (mainTrigger === "temp" && triggerDir === "down") return "cold";
  if (mainTrigger === "temp" && triggerDir === "up") return "heat";
  if (mainTrigger === "humidity" && triggerDir === "up") return "damp";
  if (mainTrigger === "humidity" && triggerDir === "down") return "dry";
  return "pressure_down";
}

export function compatFromExact(exact) {
  if (exact === "pressure_down") return { main_trigger: "pressure", trigger_dir: "down" };
  if (exact === "pressure_up") return { main_trigger: "pressure", trigger_dir: "up" };
  if (exact === "cold") return { main_trigger: "temp", trigger_dir: "down" };
  if (exact === "heat") return { main_trigger: "temp", trigger_dir: "up" };
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

  return {
    key,
    exact: key,
    role: item?.role || (index === 0 ? "primary" : "secondary"),
    main_trigger: item?.main_trigger || compat.main_trigger,
    trigger_dir: item?.trigger_dir || compat.trigger_dir,
    label: getCompatTriggerLabel(item?.main_trigger || compat.main_trigger, item?.trigger_dir || compat.trigger_dir),
    effective_load: item?.effective_load,
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
  pressure_down: ["首肩を固めたまま山場に入らない", "目・耳まわりを一度ゆるめる", "大事な作業は早めに寄せる"],
  pressure_up: ["予定を詰め込みすぎない", "肩の力を抜いて呼吸を一度整える", "刺激の強い飲食を重ねない"],
  damp: ["昼食を重くしすぎない", "甘いもの・冷たい飲み物を重ねない", "食後に少しだけ歩く"],
  humidity: ["昼食を重くしすぎない", "甘いもの・冷たい飲み物を重ねない", "食後に少しだけ歩く"],
  cold: ["足首かお腹を先に守る", "冷たい飲み物を続けない", "外に出る前に首元・腰元を確認する"],
  heat: ["暑さを我慢して押し切らない", "水分を一気飲みせずこまめに入れる", "熱がこもる前に休憩を挟む"],
  dry: ["喉が渇く前に少しずつ潤す", "目と喉を使いすぎない", "夜更かしで消耗を重ねない"],
};

const FORECAST_SYMPTOM_LABELS = {
  fatigue: "だるさ",
  sleep: "睡眠",
  neck_shoulder: "首肩",
  low_back_pain: "腰",
  swelling: "むくみ",
  headache: "頭痛",
  dizziness: "めまい",
  mood: "気分",
};

const SYMPTOM_BODY_SIGN_LABELS = {
  fatigue: ["だるさが残りやすい", "動き出しが重くなりやすい", "休んでも抜けにくく感じやすい"],
  sleep: ["夜まで刺激が残りやすい", "寝る前に体が休みに入りにくい", "朝の重さにつながりやすい"],
  neck_shoulder: ["首元・肩甲骨まわりがこわばりやすい", "画面姿勢で肩の力が抜けにくい", "頭〜首の重さとして感じやすい"],
  low_back_pain: ["腰腹・骨盤まわりが重くなりやすい", "座りっぱなしで腰に残りやすい", "動き出しでこわばりを感じやすい"],
  swelling: ["顔や脚の重さが残りやすい", "足首まわりが重く感じやすい", "冷たさ・甘さ・塩気が重なりやすい"],
  headache: ["頭・目・耳まわりにこもりやすい", "首肩のこわばりが頭に響きやすい", "空腹や刺激で重さが増えやすい"],
  dizziness: ["ふわつき感が出やすい", "立ち上がりで揺れを感じやすい", "首や耳まわりの緊張が残りやすい"],
  mood: ["気分の重さや焦りが出やすい", "刺激で押すほど揺れやすい", "予定の詰め込みが負担になりやすい"],
};

const SYMPTOM_PEAK_PREP_ITEMS = {
  fatigue: ["作業量を一つ減らして余白を残す", "空腹と食べすぎの差を小さくする", "休む余白を残して予定を詰めすぎない"],
  sleep: ["夕方以降の刺激を少し減らす", "寝る前に首肩と目を休ませる", "夜の食べすぎ・飲みすぎを避ける"],
  neck_shoulder: ["首元を冷やしたまま固めない", "画面から目を離して肩を落とす", "耳まわりと肩甲骨まわりを一度ゆるめる"],
  low_back_pain: ["座りっぱなしを一度切る", "腰腹か足首を冷やさない", "深く座る前に骨盤を小さく動かす"],
  swelling: ["足首を小さく動かす", "甘いもの・塩気・冷たい飲み物を重ねない", "同じ姿勢を長く続けない"],
  headache: ["首・耳・目まわりを先にゆるめる", "脂っこさやお酒でこもらせない", "画面姿勢を一度リセットする"],
  dizziness: ["立ち上がる前に一呼吸置く", "空腹のまま急に動かない", "首を急に振らずゆっくり切り替える"],
  mood: ["予定を一つに絞って始める", "通知や刺激を少し減らす", "甘いもの・カフェインで押し切らない"],
};

const SYMPTOM_MODE_HINTS = {
  fatigue: {
    today: "だるさを見ているなら、動きを増やすより消耗を足さないことを優先します。",
    tomorrow: "だるさを見ているなら、今夜のうちに予定量を少し軽くしておくと安心です。",
  },
  sleep: {
    today: "睡眠を見ているなら、夜まで刺激や重さを持ち越さない流れに寄せます。",
    tomorrow: "睡眠を見ているなら、今夜から明朝にかけて冷え・刺激・食べすぎを残さない準備が合います。",
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
    today: "めまいを見ているなら、空腹や急な姿勢変更を避けて、切り替えをゆっくりにします。",
    tomorrow: "めまいを見ているなら、明朝の動き出しを急がない準備をしておくと安心です。",
  },
  mood: {
    today: "気分を見ているなら、刺激で押し切るより、予定と通知を少し軽くします。",
    tomorrow: "気分を見ているなら、今夜の刺激量を下げて、明日の始まりを軽くしておくのが合います。",
  },
};

function getSymptomModeHint(symptomFocus, mode = "today") {
  return SYMPTOM_MODE_HINTS[symptomFocus]?.[mode] || null;
}

const FORECAST_SYMPTOM_LEAD_CLAUSES = {
  fatigue: {
    low: "だるさは少し残りやすい",
    middle: "だるさが残りやすい",
    high: "だるさが強く残りやすい",
  },
  sleep: {
    low: "睡眠は少し乱れやすい",
    middle: "睡眠に響きやすい",
    high: "睡眠に強く響きやすい",
  },
  neck_shoulder: {
    low: "首肩は少しこわばりやすい",
    middle: "首肩がこわばりやすい",
    high: "首肩が強くこわばりやすい",
  },
  low_back_pain: {
    low: "腰まわりは少し重くなりやすい",
    middle: "腰まわりが重くなりやすい",
    high: "腰まわりが強く重くなりやすい",
  },
  swelling: {
    low: "むくみは少し残りやすい",
    middle: "むくみが残りやすい",
    high: "むくみが強く残りやすい",
  },
  headache: {
    low: "頭まわりは少し重くなりやすい",
    middle: "頭まわりが重くなりやすい",
    high: "頭まわりが強く重くなりやすい",
  },
  dizziness: {
    low: "ふわつきは少し出やすい",
    middle: "ふわつきが出やすい",
    high: "ふわつきが強く出やすい",
  },
  mood: {
    low: "気分は少し揺れやすい",
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

export function getForecastBackgroundFactors(triggerFactors) {
  return safeArray(triggerFactors).slice(0, 2).map((factor) => {
    const key = factor?.key || factor?.exact || "pressure_down";
    return {
      key: toWeatherIconKey(key),
      label: factor?.label || "気象変化",
    };
  });
}

export function getForecastBodySigns(triggerFactors, signal = 0, symptomFocus = null) {
  const level = Number(signal ?? 0);
  const symptomSigns = (SYMPTOM_BODY_SIGN_LABELS[symptomFocus] || [])
    .map((item) => qualifyBodySignForSignal(item, level));

  if (level === 0) {
    if (symptomSigns.length) {
      return uniqueTake(
        [
          ...symptomSigns,
          "いつものリズムを崩さない",
          "違和感があれば軽めに整える",
        ],
        3
      );
    }

    return uniqueTake(
      [
        "大きなサインは出にくい見込み",
        "いつものリズムを崩さない",
        "違和感があれば軽めに整える",
      ],
      3
    );
  }

  const keys = safeArray(triggerFactors).map((factor) => factor?.key || factor?.exact).filter(Boolean);
  const signs = [...symptomSigns, ...keys.flatMap((key) => BODY_SIGN_LABELS[key] || [])];
  return uniqueTake(signs.length ? signs : ["重だるさが出やすい", "首肩がこわばりやすい", "疲れが残りやすい"], 3);
}

export function getForecastPeakPrepItems(triggerFactors, signal = 0, symptomFocus = null) {
  const symptomItems = SYMPTOM_PEAK_PREP_ITEMS[symptomFocus] || [];

  if (Number(signal) === 0) {
    return uniqueTake(
      [
        ...symptomItems,
        "予定を詰め込みすぎない",
        "食事と休憩をいつも通りに保つ",
        "違和感が出たら早めに一息入れる",
      ],
      3
    );
  }

  const keys = safeArray(triggerFactors).map((factor) => factor?.key || factor?.exact).filter(Boolean);
  const items = [...symptomItems, ...keys.flatMap((key) => PEAK_PREP_ITEMS[key] || [])];
  return uniqueTake(items.length ? items : ["山場前に首肩をゆるめる", "食事を重くしすぎない", "予定に少し余白を残す"], 3);
}

export function getForecastModeLead(triggerFactors, signal = 0, mode = "today", symptomFocus = null) {
  const level = Number(signal ?? 0);
  const factors = getForecastBackgroundFactors(triggerFactors);
  const labels = factors.map((f) => f.label).filter(Boolean);
  const joined = labels.length >= 2 ? `${labels[0]}と${labels[1]}` : labels[0] || "天気変化";
  const target = mode === "today" ? "今日は" : "明日は";
  const symptomClause = getForecastSymptomLeadClause(symptomFocus, level);

  if (level >= 2) {
    return symptomClause
      ? `${target}${joined}の影響が強め。${symptomClause}です。`
      : `${target}${joined}の影響が強め。守り気味に過ごしたい日です。`;
  }

  if (level >= 1) {
    return symptomClause
      ? `${target}${joined}が少し響きそう。${symptomClause}です。`
      : `${target}${joined}が少し響きそう。早めに軽く整えたい日です。`;
  }

  return symptomClause
    ? `${target}${joined}が背景。${symptomClause}です。`
    : `${target}${joined}が背景。大きく崩れにくい見込みです。`;
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
  if (index === 0) {
    return point?.source === "mtest" ? "まず整えたいラインケア" : "まず整えたい体質ケア";
  }
  return point?.source === "mtest" ? "ラインケア" : "体質ケア";
}

export function getPointRoleSummary(point) {
  return point?.explanation?.role_summary || "この日の整え方に合わせて選んだツボです。";
}

export function getCareStrategyTitle(triggerKey, signal, mode = "tomorrow") {
  if (mode === "today") {
    if (signal === 0) return "今日これから、崩さず過ごす一手";
    if (triggerKey === "damp") return "重さをためない日中ケア";
    if (triggerKey === "pressure_down") return "頭と首肩のこもりを逃がす";
    if (triggerKey === "cold") return "冷えをこわばりに変えない";
    if (triggerKey === "heat") return "熱をこもらせない過ごし方";
    if (triggerKey === "dry") return "うるおいを削らない支度";
    if (triggerKey === "pressure_up") return "張りつめをほどく日中ケア";
    return "今日これから整える一手";
  }
  if (signal === 0) return "明日は、整いやすさを崩さない日";
  if (triggerKey === "damp") return "重さを逃がす前夜づくり";
  if (triggerKey === "pressure_down") return "こもりを抜く前夜づくり";
  if (triggerKey === "cold") return "朝のこわばりを残さない支度";
  if (triggerKey === "heat") return "熱をためこまない夜の支度";
  if (triggerKey === "dry") return "うるおいを削らない支度";
  if (triggerKey === "pressure_up") return "張りつめをほどく前夜づくり";
  return "明日に持ち越さない前夜づくり";
}

export function getCareStrategyLead(triggerFactors, signal, mode = "tomorrow") {
  const labels = safeArray(triggerFactors).map((f) => f?.label).filter(Boolean);
  const joined = labels.length >= 2 ? `${labels[0]}と${labels[1]}` : labels[0] || "気象変化";

  if (mode === "today") {
    if (signal === 0) return `${joined}の影響は強すぎない見込みです。大きな対策より、いつもの調子を崩さない軽い一手に寄せます。`;
    if (signal === 2) return `${joined}がこのあと響きやすい時間があります。山場の前に、ほぐす・食べる・暮らすを少しだけ今日用に整えます。`;
    return `${joined}が少し響きやすい見込みです。今からできる範囲で、こもり・冷え・重さを残さないようにします。`;
  }

  if (signal === 0) {
    return `${joined}の影響は強すぎない見込みです。明日に向けて、いつもの調子を崩さないための軽い整え方を選びます。`;
  }
  if (signal === 2) {
    return `${joined}が重なりやすい日です。明日は山場の前に余力を削られないよう、今夜のうちに身体の逃げ道を作っておきます。`;
  }
  return `${joined}が少し響きやすい日です。大きく構えすぎず、今夜のうちに一手だけ先回りしておきます。`;
}


const CARE_POLICY_DEFINITIONS = {
  shizumeru: {
    key: "shizumeru",
    label: "しずめる",
    short: "熱と冴えを落ち着ける",
  },
  yurumeru: {
    key: "yurumeru",
    label: "ゆるめる",
    short: "力みをほどく",
  },
  meguraseru: {
    key: "meguraseru",
    label: "めぐらせる",
    short: "巡りを止めない",
  },
  nagasu: {
    key: "nagasu",
    label: "ながす",
    short: "重さを逃がす",
  },
  uruosu: {
    key: "uruosu",
    label: "うるおす",
    short: "乾きを補う",
  },
  nukumeru: {
    key: "nukumeru",
    label: "ぬくめる",
    short: "冷えを守る",
  },
  sasaeru: {
    key: "sasaeru",
    label: "ささえる",
    short: "回復力を削らない",
  },
};

const TRIGGER_POLICY_SCORES = {
  pressure_down: { meguraseru: 6, yurumeru: 3.5 },
  pressure_up: { yurumeru: 6, shizumeru: 3.5 },
  damp: { nagasu: 6, sasaeru: 3.5 },
  humidity: { nagasu: 6, sasaeru: 3.5 },
  cold: { nukumeru: 6, sasaeru: 3.5 },
  heat: { shizumeru: 6, uruosu: 3.5 },
  dry: { uruosu: 6, sasaeru: 3.5 },
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
  "yurumeru+meguraseru": "首肩や呼吸を固めすぎず、巡りの逃げ道を作るケアが合います。",
  "meguraseru+yurumeru": "首肩や呼吸を固めすぎず、巡りの逃げ道を作るケアが合います。",
  "nagasu+sasaeru": "重さをため込まず、胃腸と回復力を守るケアが合います。",
  "sasaeru+nagasu": "重さをため込まず、胃腸と回復力を守るケアが合います。",
  "nukumeru+sasaeru": "冷えの入口を守りながら、消耗を増やさないケアが合います。",
  "sasaeru+nukumeru": "冷えの入口を守りながら、消耗を増やさないケアが合います。",
  "shizumeru+uruosu": "熱をこもらせず、乾きや消耗を残さないケアが合います。",
  "uruosu+shizumeru": "熱をこもらせず、乾きや消耗を残さないケアが合います。",
  "shizumeru+nagasu": "熱と重さをため込まず、軽さを残すケアが合います。",
  "nagasu+shizumeru": "熱と重さをため込まず、軽さを残すケアが合います。",
  "uruosu+sasaeru": "乾かしすぎず、回復力を残すケアが合います。",
  "sasaeru+uruosu": "乾かしすぎず、回復力を残すケアが合います。",
  "nagasu+meguraseru": "重さを逃がしながら、巡りを止めないケアが合います。",
  "meguraseru+nagasu": "重さを逃がしながら、巡りを止めないケアが合います。",
  "yurumeru+shizumeru": "力みと高ぶりを早めに落とすケアが合います。",
  "shizumeru+yurumeru": "力みと高ぶりを早めに落とすケアが合います。",
  "nukumeru+meguraseru": "冷やさず、固めず、動き出しやすさを残すケアが合います。",
  "meguraseru+nukumeru": "冷やさず、固めず、動き出しやすさを残すケアが合います。",
};

const SINGLE_POLICY_SUMMARIES = {
  shizumeru: "熱や頭の冴えをこもらせず、落ち着けるケアが合います。",
  yurumeru: "首肩・呼吸・気持ちの力みをほどくケアが合います。",
  meguraseru: "止まりやすい巡りに、軽い動きの逃げ道を作るケアが合います。",
  nagasu: "湿気や重だるさをため込まないケアが合います。",
  uruosu: "乾きと消耗を残さないケアが合います。",
  nukumeru: "足元・お腹・腰まわりの冷えを守るケアが合います。",
  sasaeru: "無理に押し切らず、回復力を削らないケアが合います。",
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

function getPolicySummary({ policies, triggerFactors, signal, mode }) {
  const labels = getForecastBackgroundFactors(triggerFactors).map((f) => f.label).filter(Boolean);
  const joined = labels.length >= 2 ? `${labels[0]}と${labels[1]}` : labels[0] || "天気変化";
  const target = mode === "today" ? "今日は" : "明日は";
  const level = Number(signal || 0);
  const keys = safeArray(policies).map((p) => p.key).filter(Boolean);
  const detail =
    keys.length >= 2
      ? POLICY_PAIR_SUMMARIES[`${keys[0]}+${keys[1]}`] || `${policies[0].short}、${policies[1].short}ケアが合います。`
      : SINGLE_POLICY_SUMMARIES[keys[0]] || "いつもの調子を崩さないケアが合います。";

  if (level <= 0) {
    return `${target}${joined}の影響は強く出にくい見込み。強い対策より、${detail}`;
  }
  if (level >= 2) {
    return `${target}${joined}が響きやすい日。${detail}`;
  }
  return `${target}${joined}が少し響きやすい見込み。${detail}`;
}

export function deriveCarePolicies({ forecast, triggerFactors, riskContext, mode = "tomorrow" } = {}) {
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

  const symptomFocus = constitutionContext.symptom_focus || null;
  addPolicyScores(scores, SYMPTOM_POLICY_SCORES[symptomFocus], 1);

  const coreCode = String(constitutionContext.core_code || "");
  if (coreCode.includes("batt_small")) addPolicyScores(scores, { sasaeru: 0.8, nukumeru: 0.25 });
  if (coreCode.includes("batt_large")) addPolicyScores(scores, { yurumeru: 0.25, meguraseru: 0.25 });
  if (coreCode.startsWith("accel_")) addPolicyScores(scores, { yurumeru: 0.35, shizumeru: 0.3 });
  if (coreCode.startsWith("brake_")) addPolicyScores(scores, { nagasu: 0.35, meguraseru: 0.25 });

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
  if (signal >= 2) addPolicyScores(scores, { sasaeru: 0.75 }, 1);
  if (signal === 1) addPolicyScores(scores, { sasaeru: 0.3 }, 1);

  // The primary policy should stay anchored to the personalized forecast trigger.
  // Constitution, symptoms, and TCM actions only translate that trigger into care language.
  const primaryTriggerKey = normalizeCarePolicyTriggerKey(normalizedTriggerFactors[0]?.key || normalizedTriggerFactors[0]?.exact);
  const primaryTriggerPolicies = Object.keys(TRIGGER_POLICY_SCORES[primaryTriggerKey] || {});
  primaryTriggerPolicies.forEach((key, index) => {
    scores[key] += index === 0 ? 0.9 : 0.35;
  });

  let ranked = Object.entries(scores)
    .map(([key, score]) => ({ key, score }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!ranked.length) {
    ranked = [{ key: "sasaeru", score: 1 }];
  }

  const selected = [ranked[0]];
  const second = ranked.find((item) => item.key !== ranked[0].key);
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
    }),
  };
}


export function getLifestylePlan(primaryKey, secondaryKey, signal, mode = "tomorrow", symptomFocus = null) {
  return getLifestylePlanFromRules(primaryKey, secondaryKey, signal, mode, symptomFocus);
}


export function getPointSelectionReason(point) {
  return (
    point?.explanation?.selection_reason ||
    "この日の整え方に合うツボを選んでいます。"
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
  const base =
    point?.point_region === "abdomen"
      ? "仰向けでお腹の力を抜き、吐く息に合わせて中指でやさしく押します。"
      : "息を吐きながら、じんわり気持ちいい強さで押します。";

  const side =
    point?.point_region === "abdomen"
      ? "20〜30秒を2〜3回。"
      : "左右ある場所は片側20〜30秒ずつ、2〜3回が目安です。";

  return `${base}${side} 痛すぎる強さは避けてください。`;
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
    fallbackTriggerKey,
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




