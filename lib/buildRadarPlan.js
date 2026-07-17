// lib/radar_v1/buildRadarPlan.js
import { composeTsuboSet } from "@/lib/radar_v1/composeTsuboSet";
import { buildTomorrowFoodContext } from "@/lib/radar_v1/careRules/tomorrowFoodRules";
import { enhanceDailyCarePlan } from "@/lib/radar_v1/careRules/dailyCareV2";
import {
  getTonightNote,
  getTomorrowCaution,
  getReviewSchemaCopy,
} from "@/lib/radar_v1/copy";

export function buildRadarPlan({
  riskContext,
  tcmPoints,
  mtestPoint,
  targetDate = null,
}) {
  if (!riskContext) throw new Error("buildRadarPlan: riskContext is required");

  const tsuboSet = composeTsuboSet({
    tcmPoints,
    mtestPoint,
    riskContext,
  });

  const tonightNote = buildTonightNote(riskContext);
  const baseTomorrowFoodContext = buildTomorrowFoodContext(riskContext, { targetDate });
  const dailyCarePlan = enhanceDailyCarePlan({
    baseCarePlan: {
      night_tsubo_set: tsuboSet,
      tomorrow_food_context: baseTomorrowFoodContext,
    },
    riskContext,
    mode: "tomorrow",
    targetDate,
    symptomFocus: riskContext?.constitution_context?.symptom_focus || null,
  });
  const finalTsuboSet = dailyCarePlan.night_tsubo_set || tsuboSet;
  const tomorrowFoodContext = dailyCarePlan.tomorrow_food_context || baseTomorrowFoodContext;
  const tomorrowCaution = buildTomorrowCautionBlock(riskContext);
  const reviewSchema = getReviewSchemaCopy();

  return {
    forecast: {
      score_0_10: riskContext.target.score_0_10,
      score_display_0_10: riskContext.target.score_display_0_10 ?? riskContext.target.score_precise_0_10 ?? riskContext.target.score_0_10,
      score_precise_0_10: riskContext.target.score_precise_0_10 ?? riskContext.target.score_display_0_10 ?? riskContext.target.score_0_10,
      signal: riskContext.target.signal,
      signal_label: riskContext.target.signal_label,
      main_trigger: riskContext.summary.main_trigger,
      trigger_dir: riskContext.summary.trigger_dir,
      main_trigger_label: riskContext.summary.main_trigger_label,
      personal_main_trigger_exact: riskContext.summary.main_trigger_exact || null,
      personal_secondary_trigger_exact: riskContext.summary.secondary_trigger_exact || null,
      secondary_trigger_label: riskContext.summary.secondary_trigger_label || null,
      trigger_factors: riskContext.summary.trigger_factors || [],
      peak_start: riskContext.summary.peak_start,
      peak_end: riskContext.summary.peak_end,
      delta_vs_today: riskContext.target.delta_vs_today,
    },

    tonight: {
      tsubo_set: finalTsuboSet,
      note: tonightNote,
    },

    tomorrow_food: tomorrowFoodContext,

    tomorrow_caution: tomorrowCaution,

    review_schema: reviewSchema,

    gpt_inputs: {
      summary_input: {
        score_0_10: riskContext.target.score_0_10,
      score_display_0_10: riskContext.target.score_display_0_10 ?? riskContext.target.score_precise_0_10 ?? riskContext.target.score_0_10,
      score_precise_0_10: riskContext.target.score_precise_0_10 ?? riskContext.target.score_display_0_10 ?? riskContext.target.score_0_10,
        signal_label: riskContext.target.signal_label,
        main_trigger: riskContext.summary.main_trigger,
        trigger_dir: riskContext.summary.trigger_dir,
        main_trigger_label: riskContext.summary.main_trigger_label,
        personal_main_trigger_exact: riskContext.summary.main_trigger_exact || null,
        personal_secondary_trigger_exact: riskContext.summary.secondary_trigger_exact || null,
        trigger_factors: riskContext.summary.trigger_factors || [],
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
        personal_main_trigger_exact: riskContext.summary.main_trigger_exact || null,
        personal_secondary_trigger_exact: riskContext.summary.secondary_trigger_exact || null,
        trigger_factors: riskContext.summary.trigger_factors || [],
        peak_start: riskContext.summary.peak_start,
        peak_end: riskContext.summary.peak_end,
        score_0_10: riskContext.target.score_0_10,
      score_display_0_10: riskContext.target.score_display_0_10 ?? riskContext.target.score_precise_0_10 ?? riskContext.target.score_0_10,
      score_precise_0_10: riskContext.target.score_precise_0_10 ?? riskContext.target.score_display_0_10 ?? riskContext.target.score_0_10,
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


function buildTomorrowCautionBlock(riskContext) {
  return getTomorrowCaution(
    riskContext.constitution_context.symptom_focus,
    riskContext.summary.main_trigger,
    riskContext.summary.trigger_dir
  );
}
