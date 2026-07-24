import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

async function importText(source) {
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

async function importSource(relativePath) {
  const source = await readSource(relativePath);
  const linkedSource = source.replace(
    'import { normalizeForecastTimingLanguage } from "@/lib/radar_v1/forecastTimingLanguage";',
    ""
  );
  return importText(
    `${timingLanguageSource.replaceAll("export ", "")}\n${linkedSource}`
  );
}

const pressureSource = await readSource("../lib/radar_v1/pressureResponse.js");
const timingLanguageSource = await readSource("../lib/radar_v1/forecastTimingLanguage.js");
const pressureResponse = await importText(pressureSource);
const dailyCare = await importSource("../lib/radar_v1/careRules/dailyCareV2.js");
const forecastReasoning = await importSource("../lib/records/forecastReasoning.js");
const recordAnalysis = await importSource("../lib/records/analysis.js");
const partnerOffers = await importSource("../lib/care-navi/partnerOffers.js");
const constitutionGuideSource = await readSource("../app/result/[id]/page.js");
const personalKarteSource = await readSource("../lib/personalKarte.js");

async function importRadarUtils() {
  let source = await readSource("../app/radar/utils.js");
  source = source
    .replace('import { flattenRadarLocationPresets } from "@/lib/radar_v1/locationPresets";', "const flattenRadarLocationPresets = () => [];")
    .replace('import { getLifestylePlan as getLifestylePlanFromRules } from "@/lib/radar_v1/careRules/lifestyleRules";', "const getLifestylePlanFromRules = () => ({});")
    .replace('import { buildTodayCarePlanCore } from "@/lib/radar_v1/careRules/todayCarePlan";', "const buildTodayCarePlanCore = () => null;")
    .replace('import { normalizeForecastTimingLanguage } from "@/lib/radar_v1/forecastTimingLanguage";', "const normalizeForecastTimingLanguage = (value) => String(value || '');")
    .replace(/import \{[\s\S]*?\} from "@\/lib\/radar_v1\/pressureResponse";/, "");
  return importText(`${pressureSource.replaceAll("export ", "")}\n${source}`);
}

async function importPointExplanation() {
  let source = await readSource("../lib/radar_v1/explainPointSelection.js");
  source = source.replace(/import \{[\s\S]*?\} from "@\/lib\/radar_v1\/pressureResponse";/, "");
  return importText(`${pressureSource.replaceAll("export ", "")}\n${source}`);
}

const radarUtils = await importRadarUtils();
const pointExplanation = await importPointExplanation();

function makeForecast(physicalDirection, responseDirection) {
  const exact = physicalDirection === "down" ? "pressure_down" : "pressure_up";
  const bodyResponseKey = `pressure_${responseDirection}`;
  const caution = {
    key: "extreme_heat",
    level: "notice",
    label: "猛暑への注意",
    detail: "体質別のゆらぎ度とは別に、暑熱への備えが必要です。",
    official_alert: false,
  };
  const factor = {
    exact,
    event_key: "pressure_shift",
    role: "primary",
    physical_direction: physicalDirection,
    response_direction: responseDirection,
    body_response_key: bodyResponseKey,
    effective_load: 0.76,
    weather_strength: 0.82,
    affinity_weight: 0.74,
    peak_start: "12:00",
    peak_end: "15:00",
  };
  return {
    target_date: "2026-07-24",
    score_precise_0_10: 6.2,
    signal: 1,
    main_trigger: "pressure",
    trigger_dir: physicalDirection,
    personal_main_trigger_exact: exact,
    personal_main_event_key: "pressure_shift",
    pressure_direction: physicalDirection,
    pressure_response_direction: responseDirection,
    trigger_factors: [factor],
    environmental_cautions: [caution],
    reason_trace: {
      forecast_model_version: "radar_forecast_v2_2026-07-23_pressure_response_integrated",
      personal_main_event_key: "pressure_shift",
      pressure_direction: physicalDirection,
      pressure_response_direction: responseDirection,
      weather_event_strengths: { pressure_shift: 0.82 },
      personal_affinity_weights: { pressure_shift: 0.74 },
      event_effective_loads: { pressure_shift: 0.76 },
      effective_weather_groups: {
        pressure: {
          event_key: "pressure_shift",
          exact,
          physical_direction: physicalDirection,
          response_direction: responseDirection,
          body_response_key: bodyResponseKey,
          effective_load: 0.76,
          weather_strength: 0.82,
          affinity_weight: 0.74,
        },
      },
      manifestation: { reaction_direction: responseDirection },
      environmental_cautions: [caution],
    },
  };
}

function makeRiskContext(forecast) {
  return {
    target: { signal: forecast.signal },
    summary: {
      main_trigger: "pressure",
      trigger_dir: forecast.pressure_direction,
      main_trigger_exact: forecast.personal_main_trigger_exact,
      personal_main_trigger_exact: forecast.personal_main_trigger_exact,
      personal_main_event_key: forecast.personal_main_event_key,
      pressure_direction: forecast.pressure_direction,
      pressure_response_direction: forecast.pressure_response_direction,
      trigger_factors: forecast.trigger_factors,
      environmental_cautions: forecast.environmental_cautions,
    },
    constitution_context: {
      core_code: forecast.pressure_response_direction === "accel" ? "accel_batt_standard" : "brake_batt_standard",
      sub_labels: [],
      symptom_focus: "neck_shoulder",
      primary_meridian: "liver_gb",
    },
    tcm_context: {
      meta: {
        exact_trigger: forecast.personal_main_trigger_exact,
        symptom_focus: "neck_shoulder",
      },
      primary_actions: ["move_qi"],
      secondary_actions: ["soothe_liver"],
      organ_focus: ["liver"],
    },
  };
}

test("missing pressure response keeps legacy up/down care while explicit balanced stays neutral", () => {
  assert.equal(pressureResponse.readExplicitPressureResponseDirection({}), null);
  assert.equal(pressureResponse.getLegacyCareTriggerKey("pressure_down", {}), "pressure_down");
  assert.equal(pressureResponse.getLegacyCareTriggerKey("pressure_up", {}), "pressure_up");
  assert.equal(
    pressureResponse.getLegacyCareTriggerKey("pressure_shift", { physical_direction: "down" }),
    "pressure_down",
  );
  assert.equal(
    pressureResponse.getLegacyCareTriggerKey("pressure_down", { pressure_response_direction: "balanced" }),
    "default",
  );

  const oldFactor = radarUtils.getForecastTriggerFactors({
    personal_main_trigger_exact: "pressure_down",
    main_trigger: "pressure",
    trigger_dir: "down",
  })[0];
  assert.equal(oldFactor.responseDirection, null);
  assert.equal(oldFactor.bodyResponseKey, "pressure_down");
  assert.equal(oldFactor.careKey, "pressure_down");
});

test("pressure physical direction and body response remain separate through UI, care, points, shop, and Ekken", () => {
  const cases = [
    { physical: "down", response: "accel", weather: "気圧低下", body: /張り・力み|前のめり/ },
    { physical: "down", response: "brake", weather: "気圧低下", body: /重だるさ|こもる重さ|こもり|動き出し/ },
    { physical: "up", response: "accel", weather: "気圧上昇", body: /張り・力み|前のめり/ },
    { physical: "up", response: "brake", weather: "気圧上昇", body: /重だるさ|こもる重さ|こもり|動き出し/ },
  ];
  const results = [];

  for (const item of cases) {
    const forecast = makeForecast(item.physical, item.response);
    const riskContext = makeRiskContext(forecast);
    const factors = radarUtils.getForecastTriggerFactors(forecast);
    const factor = factors[0];

    assert.equal(factor.label, item.weather);
    assert.equal(factor.physicalDirection, item.physical);
    assert.equal(factor.responseDirection, item.response);
    assert.equal(factor.bodyResponseKey, `pressure_${item.response}`);
    assert.equal(factor.careKey, item.response === "accel" ? "pressure_up" : "pressure_down");

    const bodySigns = radarUtils.getForecastBodySigns(factors, forecast.signal, "neck_shoulder", "tomorrow");
    const careLead = radarUtils.getCareStrategyLead(factors, forecast.signal, "tomorrow", "neck_shoulder");
    assert.match(JSON.stringify(bodySigns), item.body);
    assert.match(careLead, item.body);

    const carePlan = dailyCare.enhanceDailyCarePlan({
      baseCarePlan: {},
      forecast,
      riskContext,
      mode: "tomorrow",
      targetDate: forecast.target_date,
      symptomFocus: "neck_shoulder",
    });
    assert.equal(carePlan.care_theme.trigger_key, factor.careKey);
    assert.match(
      JSON.stringify(carePlan),
      item.response === "accel" ? /力み|張り|前のめり/ : /重|だる|こもり|動き出し/,
    );
    assert.ok(carePlan.lifestyle_plan?.steps?.length > 0);
    assert.ok(carePlan.tomorrow_food_context?.add_items?.length > 0);
    assert.ok(carePlan.night_tsubo_set?.line_care);

    const pointCopy = pointExplanation.explainPointSelection({
      point: {
        code: "LI4",
        point_region: "limb",
        care_trigger_role: "primary",
        tcm_actions: ["move_qi"],
        organ_focus: ["liver"],
      },
      riskContext,
    });
    assert.match(pointCopy.role_summary, new RegExp(item.weather));
    assert.match(pointCopy.role_summary, item.body);
    assert.doesNotMatch(pointCopy.selection_reason, /首本人/);

    assert.equal(partnerOffers.getPartnerWeatherKeys(factors)[0], factor.careKey);

    const reasoning = forecastReasoning.buildForecastReasoningContext(forecast);
    assert.equal(reasoning.result.primary.physical_direction, item.physical);
    assert.equal(reasoning.result.primary.response_direction, item.response);
    assert.equal(reasoning.result.primary.body_response_key, `pressure_${item.response}`);
    assert.equal(reasoning.result.personal_main_event_key, "pressure_shift");
    assert.equal(reasoning.daily_weather.pressure_direction, item.physical);
    assert.equal(reasoning.daily_weather.pressure_response_direction, item.response);
    assert.equal(reasoning.daily_weather.environmental_cautions[0].key, "extreme_heat");
    assert.equal(reasoning.model_boundaries.pressure_direction_and_body_response_are_separate, true);

    const aiRecord = recordAnalysis.trimRecordForAi({
      date: forecast.target_date,
      forecast,
      review: null,
      care_actions: [],
    });
    assert.equal(aiRecord.forecast.personal_main_event_key, "pressure_shift");
    assert.equal(aiRecord.forecast.pressure_direction, item.physical);
    assert.equal(aiRecord.forecast.pressure_response_direction, item.response);
    assert.equal(aiRecord.forecast.trigger_factors[0].physical_direction, item.physical);
    assert.equal(aiRecord.forecast.trigger_factors[0].response_direction, item.response);
    assert.equal(aiRecord.forecast.trigger_factors[0].body_response_key, `pressure_${item.response}`);
    assert.equal(aiRecord.forecast.environmental_cautions[0].key, "extreme_heat");

    results.push({
      physical: item.physical,
      response: item.response,
      signs: JSON.stringify(bodySigns),
      careLead,
      lifestyle: JSON.stringify(carePlan.lifestyle_plan),
      food: JSON.stringify(carePlan.tomorrow_food_context),
      point: pointCopy.role_summary,
    });
  }

  const downAccel = results.find((item) => item.physical === "down" && item.response === "accel");
  const upAccel = results.find((item) => item.physical === "up" && item.response === "accel");
  const downBrake = results.find((item) => item.physical === "down" && item.response === "brake");
  const upBrake = results.find((item) => item.physical === "up" && item.response === "brake");

  assert.equal(downAccel.signs, upAccel.signs);
  assert.equal(downBrake.signs, upBrake.signs);
  assert.notEqual(downAccel.signs, downBrake.signs);
  assert.notEqual(downAccel.careLead, downBrake.careLead);
  assert.notEqual(downAccel.lifestyle, downBrake.lifestyle);
  assert.notEqual(downAccel.food, downBrake.food);
});

test("Ekken JSON reconstructs the response contract from a reason trace when top-level fields are absent", () => {
  const forecast = makeForecast("down", "accel");
  delete forecast.personal_main_event_key;
  delete forecast.pressure_direction;
  delete forecast.pressure_response_direction;
  forecast.trigger_factors = forecast.trigger_factors.map(({ response_direction, body_response_key, ...item }) => item);
  forecast.environmental_cautions = null;

  const aiRecord = recordAnalysis.trimRecordForAi({
    date: forecast.target_date,
    forecast,
    review: null,
    care_actions: [],
  });

  assert.equal(aiRecord.forecast.personal_main_event_key, "pressure_shift");
  assert.equal(aiRecord.forecast.pressure_direction, "down");
  assert.equal(aiRecord.forecast.pressure_response_direction, "accel");
  assert.equal(aiRecord.forecast.trigger_factors[0].response_direction, "accel");
  assert.equal(aiRecord.forecast.trigger_factors[0].body_response_key, "pressure_accel");
  assert.equal(aiRecord.forecast.environmental_cautions[0].key, "extreme_heat");
});

test("constitution weather compatibility uses the same pressure-response contract and temperature names", () => {
  for (const source of [constitutionGuideSource, personalKarteSource]) {
    assert.match(source, /yin_yang_score/);
    assert.match(source, /張り・力み・切り替えにくさ/);
    assert.match(source, /重だるさ・動き出しにくさ/);
    assert.match(source, /気温が低い日/);
    assert.match(source, /気温が高い日/);
    assert.doesNotMatch(source, /外圧が緩む日に、体内の膨張感/);
    assert.doesNotMatch(source, /外からの圧力が強まる日は、体がギュッと締まり/);
  }
});
