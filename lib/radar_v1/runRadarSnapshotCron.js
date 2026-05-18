import { enrichForecastGpt } from "@/lib/radar_v1/enrichForecastGpt";
import { ensureForecastBundle } from "@/lib/radar_v1/ensureForecastBundle";
import { addDaysJST } from "@/lib/radar_v1/notificationTargetDate";
import { listPrimaryRadarLocationsForForecastCron } from "@/lib/radar_v1/radarRepo";
import { nowJstParts } from "@/lib/radar_v1/timeJST";

function safeLimit(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 100;
  return Math.max(1, Math.min(500, Math.round(n)));
}

function normalizeDateKeys(value) {
  if (Array.isArray(value)) return value;
  const raw = String(value || "today,tomorrow")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return raw.length ? raw : ["today", "tomorrow"];
}

function buildTargetDates({ dates, now = new Date() }) {
  const { isoDate: today } = nowJstParts(now);
  const tomorrow = addDaysJST(today, 1);
  const keys = normalizeDateKeys(dates);
  const seen = new Set();
  const targets = [];

  for (const key of keys) {
    const target = key === "today" ? today : key === "tomorrow" ? tomorrow : key;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(target)) continue;
    if (seen.has(target)) continue;
    seen.add(target);
    targets.push({
      date: target,
      relativeTargetMode: target === today ? "today" : target === tomorrow ? "tomorrow" : "explicit",
    });
  }

  return targets.length
    ? targets
    : [
        { date: today, relativeTargetMode: "today" },
        { date: tomorrow, relativeTargetMode: "tomorrow" },
      ];
}

export async function runRadarSnapshotCron({
  dates = "today,tomorrow",
  limit = 100,
  force = true,
  enrich = true,
  dryRun = false,
  userId = null,
} = {}) {
  const targets = buildTargetDates({ dates });
  const locations = await listPrimaryRadarLocationsForForecastCron({
    limit: safeLimit(limit),
    userId,
  });

  const summary = {
    ok: true,
    target_dates: targets.map((target) => target.date),
    force: Boolean(force),
    enrich: Boolean(enrich),
    dry_run: Boolean(dryRun),
    user_count: locations.length,
    processed: 0,
    generated: 0,
    cached: 0,
    enriched: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  for (const location of locations) {
    const uid = location?.user_id;
    if (!uid || !location?.id) {
      summary.skipped += targets.length;
      summary.details.push({
        user_id: uid || null,
        location_id: location?.id || null,
        status: "skipped_invalid_location",
      });
      continue;
    }

    for (const target of targets) {
      summary.processed += 1;

      try {
        if (dryRun) {
          summary.skipped += 1;
          summary.details.push({
            user_id: uid,
            location_id: location.id,
            target_date: target.date,
            status: "dry_run_would_generate",
          });
          continue;
        }

        let bundle = await ensureForecastBundle({
          userId: uid,
          targetDate: target.date,
          location,
          force: Boolean(force),
        });

        if (bundle.cached) summary.cached += 1;
        else summary.generated += 1;

        let gptPending = false;
        let enriched = false;
        if (enrich) {
          const enrichment = await enrichForecastGpt({
            userId: uid,
            targetDate: target.date,
            location,
            existing: bundle,
            relativeTargetMode: target.relativeTargetMode,
          });

          gptPending = Boolean(enrichment?.gpt_pending);
          enriched = Boolean(enrichment && !enrichment.skipped_generation);

          if (enrichment?.persisted?.forecast && enrichment?.persisted?.care_plan) {
            bundle = {
              ...bundle,
              forecast: enrichment.persisted.forecast,
              care_plan: enrichment.persisted.care_plan,
              gpt_enrichment: {
                pending: enrichment.gpt_pending,
                debug: enrichment.debug,
              },
            };
          }
        }

        if (enriched) summary.enriched += 1;

        summary.details.push({
          user_id: uid,
          location_id: location.id,
          target_date: target.date,
          status: bundle.cached ? "cached" : "generated",
          forecast_id: bundle.forecast?.id || null,
          score_0_10: Number.isFinite(Number(bundle.forecast?.score_0_10))
            ? Number(bundle.forecast.score_0_10)
            : null,
          gpt_pending: gptPending,
        });
      } catch (error) {
        summary.failed += 1;
        summary.details.push({
          user_id: uid,
          location_id: location.id,
          target_date: target.date,
          status: "failed",
          error: String(error?.message || error),
        });
      }
    }
  }

  return summary;
}
