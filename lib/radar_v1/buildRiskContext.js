// lib/radar_v1/buildRiskContext.js
import { personalizeForecast } from "@/lib/radar_v1/personalizeForecast";
import { differentiateForTcm } from "@/lib/radar_v1/differentiation";
import { selectMtestLine } from "@/lib/radar_v1/selectMtestLine";
import { selectMotherChild } from "@/lib/radar_v1/selectMotherChild";
import { getSignalLabel, getTriggerLabel } from "@/lib/radar_v1/copy";

export function buildRiskContext({ profile, weatherStress }) {
  if (!profile) throw new Error("buildRiskContext: profile is required");
  if (!weatherStress) throw new Error("buildRiskContext: weatherStress is required");

  const personalized = personalizeForecast({
    weatherStress,
    constitution: {
      core_code: profile.core_code,
      sub_labels: profile.sub_labels,
      env: profile.env,
    },
  });

  /**
   * TCM / M-test / mother-child へ渡す weather:
   * - 互換用 main_trigger / trigger_dir は維持
   * - 6チャネルも併せて渡す
   * - exact trigger も渡す
   */
  const compatWeatherForCare = {
    main_trigger: personalized.main_trigger,
    trigger_dir: personalized.trigger_dir,

    personal_main_trigger_exact:
      personalized.personal_main_trigger_exact || "none",
    weather_main_trigger_exact:
      weatherStress.weather_main_trigger_exact || "none",

    pressure_down_strength: weatherStress.pressure_down_strength ?? 0,
    pressure_up_strength: weatherStress.pressure_up_strength ?? 0,
    cold_strength: weatherStress.cold_strength ?? 0,
    heat_strength: weatherStress.heat_strength ?? 0,
    damp_strength: weatherStress.damp_strength ?? 0,
    dry_strength: weatherStress.dry_strength ?? 0,
  };

  const tcmContext = differentiateForTcm({
    core_code: profile.core_code,
    sub_labels: profile.sub_labels,
    weatherStress: compatWeatherForCare,
  });

  const selectedLine = selectMtestLine({
    primary_meridian: profile.primary_meridian,
    secondary_meridian: profile.secondary_meridian,
    weatherStress: compatWeatherForCare,
  });

  const motherChild = selectMotherChild({
    weatherStress: compatWeatherForCare,
    core_code: profile.core_code,
    sub_labels: profile.sub_labels,
  });

  const riskFactors = buildRiskFactors({
    personalized,
    profile,
  });

  const careTone = buildCareTone({
    profile,
    personalized,
  });

  const weatherMainCompat = {
    main_trigger: weatherStress.main_trigger,
    trigger_dir: weatherStress.trigger_dir,
  };

  return {
    target: {
      score_0_10: personalized.score_0_10,
      signal: personalized.signal,
      signal_label: getSignalLabel(personalized.signal),
      delta_vs_today: null,
    },

    summary: {
      main_trigger: personalized.main_trigger,
      trigger_dir: personalized.trigger_dir,
      main_trigger_exact: personalized.personal_main_trigger_exact,
      main_trigger_label: getTriggerLabel(
        personalized.main_trigger,
        personalized.trigger_dir
      ),

      weather_main_trigger: weatherMainCompat.main_trigger,
      weather_trigger_dir: weatherMainCompat.trigger_dir,
      weather_main_trigger_exact: weatherStress.weather_main_trigger_exact || null,
      weather_main_trigger_label: getTriggerLabel(
        weatherMainCompat.main_trigger,
        weatherMainCompat.trigger_dir
      ),

      // 主表示は活動時間帯
      peak_start: personalized.active_peak_start,
      peak_end: personalized.active_peak_end,

      // 補助で全日ピークも保持
      full_day_peak_start: personalized.full_day_peak_start,
      full_day_peak_end: personalized.full_day_peak_end,
    },

    weather_context: {
      pressure_down_strength: weatherStress.pressure_down_strength ?? 0,
      pressure_up_strength: weatherStress.pressure_up_strength ?? 0,
      cold_strength: weatherStress.cold_strength ?? 0,
      heat_strength: weatherStress.heat_strength ?? 0,
      damp_strength: weatherStress.damp_strength ?? 0,
      dry_strength: weatherStress.dry_strength ?? 0,

      channel_strengths: weatherStress.channel_strengths || null,

      weather_main_trigger_exact: weatherStress.weather_main_trigger_exact || null,
      personal_main_trigger_exact: personalized.personal_main_trigger_exact || null,

      main_trigger: weatherStress.main_trigger,
      trigger_dir: weatherStress.trigger_dir,

      active_peak_start: weatherStress.active_peak_start,
      active_peak_end: weatherStress.active_peak_end,
      full_day_peak_start: weatherStress.full_day_peak_start,
      full_day_peak_end: weatherStress.full_day_peak_end,
    },

    constitution_context: {
      core_code: profile.core_code || null,
      sub_labels: Array.isArray(profile.sub_labels) ? profile.sub_labels : [],
      symptom_focus: profile.symptom_focus || null,
      env: profile.env || { sensitivity: 0, vectors: [] },
      primary_meridian: profile.primary_meridian || null,
      secondary_meridian: profile.secondary_meridian || null,
    },

    risk_factors: riskFactors,

    tcm_context: tcmContext,

    mtest_context: {
      selected_line: selectedLine.selected_line,
      selected_from: selectedLine.selected_from,
      selected_reason: selectedLine.reason,
      selected_scores: selectedLine.scores || null,

      mode: motherChild.mode,
      mode_reason: motherChild.reason,
      mode_meta: motherChild.meta,
    },

    care_tone: careTone,

    meta: {
      personalized_meta: personalized.meta || null,
      weather_meta: weatherStress.meta || null,
    },
  };
}

function buildRiskFactors({ personalized, profile }) {
  const out = [];
  const labels = Array.isArray(profile?.sub_labels) ? profile.sub_labels : [];
  const coreCode = profile?.core_code || "";

  const channels = personalized?.meta?.personal_channel_strengths || {};
  const entries = Object.entries(channels)
    .filter(([, value]) => Number(value) > 0.12)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  for (const [type, weight] of entries) {
    out.push({
      type,
      weight: round3(weight),
      matched_to: matchRiskFactorToProfile(type, labels, coreCode),
    });
  }

  return out;
}

function matchRiskFactorToProfile(type, labels, coreCode) {
  const matched = [];

  // core
  const isAccel = coreCode.startsWith("accel");
  const isBrake = coreCode.startsWith("brake");
  const isBattSmall = coreCode.includes("batt_small");

  if (type === "pressure_down") {
    if (labels.includes("fluid_damp")) matched.push("fluid_damp");
    if (labels.includes("qi_deficiency")) matched.push("qi_deficiency");
    if (labels.includes("blood_stasis")) matched.push("blood_stasis");
    if (isBrake) matched.push(coreCode);
  }

  if (type === "pressure_up") {
    if (labels.includes("qi_stagnation")) matched.push("qi_stagnation");
    if (labels.includes("fluid_deficiency")) matched.push("fluid_deficiency");
    if (isAccel) matched.push(coreCode);
  }

  if (type === "cold") {
    if (labels.includes("qi_deficiency")) matched.push("qi_deficiency");
    if (labels.includes("blood_deficiency")) matched.push("blood_deficiency");
    if (labels.includes("blood_stasis")) matched.push("blood_stasis");
    if (isBrake) matched.push(coreCode);
    if (isBattSmall) matched.push("batt_small");
  }

  if (type === "heat") {
    if (labels.includes("qi_stagnation")) matched.push("qi_stagnation");
    if (labels.includes("fluid_deficiency")) matched.push("fluid_deficiency");
    if (isAccel) matched.push(coreCode);
  }

  if (type === "damp") {
    if (labels.includes("fluid_damp")) matched.push("fluid_damp");
    if (labels.includes("qi_deficiency")) matched.push("qi_deficiency");
    if (isBrake) matched.push(coreCode);
  }

  if (type === "dry") {
    if (labels.includes("fluid_deficiency")) matched.push("fluid_deficiency");
    if (labels.includes("blood_deficiency")) matched.push("blood_deficiency");
    if (isBattSmall) matched.push("batt_small");
  }

  return uniq(matched);
}

function buildCareTone({ profile, personalized }) {
  const labels = Array.isArray(profile?.sub_labels) ? profile.sub_labels : [];
  const coreCode = profile?.core_code || "";
  const score = personalized?.score_0_10 ?? 0;
  const personalExact = personalized?.personal_main_trigger_exact || "none";

  const hasDeficiency =
    labels.includes("qi_deficiency") ||
    labels.includes("blood_deficiency") ||
    labels.includes("fluid_deficiency");

  if (coreCode.includes("batt_small") || hasDeficiency) {
    if (score >= 7) return "supportive_strong";
    return "supportive";
  }

  if (personalExact === "damp" || personalExact === "pressure_down") {
    return "lighten_and_drain";
  }

  if (personalExact === "heat" || personalExact === "dry" || personalExact === "pressure_up") {
    return "release_and_cool";
  }

  return "balancing";
}

function uniq(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}

function round3(v) {
  return Math.round(v * 1000) / 1000;
}
