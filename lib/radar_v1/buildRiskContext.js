// lib/radar_v1/buildRiskContext.js
import { personalizeForecast } from "@/lib/radar_v1/personalizeForecast";
import { differentiateForTcm } from "@/lib/radar_v1/differentiation";
import { selectMtestLine } from "@/lib/radar_v1/selectMtestLine";
import { selectMotherChild } from "@/lib/radar_v1/selectMotherChild";

/**
 * Integrated risk context builder.
 *
 * This is the new "risk.js" core conceptually.
 * It does NOT pick points directly.
 * It returns the full daily context used by:
 * - score / signal UI
 * - TCM planning
 * - M-test planning
 * - GPT summary
 * - food generation
 */

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

  const tcmContext = differentiateForTcm({
    core_code: profile.core_code,
    sub_labels: profile.sub_labels,
    weatherStress,
  });

  const selectedLine = selectMtestLine({
    primary_meridian: profile.primary_meridian,
    secondary_meridian: profile.secondary_meridian,
    weatherStress,
  });

  const motherChild = selectMotherChild({
    weatherStress,
    core_code: profile.core_code,
    sub_labels: profile.sub_labels,
  });

  const riskFactors = buildRiskFactors({
    weatherStress,
    profile,
    personalized,
  });

  const careTone = buildCareTone({
    profile,
    weatherStress,
    personalized,
  });

  return {
    target: {
      score_0_10: personalized.score_0_10,
      signal: personalized.signal,
      signal_label: signalToLabel(personalized.signal),
      delta_vs_today: null, // later when today-vs-target comparison is implemented
    },

    summary: {
      main_trigger: personalized.main_trigger,
      trigger_dir: personalized.trigger_dir,
      main_trigger_label: toTriggerLabel(
        personalized.main_trigger,
        personalized.trigger_dir
      ),
      peak_start: personalized.peak_start,
      peak_end: personalized.peak_end,
    },

    weather_context: {
      pressure_down_strength: weatherStress.pressure_down_strength ?? 0,
      cold_strength: weatherStress.cold_strength ?? 0,
      damp_strength: weatherStress.damp_strength ?? 0,
      main_trigger: weatherStress.main_trigger,
      trigger_dir: weatherStress.trigger_dir,
      peak_start: weatherStress.peak_start,
      peak_end: weatherStress.peak_end,
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

function buildRiskFactors({ weatherStress, profile, personalized }) {
  const out = [];
  const labels = Array.isArray(profile?.sub_labels) ? profile.sub_labels : [];
  const coreCode = profile?.core_code || "";

  if ((weatherStress.pressure_down_strength ?? 0) > 0.1) {
    out.push({
      type: "pressure_down",
      weight: round3(weatherStress.pressure_down_strength ?? 0),
      matched_to: [
        ...(labels.includes("qi_stagnation") ? ["qi_stagnation"] : []),
        ...(coreCode.startsWith("accel") ? [coreCode] : []),
      ],
    });
  }

  if ((weatherStress.cold_strength ?? 0) > 0.1) {
    out.push({
      type: "cold",
      weight: round3(weatherStress.cold_strength ?? 0),
      matched_to: [
        ...(labels.includes("blood_deficiency") ? ["blood_deficiency"] : []),
        ...(labels.includes("qi_deficiency") ? ["qi_deficiency"] : []),
        ...(coreCode.includes("batt_small") ? [coreCode] : []),
      ],
    });
  }

  if ((weatherStress.damp_strength ?? 0) > 0.1) {
    out.push({
      type: "damp",
      weight: round3(weatherStress.damp_strength ?? 0),
      matched_to: [
        ...(labels.includes("fluid_damp") ? ["fluid_damp"] : []),
        ...(labels.includes("qi_deficiency") ? ["qi_deficiency"] : []),
      ],
    });
  }

  out.sort((a, b) => b.weight - a.weight);

  return out;
}

function buildCareTone({ profile, weatherStress, personalized }) {
  const labels = Array.isArray(profile?.sub_labels) ? profile.sub_labels : [];
  const coreCode = profile?.core_code || "";
  const score = personalized?.score_0_10 ?? 0;

  if (
    coreCode.includes("batt_small") ||
    labels.includes("qi_deficiency") ||
    labels.includes("blood_deficiency") ||
    labels.includes("fluid_deficiency")
  ) {
    return score >= 7 ? "supportive_strong" : "supportive";
  }

  if (
    weatherStress.main_trigger === "humidity" &&
    weatherStress.trigger_dir === "up"
  ) {
    return "lighten_and_drain";
  }

  if (
    weatherStress.main_trigger === "temp" &&
    weatherStress.trigger_dir === "up"
  ) {
    return "release_and_cool";
  }

  return "balancing";
}

function toTriggerLabel(mainTrigger, triggerDir) {
  if (mainTrigger === "pressure" && triggerDir === "down") return "気圧が下がる日";
  if (mainTrigger === "pressure" && triggerDir === "up") return "気圧が上がる日";
  if (mainTrigger === "temp" && triggerDir === "down") return "冷え込みやすい日";
  if (mainTrigger === "temp" && triggerDir === "up") return "気温が上がりやすい日";
  if (mainTrigger === "humidity" && triggerDir === "up") return "湿がこもりやすい日";
  return "気象の変化がある日";
}

function signalToLabel(signal) {
  if (signal === 2) return "要警戒";
  if (signal === 1) return "注意";
  return "安定";
}

function round3(v) {
  return Math.round(v * 1000) / 1000;
}
