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
  fallbackTriggerKey,
} = {}) {
  if (!forecast) return null;

  const points = buildTodayTsuboPoints({
    symptomFocus,
    triggerKey,
    signal,
    fallbackTriggerKey,
  });
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
