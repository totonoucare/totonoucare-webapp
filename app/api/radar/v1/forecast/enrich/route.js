import { createClient } from "@supabase/supabase-js";

import {
  decideTargetDateJST,
  nowJstParts,
  toJstISODate,
} from "@/lib/radar_v1/timeJST";
import { buildFastRadarBundle } from "@/lib/radar_v1/buildFastRadarBundle";
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
import { getGptCompletionStatus, hasCompletedGpt } from "@/lib/radar_v1/gptCompletion";

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

export async function GET(req) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user?.id) {
      return jsonUtf8({ ok: false, error: "Unauthorized" }, 401);
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const allowGenerate = shouldAllowGenerate(searchParams.get("generate") || searchParams.get("allow_generate"));
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

    const completionBefore = getGptCompletionStatus(existing);

    if (existing?.forecast && existing?.care_plan && hasCompletedGpt(existing)) {
      return jsonUtf8({
        ok: true,
        cached: true,
        gpt_pending: false,
        target_date: targetDate,
        target_mode: mode,
        relative_target_mode: relativeTargetMode,
        location: serializeLocation(location),
        forecast: existing.forecast,
        care_plan: existing.care_plan,
      });
    }

    if (!allowGenerate) {
      return jsonUtf8({
        ok: true,
        cached: Boolean(existing?.forecast && existing?.care_plan),
        gpt_pending: Boolean(existing?.forecast && existing?.care_plan && !hasCompletedGpt(existing)),
        skipped_generation: true,
        target_date: targetDate,
        target_mode: mode,
        relative_target_mode: relativeTargetMode,
        location: serializeLocation(location),
        forecast: existing?.forecast || null,
        care_plan: existing?.care_plan || null,
      });
    }

    let radarPlan = null;
    let vendorMeta = null;
    let normalized = null;
    let riskContext = null;
    let enrichedFromExisting = false;

    if (existing?.forecast && existing?.care_plan) {
      radarPlan = buildRadarPlanFromExistingBundle(existing);
      riskContext = getRiskContextFromExistingBundle(existing);
      vendorMeta = existing.forecast.vendor_meta || {};
      enrichedFromExisting = Boolean(riskContext);
    }

    // 既存のDB予報にAI生成用メタが残っていない古いデータだけ、最後の手段として再計算する。
    // 通常の「gpt_pendingを埋める」処理では、天気APIを再取得せずDB上の予報を素材にする。
    if (!radarPlan || !riskContext) {
      const built = await buildFastRadarBundle({
        userId: user.id,
        targetDate,
        location,
      });
      radarPlan = built.radarPlan;
      vendorMeta = built.vendorMeta;
      normalized = built.normalized;
      riskContext = built.riskContext;
    }

    if (!completionBefore.forecast_summary) {
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
        }
      } catch (error) {
        console.error("generateRadarSummary failed:", error);
      }
    }

    if (!completionBefore.tomorrow_food) {
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
        }
      } catch (error) {
        console.error("generateTomorrowFood failed:", error);
      }
    }

    if (!completionBefore.tsubo_reasons) {
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
        }
      } catch (error) {
        console.error("generateTsuboSelectionReasons failed:", error);
      }
    }

    const forecast = await saveForecast({
      userId: user.id,
      targetDate,
      locationId: existing?.forecast?.location_id || location.id,
      radarPlan,
      vendor: existing?.forecast?.vendor || "metno",
      vendorMeta: vendorMeta || {},
    });

    await saveCarePlan({
      forecastId: forecast.id,
      radarPlan,
    });

    // 返却値は「保存できたつもり」のメモリ上オブジェクトではなく、必ずDBから読み直す。
    // これにより、初回表示では生成文が見えるのに再表示ではwhy_shortへ戻る事故を検知・防止する。
    const persisted = await getForecastBundle({
      userId: user.id,
      targetDate,
    });

    const completionAfter = getGptCompletionStatus(persisted);
    const completedAfter = hasCompletedGpt(persisted);

    return jsonUtf8({
      ok: true,
      cached: false,
      gpt_pending: !completedAfter,
      target_date: targetDate,
      target_mode: mode,
      relative_target_mode: relativeTargetMode,
      location: serializeLocation(location),
      forecast: persisted?.forecast || forecast,
      care_plan: persisted?.care_plan || null,
      debug: {
        point_count: normalized?.points?.length ?? null,
        partial_day: Array.isArray(normalized?.points) ? normalized.points.length < 24 : null,
        from_cache: false,
        enriched_from_existing: enrichedFromExisting,
        gpt_completion_before: completionBefore,
        gpt_completion_after: completionAfter,
      },
    });
  } catch (error) {
    console.error("/api/radar/v1/forecast/enrich GET error:", error);
    return jsonUtf8({ ok: false, error: String(error) }, 500);
  }
}



