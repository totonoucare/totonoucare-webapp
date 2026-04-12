// lib/radar_v1/reviewFeedback.js
import { createClient } from "@supabase/supabase-js";

const CHANNELS = [
  "pressure_down",
  "pressure_up",
  "cold",
  "heat",
  "damp",
  "dry",
];

const BAD_WEIGHTS = {
  0: 1.0, // つらい
  1: 0.6, // 少しつらい
  2: 0.0, // 安定
};

const DEFAULT_LOOKBACK_DAYS = 60;
const DEFAULT_MAX_BONUS_PER_CHANNEL = 0.12;
const DEFAULT_MIN_CHANNEL_EXPOSURE = 2;

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

function addDays(ymd, delta) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function clamp(v, min, max) {
  if (!Number.isFinite(v)) return min;
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

function round3(v) {
  return Math.round(v * 1000) / 1000;
}

function emptyChannelMap() {
  return {
    pressure_down: 0,
    pressure_up: 0,
    cold: 0,
    heat: 0,
    damp: 0,
    dry: 0,
  };
}

function buildEmptyFeedback({ windowStart, windowEnd, lookbackDays }) {
  return {
    lookback_days: lookbackDays,
    window_start: windowStart,
    window_end: windowEnd,
    observed_review_days: 0,
    bad_reviewed_days: 0,
    baseline_bad_ratio: 0,
    per_channel_bonus: emptyChannelMap(),
    per_channel_stats: {
      pressure_down: { exposure_days: 0, bad_weight: 0, bad_ratio: 0, bonus: 0 },
      pressure_up: { exposure_days: 0, bad_weight: 0, bad_ratio: 0, bonus: 0 },
      cold: { exposure_days: 0, bad_weight: 0, bad_ratio: 0, bonus: 0 },
      heat: { exposure_days: 0, bad_weight: 0, bad_ratio: 0, bonus: 0 },
      damp: { exposure_days: 0, bad_weight: 0, bad_ratio: 0, bonus: 0 },
      dry: { exposure_days: 0, bad_weight: 0, bad_ratio: 0, bonus: 0 },
    },
    top_channels: [],
  };
}

function compatTriggerToExact(mainTrigger, triggerDir) {
  if (mainTrigger === "pressure" && triggerDir === "down") return "pressure_down";
  if (mainTrigger === "pressure" && triggerDir === "up") return "pressure_up";
  if (mainTrigger === "temp" && triggerDir === "down") return "cold";
  if (mainTrigger === "temp" && triggerDir === "up") return "heat";
  if (mainTrigger === "humidity" && triggerDir === "up") return "damp";
  if (mainTrigger === "humidity" && triggerDir === "down") return "dry";
  return null;
}

function getBadWeight(conditionLevel) {
  const v = BAD_WEIGHTS[Number(conditionLevel)];
  return Number.isFinite(v) ? v : 0;
}

/**
 * 直近の振り返り記録から、どの天候で崩れやすいかを軽く学習する
 *
 * @param {{
 *   userId: string,
 *   beforeDate: string, // YYYY-MM-DD, この日より前の記録を使う
 *   lookbackDays?: number,
 *   maxBonusPerChannel?: number,
 *   minChannelExposure?: number,
 * }} args
 */
export async function getReviewFeedback({
  userId,
  beforeDate,
  lookbackDays = DEFAULT_LOOKBACK_DAYS,
  maxBonusPerChannel = DEFAULT_MAX_BONUS_PER_CHANNEL,
  minChannelExposure = DEFAULT_MIN_CHANNEL_EXPOSURE,
}) {
  if (!userId) {
    throw new Error("getReviewFeedback: userId is required");
  }
  if (!beforeDate) {
    throw new Error("getReviewFeedback: beforeDate is required");
  }

  const windowStart = addDays(beforeDate, -lookbackDays);
  const windowEnd = addDays(beforeDate, -1);

  const supabase = getServiceSupabase();

  const [{ data: reviews, error: reviewErr }, { data: forecasts, error: forecastErr }] =
    await Promise.all([
      supabase
        .from("radar_reviews")
        .select("target_date, condition_level, created_at")
        .eq("user_id", userId)
        .gte("target_date", windowStart)
        .lt("target_date", beforeDate),
      supabase
        .from("radar_forecasts")
        .select("target_date, main_trigger, trigger_dir, score_0_10, signal")
        .eq("user_id", userId)
        .gte("target_date", windowStart)
        .lt("target_date", beforeDate),
    ]);

  if (reviewErr) {
    throw new Error(`getReviewFeedback reviews failed: ${reviewErr.message}`);
  }
  if (forecastErr) {
    throw new Error(`getReviewFeedback forecasts failed: ${forecastErr.message}`);
  }

  const latestReviewByDate = new Map();
  for (const row of reviews || []) {
    const date = String(row.target_date);
    const prev = latestReviewByDate.get(date);
    if (!prev || String(row.created_at) > String(prev.created_at || "")) {
      latestReviewByDate.set(date, row);
    }
  }

  const rows = [];
  for (const forecast of forecasts || []) {
    const date = String(forecast.target_date);
    const review = latestReviewByDate.get(date);
    if (!review) continue;

    const exact = compatTriggerToExact(forecast.main_trigger, forecast.trigger_dir);
    if (!exact) continue;

    rows.push({
      date,
      exact_trigger: exact,
      condition_level: Number(review.condition_level),
      bad_weight: getBadWeight(review.condition_level),
    });
  }

  if (!rows.length) {
    return buildEmptyFeedback({
      windowStart,
      windowEnd,
      lookbackDays,
    });
  }

  const observedReviewDays = rows.length;
  const badReviewedDays = rows.filter((row) => row.bad_weight > 0).length;
  const totalBadWeight = rows.reduce((sum, row) => sum + row.bad_weight, 0);
  const baselineBadRatio = observedReviewDays > 0 ? totalBadWeight / observedReviewDays : 0;

  const exposureDays = emptyChannelMap();
  const badWeights = emptyChannelMap();

  for (const row of rows) {
    exposureDays[row.exact_trigger] += 1;
    badWeights[row.exact_trigger] += row.bad_weight;
  }

  const perChannelBonus = emptyChannelMap();
  const perChannelStats = {};

  for (const ch of CHANNELS) {
    const exposure = exposureDays[ch];
    const badWeight = badWeights[ch];
    const badRatio = exposure > 0 ? badWeight / exposure : 0;

    let bonus = 0;

    if (exposure >= minChannelExposure) {
      const deltaFromBaseline = badRatio - baselineBadRatio;
      const evidenceFactor = clamp(exposure / 4, 0, 1); // 2日で0.5, 4日以上で1.0
      bonus = clamp(deltaFromBaseline * 0.2 * evidenceFactor, 0, maxBonusPerChannel);
    }

    perChannelBonus[ch] = round3(bonus);
    perChannelStats[ch] = {
      exposure_days: exposure,
      bad_weight: round3(badWeight),
      bad_ratio: round3(badRatio),
      bonus: round3(bonus),
    };
  }

  const topChannels = Object.entries(perChannelBonus)
    .filter(([, bonus]) => bonus > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([channel, bonus]) => ({
      channel,
      bonus,
      exposure_days: perChannelStats[channel]?.exposure_days ?? 0,
      bad_ratio: perChannelStats[channel]?.bad_ratio ?? 0,
    }));

  return {
    lookback_days: lookbackDays,
    window_start: windowStart,
    window_end: windowEnd,
    observed_review_days: observedReviewDays,
    bad_reviewed_days: badReviewedDays,
    baseline_bad_ratio: round3(baselineBadRatio),
    per_channel_bonus: perChannelBonus,
    per_channel_stats: perChannelStats,
    top_channels: topChannels,
  };
}
