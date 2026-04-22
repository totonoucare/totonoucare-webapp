// lib/radar_v1/personalizeForecast.js

/**
 * 6-channel personalized forecast
 *
 * weatherStress:
 * - raw weather channel strengths
 * - raw weather timeline
 *
 * constitution:
 * - core_code
 * - sub_labels
 * - env
 * - review_feedback
 *
 * output:
 * - personalized channel scores
 * - personal main trigger
 * - active / full-day personalized peak
 * - final 0-10 score
 *
 * 改修方針:
 * - diagnosis v2 改修後の core / sub_labels に整合させる
 * - sub_labels の順番を少し反映する
 * - batt_small の一律ブーストをやめる
 * - accel / brake と気象の対応を素直にする
 * - reviews からの軽い個別化補正を加える
 */

const CHANNELS = [
  "pressure_down",
  "pressure_up",
  "cold",
  "heat",
  "damp",
  "dry",
];

const RANK_WEIGHTS = [1.0, 0.72];

const LABEL_AFFINITY_BONUS = {
  qi_stagnation: {
    pressure_down: 0.04,
    pressure_up: 0.10,
    cold: 0.00,
    heat: 0.08,
    damp: 0.02,
    dry: 0.03,
  },
  qi_deficiency: {
    pressure_down: 0.10,
    pressure_up: 0.00,
    cold: 0.14,
    heat: 0.02,
    damp: 0.10,
    dry: 0.00,
  },
  blood_deficiency: {
    pressure_down: 0.03,
    pressure_up: 0.00,
    cold: 0.10,
    heat: 0.00,
    damp: 0.00,
    dry: 0.14,
  },
  blood_stasis: {
    pressure_down: 0.07,
    pressure_up: 0.02,
    cold: 0.06,
    heat: 0.00,
    damp: 0.04,
    dry: 0.00,
  },
  fluid_damp: {
    pressure_down: 0.08,
    pressure_up: 0.00,
    cold: 0.08,
    heat: 0.00,
    damp: 0.20,
    dry: 0.00,
  },
  fluid_deficiency: {
    pressure_down: 0.00,
    pressure_up: 0.04,
    cold: 0.00,
    heat: 0.14,
    damp: 0.00,
    dry: 0.22,
  },
};

/**
 * @param {{
 * weatherStress: any,
 * constitution: {
 * core_code?: string | null,
 * sub_labels?: string[] | null,
 * env?: { sensitivity?: number, vectors?: string[] } | null,
 * review_feedback?: {
 *   per_channel_bonus?: Record<string, number> | null,
 *   observed_review_days?: number,
 *   bad_reviewed_days?: number,
 *   top_channels?: Array<{ channel: string, bonus: number }>
 * } | null
 * }
 * }} args
 */
export function personalizeForecast({ weatherStress, constitution }) {
  if (!weatherStress) {
    throw new Error("personalizeForecast: weatherStress is required");
  }

  const subLabels = Array.isArray(constitution?.sub_labels)
    ? constitution.sub_labels.filter(Boolean)
    : [];
  const coreCode = constitution?.core_code || "";
  const env = constitution?.env || {};
  const reviewFeedback = constitution?.review_feedback || null;

  const rawChannels = weatherStress?.channel_strengths || {
    pressure_down: weatherStress.pressure_down_strength ?? 0,
    pressure_up: weatherStress.pressure_up_strength ?? 0,
    cold: weatherStress.cold_strength ?? 0,
    heat: weatherStress.heat_strength ?? 0,
    damp: weatherStress.damp_strength ?? 0,
    dry: weatherStress.dry_strength ?? 0,
  };

  const affinities = buildChannelAffinities({
    subLabels,
    coreCode,
    env,
    reviewFeedback,
  });

  const personalChannels = {};
  for (const ch of CHANNELS) {
    personalChannels[ch] = round3(
      clamp01((rawChannels[ch] ?? 0) * (affinities[ch] ?? 1))
    );
  }

  const personalMainExact = pickTopChannel(personalChannels);
  const personalCompat = exactTriggerToCompat(personalMainExact);

  const weatherMainExact =
    weatherStress.weather_main_trigger_exact ||
    weatherStress.main_trigger_exact ||
    "none";

  const timeline = Array.isArray(weatherStress.timeline)
    ? weatherStress.timeline
    : [];

  const personalTimeline = timeline.map((row) => {
    const point = {
      ts: row.ts,
      pressure_down: round3((row.pressure_down ?? 0) * affinities.pressure_down),
      pressure_up: round3((row.pressure_up ?? 0) * affinities.pressure_up),
      cold: round3((row.cold ?? 0) * affinities.cold),
      heat: round3((row.heat ?? 0) * affinities.heat),
      damp: round3((row.damp ?? 0) * affinities.damp),
      dry: round3((row.dry ?? 0) * affinities.dry),
    };

    point.total = round3(
      point.pressure_down * 1.0 +
        point.pressure_up * 0.82 +
        point.cold * 0.95 +
        point.heat * 0.85 +
        point.damp * 0.98 +
        point.dry * 0.78
    );

    return point;
  });

  const fullDayPeak = findPeakWindow(personalTimeline);
  const activePeak = findPeakWindow(
    personalTimeline.filter((row) => {
      const hh = toJstHour(row.ts);
      return hh >= 6 && hh < 22;
    }),
    fullDayPeak
  );

  const baseWeatherScore = computeBaseWeatherScore(personalChannels);
  const score_0_10 = clampInt(Math.round(baseWeatherScore), 0, 10);
  const signal = toSignal(score_0_10);

  return {
    score_0_10,
    signal,

    weather_main_trigger_exact: weatherMainExact,
    personal_main_trigger_exact: personalMainExact,

    main_trigger: personalCompat.main_trigger,
    trigger_dir: personalCompat.trigger_dir,

    peak_start: activePeak.start,
    peak_end: activePeak.end,

    active_peak_start: activePeak.start,
    active_peak_end: activePeak.end,
    full_day_peak_start: fullDayPeak.start,
    full_day_peak_end: fullDayPeak.end,

    meta: {
      raw_channel_strengths: rawChannels,
      channel_affinities: affinities,
      personal_channel_strengths: personalChannels,
      base_weather_score: round3(baseWeatherScore),
      sub_labels: subLabels,
      core_code: coreCode || null,
      review_feedback_summary: summarizeReviewFeedback(reviewFeedback),
      weather_meta: weatherStress.meta || null,
      personal_timeline_sample: personalTimeline.slice(0, 6),
    },
  };
}

function buildChannelAffinities({ subLabels, coreCode, env, reviewFeedback }) {
  const labels = Array.isArray(subLabels) ? subLabels.slice(0, 2) : [];
  const vectors = Array.isArray(env?.vectors) ? env.vectors : [];
  const sensitivity = clamp(Number(env?.sensitivity ?? 0), 0, 3);
  const reviewBonus = normalizeReviewFeedbackBonus(reviewFeedback);

  const a = {
    pressure_down: 1.0,
    pressure_up: 1.0,
    cold: 1.0,
    heat: 1.0,
    damp: 1.0,
    dry: 1.0,
  };

  // sub label ordered bonus
  labels.forEach((label, index) => {
    const weight = RANK_WEIGHTS[index] ?? 0.6;
    const bonus = LABEL_AFFINITY_BONUS[label];
    if (!bonus) return;

    for (const ch of CHANNELS) {
      a[ch] += (bonus[ch] ?? 0) * weight;
    }
  });

  // core nuance
  if (coreCode.includes("batt_small")) {
    a.pressure_down += 0.08;
    a.pressure_up += 0.04;
    a.cold += 0.08;
    a.heat += 0.04;
    a.damp += 0.08;
    a.dry += 0.05;
  }

  if (coreCode.includes("batt_large")) {
    a.pressure_down -= 0.04;
    a.pressure_up -= 0.02;
    a.cold -= 0.04;
    a.heat -= 0.02;
    a.damp -= 0.04;
    a.dry -= 0.03;
  }

  if (coreCode.startsWith("accel")) {
    a.pressure_down += 0.01;
    a.pressure_up += 0.06;
    a.heat += 0.06;
    a.dry += 0.04;
  }

  if (coreCode.startsWith("brake")) {
    a.pressure_down += 0.08;
    a.cold += 0.08;
    a.damp += 0.10;
  }

  // env vectors
  if (vectors.includes("pressure_shift")) {
    a.pressure_down += 0.10;
    a.pressure_up += 0.10;
  }

  if (vectors.includes("temp_swing")) {
    a.cold += 0.14;
    a.heat += 0.14;
  }

  if (vectors.includes("humidity_up")) {
    a.damp += 0.12;
  }

  if (vectors.includes("dryness_up")) {
    a.dry += 0.10;
  }

  if (vectors.includes("wind_strong")) {
    a.pressure_down += 0.04;
    a.pressure_up += 0.02;
    a.cold += 0.03;
  }

  // review feedback
  for (const ch of CHANNELS) {
    a[ch] += reviewBonus[ch];
  }

  // global sensitivity
  a.pressure_down += sensitivity * 0.03;
  a.pressure_up += sensitivity * 0.02;
  a.cold += sensitivity * 0.03;
  a.heat += sensitivity * 0.02;
  a.damp += sensitivity * 0.03;
  a.dry += sensitivity * 0.02;

  for (const ch of CHANNELS) {
    a[ch] = round3(clamp(a[ch], 0.85, 1.75));
  }

  return a;
}

function normalizeReviewFeedbackBonus(reviewFeedback) {
  const out = {
    pressure_down: 0,
    pressure_up: 0,
    cold: 0,
    heat: 0,
    damp: 0,
    dry: 0,
  };

  const src = reviewFeedback?.per_channel_bonus || {};
  for (const ch of CHANNELS) {
    out[ch] = clamp(Number(src[ch] ?? 0), 0, 0.12);
  }

  return out;
}

function summarizeReviewFeedback(reviewFeedback) {
  if (!reviewFeedback) return null;

  return {
    observed_review_days: Number(reviewFeedback.observed_review_days ?? 0),
    bad_reviewed_days: Number(reviewFeedback.bad_reviewed_days ?? 0),
    baseline_bad_ratio: Number(reviewFeedback.baseline_bad_ratio ?? 0),
    top_channels: Array.isArray(reviewFeedback.top_channels)
      ? reviewFeedback.top_channels.slice(0, 3)
      : [],
    per_channel_bonus: normalizeReviewFeedbackBonus(reviewFeedback),
  };
}

function computeBaseWeatherScore(personalChannels) {
  return clamp(
    personalChannels.pressure_down * 2.05 +
      personalChannels.pressure_up * 1.45 +
      personalChannels.cold * 1.75 +
      personalChannels.heat * 1.5 +
      personalChannels.damp * 1.8 +
      personalChannels.dry * 1.35,
    0,
    10
  );
}

function pickTopChannel(channelStrengths) {
  const entries = Object.entries(channelStrengths).sort((a, b) => b[1] - a[1]);
  const [key, value] = entries[0] || ["pressure_down", 0];
  return value <= 0.05 ? "none" : key;
}

function exactTriggerToCompat(exact) {
  switch (exact) {
    case "pressure_down":
      return { main_trigger: "pressure", trigger_dir: "down" };
    case "pressure_up":
      return { main_trigger: "pressure", trigger_dir: "up" };
    case "cold":
      return { main_trigger: "temp", trigger_dir: "down" };
    case "heat":
      return { main_trigger: "temp", trigger_dir: "up" };
    case "damp":
      return { main_trigger: "humidity", trigger_dir: "up" };
    case "dry":
      return { main_trigger: "humidity", trigger_dir: "down" };
    default:
      return { main_trigger: "pressure", trigger_dir: "none" };
  }
}

function findPeakWindow(rows, fallback = { start: "09:00", end: "12:00" }) {
  if (!Array.isArray(rows) || rows.length === 0) return fallback;

  let best = { sum: -1, startIdx: 0, endIdx: 0 };

  for (let i = 0; i < rows.length; i++) {
    let sum = 0;
    let endIdx = i;

    for (let j = i; j < Math.min(i + 3, rows.length); j++) {
      sum += rows[j].total;
      endIdx = j;
    }

    if (sum > best.sum) {
      best = { sum, startIdx: i, endIdx };
    }
  }

  return {
    start: toJstHHMM(rows[best.startIdx].ts),
    end: toJstHHMM(rows[best.endIdx].ts),
  };
}

function toJstHHMM(isoTs) {
  const d = new Date(isoTs);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const hh = parts.find((p) => p.type === "hour")?.value ?? "00";
  const mm = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hh}:${mm}`;
}

function toJstHour(isoTs) {
  const d = new Date(isoTs);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(d);
  return Number(parts.find((p) => p.type === "hour")?.value ?? "0");
}

function toSignal(score) {
  if (score >= 6) return 2;
  if (score >= 4) return 1;
  return 0;
}

function clamp(v, min, max) {
  if (!Number.isFinite(v)) return min;
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

function clamp01(v) {
  return clamp(v, 0, 1);
}

function clampInt(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function round3(v) {
  return Math.round(v * 1000) / 1000;
}
