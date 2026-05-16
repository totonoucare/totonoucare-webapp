import {
  generateTomorrowFood,
  generateTsuboSelectionReasons,
} from "@/lib/radar_v1/gptRadar";
import {
  getForecastBundle,
  saveForecast,
  saveCarePlan,
} from "@/lib/radar_v1/radarRepo";
import { getGptCompletionStatus, shouldAutoEnrich } from "@/lib/radar_v1/gptCompletion";

export function buildRadarPlanFromExistingBundle(existing) {
  const forecast = existing?.forecast || {};
  const carePlan = existing?.care_plan || {};
  const computed = forecast?.computed || {};
  const snapshot = computed?.forecast_snapshot || {};
  const meta = computed?.radar_plan_meta || null;

  return {
    forecast: {
      ...snapshot,
      score_0_10: snapshot.score_0_10 ?? forecast.score_0_10,
      signal: snapshot.signal ?? forecast.signal,
      peak_start: snapshot.peak_start ?? forecast.peak_start,
      peak_end: snapshot.peak_end ?? forecast.peak_end,
      main_trigger: snapshot.main_trigger ?? forecast.main_trigger,
      trigger_dir: snapshot.trigger_dir ?? forecast.trigger_dir,
      delta_vs_today: snapshot.delta_vs_today ?? forecast.delta_vs_today,
      gpt_summary: forecast.gpt_summary || snapshot.gpt_summary || "",
      gpt_model: forecast.gpt_model || snapshot.gpt_model || null,
      gpt_generated_at: forecast.gpt_generated_at || snapshot.gpt_generated_at || null,
    },
    tonight: {
      tsubo_set: carePlan.night_tsubo_set || {},
      note: {
        body: carePlan.night_note || carePlan.night_tsubo_reason || "",
      },
    },
    tomorrow_food: carePlan.tomorrow_food_context || {},
    tomorrow_caution: carePlan.tomorrow_caution || "",
    review_schema: carePlan.review_schema || {},
    gpt_inputs: computed?.gpt_inputs || null,
    meta,
  };
}

export function getRiskContextFromExistingBundle(existing) {
  return existing?.forecast?.computed?.radar_plan_meta?.risk_context || null;
}

function terminalStatus(status, extra = {}) {
  return {
    status,
    at: new Date().toISOString(),
    ...extra,
  };
}

function markEnrichment(radarPlan, part, status, extra = {}) {
  return {
    ...radarPlan,
    meta: {
      ...(radarPlan?.meta || {}),
      gpt_enrichment: {
        ...(radarPlan?.meta?.gpt_enrichment || {}),
        [part]: terminalStatus(status, extra),
      },
    },
  };
}

export async function enrichForecastGpt({
  userId,
  targetDate,
  location,
  existing,
  relativeTargetMode = "explicit",
}) {
  if (!userId) throw new Error("enrichForecastGpt: userId is required");
  if (!targetDate) throw new Error("enrichForecastGpt: targetDate is required");

  const current = existing || await getForecastBundle({ userId, targetDate });

  if (!current?.forecast || !current?.care_plan) {
    return {
      skipped: true,
      skipped_generation: true,
      gpt_pending: false,
      persisted: current || null,
      debug: {
        reason: current?.forecast ? "missing_care_plan" : "missing_forecast",
        no_weather_recompute_in_enrich: true,
      },
    };
  }

  const completionBefore = getGptCompletionStatus(current);

  if (!shouldAutoEnrich(current)) {
    return {
      skipped: true,
      skipped_generation: false,
      gpt_pending: false,
      persisted: current,
      debug: { gpt_completion_before: completionBefore },
    };
  }

  let radarPlan = buildRadarPlanFromExistingBundle(current);
  const riskContext = getRiskContextFromExistingBundle(current);

  // enrichはAI補完専用。天気API再取得や予報再計算はしない。
  if (!riskContext) {
    radarPlan = markEnrichment(radarPlan, "tomorrow_food", "skipped", {
      reason: "missing_risk_context",
    });
    radarPlan = markEnrichment(radarPlan, "tsubo_reasons", "skipped", {
      reason: "missing_risk_context",
    });
  } else {
    if (!completionBefore.tomorrow_food_terminal) {
      try {
        const generatedFood = await generateTomorrowFood({
          riskContext,
          radarPlan,
          targetDate,
          relativeTargetMode,
        });

        if (generatedFood?.food) {
          radarPlan = {
            ...radarPlan,
            tomorrow_food: {
              ...radarPlan.tomorrow_food,
              ...generatedFood.food,
            },
          };
          radarPlan = markEnrichment(
            radarPlan,
            "tomorrow_food",
            generatedFood.food.generated_by === "fallback" ? "fallback" : "completed"
          );
        } else {
          radarPlan = markEnrichment(radarPlan, "tomorrow_food", "skipped", {
            reason: "empty_generation",
          });
        }
      } catch (error) {
        console.error("generateTomorrowFood failed:", error);
        radarPlan = markEnrichment(radarPlan, "tomorrow_food", "failed", {
          reason: String(error?.message || error),
        });
      }
    }

    if (!completionBefore.tsubo_reasons_terminal) {
      try {
        const generatedTsuboReasons = await generateTsuboSelectionReasons({
          riskContext,
          radarPlan,
          targetDate,
          relativeTargetMode,
          section: "tonight",
        });

        if (generatedTsuboReasons?.tsubo_set) {
          radarPlan = {
            ...radarPlan,
            tonight: {
              ...radarPlan.tonight,
              tsubo_set: generatedTsuboReasons.tsubo_set,
              note: generatedTsuboReasons.overall_reason
                ? {
                    ...radarPlan.tonight?.note,
                    body: generatedTsuboReasons.overall_reason,
                  }
                : radarPlan.tonight?.note,
            },
          };
          radarPlan = markEnrichment(radarPlan, "tsubo_reasons", "completed");
        } else {
          radarPlan = markEnrichment(radarPlan, "tsubo_reasons", "skipped", {
            reason: "empty_or_rejected_generation",
          });
        }
      } catch (error) {
        console.error("generateTsuboSelectionReasons failed:", error);
        radarPlan = markEnrichment(radarPlan, "tsubo_reasons", "failed", {
          reason: String(error?.message || error),
        });
      }
    }
  }

  const forecast = await saveForecast({
    userId,
    targetDate,
    locationId: current.forecast.location_id || location?.id,
    radarPlan,
    vendor: current.forecast.vendor || "metno",
    vendorMeta: current.forecast.vendor_meta || {},
    preserveGptIfMissing: true,
  });

  await saveCarePlan({
    forecastId: forecast.id,
    radarPlan,
    preserveGptIfMissing: true,
  });

  const persisted = await getForecastBundle({
    userId,
    targetDate,
  });
  const completionAfter = getGptCompletionStatus(persisted);

  return {
    skipped: false,
    skipped_generation: false,
    gpt_pending: shouldAutoEnrich(persisted),
    persisted,
    debug: {
      from_cache: true,
      no_weather_recompute_in_enrich: true,
      gpt_completion_before: completionBefore,
      gpt_completion_after: completionAfter,
    },
  };
}

