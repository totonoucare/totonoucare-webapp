// lib/radar_v1/careRules/todayFoodRules.js

import {
  buildIngredientFoodContext,
  normalizeFoodTriggerKey,
} from "./foodIngredientRules";

export function buildTodayFoodContext(triggerKey, signal, symptomFocus = null) {
  return buildIngredientFoodContext({
    mode: "today",
    triggerKey: normalizeFoodTriggerKey(triggerKey),
    signal,
    symptomFocus,
  });
}
