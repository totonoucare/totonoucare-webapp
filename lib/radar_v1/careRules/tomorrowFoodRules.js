// lib/radar_v1/careRules/tomorrowFoodRules.js

import {
  buildIngredientFoodContext,
  getSecondaryFoodTriggerKey,
  normalizeFoodTriggerKeyFromRiskContext,
} from "./foodIngredientRules";

function parseHour(hhmm) {
  if (!hhmm || typeof hhmm !== "string") return null;
  const [h] = hhmm.split(":");
  const n = Number(h);
  return Number.isFinite(n) ? n : null;
}

function getTimingLabel(peakStart) {
  if (peakStart == null) return "今夜〜明朝";
  if (peakStart >= 5 && peakStart <= 10) return "明日の朝";
  if (peakStart >= 11 && peakStart <= 15) return "明日の昼";
  if (peakStart >= 16 && peakStart <= 23) return "明日の夕方以降";
  return "今夜〜明朝";
}

export function buildTomorrowFoodContext(riskContext) {
  const triggerKey = normalizeFoodTriggerKeyFromRiskContext(riskContext);
  const secondaryKey = getSecondaryFoodTriggerKey(riskContext);
  const symptomFocus = riskContext?.constitution_context?.symptom_focus || null;
  const peakStart = parseHour(riskContext?.summary?.peak_start);
  const timing = getTimingLabel(peakStart);

  return {
    ...buildIngredientFoodContext({
      mode: "tomorrow",
      triggerKey,
      secondaryKey,
      signal: riskContext?.target?.signal ?? 0,
      symptomFocus,
      subLabels: riskContext?.constitution_context?.sub_labels || [],
      timing,
      riskContext,
    }),
    personal_main_trigger_exact: riskContext?.summary?.main_trigger_exact || null,
    personal_secondary_trigger_exact: riskContext?.summary?.secondary_trigger_exact || null,
    trigger_factors: riskContext?.summary?.trigger_factors || [],
    organ_focus: riskContext?.tcm_context?.organ_focus || [],
    sub_labels: riskContext?.constitution_context?.sub_labels || [],
    care_tone: riskContext?.care_tone,
  };
}
