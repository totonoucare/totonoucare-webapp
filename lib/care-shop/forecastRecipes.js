import { getRiskContext, resolveDisplayedCarePlan } from "@/app/radar/utils";
import { shelfFromPlan } from "./recipeShelf";

export function recipesForForecast(bundle, mode, targetDate) {
  if (!bundle?.forecast || (bundle.target_date || bundle.forecast.target_date) !== targetDate) return [];
  const plan = resolveDisplayedCarePlan({
    forecast: bundle.forecast,
    storedCarePlan: bundle.care_plan,
    riskContext: getRiskContext(bundle),
    mode,
    targetDate,
  });
  return shelfFromPlan(plan);
}
