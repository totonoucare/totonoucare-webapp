import { getPrimaryRadarLocation } from "@/lib/radar_v1/radarRepo";
import { ensureForecastBundle } from "@/lib/radar_v1/ensureForecastBundle";
import { getNotificationTargetDate } from "@/lib/radar_v1/notificationTargetDate";
import { buildRadarPushPayload, stripPushTimeSeconds } from "@/lib/push/notificationText";
import { sendWebPush } from "@/lib/push/webPush";
import {
  deactivatePushSubscriptionByEndpoint,
  getActivePushSubscriptions,
  getNotificationLog,
  getNotificationTargets,
  insertNotificationLog,
} from "@/lib/push/pushRepo";

function safeLimit(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 25;
  return Math.max(1, Math.min(100, Math.round(n)));
}

function shouldDeactivatePushSubscription(error) {
  const statusCode = Number(error?.statusCode || error?.status || 0);
  return statusCode === 404 || statusCode === 410;
}

export async function runRadarNotificationCron({
  kind,
  limit = 25,
  dryRun = false,
  userId = null,
}) {
  if (!['night', 'morning'].includes(kind)) {
    throw new Error("kind must be night or morning");
  }

  const targetDate = getNotificationTargetDate({ kind });
  const targets = await getNotificationTargets({
    kind,
    limit: safeLimit(limit),
    userId,
  });

  const summary = {
    ok: true,
    kind,
    target_date: targetDate,
    dry_run: Boolean(dryRun),
    target_count: targets.length,
    processed: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  for (const target of targets) {
    const uid = target.user_id;
    const minScore = Number.isFinite(Number(target.min_score)) ? Number(target.min_score) : 6;

    try {
      const existingLog = await getNotificationLog({
        userId: uid,
        targetDate,
        kind,
      });

      if (existingLog) {
        summary.skipped += 1;
        summary.details.push({ user_id: uid, status: "skipped_already_logged" });
        continue;
      }

      const subscriptions = await getActivePushSubscriptions({ userId: uid });
      if (!subscriptions.length) {
        await insertNotificationLog({
          userId: uid,
          targetDate,
          kind,
          status: "skipped_no_subscription",
        });
        summary.skipped += 1;
        summary.details.push({ user_id: uid, status: "skipped_no_subscription" });
        continue;
      }

      const location = await getPrimaryRadarLocation({ userId: uid });
      if (!location) {
        await insertNotificationLog({
          userId: uid,
          targetDate,
          kind,
          status: "skipped_no_location",
        });
        summary.skipped += 1;
        summary.details.push({ user_id: uid, status: "skipped_no_location" });
        continue;
      }

      let bundle = await ensureForecastBundle({
        userId: uid,
        targetDate,
        location,
      });

      // AI補完は一時停止中。通知もルールベースの予報スナップショットだけで送る。

      const forecast = bundle.forecast;
      const score = Number(forecast?.score_0_10 || 0);

      if (score < minScore) {
        await insertNotificationLog({
          userId: uid,
          forecastId: forecast?.id || null,
          targetDate,
          kind,
          score,
          status: "skipped_low_score",
          payload: { min_score: minScore },
        });
        summary.skipped += 1;
        summary.details.push({
          user_id: uid,
          status: "skipped_low_score",
          score,
          min_score: minScore,
        });
        continue;
      }

      const rawPayload = buildRadarPushPayload({ kind, forecast, targetDate });
      const payload = {
        ...rawPayload,
        title: stripPushTimeSeconds(rawPayload.title),
        body: stripPushTimeSeconds(rawPayload.body),
      };

      if (dryRun) {
        summary.sent += 1;
        summary.details.push({
          user_id: uid,
          status: "dry_run_would_send",
          score,
          payload,
        });
        continue;
      }

      let sentTo = 0;
      const errors = [];

      for (const subscription of subscriptions) {
        try {
          await sendWebPush({ subscription, payload });
          sentTo += 1;
        } catch (error) {
          const message = String(error?.message || error);
          errors.push(message);

          if (shouldDeactivatePushSubscription(error)) {
            await deactivatePushSubscriptionByEndpoint({
              userId: uid,
              endpoint: subscription.endpoint,
              reason: message,
            });
          }
        }
      }

      if (sentTo > 0) {
        await insertNotificationLog({
          userId: uid,
          forecastId: forecast?.id || null,
          targetDate,
          kind,
          score,
          status: "sent",
          payload: { ...payload, sent_to: sentTo },
          errorMessage: errors.length ? errors.join(" / ").slice(0, 1000) : null,
        });
        summary.sent += 1;
        summary.details.push({ user_id: uid, status: "sent", score, sent_to: sentTo });
      } else {
        await insertNotificationLog({
          userId: uid,
          forecastId: forecast?.id || null,
          targetDate,
          kind,
          score,
          status: "failed",
          payload,
          errorMessage: errors.join(" / ").slice(0, 1000),
        });
        summary.failed += 1;
        summary.details.push({ user_id: uid, status: "failed", score, errors });
      }
    } catch (error) {
      const message = String(error?.message || error);
      summary.failed += 1;
      summary.details.push({ user_id: uid, status: "failed", error: message });
    } finally {
      summary.processed += 1;
    }
  }

  return summary;
}

