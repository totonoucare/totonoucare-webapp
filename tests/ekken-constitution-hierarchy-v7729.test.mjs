import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const importSource = async (relativePath) => {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
};

const scoring = await importSource("../lib/diagnosis/v2/scoring.js");
const reasoning = await importSource("../lib/records/constitutionReasoning.js");
const promptSource = await readFile(new URL("../lib/records/aiPrompts.js", import.meta.url), "utf8");
const contextSource = await readFile(new URL("../lib/records/aiContext.js", import.meta.url), "utf8");
const serverSource = await readFile(new URL("../lib/records/server.js", import.meta.url), "utf8");
const liveRoute = await readFile(new URL("../app/api/records/live-chat/route.js", import.meta.url), "utf8");
const periodRoute = await readFile(new URL("../app/api/records/chat/route.js", import.meta.url), "utf8");
const analysisRoute = await readFile(new URL("../app/api/records/analysis/route.js", import.meta.url), "utf8");

const cheetahAnswers = {
  symptom_focus: "mood",
  fatigue_easy: "6_9",
  carryover: "6_9",
  qi_stuck: "10p",
  tension_residue: "10p",
  fluid_heavy: "0",
  postmeal_heavy: "0",
  startup_heavy: "0",
  vision_blur: "0",
  dryness_general: "0",
  stool_dry: "0",
  env_sensitivity: 3,
  thermo: "heat",
  meridian_primary: "E",
  meridian_secondary: "C",
};

test("the scoring engine produces the integrated cheetah profile before AI interpretation", () => {
  const result = scoring.scoreDiagnosis(cheetahAnswers);
  assert.equal(result.core_code, "accel_batt_small");
  assert.deepEqual(result.sub_labels, ["qi_stagnation", "qi_deficiency"]);
  assert.equal(result.axes.yin_yang_label, "accel");
  assert.equal(result.axes.drive_label, "batt_small");
  assert.ok(result.axes.obstruction_score > 0);
  assert.equal(result.primary_meridian, "lung_li");
  assert.equal(result.secondary_meridian, "liver_gb");
  assert.ok(result.split_scores.qi.stagnation > result.split_scores.qi.deficiency);
});

test("Ekken receives a hierarchical interpretation instead of parallel profile tags", () => {
  const computed = scoring.scoreDiagnosis(cheetahAnswers);
  const context = reasoning.buildConstitutionReasoningContext({
    ...computed,
    axes: computed.axes,
    split_scores: computed.split_scores,
  });

  assert.equal(context.hierarchy_role, "core_is_top_level_integrated_result");
  assert.equal(context.core_reading.code, "accel_batt_small");
  assert.match(context.core_reading.care_balance, /巡らせる|ゆるめる/);
  assert.match(context.core_reading.care_balance, /支える|余力/);
  assert.equal(context.material_pattern_summary.all_ranked_patterns.length, 6);
  assert.equal(context.material_pattern_summary.all_ranked_patterns[0].code, "qi_stagnation");
  assert.deepEqual(
    context.material_pattern_summary.representative_labels.map((item) => item.code),
    ["qi_stagnation", "qi_deficiency"]
  );
  assert.match(context.current_expression_lenses.symptom_reasoning, /張り・詰まり/);
  assert.match(context.consultation_rules.kampo, /コアタイプ→余力→全6パターン/);
});

test("the profile loader preserves computed material scores and the obstruction auxiliary axis", () => {
  assert.match(serverSource, /split_scores: compactSplitScores\(computed\?\.split_scores\)/);
  assert.match(serverSource, /obstruction_score: finiteOrNull\(computed\.axes\.obstruction_score\)/);
  assert.match(serverSource, /thermo_answer: computed\.axes\.thermo_answer/);
  assert.doesNotMatch(serverSource, /startup_heavy:\s*finiteOrNull/);
});

test("the AI context includes all six patterns and Japanese meridian names", () => {
  assert.match(contextSource, /buildConstitutionReasoningContext/);
  assert.match(contextSource, /material_pattern_summary/);
  assert.match(contextSource, /meridians: safeArray\(primary\.meridians\)/);
  assert.match(contextSource, /meridians: safeArray\(secondary\.meridians\)/);
  assert.match(contextSource, /core_is_top_level: true/);
});

test("live support knows the constitution hierarchy without forcing a fixed reasoning script", () => {
  assert.match(promptSource, /コアタイプは、アクセル／ブレーキ、余力、気血津液の量と巡り/);
  assert.match(promptSource, /気虚・気滞などの全6要素、経絡、不調フォーカス/);
  assert.match(promptSource, /全項目を順番に説明したり、チェックリストを埋めたりする必要はない/);
  assert.match(promptSource, /日本語の会話へ不要な英単語を混ぜない/);
  assert.doesNotMatch(promptSource, /漢方、食養生、暮らす、ほぐすの回答では、候補やケアを出す前に/);
});

test("prompt versions change so saved outputs do not reuse the old constitution interpretation", () => {
  assert.match(liveRoute, /records_live_support_v12_forecast_v2_2026-07-21/);
  assert.match(periodRoute, /records_chat_v12_forecast_v2_2026-07-21/);
  assert.match(analysisRoute, /records_analysis_v11_forecast_v2_2026-07-21/);
});
