// lib/radar_v1/buildRadarPlan.js
import { composeTsuboSet } from "@/lib/radar_v1/composeTsuboSet";

/**
 * Build the full daily plan payload used by UI / DB save / GPT input.
 *
 * Output includes:
 * - forecast display block
 * - tonight prep note
 * - tomorrow food context
 * - tomorrow caution
 * - review schema
 */

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
  const tomorrowCaution = buildTomorrowCaution(riskContext);
  const reviewSchema = buildReviewSchema();

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
        preferred_timing: tomorrowFoodContext.timing,
        focus: tomorrowFoodContext.focus,
        avoid: tomorrowFoodContext.avoid,
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
  const main = riskContext.summary.main_trigger;
  const dir = riskContext.summary.trigger_dir;
  const tone = riskContext.care_tone;

  if (main === "pressure" && dir === "down") {
    return {
      title: "今夜の注意",
      body: tone.startsWith("supportive")
        ? "夜更かしを避けて、詰め込みすぎない夜にしたい日です。首肩に力が入り続けないようにしておくと、明日の揺れに備えやすくなります。"
        : "詰め込みすぎず、呼吸が浅くなりすぎないように過ごしたい日です。",
    };
  }

  if (main === "temp" && dir === "down") {
    return {
      title: "今夜の注意",
      body: "首・お腹・足元を冷やしすぎないようにしたい日です。遅い時間の消耗や、眠る前の冷えをためない意識が合います。",
    };
  }

  if (main === "humidity" && dir === "up") {
    return {
      title: "今夜の注意",
      body: "重い食事や甘いもの、冷たいものを重ねすぎない方が明日が軽くなりやすい日です。",
    };
  }

  if (main === "temp" && dir === "up") {
    return {
      title: "今夜の注意",
      body: "のぼせや詰まりをため込みすぎないように、遅い時間まで頑張りすぎない方が合う日です。",
    };
  }

  return {
    title: "今夜の注意",
    body: "今日は少し整えてから休むと、明日のぶれを小さくしやすい日です。",
  };
}

function buildTomorrowFoodContext(riskContext) {
  const main = riskContext.summary.main_trigger;
  const dir = riskContext.summary.trigger_dir;
  const peakStart = parseHour(riskContext.summary.peak_start);
  const symptom = riskContext.constitution_context.symptom_focus;
  const organs = riskContext.tcm_context.organ_focus || [];
  const subLabels = riskContext.constitution_context.sub_labels || [];
  const tone = riskContext.care_tone;

  let timing = "昼";
  if (peakStart !== null && peakStart < 9) timing = "朝";
  else if (peakStart !== null && peakStart < 15) timing = "昼";
  else timing = "間食";

  let focus = "整えやすい食事";
  let avoid = "食べすぎ・飲みすぎを重ねない";

  if (main === "temp" && dir === "down") {
    focus = "温かくて負担の軽いもの";
    avoid = "冷たい飲み物や冷たい食事を重ねない";
  } else if (main === "humidity" && dir === "up") {
    focus = "重さをためにくい軽めのもの";
    avoid = "甘いもの・乳っぽい重さ・冷たいものを重ねない";
  } else if (main === "pressure" && dir === "down") {
    focus = "詰まりを増やしにくい、やさしい食べ方";
    avoid = "食べる量と時間帯の無理を重ねない";
  } else if (main === "temp" && dir === "up") {
    focus = "こもりを増やしにくい軽めのもの";
    avoid = "辛いもの・脂っこいもの・詰め込み食いを重ねない";
  }

  return {
    timing,
    focus,
    avoid,
    symptom_focus: symptom || null,
    organ_focus: organs,
    sub_labels: subLabels,
    care_tone: tone,
  };
}

function buildTomorrowCaution(riskContext) {
  const symptom = riskContext.constitution_context.symptom_focus;
  const main = riskContext.summary.main_trigger;
  const dir = riskContext.summary.trigger_dir;

  if (symptom === "headache") {
    if (main === "pressure" && dir === "down") return "朝の立ち上がりを急ぎすぎず、首肩の力みをためないようにしたい日です。";
    if (main === "temp" && dir === "down") return "冷えで首肩が固まりやすいので、冷気に当たり続けないようにしたい日です。";
  }

  if (symptom === "sleep") {
    return "刺激を重ねすぎず、夜に向けて少し早めに整える意識が合います。";
  }

  if (symptom === "mood") {
    return "詰め込みすぎるより、切り替えの余白を少し作る方が合う日です。";
  }

  if (symptom === "neck_shoulder") {
    return "同じ姿勢を続けすぎず、肩の力が抜けるタイミングをこまめに作りたい日です。";
  }

  return "無理に頑張りきるより、少し余白を残す方が合う日です。";
}

function buildReviewSchema() {
  return {
    condition_options: [
      { value: 0, label: "崩れた" },
      { value: 1, label: "ふつう" },
      { value: 2, label: "大丈夫だった" },
    ],
    prevent_options: [
      { value: 0, label: "できなかった" },
      { value: 1, label: "一部できた" },
      { value: 2, label: "できた" },
    ],
    action_tag_options: [
      { value: "tsubo_done", label: "ツボできた" },
      { value: "food_done", label: "食を意識できた" },
      { value: "avoid_done", label: "控えたいことを意識できた" },
    ],
  };
}

function parseHour(hhmm) {
  if (!hhmm || typeof hhmm !== "string") return null;
  const m = hhmm.match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]);
}
