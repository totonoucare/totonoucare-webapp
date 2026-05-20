// app/radar/utils.js

import { flattenRadarLocationPresets } from "@/lib/radar_v1/locationPresets";

export function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

const SYMPTOM_LABELS = {
  fatigue: "疲れやすさ",
  sleep: "睡眠の乱れ",
  neck_shoulder: "首肩の重さ",
  low_back_pain: "腰まわりの重さ",
  swelling: "むくみ",
  headache: "頭の重さ",
  dizziness: "ふらつき",
  mood: "気分の張りつめ",
};

const TRIGGER_LABELS = {
  pressure_down: "低気圧",
  pressure_up: "気圧上昇",
  damp: "湿気",
  humidity: "湿気",
  cold: "冷え",
  heat: "暑さ",
  dry: "乾燥",
  temp: "気温差",
};

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

export function getForecastBodySigns(triggerFactors, signal = 0) {
  if (Number(signal) === 0) {
    return ["大きなサインは出にくい見込み", "いつものリズムを崩さない", "違和感があれば軽めに整える"];
  }

  const keys = safeArray(triggerFactors).map((factor) => factor?.key || factor?.exact).filter(Boolean);
  const signs = keys.flatMap((key) => BODY_SIGN_LABELS[key] || []);
  return uniqueTake(signs.length ? signs : ["重だるさが出やすい", "首肩がこわばりやすい", "疲れが残りやすい"], 3);
}

export function getForecastPeakPrepItems(triggerFactors, signal = 0) {
  if (Number(signal) === 0) {
    return ["予定を詰め込みすぎない", "食事と休憩をいつも通りに保つ", "違和感が出たら早めに一息入れる"];
  }

  const keys = safeArray(triggerFactors).map((factor) => factor?.key || factor?.exact).filter(Boolean);
  const items = keys.flatMap((key) => PEAK_PREP_ITEMS[key] || []);
  return uniqueTake(items.length ? items : ["山場前に首肩をゆるめる", "食事を重くしすぎない", "予定に少し余白を残す"], 3);
}

export function getForecastModeLead(triggerFactors, signal = 0, mode = "today") {
  const level = Number(signal);
  const factors = getForecastBackgroundFactors(triggerFactors);
  const labels = factors.map((f) => f.label).filter(Boolean);
  const joined = labels.length >= 2 ? `${labels[0]}と${labels[1]}` : labels[0] || "天気変化";
  const target = mode === "today" ? "今日は" : "明日は";

  if (level === 2) {
    return `${target}${joined}の影響が強め。予定・食事・休み方を守り気味にして、無理を重ねない日です。`;
  }
  if (level === 1) {
    return `${target}${joined}が少し響きやすい見込み。早めに軽く整えると、後半の崩れを抑えやすい日です。`;
  }
  return `${target}大きく崩れにくい見込み。いつものリズムを保ちながら、余裕があれば軽く整える日です。`;
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


function getTodayLifestylePlan(primaryKey, secondaryKey, signal) {
  const severity = Number(signal ?? 0);
  if (primaryKey === "damp") {
    return {
      title: "重さを外に逃がす環境づくり",
      lead:
        severity >= 2
          ? "このあと湿気の重さが居座りやすい時間帯です。部屋・服・姿勢のこもりを少し抜くだけでも体感が変わります。"
          : "湿気が少し残りやすい時間帯です。大きな対策より、こもりを作らない一手にします。",
      steps: ["5分だけ換気する", "濡れたタオルや部屋干しから少し離れる", "食後に2〜3分だけ歩く"],
      trap: "座りっぱなし・冷たい飲食・甘いものを重ねると、重さが残りやすくなります。",
    };
  }
  if (primaryKey === "pressure_down") {
    return {
      title: "頭と首肩の通り道を作る",
      lead:
        severity >= 2
          ? "このあと頭・首肩・耳まわりが詰まりやすい時間帯です。山場前に上半身の力みを抜いておきます。"
          : "気圧変化が少し響きやすい時間帯です。首を固めたまま粘らないのがコツです。",
      steps: ["耳の周りを10秒ずつほぐす", "画面から目を離して首を一度起こす", "肩をすくめて落とす動きを3回する"],
      trap: "頭が重いままカフェインや甘いもので押し切ると、あとで首肩の重さとして残ることがあります。",
    };
  }
  if (primaryKey === "cold") {
    return {
      title: "冷えをこわばりに変えない",
      lead:
        severity >= 2
          ? "このあと冷えや気温差が腰腹・足元に残りやすい時間帯です。温める場所を一つに絞って先に守ります。"
          : "冷えを少し拾いやすい時間帯です。冷やし切ってから戻すより、先に一か所だけ守ります。",
      steps: ["足首かお腹のどちらかを温める", "冷たい飲み物を続けない", "外に出る前に首元・腰元を確認する"],
      trap: "薄着のまま冷たい飲み物を重ねると、腰や足のだるさに残りやすくなります。",
    };
  }
  if (primaryKey === "heat") {
    return {
      title: "熱をこもらせない休ませ方",
      lead:
        severity >= 2
          ? "このあと暑さや熱のこもりが出やすい時間帯です。頑張って発散するより、熱の逃げ道を作ります。"
          : "熱が少し残りやすい時間帯です。刺激を足すより、余分な熱を残さない方向に寄せます。",
      steps: ["首の後ろを短時間だけ冷ます", "水分を小分けに取る", "辛いもの・濃い味を重ねすぎない"],
      trap: "暑さの上に辛味・アルコール・カフェインを重ねると、眠りやだるさに残ることがあります。",
    };
  }
  if (primaryKey === "dry") {
    return {
      title: "乾きの入口を減らす",
      lead:
        severity >= 2
          ? "このあと喉・目・首肩の乾きが出やすい時間帯です。水分だけでなく、環境と使いすぎを一緒に整えます。"
          : "乾きを少し拾いやすい時間帯です。喉や目が乾く前に小さく補います。",
      steps: ["温かい飲み物を少しずつ取る", "目を閉じる時間を10秒作る", "室内が乾くなら加湿や濡れタオルを使う"],
      trap: "コーヒーだけで粘る、乾いた菓子だけでつなぐと、乾きが残りやすくなります。",
    };
  }
  return {
    title: "張りつめをほどく切り替え",
    lead:
      severity >= 2
        ? "このあと身体が前のめりになりやすい時間帯です。集中を増やすより、一度抜く時間を作ります。"
        : "少し張りつめやすい時間帯です。早めに小さく切り替えると残りにくくなります。",
    steps: ["通知を見ない時間を5分作る", "息を吐く時間を長めにする", "肩・手首・足首のどれかをゆるめる"],
    trap: "予定や通知を抱えたまま走り続けると、夜に張りが残りやすくなります。",
  };
}

export function getLifestylePlan(primaryKey, secondaryKey, signal, mode = "tomorrow") {
  if (mode === "today") return getTodayLifestylePlan(primaryKey, secondaryKey, signal);
  const keys = new Set([primaryKey, secondaryKey].filter(Boolean));

  if (keys.has("damp")) {
    return {
      title: "湿気を寝室に持ち込まない",
      lead:
        signal === 2
          ? `${mode === "today" ? "このあと“重さが居座る”感じが出やすい時間帯。" : "明日は“重さが居座る”感じが出やすい日。"}身体だけを整えるより、まず空間の湿気の逃げ道を作ると、体感が変わりやすくなります。`
          : mode === "today"
            ? "湿気が残りやすい時間帯です。部屋や服のこもりを少し抜いて、身体に重さを残さないようにします。"
            : "湿気が残りやすい日は、寝る前の空間づくりで体感が変わります。部屋のこもりを少し抜いてから休みましょう。",
      steps: [
        "寝る前に5分だけ換気して、空気を一度入れ替える",
        "部屋干しや濡れたタオルを、寝室から少し離す",
        "首・みぞおち・お腹まわりを冷やさない服装にする",
      ],
      trap: "冷たい飲み物・甘いもの・部屋のこもりが重なると、翌朝に重さとして残りやすくなります。",
    };
  }

  if (keys.has("pressure_down")) {
    return {
      title: "頭と首肩の逃げ道を作る",
      lead:
        signal === 2
          ? "低気圧の日は、頭だけでなく首肩や耳まわりまで“こもる”感じが出やすい日。寝る前に上半身の通り道を作っておくのが先回りです。"
          : "気圧が下がる日は、首肩まわりを固めたまま寝ないことが小さな差になります。短時間で抜け道を作りましょう。",
      steps: [
        "耳を上・横・下に軽く引っぱり、耳まわりを温める",
        "スマホを見る姿勢を一度リセットして、首の後ろをゆるめる",
        "枕元に水を置き、寝る前の一口で乾きすぎを避ける",
      ],
      trap: "寝る直前まで画面を見続けて首を固めると、明日の山場で重く感じやすくなります。",
    };
  }

  if (keys.has("cold")) {
    return {
      title: "朝に冷えを持ち越さない",
      lead:
        signal === 2
          ? "冷え込みの日は、朝になってから温めるより、夜のうちに“冷えの入口”をふさいでおく方が先回りになります。"
          : "冷えが出やすい日は、寝る前の足元・腰腹まわりがポイントです。朝のこわばりを残さない準備に寄せます。",
      steps: [
        "足首・お腹・腰のどこか一つだけ温かくして寝る",
        "シャワーだけの日は、足先に少し長めに温水を当てる",
        "朝使う上着や靴下を、寝る前に手に取りやすい場所へ置く",
      ],
      trap: "首元・足首・お腹を同時に冷やすと、翌朝にこわばりとして出やすくなります。",
    };
  }

  if (keys.has("heat")) {
    return {
      title: "熱を部屋と身体に残さない",
      lead:
        signal === 2
          ? "暑さが響く日は、頑張って汗をかくより、夜に熱を持ち越さない設計が大事です。寝る前の環境づくりを優先します。"
          : "気温上昇がある日は、寝苦しさを作らないことが翌日の余力につながります。熱の逃げ道を用意しましょう。",
      steps: [
        "寝る前に部屋の熱気を逃がしてから冷房を使う",
        "首元を締めつけない服で、熱がこもる場所を減らす",
        "入浴後すぐ布団に入らず、汗が引いてから休む",
      ],
      trap: "熱がこもった部屋でそのまま寝ると、眠りの浅さやだるさにつながりやすくなります。",
    };
  }

  if (keys.has("dry")) {
    return {
      title: "乾きを寝ている間に進ませない",
      lead:
        signal === 2
          ? "乾燥の日は、のど・肌・目の通り道が削られやすい日。寝る前に“乾きの入口”を減らしておくのが先回りです。"
          : "乾燥がある日は、朝起きたときののどや肌の感覚に差が出やすいです。寝室の乾きを少しやわらげましょう。",
      steps: [
        "枕元に水を置き、寝る前と起床後に一口飲めるようにする",
        "エアコンの風が顔に直接当たらない向きに変える",
        "洗顔後や入浴後は、乾く前に保湿まで済ませる",
      ],
      trap: "暖房の風・夜更かし・水分不足が重なると、翌朝の乾きとして出やすくなります。",
    };
  }

  if (keys.has("pressure_up")) {
    return {
      title: "張りつめたまま寝ない",
      lead:
        signal === 2
          ? "気圧上昇の日は、身体が前のめりになりやすい日。寝る前に“抜く時間”を作って、張りつめを翌日に持ち越さないようにします。"
          : "張りつめやすい日は、休む前の切り替えがポイントです。短くても、緊張をほどく儀式を入れましょう。",
      steps: [
        "寝る30分前だけ、通知を見ない時間を作る",
        "肩をすくめて一気に落とす動きを3回入れる",
        "明日の予定を一つだけ紙に出して、頭の中から外に置く",
      ],
      trap: "予定や通知を抱えたまま寝ると、休んだのに張りが残る感覚につながりやすくなります。",
    };
  }

  return {
    title: "いつもの調子を崩さない夜にする",
    lead:
      "明日は大きな波は出にくい見込みです。特別なことを増やすより、睡眠・食べ方・身体の力みを少し整えて、安定を残しましょう。",
    steps: [
      "寝る前のスマホ時間を少し短くする",
      "明日の朝に使うものを先に出して、起きた直後の負担を減らす",
      "首肩かお腹のどちらか一つだけ、冷やさないようにする",
    ],
    trap: "安定の日ほど、夜更かしや食べすぎで自分から波を作らないのがコツです。",
  };
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


const TODAY_POINT_LIBRARY = {
  LI4: {
    code: "LI4",
    name_ja: "合谷",
    reading_ja: "ごうこく",
    body_region: "hand",
    point_region: "limb",
    meridian_code: "li",
    image_path: "points/LI4.webp",
    tags_symptom: ["headache", "neck_shoulder", "mood"],
    tags_trigger: ["pressure", "temp"],
    tcm_actions: ["move_qi", "move_blood"],
    organ_focus: ["liver"],
  },
  LR3: {
    code: "LR3",
    name_ja: "太衝",
    reading_ja: "たいしょう",
    body_region: "foot_dorsum",
    point_region: "limb",
    meridian_code: "lr",
    image_path: "points/LR3.webp",
    tags_symptom: ["headache", "mood", "neck_shoulder"],
    tags_trigger: ["pressure", "temp"],
    tcm_actions: ["move_qi", "soothe_liver"],
    organ_focus: ["liver"],
  },
  GB20: {
    code: "GB20",
    name_ja: "風池",
    reading_ja: "ふうち",
    body_region: "neck_base",
    point_region: "head_neck",
    meridian_code: "gb",
    image_path: "points/GB20.webp",
    tags_symptom: ["headache", "dizziness", "neck_shoulder"],
    tags_trigger: ["pressure", "temp"],
    tcm_actions: ["move_qi", "move_blood"],
    organ_focus: ["liver"],
  },
  PC6: {
    code: "PC6",
    name_ja: "内関",
    reading_ja: "ないかん",
    body_region: "forearm_inner",
    point_region: "limb",
    meridian_code: "pc",
    image_path: "points/PC6.webp",
    tags_symptom: ["sleep", "mood", "dizziness"],
    tags_trigger: ["pressure", "temp"],
    tcm_actions: ["move_qi", "soothe_liver"],
    organ_focus: ["liver", "kidney"],
  },
  ST36: {
    code: "ST36",
    name_ja: "足三里",
    reading_ja: "あしさんり",
    body_region: "leg_anterior",
    point_region: "limb",
    meridian_code: "st",
    image_path: "points/ST36.webp",
    tags_symptom: ["fatigue", "swelling", "dizziness"],
    tags_trigger: ["humidity", "temp"],
    tcm_actions: ["tonify_qi", "strengthen_spleen"],
    organ_focus: ["spleen", "kidney"],
  },
  SP6: {
    code: "SP6",
    name_ja: "三陰交",
    reading_ja: "さんいんこう",
    body_region: "leg_medial",
    point_region: "limb",
    meridian_code: "sp",
    image_path: "points/SP6.webp",
    tags_symptom: ["fatigue", "sleep", "low_back_pain"],
    tags_trigger: ["humidity", "temp"],
    tcm_actions: ["nourish_blood", "generate_fluids"],
    organ_focus: ["spleen", "kidney"],
  },
  KI3: {
    code: "KI3",
    name_ja: "太渓",
    reading_ja: "たいけい",
    body_region: "ankle_medial",
    point_region: "limb",
    meridian_code: "ki",
    image_path: "points/KI3.webp",
    tags_symptom: ["fatigue", "low_back_pain", "dizziness"],
    tags_trigger: ["temp", "pressure"],
    tcm_actions: ["support_kidney", "generate_fluids"],
    organ_focus: ["kidney"],
  },
  CV6: {
    code: "CV6",
    name_ja: "気海",
    reading_ja: "きかい",
    body_region: "lower_abdomen",
    point_region: "abdomen",
    meridian_code: "cv",
    image_path: "points/CV6.webp",
    tags_symptom: ["fatigue", "low_back_pain", "dizziness"],
    tags_trigger: ["temp", "pressure"],
    tcm_actions: ["tonify_qi", "support_kidney"],
    organ_focus: ["kidney"],
  },
  LU7: {
    code: "LU7",
    name_ja: "列缺",
    reading_ja: "れっけつ",
    body_region: "forearm_thumb_side",
    point_region: "limb",
    meridian_code: "lu",
    image_path: "points/LU7.webp",
    tags_symptom: ["neck_shoulder", "headache"],
    tags_trigger: ["pressure", "temp"],
    tcm_actions: ["move_qi", "tonify_qi"],
    organ_focus: ["liver", "spleen"],
  },
  SP5: {
    code: "SP5",
    name_ja: "商丘",
    reading_ja: "しょうきゅう",
    body_region: "ankle_medial",
    point_region: "limb",
    meridian_code: "sp",
    image_path: "points/SP5.webp",
    tags_symptom: ["swelling", "fatigue"],
    tags_trigger: ["humidity", "temp"],
    tcm_actions: ["transform_damp"],
    organ_focus: ["spleen"],
  },
};

const TODAY_POINT_BY_SYMPTOM = {
  headache: ["GB20", "LI4", "LR3"],
  neck_shoulder: ["GB20", "LU7", "LI4"],
  low_back_pain: ["KI3", "CV6", "SP6"],
  dizziness: ["PC6", "KI3", "ST36"],
  mood: ["LR3", "PC6", "LI4"],
  sleep: ["PC6", "SP6", "KI3"],
  fatigue: ["ST36", "CV6", "KI3"],
  swelling: ["SP5", "ST36", "SP6"],
};

const TODAY_POINT_BY_TRIGGER = {
  damp: ["ST36", "SP5", "SP6"],
  humidity: ["ST36", "SP5", "SP6"],
  pressure_down: ["GB20", "PC6", "LI4"],
  pressure_up: ["LR3", "LI4", "PC6"],
  cold: ["KI3", "CV6", "ST36"],
  heat: ["LI4", "LR3", "GB20"],
  dry: ["KI3", "PC6", "LU7"],
  temp: ["ST36", "KI3", "LI4"],
};

function decorateTodayPoint(point, { symptomFocus, triggerKey, signal } = {}) {
  const symptomLabel = SYMPTOM_LABELS[symptomFocus] || "今日の不調";
  const triggerLabel = TRIGGER_LABELS[triggerKey] || "このあとの変化";
  const pressure = signal >= 2 ? "山場前に" : "気づいた時に";
  return {
    ...point,
    source: "today_rule",
    explanation: {
      role_summary:
        point.point_region === "head_neck"
          ? "頭・首肩まわりのこもりを、その場で逃がしたい時に使いやすいツボです。"
          : point.point_region === "abdomen"
            ? "お腹と腰腹まわりの力を抜き、冷えやだるさを抱え込ませないためのツボです。"
            : "今日これからの違和感を、強くなる前に逃がすためのセルフケア向きのツボです。",
      selection_reason: `${symptomLabel}と${triggerLabel}を見て、${pressure}短時間で使いやすいツボとして選んでいます。明日の弁証型というより、今日の山場をやり過ごすための実用寄りです。`,
      match_tags: [symptomFocus, triggerKey].filter(Boolean),
    },
  };
}

function pickTodayPointCodes(symptomFocus, triggerKey) {
  const ordered = [
    ...safeArray(TODAY_POINT_BY_SYMPTOM[symptomFocus]),
    ...safeArray(TODAY_POINT_BY_TRIGGER[triggerKey]),
    ...safeArray(TODAY_POINT_BY_TRIGGER[getForecastTriggerKey({ main_trigger: triggerKey })]),
    "LI4",
    "PC6",
    "ST36",
  ];
  return Array.from(new Set(ordered)).filter((code) => TODAY_POINT_LIBRARY[code]).slice(0, 3);
}

function buildTodayFoodContext(triggerKey, signal) {
  if (triggerKey === "damp" || triggerKey === "humidity") {
    return {
      title: "重さを増やさない昼〜間食",
      recommendation: "冷たい麺・甘いカフェラテ・揚げ物を重ねるより、温かい汁物や香味野菜を少し足して、重さの逃げ道を作ります。",
      how_to: "昼か間食のどこかで、温かい飲み物・汁物・生姜やねぎなどの香味を一つだけ足します。完璧な養生食に寄せなくて大丈夫です。",
      avoid: "冷たいもの、甘いもの、油っこいものを同じ時間帯に重ねすぎない。",
      reason: "湿気が響く日は、食べたものが力になる前に“重さ”として残りやすい設計にしています。",
      lifestyle_tip: "食後すぐ座りっぱなしにせず、2〜3分だけ歩くと重さを残しにくくなります。",
      examples: ["温かい味噌汁を足す", "冷たい麺なら温かいお茶を合わせる", "甘い飲み物を無糖のお茶に替える"],
    };
  }

  if (triggerKey === "cold") {
    return {
      title: "冷えを残さない食べ方",
      recommendation: "冷たいサラダやアイスで済ませるより、温かい主食・汁物・香味を一つ足して、腰腹まわりを冷やしすぎない形に寄せます。",
      how_to: "昼食か夕方に、温かい飲み物か汁物を入れてください。量を増やすより温度を変える方が今日向きです。",
      avoid: "空腹のまま冷たい飲み物を流し込む、薄着で冷たいものを続ける。",
      reason: "気温差や冷え込みがある日は、食事の温度がそのままこわばりの残り方に出やすいためです。",
      lifestyle_tip: "食べる前後に足首・腰腹を冷やさないだけでも、午後の重さを減らしやすくなります。",
      examples: ["スープを足す", "常温〜温かい飲み物にする", "生姜・ねぎ・味噌系を少し使う"],
    };
  }

  if (triggerKey === "heat") {
    return {
      title: "熱をこもらせない昼〜夕方",
      recommendation: "辛いもの・濃い味・カフェインで押し切るより、軽い汁気やみずみずしい食材を入れて、熱の逃げ道を残します。",
      how_to: "昼〜夕方のどこかで、水分と塩気を少し補い、濃い味を重ねすぎないようにします。",
      avoid: "暑さに加えて辛味・アルコール・カフェインを重ねる。",
      reason: "暑さが響く日は、頑張るための刺激が“内側の熱っぽさ”として残りやすいからです。",
      lifestyle_tip: "首の後ろを冷やしすぎず、汗が引く時間を少し作ると楽です。",
      examples: ["具のあるスープ", "梅・しそ系の軽い味", "常温の水分をこまめに"],
    };
  }

  if (triggerKey === "dry") {
    return {
      title: "乾きを削らない間食",
      recommendation: "カリカリした菓子や濃いコーヒーだけでつなぐより、汁気・果物・温かい飲み物を少し入れて、喉と頭の乾きを残さないようにします。",
      how_to: "水を一気飲みするより、温かい飲み物や汁気を小分けに入れる方が今日向きです。",
      avoid: "空腹のままコーヒーだけで粘る、乾いた菓子を続ける。",
      reason: "乾燥が響く日は、喉だけでなく頭や首肩の張りにもつながりやすい前提で組みます。",
      lifestyle_tip: "室内が乾くなら、デスク周りの湿度や喉の使いすぎも一緒に見てください。",
      examples: ["温かいお茶", "汁物", "みずみずしい果物を少量"],
    };
  }

  return {
    title: "頭と首肩を詰まらせない食べ方",
    recommendation: "急いで甘いものやカフェインで押すより、軽く温かいものを入れて、頭と首肩にこもる感じを逃がす食べ方に寄せます。",
    how_to: "昼〜夕方に、温かい飲み物・汁物・軽めの主食のどれかを選びます。食べすぎより“詰め込まない”ことを優先します。",
    avoid: "空腹のままカフェインを重ねる、甘いものだけで山場を越えようとする。",
    reason: "気圧変化が響く日は、胃腸の重さと首肩のこわばりが一緒に出ると体感が悪くなりやすいからです。",
    lifestyle_tip: "食後は首を一度起こし、耳まわりを軽く動かすと切り替えやすくなります。",
    examples: ["温かいお茶", "軽いスープ", "小さめのおにぎり＋汁物"],
  };
}

export function buildTodayCarePlan({ forecast, riskContext } = {}) {
  if (!forecast) return null;
  const triggerFactors = getForecastTriggerFactors(forecast);
  const triggerKey = triggerFactors[0]?.key || getForecastTriggerKey(forecast);
  const secondaryKey = triggerFactors[1]?.key || null;
  const signal = Number(forecast?.signal ?? 0);
  const symptomFocus = riskContext?.constitution_context?.symptom_focus || null;
  const codes = pickTodayPointCodes(symptomFocus, triggerKey);
  const points = codes.map((code) => decorateTodayPoint(TODAY_POINT_LIBRARY[code], { symptomFocus, triggerKey, signal }));
  const food = buildTodayFoodContext(triggerKey, signal);

  return {
    id: `today-care-${forecast?.target_date || "live"}`,
    night_tsubo_set: {
      title: "今日これから使えるツボ",
      lead: "明日の弁証というより、このあとの山場をやり過ごすための実用寄りで選んでいます。",
      points,
    },
    night_tsubo_reason: points[0]?.explanation?.selection_reason || "今日これからの山場に合わせて選んでいます。",
    tomorrow_food_context: food,
    night_food: food,
    night_food_reason: food.reason,
    tomorrow_caution: food.avoid || "無理を重ねすぎないでください。",
    lifestyle_plan: getLifestylePlan(triggerKey, secondaryKey, signal, "today"),
  };
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


