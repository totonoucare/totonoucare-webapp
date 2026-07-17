// lib/radar_v1/careRules/todayFoodRules.js

import {
  buildIngredientFoodContext,
  normalizeFoodTriggerKey,
} from "./foodIngredientRules";

export function buildTodayFoodContext(triggerKey, signal, symptomFocus = null, secondaryKey = null, subLabels = [], options = {}) {
  return buildIngredientFoodContext({
    mode: "today",
    triggerKey: normalizeFoodTriggerKey(triggerKey),
    secondaryKey: secondaryKey ? normalizeFoodTriggerKey(secondaryKey) : null,
    signal,
    symptomFocus,
    subLabels,
    targetDate: options?.targetDate || null,
    riskContext: options?.riskContext || null,
  });
}
