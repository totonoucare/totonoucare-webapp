// lib/radar_v1/careRules/todayCarePlan.js
import { getLifestylePlan } from "./lifestyleRules";
import { buildTodayFoodContext } from "./todayFoodRules";
import { buildTodayTsuboPoints } from "./todayTsuboRules";

export function buildTodayCarePlanCore({
  forecast,
  triggerKey,
  secondaryKey,
  signal,
  symptomFocus,
  subLabels = [],
  fallbackTriggerKey,
} = {}) {
  if (!forecast) return null;

  const points = buildTodayTsuboPoints({
    symptomFocus,
    triggerKey,
    signal,
    fallbackTriggerKey,
  });
  const food = buildTodayFoodContext(triggerKey, signal, symptomFocus, secondaryKey, subLabels);

  return {
    id: `today-care-${forecast?.target_date || "live"}`,
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
    lifestyle_plan: getLifestylePlan(triggerKey, secondaryKey, signal, "today", symptomFocus),
  };
}


