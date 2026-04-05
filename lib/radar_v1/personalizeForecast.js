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
 *
 * output:
 * - personalized channel scores
 * - personal main trigger
 * - active / full-day personalized peak
 * - final 0-10 score
 */

const CHANNELS = [
  "pressure_down",
  "pressure_up",
  "cold",
  "heat",
  "damp",
  "dry",
];

/**
 * @param {{
 * weatherStress: any,
 * constitution: {
 * core_code?: string | null,
 * sub_labels?: string[] | null,
 * env?: { sensitivity?: number, vectors?: string[] } | null
 * }
 * }} args
 */
export function personalizeForecast({ weatherStress, constitution }) {
  if (!weatherStress) {
    throw new Error("personalizeForecast: weatherStress is required");
  }

  const subLabels = Array.isArray(constitution?.sub_labels)
    ? constitution.sub_labels
    : [];
  const coreCode = constitution?.core_code || "";
  const env = constitution?.env || {};

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

  const timeline = Array.isArray(weatherStress.timeline) ? weatherStress.timeline : [];
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
        point.pressure_up * 0.75 +
        point.cold * 0.95 +
        point.heat * 0.8 +
        point.damp * 0.95 +
        point.dry * 0.75
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

    // UI主表示は活動時間ピーク
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
      weather_meta: weatherStress.meta || null,
      personal_timeline_sample: personalTimeline.slice(0, 6),
    },
  };
}

/**
 * 方針:
 * - 低下 / 冷え / 湿 をやや重めに見る基本思想は維持
 * - ただし春秋の寒暖差を少し拾いやすくする
 * - 陽側(pressure_up / heat / dry)への補正は一部だけ軽く追加
 */
function buildChannelAffinities({ subLabels, coreCode, env }) {
  const labels = Array.isArray(subLabels) ? subLabels : [];
  const vectors = Array.isArray(env?.vectors) ? env.vectors : [];
  const sensitivity = clamp(Number(env?.sensitivity ?? 0), 0, 3);

  const a = {
    pressure_down: 1.0,
    pressure_up: 1.0,
    cold: 1.0,
    heat: 1.0,
    damp: 1.0,
    dry: 1.0,
  };

  // sub labels
  for (const label of labels) {
    switch (label) {
      case "qi_stagnation":
        // 気滞: 圧変化、とくに詰まり感や上への張りで崩れやすい。
        a.pressure_down += 0.10;
        a.pressure_up += 0.08; // 少しだけ陽側も拾う
        a.heat += 0.06;
        a.damp += 0.04;
        break;

      case "qi_deficiency":
        // 気虚: バリア不足。低下・冷え・湿で沈みやすい。
        a.pressure_down += 0.10;
        a.cold += 0.14;
        a.damp += 0.10;
        break;

      case "blood_deficiency":
        // 血虚: 養い不足。冷えと乾きに弱い。
        a.cold += 0.12;
        a.dry += 0.10;
        a.pressure_down += 0.06;
        break;

      case "blood_stasis":
        // 血瘀: 滞り。低下・冷えで固まりやすい。
        a.pressure_down += 0.10;
        a.cold += 0.08;
        a.damp += 0.05;
        // pressure_up は入れてもごく少量まで
        a.pressure_up += 0.03;
        break;

      case "fluid_damp":
        // 水滞: 水分の停滞。湿・冷え・気圧低下に引っ張られやすい。
        a.damp += 0.22;
        a.cold += 0.06;
        a.pressure_down += 0.04;
        break;

      case "fluid_deficiency":
        // 津液不足: 乾きと熱に弱い。
        a.dry += 0.22;
        a.heat += 0.18;
        a.pressure_up += 0.05;
        break;

      default:
        break;
    }
  }

  // core nuance
  if (coreCode.includes("batt_small")) {
    for (const ch of CHANNELS) a[ch] += 0.08;
  }
  if (coreCode.includes("batt_large")) {
    for (const ch of CHANNELS) a[ch] -= 0.03;
  }

  if (coreCode.startsWith("accel")) {
    // accel: 陽寄り。上昇・熱に少し反応しやすい
    a.pressure_down += 0.06;
    a.pressure_up += 0.05;
    a.heat += 0.05;
  }

  if (coreCode.startsWith("brake")) {
    // brake: 陰寄り。冷え・湿・低下で沈みやすい
    a.cold += 0.08;
    a.damp += 0.10;
    a.pressure_down += 0.03;
  }

  // env vectors (アンケートによる主観補正)
  if (vectors.includes("pressure_shift")) {
    a.pressure_down += 0.12;
    a.pressure_up += 0.12;
  }

  if (vectors.includes("temp_swing")) {
    // ここが今回の本命: 春秋の寒暖差を少し拾いやすくする
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
    a.pressure_down += 0.03;
    a.pressure_up += 0.03;
  }

  // global sensitivity
  for (const ch of CHANNELS) {
    a[ch] += sensitivity * 0.03;
    a[ch] = round3(clamp(a[ch], 0.85, 1.6));
  }

  return a;
}

/**
 * 最終0-10点用の重み。
 * 主因判定そのものではなく、総合スコアの出方を少しだけ調整する。
 * 低下 / 冷え / 湿 優位は残しつつ、陽側も少し拾う。
 */
function computeBaseWeatherScore(personalChannels) {
  return clamp(
    personalChannels.pressure_down * 2.1 +
      personalChannels.pressure_up * 1.35 +
      personalChannels.cold * 1.75 +
      personalChannels.heat * 1.4 +
      personalChannels.damp * 1.75 +
      personalChannels.dry * 1.25,
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
  if (score >= 7) return 2;
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
