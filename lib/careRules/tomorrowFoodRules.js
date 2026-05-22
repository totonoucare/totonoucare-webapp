// lib/radar_v1/careRules/tomorrowFoodRules.js
import { getTomorrowFoodStrings } from "@/lib/radar_v1/copy";

export function buildTomorrowFoodContext(riskContext) {
  const peakStart = parseHour(riskContext.summary.peak_start);
  const foodCopy = getTomorrowFoodStrings(
    riskContext.summary.main_trigger,
    riskContext.summary.trigger_dir,
    peakStart
  );

  return {
    title: buildFoodTitle(riskContext),
    timing: foodCopy.timing,
    recommendation: foodCopy.focus,
    how_to: buildFoodHowTo(riskContext, foodCopy.timing),
    avoid: foodCopy.avoid,
    reason: buildFoodReason(riskContext),
    examples: buildFoodExamples(riskContext),
    lifestyle_tip: buildLifestyleTip(riskContext),
    personal_main_trigger_exact: riskContext.summary.main_trigger_exact || null,
    personal_secondary_trigger_exact: riskContext.summary.secondary_trigger_exact || null,
    trigger_factors: riskContext.summary.trigger_factors || [],
    symptom_focus: riskContext.constitution_context.symptom_focus || null,
    organ_focus: riskContext.tcm_context.organ_focus || [],
    sub_labels: riskContext.constitution_context.sub_labels || [],
    care_tone: riskContext.care_tone,
  };
}

function getSecondaryExact(riskContext) {
  const primary = riskContext?.summary?.main_trigger_exact || null;
  const secondary = riskContext?.summary?.secondary_trigger_exact || null;
  if (!secondary || secondary === primary) return null;
  return secondary;
}

function secondaryFoodHint(exact) {
  if (exact === "damp") return "湿気の重さも意識して、軽さを足す";
  if (exact === "dry") return "乾きも意識して、うるおいを少し足す";
  if (exact === "cold") return "冷えも意識して、温かさを足す";
  if (exact === "heat") return "熱こもりも意識して、こもらせない";
  if (exact === "pressure_down") return "気圧低下も意識して、詰め込みすぎない";
  if (exact === "pressure_up") return "気圧上昇も意識して、力ませすぎない";
  return null;
}

function buildFoodTitle(riskContext) {
  const main = riskContext.summary.main_trigger;
  const dir = riskContext.summary.trigger_dir;

  if (main === "temp" && dir === "down") return "明日は温かい一品を足す";
  if (main === "humidity" && dir === "up") return "明日は重さをためにくい食べ方へ";
  if (main === "pressure" && dir === "down") return "明日は詰め込みすぎない食べ方へ";
  if (main === "temp" && dir === "up") return "明日はこもりすぎない軽めの食事へ";
  return "明日の食養生";
}

function buildFoodHowTo(riskContext, timing) {
  const main = riskContext.summary.main_trigger;
  const dir = riskContext.summary.trigger_dir;
  const secondaryHint = secondaryFoodHint(getSecondaryExact(riskContext));

  if (main === "temp" && dir === "down") {
    const base = timing === "朝"
      ? "朝食か昼食に、汁物や温かい飲み物を一つ足すだけでも十分です。"
      : timing === "間食"
        ? "間食なら、冷たいものより温かい飲み物や軽いスープ寄りが合います。"
        : "食事に温かい汁物や、火を通した一品を足す形が取り入れやすいです。";
    return secondaryHint ? `${base} ${secondaryHint}ことも少し意識するとより合います。` : base;
  }

  if (main === "humidity" && dir === "up") {
    const base = "量を増やすより、軽めで重さを残しにくい内容に寄せる方が合います。";
    return secondaryHint ? `${base} ${secondaryHint}意識も少し足してください。` : base;
  }

  if (main === "pressure" && dir === "down") {
    const base = "空腹と食べすぎの差が大きくなりすぎないよう、無理のない量で整えるのが合います。";
    return secondaryHint ? `${base} ${secondaryHint}ことも合わせると安心です。` : base;
  }

  if (main === "temp" && dir === "up") {
    const base = "辛さや脂っこさを足すより、軽く食べてこもりを増やしすぎない形が合います。";
    return secondaryHint ? `${base} ${secondaryHint}意識も添えてください。` : base;
  }

  const base = "無理のない量で、負担を増やしにくい内容に寄せるのが合います。";
  return secondaryHint ? `${base} ${secondaryHint}ことも少し添えると合います。` : base;
}

function buildFoodReason(riskContext) {
  const symptom = riskContext.constitution_context.symptom_focus;
  const main = riskContext.summary.main_trigger;
  const dir = riskContext.summary.trigger_dir;
  const secondaryHint = secondaryFoodHint(getSecondaryExact(riskContext));

  if (symptom === "headache" && main === "temp" && dir === "down") {
    const base = "冷えで首肩が固まると頭の重さにつながりやすい日に、内側から冷えをためにくくするためです。";
    return secondaryHint ? `${base} ${secondaryHint}ことも狙います。` : base;
  }

  if (main === "humidity" && dir === "up") {
    const base = "重だるさや頭の重さをためこみにくくするためです。";
    return secondaryHint ? `${base} ${secondaryHint}ことも狙います。` : base;
  }

  if (main === "pressure" && dir === "down") {
    const base = "詰まり感や気分の落ち込みを増やしにくくするためです。";
    return secondaryHint ? `${base} ${secondaryHint}ことも狙います。` : base;
  }

  const base = "明日のぶれを小さくするために、先に整えておくためです。";
  return secondaryHint ? `${base} ${secondaryHint}ことも意識します。` : base;
}

function buildFoodExamples(riskContext) {
  const main = riskContext.summary.main_trigger;
  const dir = riskContext.summary.trigger_dir;
  const secondary = getSecondaryExact(riskContext);

  if (main === "temp" && dir === "down") {
    const base = ["味噌汁", "卵スープ", "生姜を少し足した温かい飲み物"];
    if (secondary === "damp") return ["生姜入り味噌汁", "野菜スープ", "温かいお茶"];
    if (secondary === "dry") return ["卵スープ", "豆腐入り味噌汁", "はちみつを少し足した温かい飲み物"];
    return base;
  }

  if (main === "humidity" && dir === "up") {
    const base = ["雑炊", "温かいスープ", "野菜多めの軽い定食"];
    if (secondary === "cold") return ["温かい雑炊", "生姜を少し足したスープ", "野菜多めの温かい定食"];
    if (secondary === "pressure_down") return ["具だくさんスープ", "軽めのうどん", "おにぎり＋味噌汁"];
    return base;
  }

  if (main === "pressure" && dir === "down") {
    const base = ["具だくさんの汁物", "温かい麺を軽めに", "おにぎり＋スープ"];
    if (secondary === "damp") return ["具だくさん味噌汁", "雑炊を軽めに", "おにぎり＋温かいお茶"];
    if (secondary === "heat") return ["野菜スープ", "豆腐入りの汁物", "軽めの定食"];
    return base;
  }

  if (main === "temp" && dir === "up") {
    const base = ["野菜スープ", "豆腐料理", "脂っこすぎない丼や定食"];
    if (secondary === "dry") return ["豆腐入りスープ", "卵とじ", "野菜多めの温かい定食"];
    if (secondary === "pressure_up") return ["野菜スープ", "豆腐料理", "香味を控えめにした軽い定食"];
    return base;
  }

  return [];
}

function buildLifestyleTip(riskContext) {
  const symptom = riskContext.constitution_context.symptom_focus;
  const main = riskContext.summary.main_trigger;
  const dir = riskContext.summary.trigger_dir;

  if (symptom === "headache") {
    return "食後に首まわりを軽く回して、呼吸を深くする。";
  }

  if (main === "pressure" && dir === "down") {
    return "少しだけ目を閉じて、長めに息を吐く時間を作る。";
  }

  if (main === "humidity" && dir === "up") {
    return "座りっぱなしを避けて、数分だけ体を動かす。";
  }

  return "食後に少しだけ呼吸を整えて、詰め込みすぎないようにする。";
}

function parseHour(hhmm) {
  if (!hhmm || typeof hhmm !== "string") return null;
  const [h] = hhmm.split(":");
  const n = Number(h);
  return Number.isFinite(n) ? n : null;
}
