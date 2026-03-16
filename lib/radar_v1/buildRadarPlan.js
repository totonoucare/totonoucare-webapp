// lib/radar_v1/buildRadarPlan.js
import { composeTsuboSet } from "@/lib/radar_v1/composeTsuboSet";
import {
  getTonightNote,
  getTomorrowFoodStrings,
  getTomorrowCaution,
  getReviewSchemaCopy,
} from "@/lib/radar_v1/copy";

export function buildRadarPlan({
  riskContext,
  tcmPoints,
  mtestPoint,
}) {
  if (!riskContext) throw new Error("buildRadarPlan: riskContext is required");

  const tsuboSet = composeTsuboSet({
    tcmPoints,
    mtestPoint,
  });

  const tonightNote = buildTonightNote(riskContext);
  const tomorrowFoodContext = buildTomorrowFoodContext(riskContext);
  const tomorrowCaution = buildTomorrowCautionBlock(riskContext);
  const reviewSchema = getReviewSchemaCopy();

  return {
    forecast: {
      score_0_10: riskContext.target.score_0_10,
      signal: riskContext.target.signal,
      signal_label: riskContext.target.signal_label,
      main_trigger: riskContext.summary.main_trigger,
      trigger_dir: riskContext.summary.trigger_dir,
      main_trigger_label: riskContext.summary.main_trigger_label,
      peak_start: riskContext.summary.peak_start,
      peak_end: riskContext.summary.peak_end,
      delta_vs_today: riskContext.target.delta_vs_today,
    },

    tonight: {
      tsubo_set: tsuboSet,
      note: tonightNote,
    },

    tomorrow_food: tomorrowFoodContext,

    tomorrow_caution: tomorrowCaution,

    review_schema: reviewSchema,

    gpt_inputs: {
      summary_input: {
        score_0_10: riskContext.target.score_0_10,
        signal_label: riskContext.target.signal_label,
        main_trigger: riskContext.summary.main_trigger,
        trigger_dir: riskContext.summary.trigger_dir,
        main_trigger_label: riskContext.summary.main_trigger_label,
        peak_start: riskContext.summary.peak_start,
        peak_end: riskContext.summary.peak_end,
        symptom_focus: riskContext.constitution_context.symptom_focus,
        core_code: riskContext.constitution_context.core_code,
        sub_labels: riskContext.constitution_context.sub_labels,
        organ_focus: riskContext.tcm_context.organ_focus,
        care_tone: riskContext.care_tone,
      },

      food_input: {
        main_trigger: riskContext.summary.main_trigger,
        trigger_dir: riskContext.summary.trigger_dir,
        main_trigger_label: riskContext.summary.main_trigger_label,
        peak_start: riskContext.summary.peak_start,
        peak_end: riskContext.summary.peak_end,
        score_0_10: riskContext.target.score_0_10,
        symptom_focus: riskContext.constitution_context.symptom_focus,
        core_code: riskContext.constitution_context.core_code,
        sub_labels: riskContext.constitution_context.sub_labels,
        organ_focus: riskContext.tcm_context.organ_focus,
        care_tone: riskContext.care_tone,
        title: tomorrowFoodContext.title,
        timing: tomorrowFoodContext.timing,
        recommendation: tomorrowFoodContext.recommendation,
        how_to: tomorrowFoodContext.how_to,
        avoid: tomorrowFoodContext.avoid,
        reason: tomorrowFoodContext.reason,
        examples: tomorrowFoodContext.examples,
      },
    },

    meta: {
      risk_context: riskContext,
      tcm_meta: tcmPoints?.meta || null,
      mtest_meta: mtestPoint?.meta || null,
    },
  };
}

function buildTonightNote(riskContext) {
  return getTonightNote(
    riskContext.summary.main_trigger,
    riskContext.summary.trigger_dir,
    riskContext.care_tone
  );
}

function buildTomorrowFoodContext(riskContext) {
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
    symptom_focus: riskContext.constitution_context.symptom_focus || null,
    organ_focus: riskContext.tcm_context.organ_focus || [],
    sub_labels: riskContext.constitution_context.sub_labels || [],
    care_tone: riskContext.care_tone,
  };
}

function buildTomorrowCautionBlock(riskContext) {
  return getTomorrowCaution(
    riskContext.constitution_context.symptom_focus,
    riskContext.summary.main_trigger,
    riskContext.summary.trigger_dir
  );
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

  if (main === "temp" && dir === "down") {
    if (timing === "朝") return "朝食か昼食に、汁物や温かい飲み物を一つ足すだけでも十分です。";
    if (timing === "間食") return "間食なら、冷たいものより温かい飲み物や軽いスープ寄りが合います。";
    return "食事に温かい汁物や、火を通した一品を足す形が取り入れやすいです。";
  }

  if (main === "humidity" && dir === "up") {
    return "量を増やすより、軽めで重さを残しにくい内容に寄せる方が合います。";
  }

  if (main === "pressure" && dir === "down") {
    return "空腹と食べすぎの差が大きくなりすぎないよう、無理のない量で整えるのが合います。";
  }

  if (main === "temp" && dir === "up") {
    return "辛さや脂っこさを足すより、軽く食べてこもりを増やしすぎない形が合います。";
  }

  return "無理のない量で、負担を増やしにくい内容に寄せるのが合います。";
}

function buildFoodReason(riskContext) {
  const symptom = riskContext.constitution_context.symptom_focus;
  const main = riskContext.summary.main_trigger;
  const dir = riskContext.summary.trigger_dir;

  if (symptom === "headache" && main === "temp" && dir === "down") {
    return "冷えで首肩が固まると頭の重さにつながりやすい日に、内側から冷えをためにくくするためです。";
  }

  if (main === "humidity" && dir === "up") {
    return "重だるさや頭の重さをためこみにくくするためです。";
  }

  if (main === "pressure" && dir === "down") {
    return "詰まり感や気分の落ち込みを増やしにくくするためです。";
  }

  return "明日のぶれを小さくしやすい方向に寄せるためです。";
}

function buildFoodExamples(riskContext) {
  const main = riskContext.summary.main_trigger;
  const dir = riskContext.summary.trigger_dir;

  if (main === "temp" && dir === "down") {
    return ["味噌汁", "卵スープ", "生姜を少し足した温かい飲み物"];
  }

  if (main === "humidity" && dir === "up") {
    return ["雑炊", "温かいスープ", "野菜多めの軽い定食"];
  }

  if (main === "pressure" && dir === "down") {
    return ["具だくさんの汁物", "温かい麺を軽めに", "おにぎり＋スープ"];
  }

  if (main === "temp" && dir === "up") {
    return ["野菜スープ", "豆腐料理", "脂っこすぎない丼や定食"];
  }

  return [];
}

function buildLifestyleTip(riskContext) {
  const symptom = riskContext.constitution_context.symptom_focus;
  const main = riskContext.summary.main_trigger;
  const dir = riskContext.summary.trigger_dir;

  if (symptom === "headache" && main === "temp" && dir === "down") {
    return "首元を冷やしすぎない意識があると、食の工夫が活きやすいです。";
  }

  if (symptom === "swelling") {
    return "座りっぱなしを続けず、軽く動く時間を作ると重さをためにくくなります。";
  }

  if (symptom === "fatigue") {
    return "食事だけで立て直そうとせず、消耗しすぎない配分も大事です。";
  }

  return "";
}

function parseHour(hhmm) {
  if (!hhmm || typeof hhmm !== "string") return null;
  const m = hhmm.match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]);
}
