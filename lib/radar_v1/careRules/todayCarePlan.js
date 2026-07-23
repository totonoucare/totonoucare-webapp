// lib/radar_v1/careRules/todayCarePlan.js
import { getLifestylePlan } from "./lifestyleRules";
import { buildTodayFoodContext } from "./todayFoodRules";
import { buildTodayTsuboPoints } from "./todayTsuboRules";
import { enhanceDailyCarePlan } from "./dailyCareV2";
import {
  getLegacyCareTriggerKey,
  hasExplicitPressureResponseDirection,
} from "../pressureResponse";

export function buildTodayCarePlanCore({
  forecast,
  triggerKey,
  secondaryKey,
  signal,
  symptomFocus,
  subLabels = [],
  fallbackTriggerKey,
  riskContext = null,
} = {}) {
  if (!forecast) return null;

  const constitution = riskContext?.constitution_context || {};
  const targetDate = forecast?.target_date || null;
  const hasPressureResponse = hasExplicitPressureResponseDirection(riskContext || forecast);
  const careTriggerKey = hasPressureResponse
    ? getLegacyCareTriggerKey(triggerKey, riskContext || forecast)
    : triggerKey;
  const careSecondaryKey = secondaryKey && hasPressureResponse
    ? getLegacyCareTriggerKey(secondaryKey, riskContext || forecast)
    : secondaryKey;
  const points = buildTodayTsuboPoints({
    symptomFocus,
    triggerKey: careTriggerKey,
    signal,
    fallbackTriggerKey,
    primaryMeridian: constitution.primary_meridian || null,
    secondaryMeridian: constitution.secondary_meridian || null,
    subLabels: constitution.sub_labels || subLabels,
    coreCode: constitution.core_code || null,
    targetDate,
  });
  const food = buildTodayFoodContext(
    careTriggerKey,
    signal,
    symptomFocus,
    careSecondaryKey,
    constitution.sub_labels || subLabels,
    { targetDate, riskContext },
  );

  const basePlan = {
    id: `today-care-${targetDate || "live"}`,
    target_date: targetDate,
    night_tsubo_set: {
      title: "今日これから使えるツボ",
      lead: "今見ている不調とこのあとの天気変化に合わせて、短時間で触れやすい場所を中心にしています。",
      points,
    },
    night_tsubo_reason: points[0]?.explanation?.selection_reason || "今日これからの不調と天気変化に合わせて、短時間で触れやすい場所を中心にしています。",
    tomorrow_food_context: food,
    night_food: food,
    night_food_reason: food.reason,
    tomorrow_caution: food.avoid || "無理を続けすぎないでください。",
    lifestyle_plan: getLifestylePlan(careTriggerKey, careSecondaryKey, signal, "today", symptomFocus),
  };

  return enhanceDailyCarePlan({
    baseCarePlan: basePlan,
    forecast,
    riskContext,
    mode: "today",
    targetDate,
    symptomFocus,
    triggerKey,
    secondaryKey,
  });
}
