// lib/radar_v1/careRules/todayFoodRules.js

import {
  buildIngredientFoodContext,
  normalizeFoodTriggerKey,
} from "./foodIngredientRules";

export function buildTodayFoodContext(triggerKey, signal, symptomFocus = null, secondaryKey = null, subLabels = []) {
  return buildIngredientFoodContext({
    mode: "today",
    triggerKey: normalizeFoodTriggerKey(triggerKey),
    secondaryKey: secondaryKey ? normalizeFoodTriggerKey(secondaryKey) : null,
    signal,
    symptomFocus,
    subLabels,
  });
}
