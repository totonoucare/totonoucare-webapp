import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const importSource = async (relativePath) => {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  return import(
    `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
  );
};

const forecastReasoning = await importSource("../lib/records/forecastReasoning.js");
const promptSource = await readFile(new URL("../lib/records/aiPrompts.js", import.meta.url), "utf8");
const contextSource = await readFile(new URL("../lib/records/aiContext.js", import.meta.url), "utf8");
const serverSource = await readFile(new URL("../lib/records/server.js", import.meta.url), "utf8");
const analysisSource = await readFile(new URL("../lib/records/analysis.js", import.meta.url), "utf8");
const personalizeSource = await readFile(new URL("../lib/radar_v1/personalizeForecastV2.js", import.meta.url), "utf8");
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
    forecast_model_version: "radar_forecast_v2_2026-07-21",
    weather_event_strengths: { pressure_shift: 0.2, temperature_shift: 0.15, cold: 0.62, heat: 0.05, damp: 0.83, dry: 0.08 },
    pressure_direction: "down",
    personal_affinity_weights: { pressure_shift: 0.7, temperature_shift: 0.66, cold: 0.73, heat: 0.64, damp: 0.82, dry: 0.65 },
    event_effective_loads: { pressure_shift: 0.18, temperature_shift: 0.13, cold: 0.56, heat: 0.04, damp: 0.77, dry: 0.07 },
    effective_weather_groups: {
      pressure: { event_key: "pressure_shift", exact: "pressure_down", direction: "down", effective_load: 0.18, weather_strength: 0.2, affinity_weight: 0.7 },
      temperature: { event_key: "cold", exact: "cold", direction: "down", effective_load: 0.56, weather_strength: 0.62, affinity_weight: 0.73 },
      moisture: { event_key: "damp", exact: "damp", direction: "up", effective_load: 0.77, weather_strength: 0.83, affinity_weight: 0.82 },
    },
    continuous_axes: { yin_yang_score: -0.4, drive_score: -0.5, obstruction_score: 0.7 },
    material_scores: { qi_deficiency: 0.61, qi_stagnation: 0.22, blood_deficiency: 0.3, blood_stasis: 0.25, fluid_deficiency: 0.19, fluid_damp: 0.78 },
    manifestation: { reaction_direction: "brake", material_ranking: [{ key: "fluid_damp", value: 0.78 }] },
    reserve_scalar: 1.04,
    score_trace: {
      final_score_0_10: 6.4,
      bonuses: { strong_weather_event: 0, multi_group_overlap: 0.25 },
    },
    review_feedback_applied: false,
  },
};

test("forecast common knowledge follows the actual forecast hierarchy", () => {
  const model = forecastReasoning.RECORDS_FORECAST_MODEL_CONTEXT;
  assert.equal(model.personalization.universal_weather_share, 0.38);
  assert.equal(model.personalization.personal_affinity_share, 0.62);
  assert.match(model.personalization.direction_modifier, /0\.06/);
  assert.match(model.weather_events.overlap_rule, /一つの温熱環境/);
  assert.match(model.score_construction.overlap, /大きい方/);
  assert.match(model.trigger_selection.secondary, /0\.24/);
  assert.match(model.trigger_selection.secondary, /45％/);
  assert.ok(model.excluded_from_score.includes("当日の本人の体調実感"));
  assert.ok(model.excluded_from_score.includes("主・副経絡"));
});

test("computed forecast context keeps primary, secondary, affinity and reserve roles separate", () => {
  const context = forecastReasoning.buildForecastReasoningContext(sampleForecast);
  assert.equal(context.hierarchy_role, "weather_events_to_constitution_expression_to_reserve_to_mode_to_care");
  assert.equal(context.result.mode_label, "いたわり");
  assert.equal(context.result.primary.label, "湿気");
  assert.equal(context.result.secondary.label, "低温");
  assert.equal(context.personalization.formula.includes("0.62"), true);
  assert.equal(context.personalization.manifestation.reaction_direction, "brake");
  assert.equal(context.reserve_adjustment.raw_scalar, 1.04);
  assert.equal(context.reserve_adjustment.applied_scalar, 1.04);
  assert.equal(context.daily_weather.ranked_by_effective_load[0].group, "moisture");
  assert.equal(context.model_boundaries.actual_condition_is_separate, true);
  assert.equal(context.model_boundaries.pressure_direction_is_secondary, true);
  assert.equal(context.model_boundaries.comfort_direction_calibration_applied, false);
});

test("forecast explanation distinguishes stored pre-calibration V2 from comfort-calibrated V2", () => {
  const current = forecastReasoning.buildForecastReasoningContext({
    ...sampleForecast,
    reason_trace: {
      ...sampleForecast.reason_trace,
      forecast_model_version: "radar_forecast_v2_2026-07-22_comfort_calibrated",
    },
  });

  assert.match(current.personalization.formula, /全員共通分0\.38/);
  assert.match(current.personalization.formula, /体質親和分0\.62/);
  assert.equal(current.model_boundaries.comfort_direction_calibration_applied, true);
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
  assert.deepEqual(context.effective_load.event_values, {});
  assert.equal(context.score_trace, null);
});

test("forecast engine persists an explanation trace without changing its public result fields", () => {
  assert.match(personalizeSource, /function computeScore/);
  assert.match(personalizeSource, /const scorePrecise = scoreTrace\.final_score_0_10/);
  assert.match(personalizeSource, /reserve_scalar: scoreTrace\.reserve_scalar_applied/);
  assert.match(personalizeSource, /score_trace: scoreTrace/);
  assert.match(personalizeSource, /universal_weather_share: UNIVERSAL_SHARE/);
  assert.match(personalizeSource, /personal_affinity_share: PERSONAL_SHARE/);
});

test("stored and current record contexts preserve the forecast explanation fields", () => {
  for (const source of [serverSource, analysisSource]) {
    assert.match(source, /forecast_model_version/);
    assert.match(source, /weather_event_strengths/);
    assert.match(source, /effective_weather_groups/);
    assert.match(source, /continuous_axes/);
    assert.match(source, /material_scores/);
    assert.match(source, /reserve_scalar/);
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
  assert.match(promptSource, /気圧の上昇・低下は副情報/);
  assert.match(promptSource, /今回に関係する材料を自由に選び、統合して考える/);
  assert.doesNotMatch(promptSource, /予報の推論順は/);
});

test("prompt versions invalidate older saved AI interpretations", () => {
  assert.match(liveRoute, /records_live_support_v14_weather_peak_semantics_2026-07-24/);
  assert.match(periodRoute, /records_chat_v14_weather_peak_semantics_2026-07-24/);
  assert.match(analysisRoute, /records_analysis_v13_weather_peak_semantics_2026-07-24/);
});
