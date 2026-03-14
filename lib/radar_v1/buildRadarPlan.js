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
    timing: foodCopy.timing,
    focus: foodCopy.focus,
    avoid: foodCopy.avoid,
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

function parseHour(hhmm) {
  if (!hhmm || typeof hhmm !== "string") return null;
  const m = hhmm.match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]);
}
