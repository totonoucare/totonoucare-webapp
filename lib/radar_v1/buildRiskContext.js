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

  // TCM / M-test / mother-child には、本人に一番効きやすい3軸互換 trigger を渡す
  const compatWeatherForCare = {
    main_trigger: personalized.main_trigger,
    trigger_dir: personalized.trigger_dir,
    pressure_down_strength: weatherStress.pressure_down_strength ?? 0,
    cold_strength: weatherStress.cold_strength ?? 0,
    damp_strength: weatherStress.damp_strength ?? 0,
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

  if (type === "pressure_down") {
    if (labels.includes("qi_stagnation")) matched.push("qi_stagnation");
    if (coreCode.startsWith("accel")) matched.push(coreCode);
  }

  if (type === "pressure_up") {
    if (labels.includes("qi_stagnation")) matched.push("qi_stagnation");
    if (labels.includes("fluid_deficiency")) matched.push("fluid_deficiency");
  }

  if (type === "cold") {
    if (labels.includes("blood_deficiency")) matched.push("blood_deficiency");
    if (labels.includes("qi_deficiency")) matched.push("qi_deficiency");
    if (coreCode.includes("batt_small")) matched.push(coreCode);
  }

  if (type === "heat") {
    if (labels.includes("fluid_deficiency")) matched.push("fluid_deficiency");
    if (labels.includes("qi_stagnation")) matched.push("qi_stagnation");
  }

  if (type === "damp") {
    if (labels.includes("fluid_damp")) matched.push("fluid_damp");
    if (labels.includes("qi_deficiency")) matched.push("qi_deficiency");
  }

  if (type === "dry") {
    if (labels.includes("fluid_deficiency")) matched.push("fluid_deficiency");
    if (labels.includes("blood_deficiency")) matched.push("blood_deficiency");
  }

  return matched;
}

function buildCareTone({ profile, personalized }) {
  const labels = Array.isArray(profile?.sub_labels) ? profile.sub_labels : [];
  const coreCode = profile?.core_code || "";
  const score = personalized?.score_0_10 ?? 0;
  const personalExact = personalized?.personal_main_trigger_exact || "none";

  if (
    coreCode.includes("batt_small") ||
    labels.includes("qi_deficiency") ||
    labels.includes("blood_deficiency") ||
    labels.includes("fluid_deficiency")
  ) {
    return score >= 7 ? "supportive_strong" : "supportive";
  }

  if (personalExact === "damp") {
    return "lighten_and_drain";
  }

  if (personalExact === "heat" || personalExact === "dry") {
    return "release_and_cool";
  }

  return "balancing";
}

function round3(v) {
  return Math.round(v * 1000) / 1000;
}
