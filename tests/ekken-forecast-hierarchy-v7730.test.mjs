import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const importSource = async (relativePath) => {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
};

const forecastReasoning = await importSource("../lib/records/forecastReasoning.js");
const promptSource = await readFile(new URL("../lib/records/aiPrompts.js", import.meta.url), "utf8");
const contextSource = await readFile(new URL("../lib/records/aiContext.js", import.meta.url), "utf8");
const serverSource = await readFile(new URL("../lib/records/server.js", import.meta.url), "utf8");
const analysisSource = await readFile(new URL("../lib/records/analysis.js", import.meta.url), "utf8");
const personalizeSource = await readFile(new URL("../lib/radar_v1/personalizeForecast.js", import.meta.url), "utf8");
const liveRoute = await readFile(new URL("../app/api/records/live-chat/route.js", import.meta.url), "utf8");
const periodRoute = await readFile(new URL("../app/api/records/chat/route.js", import.meta.url), "utf8");
const analysisRoute = await readFile(new URL("../app/api/records/analysis/route.js", import.meta.url), "utf8");

const sampleForecast = {
  target_date: "2026-07-16",
  score_precise_0_10: 6.4,
  signal: 1,
  personal_main_trigger_exact: "damp",
  personal_secondary_trigger_exact: "cold",
  trigger_factors: [
    { exact: "damp", role: "primary", effective_load: 0.71, weather_strength: 0.83, affinity_weight: 0.82, peak_start: "09:00", peak_end: "14:00" },
    { exact: "cold", role: "secondary", effective_load: 0.38, weather_strength: 0.62, affinity_weight: 0.46, peak_start: "18:00", peak_end: "22:00" },
  ],
  why_short: "湿気を主因に、冷え込みも重なります。",
  reason_trace: {
    weather_strengths: { pressure_down: 0.2, pressure_up: 0.1, cold: 0.62, heat: 0.05, damp: 0.83, dry: 0.08 },
    core_weather_weights: { pressure_down: 0.85, pressure_up: 0.3, cold: 0.9, heat: 0.34, damp: 1, dry: 0.45 },
    affinity_sub_codes: ["fluid_damp", "qi_deficiency"],
    personal_affinity_weights: { pressure_down: 0.78, pressure_up: 0.29, cold: 0.46, heat: 0.28, damp: 0.82, dry: 0.31 },
    effective_channel_loads: { pressure_down: 0.17, pressure_up: 0.05, cold: 0.38, heat: 0.02, damp: 0.71, dry: 0.04 },
    battery_tier: "small",
    battery_scalar: 1.12,
    battery_scalar_applied: 1.08,
    score_trace: {
      final_score_0_10: 6.4,
      bonuses: { strong_weather_affinity: 0, strong_secondary_load: 0, multi_channel_overlap: 0 },
    },
    review_feedback_applied: false,
  },
};

test("forecast common knowledge follows the actual forecast hierarchy", () => {
  const model = forecastReasoning.RECORDS_FORECAST_MODEL_CONTEXT;
  assert.equal(model.affinity_construction.base_mix.core_type, 0.55);
  assert.equal(model.affinity_construction.base_mix.primary_material_pattern, 0.28);
  assert.equal(model.affinity_construction.base_mix.secondary_material_pattern, 0.17);
  assert.match(model.effective_load.formula, /0\.30/);
  assert.match(model.effective_load.formula, /0\.68/);
  assert.match(model.trigger_selection.secondary, /0\.20/);
  assert.match(model.trigger_selection.secondary, /45％/);
  assert.ok(model.excluded_from_score.includes("当日の本人の体調実感"));
  assert.ok(model.excluded_from_score.includes("主・副経絡"));
});

test("computed forecast context keeps primary, secondary, affinity and reserve roles separate", () => {
  const context = forecastReasoning.buildForecastReasoningContext(sampleForecast);
  assert.equal(context.hierarchy_role, "constitution_to_affinity_to_weather_to_load_to_mode_to_care");
  assert.equal(context.result.mode_label, "いたわり");
  assert.equal(context.result.primary.label, "湿気");
  assert.equal(context.result.secondary.label, "冷え込み");
  assert.equal(context.personal_affinity.base_mix.core_type, 0.55);
  assert.deepEqual(context.personal_affinity.representative_material_codes, ["fluid_damp", "qi_deficiency"]);
  assert.equal(context.reserve_adjustment.raw_scalar, 1.12);
  assert.equal(context.reserve_adjustment.applied_scalar, 1.08);
  assert.equal(context.daily_weather.ranked_by_effective_load[0].key, "damp");
  assert.equal(context.model_boundaries.actual_condition_is_separate, true);
});

test("forecast context does not invent missing reason trace", () => {
  const context = forecastReasoning.buildForecastReasoningContext({
    target_date: "2026-07-16",
    score_precise_0_10: 2.1,
    signal: 0,
    personal_main_trigger_exact: "dry",
  });
  assert.equal(context.result.mode_label, "安定");
  assert.equal(context.result.primary.label, "乾燥");
  assert.equal(context.trace_available, false);
  assert.deepEqual(context.effective_load.values, {});
  assert.equal(context.score_trace, null);
});

test("forecast engine persists an explanation trace without changing its public result fields", () => {
  assert.match(personalizeSource, /function computeScoreTrace/);
  assert.match(personalizeSource, /const scorePrecise = scoreTrace\.final_score_0_10/);
  assert.match(personalizeSource, /battery_scalar_applied: scoreTrace\.battery_scalar_applied/);
  assert.match(personalizeSource, /score_trace: scoreTrace/);
  assert.match(personalizeSource, /universal_weather_share: UNIVERSAL_WEATHER_SHARE/);
  assert.match(personalizeSource, /secondary_trigger_min_ratio: SECONDARY_TRIGGER_MIN_RATIO/);
});

test("stored and current record contexts preserve the forecast explanation fields", () => {
  for (const source of [serverSource, analysisSource]) {
    assert.match(source, /core_weather_weights/);
    assert.match(source, /affinity_sub_codes/);
    assert.match(source, /battery_scalar_applied/);
    assert.match(source, /forecast_model/);
    assert.match(source, /score_trace/);
  }
  assert.match(contextSource, /RECORDS_FORECAST_MODEL_CONTEXT/);
  assert.match(contextSource, /buildForecastReasoningContext/);
  assert.match(contextSource, /forecast_reasoning:/);
});

test("Ekken uses the computed forecast model without a rigid narration script", () => {
  assert.match(promptSource, /forecastはアプリの計算済み事実/);
  assert.match(promptSource, /気象強度、本人親和性、有効負担、主因・副因、余力補正/);
  assert.match(promptSource, /現在の症状や記録を予報点数の原因へ後付けしない/);
  assert.match(promptSource, /今回に関係する材料を自由に選び、統合して考える/);
  assert.doesNotMatch(promptSource, /予報の推論順は/);
});

test("prompt versions invalidate older saved AI interpretations", () => {
  assert.match(liveRoute, /records_live_support_v11_living_language_2026-07-17/);
  assert.match(periodRoute, /records_chat_v11_forecast_hierarchy_2026-07-16/);
  assert.match(analysisRoute, /records_analysis_v10_forecast_hierarchy_2026-07-16/);
});
