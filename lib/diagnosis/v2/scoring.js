/**
 * Diagnosis v2 scoring engine.
 *
 * Six constitution materials are independently normalized to 0–100. The
 * accelerator/brake result is a signed continuous reaction axis, not a seventh
 * material. Cold/heat, reserve and environmental sensitivity remain separate.
 */

const BODY_LINE_MAP = {
  A: "kidney_bl",
  B: "spleen_st",
  C: "liver_gb",
  D: "heart_si",
  E: "lung_li",
  F: "pc_sj",
};

const MATERIAL_ORDER = [
  "qi_deficiency",
  "qi_stagnation",
  "blood_deficiency",
  "blood_stasis",
  "fluid_deficiency",
  "fluid_damp",
];

const SYMPTOM_FOCUS_DEFAULT = "fatigue";
const ANSWER_SCORE = {
  never: 0,
  rare: 0.25,
  sometimes: 0.5,
  often: 0.75,
  almost_always: 1,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function clamp11(value) {
  return clamp(value, -1, 1);
}

function round(value, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function q(answers, key) {
  return ANSWER_SCORE[answers?.[key]] ?? 0;
}

function selected(values) {
  return Array.isArray(values) ? values.filter((value) => value && value !== "none") : [];
}

function normalizedPercent(numerator, maximum) {
  return round(clamp01(maximum > 0 ? numerator / maximum : 0) * 100, 1);
}

function score01(percent) {
  return clamp01(Number(percent || 0) / 100);
}

function movementSignals(value) {
  return {
    accel: value === "easier" ? 1 : 0,
    brake: value === "more_tired" ? 1 : value === "no_change" ? 0.35 : 0,
    qiDeficiency: value === "more_tired" ? 1 : 0,
    qiStagnation: value === "easier" ? 1 : 0,
    fluidDamp: value === "easier" || value === "no_change" ? 1 : 0,
  };
}

function labelReaction(score, tieAnswer) {
  if (score > 0) return { key: "accel", tri: 1 };
  if (score < 0) return { key: "brake", tri: -1 };
  return tieAnswer === "accel"
    ? { key: "accel", tri: 1 }
    : { key: "brake", tri: -1 };
}

function labelReserve(score) {
  if (score >= 0.25) return { key: "batt_large", tri: 1 };
  if (score <= -0.25) return { key: "batt_small", tri: -1 };
  return { key: "batt_standard", tri: 0 };
}

function decideMaterialTri(deficiency, obstruction) {
  if (deficiency < 35 && obstruction < 35) return 0;
  const difference = deficiency - obstruction;
  if (difference >= 5) return -1;
  if (difference <= -5) return 1;
  return 0;
}

function pickSubLabels(materialScores) {
  return MATERIAL_ORDER
    .map((key, index) => ({ key, score: Number(materialScores[key] || 0), index }))
    .filter((item) => item.score >= 35)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 2)
    .map((item) => item.key);
}

function bodyLines(answers) {
  const primary = BODY_LINE_MAP[answers?.body_line_primary] || null;
  let secondary = BODY_LINE_MAP[answers?.body_line_secondary] || null;
  if (!primary || secondary === primary) secondary = null;
  return { primary, secondary };
}

export function scoreDiagnosis(answers = {}) {
  const movement = movementSignals(answers.movement_response);
  const bloodDeficiencyClues = selected(answers.blood_deficiency_clues).slice(0, 2);
  const bloodStasisClues = selected(answers.blood_stasis_clues).slice(0, 2);
  const fluidDeficiencyClues = selected(answers.fluid_deficiency_clues).slice(0, 2);

  const materialScores = {
    qi_deficiency: normalizedPercent(
      q(answers, "fatigue_easy") +
        q(answers, "recovery_lag") +
        0.25 * q(answers, "postmeal_burden") +
        0.2 * q(answers, "orthostatic_unsteadiness") +
        0.35 * movement.qiDeficiency,
      2.8
    ),
    qi_stagnation: normalizedPercent(
      q(answers, "qi_obstruction") +
        q(answers, "stress_variability") +
        0.3 * movement.qiStagnation,
      2.3
    ),
    blood_deficiency: normalizedPercent(
      0.8 * q(answers, "visual_depletion") +
        0.8 * q(answers, "orthostatic_unsteadiness") +
        0.3 * bloodDeficiencyClues.length,
      2.2
    ),
    blood_stasis: normalizedPercent(
      q(answers, "fixed_discomfort") + 0.25 * bloodStasisClues.length,
      1.5
    ),
    fluid_deficiency: normalizedPercent(
      q(answers, "general_dryness") +
        0.8 * q(answers, "dry_stool") +
        0.25 * fluidDeficiencyClues.length,
      2.3
    ),
    fluid_damp: normalizedPercent(
      q(answers, "body_heaviness") +
        q(answers, "postmeal_burden") +
        0.25 * movement.fluidDamp,
      2.25
    ),
  };

  const normalized = Object.fromEntries(
    MATERIAL_ORDER.map((key) => [key, score01(materialScores[key])])
  );
  const coldScore = q(answers, "cold_pattern");
  const heatScore = q(answers, "heat_pattern");

  let accelEvidence =
    0.5 * normalized.qi_stagnation +
    0.2 * heatScore +
    0.15 * normalized.fluid_deficiency * heatScore +
    0.15 * movement.accel;
  let brakeEvidence =
    0.45 * normalized.fluid_damp +
    0.2 * coldScore +
    0.15 * normalized.qi_deficiency * coldScore +
    0.1 * normalized.blood_deficiency * coldScore +
    0.1 * movement.brake;

  const evidenceBeforeTie = accelEvidence - brakeEvidence;
  const tieAnswer = answers.reaction_tiebreak;
  const tieWasUsed =
    Math.abs(evidenceBeforeTie) <= 0.08 &&
    (tieAnswer === "accel" || tieAnswer === "brake");
  if (tieWasUsed) {
    if (tieAnswer === "accel") accelEvidence += 0.04;
    else brakeEvidence += 0.04;
  }

  const reactionScore = clamp11(
    (accelEvidence - brakeEvidence) / (accelEvidence + brakeEvidence + 0.25)
  );

  const reserveLoss = clamp01(
    0.45 * q(answers, "fatigue_easy") +
      0.35 * q(answers, "recovery_lag") +
      0.1 * normalized.blood_deficiency +
      0.1 * normalized.fluid_deficiency
  );
  const reserveScore = clamp11(1 - 2 * reserveLoss);
  const obstructionScore = clamp01(
    0.34 * normalized.qi_stagnation +
      0.33 * normalized.blood_stasis +
      0.33 * normalized.fluid_damp
  );

  const thermalDirection = clamp11(
    (heatScore - coldScore) / (heatScore + coldScore + 0.25)
  );
  const thermalMixed = coldScore >= 0.5 && heatScore >= 0.5;
  const thermoAnswer = thermalMixed
    ? "mixed"
    : thermalDirection >= 0.1
      ? "heat"
      : thermalDirection <= -0.1
        ? "cold"
        : "neutral";
  const thermoTri = thermalDirection >= 0.1 ? 1 : thermalDirection <= -0.1 ? -1 : 0;

  const reaction = labelReaction(reactionScore, tieAnswer);
  const reserve = labelReserve(reserveScore);
  const lines = bodyLines(answers);
  const envVectors = selected(answers.env_vectors).slice(0, 2);
  const symptomFocus = String(answers.symptom_focus || SYMPTOM_FOCUS_DEFAULT);

  const deficiencyTotal = round(
    (materialScores.qi_deficiency + materialScores.blood_deficiency + materialScores.fluid_deficiency) / 3,
    1
  );
  const obstructionTotal = round(
    (materialScores.qi_stagnation + materialScores.blood_stasis + materialScores.fluid_damp) / 3,
    1
  );

  return {
    symptom_focus: symptomFocus,
    qi: decideMaterialTri(materialScores.qi_deficiency, materialScores.qi_stagnation),
    blood: decideMaterialTri(materialScores.blood_deficiency, materialScores.blood_stasis),
    fluid: decideMaterialTri(materialScores.fluid_deficiency, materialScores.fluid_damp),
    thermo: thermoTri,
    resilience: reserve.tri,
    is_mixed: thermalMixed,
    primary_meridian: lines.primary,
    secondary_meridian: lines.secondary,
    core_code: `${reaction.key}_${reserve.key}`,
    sub_labels: pickSubLabels(materialScores),
    material_scores: materialScores,
    split_scores: {
      qi: {
        deficiency: materialScores.qi_deficiency,
        stagnation: materialScores.qi_stagnation,
      },
      blood: {
        deficiency: materialScores.blood_deficiency,
        stasis: materialScores.blood_stasis,
      },
      fluid: {
        deficiency: materialScores.fluid_deficiency,
        damp: materialScores.fluid_damp,
      },
      total: {
        deficiency: deficiencyTotal,
        obstruction: obstructionTotal,
      },
      scale: "0_100",
    },
    env: {
      sensitivity: round(q(answers, "env_sensitivity") * 3, 2),
      vectors: envVectors,
    },
    axes: {
      reaction_score: round(reactionScore),
      reserve_score: round(reserveScore),
      obstruction_score: round(obstructionScore),
      cold_score: round(coldScore),
      heat_score: round(heatScore),
      thermal_direction: round(thermalDirection),
      thermal_mixed: thermalMixed,
      reaction_label: reaction.key,
      reserve_label: reserve.key,
      thermo_answer: thermoAnswer,
      reaction_resolution: tieWasUsed ? "tiebreak" : "weighted_evidence",
      // Existing consumers use these names; both aliases contain the new
      // canonical continuous values.
      yin_yang_score: round(reactionScore),
      drive_score: round(reserveScore),
      yin_yang_label: reaction.key,
      drive_label: reserve.key,
    },
    score_scale: "0_100",
    model_revision: "2026-08-31",
    version: "v2",
    engine_version: "v2",
  };
}

export function buildConstitutionProfilePayload(userId, answers) {
  const computed = scoreDiagnosis(answers);
  return {
    user_id: userId,
    symptom_focus: computed.symptom_focus,
    active_symptom_focus: computed.symptom_focus,
    qi: computed.qi,
    blood: computed.blood,
    fluid: computed.fluid,
    cold_heat: computed.thermo,
    resilience: computed.resilience,
    primary_meridian: computed.primary_meridian,
    secondary_meridian: computed.secondary_meridian,
    organs: computed.primary_meridian ? [computed.primary_meridian] : [],
    answers,
    computed,
    thermo: computed.thermo,
    is_mixed: computed.is_mixed,
    core_code: computed.core_code,
    sub_labels: computed.sub_labels,
    engine_version: "v2",
    version: "v2",
  };
}
