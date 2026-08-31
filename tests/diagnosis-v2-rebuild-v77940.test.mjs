import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const { scoreDiagnosis } = await import(
  pathToFileURL(path.join(root, "lib/diagnosis/v2/scoring.js")).href
);
const { getQuestions } = await import(
  pathToFileURL(path.join(root, "lib/diagnosis/v2/questions.js")).href
);
const { buildConstitutionWeatherAffinityV2 } = await import(
  pathToFileURL(path.join(root, "lib/radar_v1/personalizeForecastV2.js")).href
);

const baseKeys = [
  "fatigue_easy", "recovery_lag", "qi_obstruction", "stress_variability",
  "body_heaviness", "postmeal_burden", "fixed_discomfort", "visual_depletion",
  "orthostatic_unsteadiness", "general_dryness", "dry_stool", "cold_pattern",
  "heat_pattern", "env_sensitivity",
];

function answers(overrides = {}) {
  return {
    ...Object.fromEntries(baseKeys.map((key) => [key, "never"])),
    symptom_focus: "fatigue",
    ...overrides,
  };
}

test("all-low answers require an explicit reaction tiebreak instead of silently defaulting", () => {
  const partial = answers();
  assert.equal(
    getQuestions(partial).some((question) => question.key === "reaction_tiebreak"),
    true
  );
  const result = scoreDiagnosis({ ...partial, reaction_tiebreak: "brake" });
  assert.equal(result.axes.reaction_resolution, "tiebreak");
  assert.equal(result.axes.reaction_label, "brake");
  assert.ok(result.axes.reaction_score < 0);
});

test("pure qi stagnation is accelerator-led and pure dampness is brake-led", () => {
  const qiStagnation = scoreDiagnosis(answers({
    qi_obstruction: "almost_always",
    stress_variability: "almost_always",
  }));
  assert.equal(qiStagnation.axes.reaction_label, "accel");
  assert.ok(qiStagnation.material_scores.qi_stagnation > 80);

  const dampness = scoreDiagnosis(answers({
    body_heaviness: "almost_always",
    postmeal_burden: "almost_always",
    movement_response: "no_change",
  }));
  assert.equal(dampness.axes.reaction_label, "brake");
  assert.ok(dampness.material_scores.fluid_damp > 80);
});

test("qi deficiency with cold lowers reserve and assists the brake side", () => {
  const result = scoreDiagnosis(answers({
    fatigue_easy: "almost_always",
    recovery_lag: "almost_always",
    cold_pattern: "almost_always",
    movement_response: "more_tired",
  }));
  assert.equal(result.axes.reaction_label, "brake");
  assert.equal(result.axes.reserve_label, "batt_small");
  assert.ok(result.axes.reserve_score <= -0.25);
});

test("fluid deficiency with heat assists accelerator while blood deficiency with cold only weakly assists brake", () => {
  const dryHeat = scoreDiagnosis(answers({
    general_dryness: "almost_always",
    dry_stool: "almost_always",
    heat_pattern: "almost_always",
    fluid_deficiency_clues: ["evening_heat", "night_sweats"],
  }));
  assert.equal(dryHeat.axes.reaction_label, "accel");

  const bloodCold = scoreDiagnosis(answers({
    visual_depletion: "almost_always",
    orthostatic_unsteadiness: "almost_always",
    cold_pattern: "almost_always",
    blood_deficiency_clues: ["muscle_cramp", "brittle_nails"],
  }));
  assert.equal(bloodCold.axes.reaction_label, "brake");
  assert.ok(Math.abs(bloodCold.axes.reaction_score) < 0.6);
});

test("blood stasis raises obstruction but never directly supplies reaction direction", () => {
  const withoutStasis = scoreDiagnosis(answers({ reaction_tiebreak: "accel" }));
  const withStasis = scoreDiagnosis(answers({
    fixed_discomfort: "almost_always",
    blood_stasis_clues: ["focal_stabbing", "worse_at_night"],
    reaction_tiebreak: "accel",
  }));
  assert.equal(withStasis.axes.reaction_score, withoutStasis.axes.reaction_score);
  assert.ok(withStasis.axes.obstruction_score > withoutStasis.axes.obstruction_score);
});

test("cold and heat are retained independently when both are present", () => {
  const result = scoreDiagnosis(answers({
    cold_pattern: "almost_always",
    heat_pattern: "almost_always",
    fluid_deficiency_clues: ["evening_heat"],
    reaction_tiebreak: "accel",
  }));
  assert.equal(result.axes.cold_score, 1);
  assert.equal(result.axes.heat_score, 1);
  assert.equal(result.axes.thermal_mixed, true);
  assert.equal(result.axes.thermo_answer, "mixed");
  assert.equal(result.is_mixed, true);
});

test("the same displayed animal can retain meaningfully different continuous values", () => {
  const mild = scoreDiagnosis(answers({
    qi_obstruction: "often",
    stress_variability: "sometimes",
    fatigue_easy: "rare",
  }));
  const strong = scoreDiagnosis(answers({
    qi_obstruction: "almost_always",
    stress_variability: "almost_always",
    fatigue_easy: "rare",
  }));
  assert.equal(mild.core_code, strong.core_code);
  assert.notEqual(mild.axes.reaction_score, strong.axes.reaction_score);
  assert.notEqual(mild.material_scores.qi_stagnation, strong.material_scores.qi_stagnation);
  const mildAffinity = buildConstitutionWeatherAffinityV2({ constitution: { computed: mild } });
  const strongAffinity = buildConstitutionWeatherAffinityV2({ constitution: { computed: strong } });
  assert.notEqual(mildAffinity.weights.heat, strongAffinity.weights.heat);
});

test("symptom, environment and optional body lines do not corrupt the six baseline scores", () => {
  const base = answers({
    qi_obstruction: "often",
    reaction_tiebreak: "accel",
  });
  const first = scoreDiagnosis(base);
  const second = scoreDiagnosis({
    ...base,
    symptom_focus: "headache",
    env_sensitivity: "almost_always",
    env_vectors: ["pressure_shift", "temp_swing"],
    body_line_primary: "A",
    body_line_secondary: "C",
  });
  assert.deepEqual(second.material_scores, first.material_scores);
  assert.equal(second.axes.reaction_score, first.axes.reaction_score);
  assert.equal(second.primary_meridian, "kidney_bl");
});

test("reserve uses each fixed input once and does not re-add the qi-deficiency aggregate", () => {
  const recoveryOnly = scoreDiagnosis(answers({
    recovery_lag: "almost_always",
    reaction_tiebreak: "brake",
  }));
  assert.equal(recoveryOnly.axes.reserve_score, 0.3);
});
