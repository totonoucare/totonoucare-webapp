import { createClient } from "@supabase/supabase-js";

import {
  decideTargetDateJST,
  nowJstParts,
  toJstISODate,
} from "@/lib/radar_v1/timeJST";
import {
  generateRadarSummary,
  generateTomorrowFood,
  generateTsuboSelectionReasons,
} from "@/lib/radar_v1/gptRadar";
import {
  getPrimaryRadarLocation,
  getForecastBundle,
  saveForecast,
  saveCarePlan,
} from "@/lib/radar_v1/radarRepo";
import { getGptCompletionStatus, shouldAutoEnrich } from "@/lib/radar_v1/gptCompletion";

export const runtime = "nodejs";

function jsonUtf8(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function getAuthSupabase(authHeader) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false },
    global: authHeader
      ? {
          headers: {
            Authorization: authHeader,
          },
        }
      : undefined,
  });
}

async function getAuthenticatedUser(req) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;

  const supabase = getAuthSupabase(authHeader);
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(`Auth getUser failed: ${error.message}`);
  }

  return data?.user || null;
}

function getRelativeTargetMode(targetDate) {
  const { isoDate: today } = nowJstParts(new Date());

  const [y, m, d] = today.split("-").map(Number);
  const tomorrowDate = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0));
  const tomorrow = toJstISODate(tomorrowDate);

  if (targetDate === today) return "today";
  if (targetDate === tomorrow) return "tomorrow";
  return "explicit";
}

function serializeLocation(location) {
  if (!location) return null;
  return {
    id: location.id,
    lat: location.lat,
    lon: location.lon,
    timezone: location.timezone,
    label: location.label || null,
    display_name: location.display_name || null,
    region_name: location.region_name || null,
  };
}

function buildRadarPlanFromExistingBundle(existing) {
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

function getRiskContextFromExistingBundle(existing) {
  return existing?.forecast?.computed?.radar_plan_meta?.risk_context || null;
}

function shouldAllowGenerate(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
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

export async function GET(req) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user?.id) {
      return jsonUtf8({ ok: false, error: "Unauthorized" }, 401);
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const allowGenerate = shouldAllowGenerate(
      searchParams.get("generate") || searchParams.get("allow_generate")
    );
    const { targetDate, mode } = decideTargetDateJST({ date: date || null });
    const relativeTargetMode = getRelativeTargetMode(targetDate);

    const location = await getPrimaryRadarLocation({ userId: user.id });
    if (!location) {
      return jsonUtf8(
        {
          ok: false,
          error:
            "No radar location found. Pass lat/lon once to set a primary location.",
        },
        400
      );
    }

    const existing = await getForecastBundle({
      userId: user.id,
      targetDate,
    });

    const basePayload = {
      ok: true,
      target_date: targetDate,
      target_mode: mode,
      relative_target_mode: relativeTargetMode,
      location: serializeLocation(location),
      forecast: existing?.forecast || null,
      care_plan: existing?.care_plan || null,
    };

    if (!existing?.forecast || !existing?.care_plan) {
      return jsonUtf8({
        ...basePayload,
        cached: Boolean(existing?.forecast),
        gpt_pending: false,
        skipped_generation: true,
        debug: {
          reason: existing?.forecast ? "missing_care_plan" : "missing_forecast",
          no_weather_recompute_in_enrich: true,
        },
      });
    }

    const completionBefore = getGptCompletionStatus(existing);

    if (!shouldAutoEnrich(existing)) {
      return jsonUtf8({
        ...basePayload,
        cached: true,
        gpt_pending: false,
        debug: { gpt_completion_before: completionBefore },
      });
    }

    if (!allowGenerate) {
      return jsonUtf8({
        ...basePayload,
        cached: true,
        gpt_pending: true,
        skipped_generation: true,
        debug: { gpt_completion_before: completionBefore },
      });
    }

    let radarPlan = buildRadarPlanFromExistingBundle(existing);
    const riskContext = getRiskContextFromExistingBundle(existing);

    // enrichはAI補完専用。天気API再取得や予報再計算はしない。
    if (!riskContext) {
      radarPlan = markEnrichment(radarPlan, "forecast_summary", "skipped", {
        reason: "missing_risk_context",
      });
      radarPlan = markEnrichment(radarPlan, "tomorrow_food", "skipped", {
        reason: "missing_risk_context",
      });
      radarPlan = markEnrichment(radarPlan, "tsubo_reasons", "skipped", {
        reason: "missing_risk_context",
      });
    } else {
      if (!completionBefore.forecast_summary_terminal) {
        try {
          const summary = await generateRadarSummary({
            riskContext,
            radarPlan,
            targetDate,
            relativeTargetMode,
          });

          if (summary?.text) {
            radarPlan = {
              ...radarPlan,
              forecast: {
                ...radarPlan.forecast,
                gpt_summary: summary.text,
                gpt_model: summary.model || null,
                gpt_generated_at: summary.generated_at || new Date().toISOString(),
              },
            };
            radarPlan = markEnrichment(radarPlan, "forecast_summary", "completed");
          } else {
            radarPlan = markEnrichment(radarPlan, "forecast_summary", "skipped", {
              reason: "empty_generation",
            });
          }
        } catch (error) {
          console.error("generateRadarSummary failed:", error);
          radarPlan = markEnrichment(radarPlan, "forecast_summary", "failed", {
            reason: String(error?.message || error),
          });
        }
      }

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
      userId: user.id,
      targetDate,
      locationId: existing.forecast.location_id || location.id,
      radarPlan,
      vendor: existing.forecast.vendor || "metno",
      vendorMeta: existing.forecast.vendor_meta || {},
      preserveGptIfMissing: true,
    });

    await saveCarePlan({
      forecastId: forecast.id,
      radarPlan,
      preserveGptIfMissing: true,
    });

    const persisted = await getForecastBundle({
      userId: user.id,
      targetDate,
    });
    const completionAfter = getGptCompletionStatus(persisted);

    return jsonUtf8({
      ok: true,
      cached: true,
      gpt_pending: shouldAutoEnrich(persisted),
      target_date: targetDate,
      target_mode: mode,
      relative_target_mode: relativeTargetMode,
      location: serializeLocation(location),
      forecast: persisted?.forecast || forecast,
      care_plan: persisted?.care_plan || null,
      debug: {
        from_cache: true,
        no_weather_recompute_in_enrich: true,
        gpt_completion_before: completionBefore,
        gpt_completion_after: completionAfter,
      },
    });
  } catch (error) {
    console.error("/api/radar/v1/forecast/enrich GET error:", error);
    return jsonUtf8({ ok: false, error: String(error) }, 500);
  }
}
