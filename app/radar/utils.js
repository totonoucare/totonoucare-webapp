// app/radar/utils.js

import { flattenRadarLocationPresets } from "@/lib/radar_v1/locationPresets";

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

export function getDefaultDateModeJST() {
  const { hour } = getJstTodayTomorrow();
  return hour < 18 ? "today" : "tomorrow";
}

export function inferModeFromTargetDate(targetDate) {
  const { today, tomorrow } = getJstTodayTomorrow();
  if (targetDate === today) return "today";
  if (targetDate === tomorrow) return "tomorrow";
  return null;
}

export function getDateModeLabel(mode) {
  return mode === "today" ? "今日" : "明日";
}

export function buildScoreCardTitle(mode, targetDate) {
  return `${getDateModeLabel(mode)}(${formatTargetDate(targetDate)})の予報`;
}

export function getSectionLabels(mode) {
  if (mode === "today") {
    return {
      noticeTitle: "今日の注意点",
      tsuboTitle: "今日の整えツボ",
      tsuboSubtitle: "今日ここから整えたい3点セット",
      foodTitle: "今日の食養生",
    };
  }

  return {
    noticeTitle: "明日の注意点",
    tsuboTitle: "今夜の先回りツボ",
    tsuboSubtitle: "今夜のうちに整えておきたい3点セット",
    foodTitle: "明日の食養生",
  };
}

export function signalLabel(signal) {
  if (signal === 2) return "警戒";
  if (signal === 1) return "注意";
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

export function getCareStrategyTitle(triggerKey, signal) {
  if (signal === 0) return "明日は、整いやすさを崩さない日";
  if (triggerKey === "damp") return "重さを逃がす前夜づくり";
  if (triggerKey === "pressure_down") return "こもりを抜く前夜づくり";
  if (triggerKey === "cold") return "朝のこわばりを残さない支度";
  if (triggerKey === "heat") return "熱をためこまない夜の支度";
  if (triggerKey === "dry") return "うるおいを削らない支度";
  if (triggerKey === "pressure_up") return "張りつめをほどく前夜づくり";
  return "明日に持ち越さない前夜づくり";
}

export function getCareStrategyLead(triggerFactors, signal) {
  const labels = safeArray(triggerFactors).map((f) => f?.label).filter(Boolean);
  const joined = labels.length >= 2 ? `${labels[0]}と${labels[1]}` : labels[0] || "気象変化";

  if (signal === 0) {
    return `${joined}の影響は強すぎない見込みです。明日に向けて、いつもの調子を崩さないための軽い整え方を選びます。`;
  }
  if (signal === 2) {
    return `${joined}が重なりやすい日です。明日は山場の前に余力を削られないよう、今夜のうちに身体の逃げ道を作っておきます。`;
  }
  return `${joined}が少し響きやすい日です。大きく構えすぎず、今夜のうちに一手だけ先回りしておきます。`;
}

export function getLifestylePlan(primaryKey, secondaryKey, signal) {
  const keys = new Set([primaryKey, secondaryKey].filter(Boolean));

  if (keys.has("damp")) {
    return {
      title: "湿気を寝室に持ち込まない",
      lead:
        signal === 2
          ? "明日は“重さが居座る”感じが出やすい日。身体だけを整えるより、まず寝る場所の湿気の逃げ道を作ると、朝の感覚が変わりやすくなります。"
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
