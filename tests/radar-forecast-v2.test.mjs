import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function importSource(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

const weather = await importSource("../lib/radar_v1/weatherStressV2.js");
const forecast = await importSource("../lib/radar_v1/personalizeForecastV2.js");
const pressureResponse = await importSource("../lib/radar_v1/pressureResponse.js");
const timingLanguage = await importSource("../lib/radar_v1/forecastTimingLanguage.js");
const constitutionCare = await importSource("../lib/diagnosis/v2/carePreferences.js");
const constitutionCareSource = await readFile(new URL("../lib/diagnosis/v2/carePreferences.js", import.meta.url), "utf8");
const careSource = await readFile(new URL("../lib/radar_v1/careRules/dailyCareV2.js", import.meta.url), "utf8");
const workflowSource = await readFile(new URL("../.github/workflows/radar-forecast-snapshots.yml", import.meta.url), "utf8");
const notificationSource = await readFile(new URL("../lib/push/runRadarNotificationCron.js", import.meta.url), "utf8");
const radarPageSource = await readFile(new URL("../app/radar/page.js", import.meta.url), "utf8");
const radarUtilsSource = await readFile(new URL("../app/radar/utils.js", import.meta.url), "utf8");
const homeClientSource = await readFile(new URL("../app/HomeClient.jsx", import.meta.url), "utf8");
const weatherIconSource = await readFile(new URL("../components/illust/icons/weather.jsx", import.meta.url), "utf8");
const resultPageSource = await readFile(new URL("../app/result/[id]/page.js", import.meta.url), "utf8");
const personalKarteSource = await readFile(new URL("../lib/personalKarte.js", import.meta.url), "utf8");
const pointExplanationSource = await readFile(new URL("../lib/radar_v1/explainPointSelection.js", import.meta.url), "utf8");
const lifestyleRulesSource = await readFile(new URL("../lib/radar_v1/careRules/lifestyleRules.js", import.meta.url), "utf8");
const publicForecastSource = await readFile(new URL("../app/api/radar/v1/forecast/public/route.js", import.meta.url), "utf8");
const riskContextSource = await readFile(new URL("../lib/radar_v1/buildRiskContext.js", import.meta.url), "utf8");
const radarPlanSource = await readFile(new URL("../lib/radar_v1/buildRadarPlan.js", import.meta.url), "utf8");
const motherChildSource = await readFile(new URL("../lib/radar_v1/selectMotherChild.js", import.meta.url), "utf8");
const tcmPointSource = await readFile(new URL("../lib/radar_v1/pickTcmPoints.js", import.meta.url), "utf8");
const promptContextSource = await readFile(new URL("../lib/radar_v1/radarPromptContext.js", import.meta.url), "utf8");
const partnerOfferSource = await readFile(new URL("../lib/care-navi/partnerOffers.js", import.meta.url), "utf8");
const todayCareSource = await readFile(new URL("../lib/radar_v1/careRules/todayCarePlan.js", import.meta.url), "utf8");
const gptRadarSource = await readFile(new URL("../lib/radar_v1/gptRadar.js", import.meta.url), "utf8");
const radarRepoSource = await readFile(new URL("../lib/radar_v1/radarRepo.js", import.meta.url), "utf8");
const liveForecastSource = await readFile(new URL("../app/api/radar/v1/forecast/live/route.js", import.meta.url), "utf8");
const recordsAnalysisSource = await readFile(new URL("../lib/records/analysis.js", import.meta.url), "utf8");
const recordsTrendSource = await readFile(new URL("../components/records/RecordsTrendChart.jsx", import.meta.url), "utf8");
const forecastReasoningSource = await readFile(new URL("../lib/records/forecastReasoning.js", import.meta.url), "utf8");

function point(hour, values = {}) {
  return {
    ts: `2026-07-21T${String(hour).padStart(2, "0")}:00:00+09:00`,
    pressure_hpa: 1012,
    temp_c: 24,
    humidity_pct: 60,
    dew_point_c: 15.7,
    ...values,
  };
}

function linearPoints({ start, end, field, from, to, base = {} }) {
  const length = end - start;
  return Array.from({ length: length + 1 }, (_, index) => point(start + index, {
    ...base,
    [field]: from + ((to - from) * index) / length,
  }));
}

function dailyTemperaturePoints({ min, max, dewPoint, pressureFrom = 1012, pressureTo = 1012 }) {
  return Array.from({ length: 24 }, (_, hour) => {
    const daytime = Math.max(0, Math.sin(((hour - 6) / 24) * Math.PI * 2));
    return point(hour, {
      temp_c: min + (max - min) * daytime,
      dew_point_c: dewPoint,
      pressure_hpa: pressureFrom + ((pressureTo - pressureFrom) * hour) / 23,
    });
  });
}

function constitution({
  yinYang = 0.7,
  drive = 0,
  thermo = "neutral",
  sensitivity = 2,
  vectors = ["pressure_shift", "temp_swing"],
  material = {},
} = {}) {
  return {
    core_code: `${yinYang >= 0 ? "accel" : "brake"}_batt_standard`,
    sub_labels: ["qi_stagnation", "fluid_damp"],
    axes: {
      yin_yang_score: yinYang,
      drive_score: drive,
      obstruction_score: 0.45,
      thermo_answer: thermo,
    },
    split_scores: {
      qi: {
        deficiency: material.qi_deficiency ?? 1.2,
        stagnation: material.qi_stagnation ?? 2.4,
      },
      blood: {
        deficiency: material.blood_deficiency ?? 0.8,
        stasis: material.blood_stasis ?? 1.5,
      },
      fluid: {
        deficiency: material.fluid_deficiency ?? 0.7,
        damp: material.fluid_damp ?? 2.1,
      },
    },
    env: { sensitivity, vectors },
  };
}

function balancedWeatherStress() {
  return {
    event_strengths: {
      pressure_shift: 0.72,
      temperature_shift: 0.58,
      cold: 0.62,
      heat: 0.62,
      damp: 0.66,
      dry: 0.66,
    },
    pressure_direction: "mixed",
    pressure_presentation_direction: "down",
    temperature_direction: "mixed",
    channel_peaks: {
      pressure_shift: { start: "06:00", end: "09:00" },
      temp_shift: { start: "12:00", end: "15:00" },
      cold: { start: "06:00", end: "09:00" },
      heat: { start: "12:00", end: "15:00" },
      damp: { start: "09:00", end: "12:00" },
      dry: { start: "15:00", end: "18:00" },
    },
  };
}

test("equal pressure rise and fall produce comparable shake strength", () => {
  const falling = weather.buildWeatherStressV2({
    points: linearPoints({ start: 6, end: 12, field: "pressure_hpa", from: 1016, to: 1008 }),
  });
  const rising = weather.buildWeatherStressV2({
    points: linearPoints({ start: 6, end: 12, field: "pressure_hpa", from: 1008, to: 1016 }),
  });

  assert.equal(falling.pressure_direction, "down");
  assert.equal(rising.pressure_direction, "up");
  assert.ok(Math.abs(falling.pressure_shift_strength - rising.pressure_shift_strength) <= 0.001);
  assert.equal(falling.pressure_up_strength, 0);
  assert.equal(rising.pressure_down_strength, 0);
});

test("pressure reversal is one event rather than down plus up", () => {
  const points = [
    ...linearPoints({ start: 0, end: 6, field: "pressure_hpa", from: 1016, to: 1008 }),
    ...linearPoints({ start: 7, end: 13, field: "pressure_hpa", from: 1009.3, to: 1017 }),
  ];
  const result = weather.buildWeatherStressV2({ points });

  assert.equal(result.pressure_direction, "mixed");
  assert.equal(result.pressure_reversal, true);
  assert.equal(result.event_strengths.pressure_shift, result.pressure_shift_strength);
  assert.ok(result.event_strengths.pressure_shift <= 1);
  assert.equal(
    [result.pressure_down_strength, result.pressure_up_strength].filter((value) => value > 0).length,
    1,
  );
});

test("summer evening cooling toward the comfort band is not a large cold or change stress", () => {
  const cooling = weather.buildWeatherStressV2({
    points: linearPoints({ start: 14, end: 20, field: "temp_c", from: 34, to: 28, base: { dew_point_c: 21 } }),
  });
  const warming = weather.buildWeatherStressV2({
    points: linearPoints({ start: 8, end: 14, field: "temp_c", from: 28, to: 34, base: { dew_point_c: 21 } }),
  });

  assert.equal(cooling.cold_strength, 0);
  assert.ok(cooling.temperature_shift_strength <= 0.25);
  assert.ok(cooling.meta.temperature.comfort_relief_strength > cooling.meta.temperature.comfort_departure_strength);
  assert.ok(warming.temperature_shift_strength > cooling.temperature_shift_strength * 2);
  assert.ok(cooling.heat_strength > 0);
});

test("ordinary smooth daytime warming and cooling stays below care mode", () => {
  const points = Array.from({ length: 13 }, (_, index) => point(index + 6, {
    pressure_hpa: 1012 + Math.sin(index / 4),
    temp_c: 20 + Math.sin((index / 12) * Math.PI) * 5,
    dew_point_c: 13,
  }));
  const stress = weather.buildWeatherStressV2({ points });
  const personalized = forecast.personalizeForecastV2({
    weatherStress: stress,
    constitution: constitution({ yinYang: 0.4, drive: 0 }),
  });

  assert.ok(stress.temperature_shift_strength < 0.65);
  assert.equal(personalized.signal, 0);
});

test("relative humidity drop caused by warming is not strong dryness", () => {
  const points = [
    point(8, { temp_c: 20, humidity_pct: 88, dew_point_c: 18 }),
    point(14, { temp_c: 30, humidity_pct: 49, dew_point_c: 18 }),
  ];
  const result = weather.buildWeatherStressV2({ points });

  assert.ok(result.dry_strength < 0.2);
  assert.equal(result.meta.moisture.relative_humidity_used_as_secondary, true);
});

test("humidity load is coupled with temperature while water-content change stays separate", () => {
  const mildHumid = weather.buildWeatherStressV2({
    points: Array.from({ length: 12 }, (_, hour) => point(hour + 6, {
      temp_c: 20,
      dew_point_c: 18,
      humidity_pct: 88,
    })),
  });
  const hotHumid = weather.buildWeatherStressV2({
    points: Array.from({ length: 12 }, (_, hour) => point(hour + 6, {
      temp_c: 35,
      dew_point_c: 24,
      humidity_pct: 60,
    })),
  });

  assert.ok(hotHumid.damp_strength > mildHumid.damp_strength + 0.5);
  assert.ok(mildHumid.moisture_shift_strength < 0.1);
  assert.ok(hotHumid.moisture_shift_strength < 0.1);
});

test("directional channel peaks identify the actionable side of mixed changes", () => {
  const personalized = forecast.personalizeForecastV2({
    weatherStress: {
      event_strengths: {
        pressure_shift: 0.82,
        temperature_shift: 0.86,
        cold: 0.08,
        heat: 0.1,
        damp: 0.12,
        dry: 0.1,
      },
      pressure_direction: "mixed",
      pressure_presentation_direction: "down",
      temperature_direction: "mixed",
      moisture_shift_strength: 0.1,
      moisture_direction: "steady",
      channel_peaks: {
        pressure_shift: { start: "09:00", end: "12:00", strength: 0.82 },
        pressure_down: { start: "06:00", end: "09:00", strength: 0.58 },
        pressure_up: { start: "15:00", end: "18:00", strength: 0.91 },
        temp_shift: { start: "12:00", end: "15:00", strength: 0.86 },
        temp_down: { start: "18:00", end: "21:00", strength: 0.88 },
        temp_up: { start: "10:00", end: "13:00", strength: 0.52 },
        damp: { start: "12:00", end: "15:00", strength: 0.12 },
        dry: { start: "06:00", end: "09:00", strength: 0.1 },
      },
      meta: {
        temperature: { dominant_direction: "down" },
        moisture: { dominant_direction: "up" },
      },
    },
    constitution: constitution(),
  });

  const groups = personalized.meta.weather_load_groups;
  assert.equal(groups.pressure.direction, "mixed");
  assert.equal(groups.pressure.attention_direction, "up");
  assert.equal(groups.pressure.peak_start, "15:00");
  assert.equal(groups.temperature.exact, "temp_shift");
  assert.equal(groups.temperature.direction, "mixed");
  assert.equal(groups.temperature.attention_direction, "down");
  assert.equal(groups.temperature.peak_start, "18:00");
});

test("moisture change is folded into damp or dry instead of creating a third UI state", () => {
  const personalized = forecast.personalizeForecastV2({
    weatherStress: {
      event_strengths: {
        pressure_shift: 0.1,
        temperature_shift: 0.1,
        cold: 0.05,
        heat: 0.05,
        damp: 0.08,
        dry: 0.12,
      },
      pressure_direction: "steady",
      pressure_presentation_direction: "down",
      temperature_direction: "steady",
      moisture_shift_strength: 0.84,
      moisture_direction: "down",
      channel_peaks: {
        pressure_down: { start: "09:00", end: "12:00", strength: 0.1 },
        temp_shift: { start: "09:00", end: "12:00", strength: 0.1 },
        moisture_shift: { start: "15:00", end: "18:00", strength: 0.84 },
        moisture_down: { start: "15:00", end: "18:00", strength: 0.8 },
        moisture_up: { start: "06:00", end: "09:00", strength: 0.12 },
        damp: { start: "09:00", end: "12:00", strength: 0.08 },
        dry: { start: "15:00", end: "18:00", strength: 0.12 },
      },
      meta: {
        temperature: { dominant_direction: "up" },
        moisture: { dominant_direction: "down" },
      },
    },
    constitution: constitution({ vectors: ["dryness_up"] }),
  });

  const moisture = personalized.meta.weather_load_groups.moisture;
  assert.equal(moisture.event_key, "moisture_shift");
  assert.equal(moisture.exact, "dry");
  assert.equal(moisture.load_source, "change");
  assert.equal(moisture.attention_direction, "down");
  assert.equal(moisture.peak_start, "15:00");
  assert.ok(moisture.effective_load > personalized.meta.event_effective_loads.dry);
});

test("moisture relief toward the comfort band does not masquerade as the opposite environment", () => {
  const personalized = forecast.personalizeForecastV2({
    weatherStress: {
      event_strengths: {
        pressure_shift: 0.05,
        temperature_shift: 0.05,
        cold: 0,
        heat: 0,
        damp: 0.04,
        dry: 0,
      },
      pressure_direction: "steady",
      pressure_presentation_direction: "down",
      temperature_direction: "steady",
      moisture_shift_strength: 0.18,
      moisture_direction: "down",
      channel_peaks: {
        pressure_down: { start: "09:00", end: "12:00", strength: 0.05 },
        temp_shift: { start: "09:00", end: "12:00", strength: 0.05 },
        moisture_shift: { start: "12:00", end: "15:00", strength: 0.18 },
        moisture_down: { start: "12:00", end: "15:00", strength: 0.82 },
        damp: { start: "09:00", end: "12:00", strength: 0.04 },
        dry: { start: "12:00", end: "15:00", strength: 0 },
      },
      meta: {
        temperature: { dominant_direction: "up" },
        moisture: {
          direction: "down",
          dominant_direction: "down",
          raw_shift_strength: 0.82,
          comfort_departure_strength: 0,
          comfort_relief_strength: 0.82,
        },
      },
    },
    constitution: constitution({ vectors: ["humidity_up"] }),
  });

  const moisture = personalized.meta.weather_load_groups.moisture;
  assert.equal(moisture.event_key, "moisture_shift");
  assert.equal(moisture.exact, "damp");
  assert.equal(moisture.attention_direction, "down");
});

test("steady summer burden does not force every profile or the public demo into guard mode", () => {
  const stress = weather.buildWeatherStressV2({
    points: dailyTemperaturePoints({ min: 28, max: 35, dewPoint: 24 }),
  });
  const sharedMaterial = {
    qi_deficiency: 3,
    qi_stagnation: 3,
    blood_deficiency: 2,
    blood_stasis: 2,
    fluid_deficiency: 2,
    fluid_damp: 4,
  };
  const sensitive = forecast.personalizeForecastV2({
    weatherStress: stress,
    constitution: constitution({
      yinYang: -0.8,
      drive: -0.8,
      sensitivity: 3,
      vectors: ["humidity_up"],
      material: sharedMaterial,
    }),
  });
  const resilient = forecast.personalizeForecastV2({
    weatherStress: stress,
    constitution: constitution({
      yinYang: -0.8,
      drive: 0.8,
      sensitivity: 1,
      vectors: [],
      material: sharedMaterial,
    }),
  });
  const publicForecast = forecast.personalizePublicForecastV2({ weatherStress: stress });

  assert.ok(publicForecast.score_precise_0_10 < 7);
  assert.ok(sensitive.score_precise_0_10 < 7);
  assert.ok(sensitive.score_precise_0_10 - resilient.score_precise_0_10 >= 0.5);
  assert.equal(publicForecast.meta.forecast_model.personalized, false);
});

test("the six continuous core combinations do not collapse to one summer score", () => {
  const stress = weather.buildWeatherStressV2({
    points: dailyTemperaturePoints({ min: 28, max: 35, dewPoint: 24 }),
  });
  const sharedMaterial = {
    qi_deficiency: 3,
    qi_stagnation: 3,
    blood_deficiency: 2,
    blood_stasis: 2,
    fluid_deficiency: 2,
    fluid_damp: 4,
  };
  const scores = [];
  for (const yinYang of [-0.8, 0.8]) {
    for (const drive of [-0.8, 0, 0.8]) {
      const result = forecast.personalizeForecastV2({
        weatherStress: stress,
        constitution: constitution({
          yinYang,
          drive,
          thermo: yinYang < 0 ? "cold" : "heat",
          sensitivity: 2,
          vectors: yinYang < 0 ? ["humidity_up"] : ["temp_swing"],
          material: sharedMaterial,
        }),
      });
      scores.push(result.score_precise_0_10);
    }
  }

  assert.ok(Math.max(...scores) - Math.min(...scores) >= 1);
  assert.ok(new Set(scores).size >= 3);
  assert.ok(scores[0] - scores[2] >= 0.5);
});

test("truly extreme steady heat keeps a guard floor without needing a weather change", () => {
  const stress = weather.buildWeatherStressV2({
    points: dailyTemperaturePoints({ min: 40, max: 40, dewPoint: 25 }),
  });
  const publicForecast = forecast.personalizePublicForecastV2({ weatherStress: stress });

  assert.equal(stress.temperature_shift_strength, 0);
  assert.ok(stress.heat_strength >= 0.98);
  assert.ok(publicForecast.score_precise_0_10 >= 7);
  assert.ok(publicForecast.meta.score_trace.score_components.universal_extreme_floor >= 6.5);
});

test("steady but non-extreme winter weather does not become a permanent guard alert", () => {
  const stress = weather.buildWeatherStressV2({
    points: dailyTemperaturePoints({ min: 5, max: 5, dewPoint: -3 }),
  });
  const publicForecast = forecast.personalizePublicForecastV2({ weatherStress: stress });

  assert.equal(stress.temperature_shift_strength, 0);
  assert.ok(publicForecast.score_precise_0_10 < 7);
});

test("accel and brake constitutions both respond to both pressure directions", () => {
  const down = weather.buildWeatherStressV2({
    points: linearPoints({ start: 6, end: 12, field: "pressure_hpa", from: 1016, to: 1008 }),
  });
  const up = weather.buildWeatherStressV2({
    points: linearPoints({ start: 6, end: 12, field: "pressure_hpa", from: 1008, to: 1016 }),
  });

  for (const yinYang of [0.8, -0.8]) {
    const downForecast = forecast.personalizeForecastV2({ weatherStress: down, constitution: constitution({ yinYang }) });
    const upForecast = forecast.personalizeForecastV2({ weatherStress: up, constitution: constitution({ yinYang }) });
    assert.ok(downForecast.meta.effective_weather_groups.pressure.effective_load > 0.5);
    assert.ok(upForecast.meta.effective_weather_groups.pressure.effective_load > 0.5);
  }
});

test("pressure physical direction and body response remain independent in all four combinations", () => {
  const weatherByDirection = {
    down: weather.buildWeatherStressV2({
      points: linearPoints({ start: 6, end: 12, field: "pressure_hpa", from: 1017, to: 1007 }),
    }),
    up: weather.buildWeatherStressV2({
      points: linearPoints({ start: 6, end: 12, field: "pressure_hpa", from: 1007, to: 1017 }),
    }),
  };

  for (const [direction, stress] of Object.entries(weatherByDirection)) {
    for (const [response, yinYang] of [["accel", 0.9], ["brake", -0.9]]) {
      const result = forecast.personalizeForecastV2({
        weatherStress: stress,
        constitution: constitution({ yinYang, sensitivity: 3, vectors: ["pressure_shift"] }),
      });
      const factor = result.trigger_factors[0];
      assert.equal(result.personal_main_trigger_exact, `pressure_${direction}`);
      assert.equal(result.pressure_direction, direction);
      assert.equal(result.pressure_response_direction, response);
      assert.equal(factor.physical_direction, direction);
      assert.equal(factor.response_direction, response);
      assert.equal(factor.body_response_key, `pressure_${response}`);
    }
  }
});

test("pressure compatibility projection follows response and neutralizes false direction prose", () => {
  assert.equal(pressureResponse.getLegacyCareTriggerKey("pressure_down", "accel"), "pressure_up");
  assert.equal(pressureResponse.getLegacyCareTriggerKey("pressure_up", "brake"), "pressure_down");
  assert.equal(
    pressureResponse.rewritePressureBodyCopy("気圧上昇の日は肩に力が入りやすい", "accel"),
    "気圧変化の日は肩に力が入りやすい",
  );
  assert.equal(
    pressureResponse.rewritePressureBodyCopy("低気圧の日は体が重くなりやすい", "brake"),
    "気圧変化の日は体が重くなりやすい",
  );
});

test("absolute temperature cautions are separate from the constitution score", () => {
  const hot = weather.buildWeatherStressV2({
    points: dailyTemperaturePoints({ min: 28, max: 35, dewPoint: 22 }),
  });
  const critical = weather.buildWeatherStressV2({
    points: dailyTemperaturePoints({ min: 30, max: 40, dewPoint: 22 }),
  });
  const ordinary = weather.buildWeatherStressV2({
    points: dailyTemperaturePoints({ min: 27, max: 34, dewPoint: 22 }),
  });
  const cold = weather.buildWeatherStressV2({
    points: dailyTemperaturePoints({ min: -6, max: -1, dewPoint: -8 }),
  });

  assert.equal(hot.environmental_cautions[0]?.key, "extreme_heat_35");
  assert.equal(critical.environmental_cautions[0]?.key, "extreme_heat_40");
  assert.equal(ordinary.environmental_cautions.length, 0);
  assert.equal(cold.environmental_cautions[0]?.key, "extreme_cold");
  assert.equal(hot.environmental_cautions[0]?.official_alert, false);
  assert.equal(hot.meta.extreme_environment.independent_from_yuragi_score, true);
});

test("the user's cold or heat answer affects the matching absolute-temperature event", () => {
  const winter = weather.buildWeatherStressV2({
    points: linearPoints({ start: 6, end: 12, field: "temp_c", from: 4, to: 8, base: { dew_point_c: 1 } }),
  });
  const summer = weather.buildWeatherStressV2({
    points: linearPoints({ start: 10, end: 16, field: "temp_c", from: 29, to: 35, base: { dew_point_c: 21 } }),
  });
  const coldAnswer = forecast.personalizeForecastV2({
    weatherStress: winter,
    constitution: constitution({ thermo: "cold" }),
  });
  const neutralWinter = forecast.personalizeForecastV2({
    weatherStress: winter,
    constitution: constitution({ thermo: "neutral" }),
  });
  const heatAnswer = forecast.personalizeForecastV2({
    weatherStress: summer,
    constitution: constitution({ thermo: "heat" }),
  });
  const neutralSummer = forecast.personalizeForecastV2({
    weatherStress: summer,
    constitution: constitution({ thermo: "neutral" }),
  });

  assert.ok(coldAnswer.meta.exact_affinity_weights.cold > neutralWinter.meta.exact_affinity_weights.cold);
  assert.ok(heatAnswer.meta.exact_affinity_weights.heat > neutralSummer.meta.exact_affinity_weights.heat);
});

test("direct weather answers outrank the summarized accelerator or brake prior", () => {
  const stress = balancedWeatherStress();
  const coldAccel = forecast.personalizeForecastV2({
    weatherStress: stress,
    constitution: constitution({ yinYang: 0.9, thermo: "cold", vectors: [] }),
  });
  const neutralAccel = forecast.personalizeForecastV2({
    weatherStress: stress,
    constitution: constitution({ yinYang: 0.9, thermo: "neutral", vectors: [] }),
  });
  const dryBrake = forecast.personalizeForecastV2({
    weatherStress: stress,
    constitution: constitution({ yinYang: -0.9, vectors: ["dryness_up"] }),
  });
  const neutralBrake = forecast.personalizeForecastV2({
    weatherStress: stress,
    constitution: constitution({ yinYang: -0.9, vectors: [] }),
  });

  assert.ok(coldAccel.meta.exact_affinity_weights.cold > neutralAccel.meta.exact_affinity_weights.cold);
  assert.ok(dryBrake.meta.exact_affinity_weights.dry > neutralBrake.meta.exact_affinity_weights.dry);
});

test("all six scores create cross-type heat, cold, damp and dry affinities", () => {
  const stress = balancedWeatherStress();
  const dryBrake = forecast.personalizeForecastV2({
    weatherStress: stress,
    constitution: constitution({
      yinYang: -0.7,
      sensitivity: 1,
      vectors: [],
      material: {
        qi_deficiency: 0.2,
        qi_stagnation: 0.2,
        blood_deficiency: 3.5,
        blood_stasis: 0.2,
        fluid_deficiency: 5,
        fluid_damp: 0.1,
      },
    }),
  });
  const dampAccel = forecast.personalizeForecastV2({
    weatherStress: stress,
    constitution: constitution({
      yinYang: 0.7,
      sensitivity: 1,
      vectors: [],
      material: {
        qi_deficiency: 2.5,
        qi_stagnation: 5,
        blood_deficiency: 0.2,
        blood_stasis: 0.2,
        fluid_deficiency: 0.1,
        fluid_damp: 4,
      },
    }),
  });

  assert.ok(dryBrake.meta.exact_affinity_weights.dry > dryBrake.meta.exact_affinity_weights.damp);
  assert.ok(dampAccel.meta.exact_affinity_weights.damp > dampAccel.meta.exact_affinity_weights.dry);
  assert.ok(dryBrake.meta.affinity_trace.channels.dry.material_fluid_deficiency > 0);
  assert.ok(dampAccel.meta.affinity_trace.channels.damp.material_fluid_damp > 0);
});

test("reaction axis keeps modest heat-dry and cold-damp priors", () => {
  const stress = balancedWeatherStress();
  const sharedMaterial = {
    qi_deficiency: 1,
    qi_stagnation: 1,
    blood_deficiency: 1,
    blood_stasis: 1,
    fluid_deficiency: 1,
    fluid_damp: 1,
  };
  const accel = forecast.personalizeForecastV2({
    weatherStress: stress,
    constitution: constitution({ yinYang: 0.9, sensitivity: 1, vectors: [], material: sharedMaterial }),
  });
  const brake = forecast.personalizeForecastV2({
    weatherStress: stress,
    constitution: constitution({ yinYang: -0.9, sensitivity: 1, vectors: [], material: sharedMaterial }),
  });

  assert.ok(accel.meta.exact_affinity_weights.heat > brake.meta.exact_affinity_weights.heat);
  assert.ok(accel.meta.exact_affinity_weights.dry > brake.meta.exact_affinity_weights.dry);
  assert.ok(brake.meta.exact_affinity_weights.cold > accel.meta.exact_affinity_weights.cold);
  assert.ok(brake.meta.exact_affinity_weights.damp > accel.meta.exact_affinity_weights.damp);
});

test("all six material scores are retained while the score uses three weather groups", () => {
  const stress = weather.buildWeatherStressV2({
    points: linearPoints({
      start: 6,
      end: 12,
      field: "pressure_hpa",
      from: 1017,
      to: 1008,
      base: { temp_c: 32, dew_point_c: 22, humidity_pct: 60 },
    }),
  });
  const result = forecast.personalizeForecastV2({ weatherStress: stress, constitution: constitution() });

  assert.equal(Object.keys(result.meta.manifestation.material_scores).length, 6);
  assert.equal(result.meta.manifestation.material_ranking.length, 6);
  assert.deepEqual(
    result.meta.score_trace.weather_group_contributions.map((item) => item.group).sort(),
    ["moisture", "pressure", "temperature"],
  );
});

test("reserve changes vulnerability modestly without overriding weather", () => {
  const stress = weather.buildWeatherStressV2({
    points: linearPoints({ start: 6, end: 12, field: "pressure_hpa", from: 1016, to: 1009 }),
  });
  const lowReserve = forecast.personalizeForecastV2({
    weatherStress: stress,
    constitution: constitution({ drive: -1 }),
  });
  const highReserve = forecast.personalizeForecastV2({
    weatherStress: stress,
    constitution: constitution({ drive: 1 }),
  });

  assert.ok(lowReserve.score_precise_0_10 > highReserve.score_precise_0_10);
  assert.equal(lowReserve.meta.reserve_scalar, 1.1);
  assert.equal(highReserve.meta.reserve_scalar, 0.9);
  assert.ok(lowReserve.meta.weather_load_groups.pressure.personal_load > highReserve.meta.weather_load_groups.pressure.personal_load);
});

test("signal thresholds use the precise score", () => {
  assert.equal(forecast.forecastSignalFromScoreV2(3.9), 0);
  assert.equal(forecast.forecastSignalFromScoreV2(4), 1);
  assert.equal(forecast.forecastSignalFromScoreV2(6.9), 1);
  assert.equal(forecast.forecastSignalFromScoreV2(7), 2);
});

test("care policy copy is plain and fluid_damp is supported", () => {
  assert.match(careSource, /重だるさをためず、疲れを増やさないように整えます。/);
  assert.match(careSource, /熱や高ぶりを落ち着け、力みやこわばりをやわらげるように整えます。/);
  assert.match(careSource, /fluid_damp:\s*\{ nagasu:/);
  assert.doesNotMatch(careSource.slice(0, 6000), /出口へ運ぶ|冷えの入口|回復力を削らない/);
});

test("today remains morning-fixed and only tomorrow refreshes in the evening", () => {
  assert.match(workflowSource, /cron: "5 16 \* \* \*"/);
  assert.match(workflowSource, /cron: "30 7 \* \* \*"/);
  assert.match(workflowSource, /DATES="tomorrow"/);
  assert.match(workflowSource, /SLOT="evening_tomorrow"/);
  assert.match(notificationSource, /kind === "night"/);
  assert.match(notificationSource, /generationSlot: "notification_fallback"/);
});

test("forecast UI keeps three weather stresses simple and shows at most one meaningful peak", () => {
  assert.match(radarPageSource, />天気ストレス<\/div>/);
  assert.match(radarPageSource, /grid grid-cols-3 gap-2/);
  assert.match(radarPageSource, /高・中・低の目安/);
  assert.match(radarPageSource, /WEATHER_LOAD_SHORT_LABELS/);
  assert.match(radarPageSource, /compactPeakLabel/);
  assert.match(radarPageSource, /IconAttention/);
  assert.doesNotMatch(radarPageSource, />負荷<\/span>/);
  assert.match(radarPageSource, /天気ストレスのピーク/);
  assert.match(radarPageSource, /factor\.load >= 0\.34/);
  assert.match(radarPageSource, /weatherLoadPeak\.detailLabel/);
  assert.match(radarUtilsSource, /temperature: "気温ストレス"/);
  assert.match(radarUtilsSource, /moisture: "湿度ストレス"/);
  assert.match(radarUtilsSource, /pressure: "気圧ストレス"/);
  assert.match(radarUtilsSource, /load >= 0\.67 \? "高" : load >= 0\.34 \? "中" : "低"/);
  assert.match(radarPageSource, /factor\.loadLevelLabel/);
  assert.match(radarPageSource, /<IconBolt className="h-3\.5 w-3\.5 shrink-0 text-\[#D79A2B\]" \/>/);
  assert.doesNotMatch(radarPageSource, /WeatherPeakDirectionIcon/);
  assert.doesNotMatch(radarPageSource, /weatherLoadPeak\.attentionDirection/);
  assert.doesNotMatch(radarPageSource, /天気負荷と注意時間/);
  assert.doesNotMatch(radarPageSource, /peakPrepItems/);
  assert.doesNotMatch(radarPageSource, /注意時間の前に/);
  assert.doesNotMatch(radarPageSource, /factor\.loadPercent/);
  assert.doesNotMatch(radarPageSource, /天気ストレスと注意時間/);
});

test("absolute temperature cautions sit below weather stresses and stay collapsed by default", () => {
  const weatherLoadPosition = radarPageSource.indexOf("天気ストレス");
  const cautionPosition = radarPageSource.indexOf("environmentalCautions.map");
  assert.ok(weatherLoadPosition >= 0);
  assert.ok(cautionPosition > weatherLoadPosition);
  assert.match(radarPageSource, /<details[\s\S]*?caution\.key/);
  assert.match(radarPageSource, /<summary[\s\S]*?\{caution\.label\}/);
  assert.doesNotMatch(radarPageSource, /<details[^>]*\sopen(?:=|>)/);
});

test("weather peak language never treats the peak as symptom onset", () => {
  assert.equal(
    timingLanguage.normalizeForecastTimingLanguage(
      "崩れやすい時間帯は21:00〜00:00。注意時間の前に休む。"
    ),
    "天気ストレスが強まる時間帯は21:00〜00:00。天気ストレスのピーク前に休む。"
  );
  assert.equal(
    timingLanguage.normalizeForecastTimingLanguage(
      "天気負荷が強まる時間帯は21:00〜00:00。天気負荷のピーク前に休む。"
    ),
    "天気ストレスが強まる時間帯は21:00〜00:00。天気ストレスのピーク前に休む。"
  );
  assert.match(gptRadarSource, /天気ストレスのピークであり、症状が出る時刻ではありません/);
  assert.match(radarRepoSource, /天気ストレスが強まる時間帯/);
  assert.match(liveForecastSource, /症状が出る時刻を示すものではありません/);
  assert.match(recordsAnalysisSource, /label: "天気ストレスのピーク前"/);
  assert.match(recordsTrendSource, /先＝天気ストレスのピーク前/);
  assert.match(forecastReasoningSource, /症状の発生時刻や悪化時刻ではない/);
});

test("weather peak pill is readable and marks cross-midnight windows explicitly", () => {
  assert.match(radarPageSource, /endHour < startHour/);
  assert.match(radarPageSource, /`\$\{startWithUnit\}–翌\$\{endWithUnit\}`/);
  assert.match(radarPageSource, /rounded-full[\s\S]*?text-\[12px\][\s\S]*?天気ストレスのピーク/);
});

test("weather icons separate temperature state direction and mixed changes", () => {
  assert.match(weatherIconSource, /export function IconWeatherHighTemperature/);
  assert.match(weatherIconSource, /export function IconWeatherTemperatureDown/);
  assert.match(weatherIconSource, /export function IconWeatherTemperatureSwing/);
  assert.match(weatherIconSource, /export function IconWeatherPressureMixed/);
  assert.match(weatherIconSource, /key === "heat".*return "high_temperature"/s);
  assert.match(weatherIconSource, /key === "cold".*return "low_temperature"/s);
  assert.match(weatherIconSource, /physicalDirection === "up".*return "temperature_up"/s);
  assert.match(weatherIconSource, /physicalDirection === "down".*return "temperature_down"/s);
  assert.match(weatherIconSource, /return "temperature_swing"/);
  assert.match(weatherIconSource, /physicalDirection === "mixed".*return "pressure_mixed"/s);
  assert.match(radarUtilsSource, /return "temp_shift"/);
  assert.doesNotMatch(radarUtilsSource, /return direction === "down" \? "cold" : "heat"/);
  assert.match(radarPageSource, /direction=\{factor\.direction\}/);
  assert.match(homeClientSource, /direction=\{factor\.direction\}/);
  assert.match(homeClientSource, /return "気圧変動"/);
  assert.doesNotMatch(homeClientSource, /気温差/);
});

test("constitution guide shares V2 affinities and treats pressure as one slot", () => {
  const profile = forecast.buildConstitutionWeatherAffinityV2({
    constitution: constitution({
      yinYang: -0.7,
      vectors: ["temp_swing"],
      material: { fluid_deficiency: 4, fluid_damp: 0.2 },
    }),
  });
  const ranked = forecast.rankConstitutionWeatherAffinityV2(profile.weights);

  assert.equal(ranked.filter((item) => item.key.startsWith("pressure_")).length, 1);
  assert.ok(ranked.some((item) => item.key === "temp_shift"));
  assert.ok(profile.trace.dry.material_fluid_deficiency > 0);
  assert.match(resultPageSource, /buildConstitutionWeatherAffinityV2/);
  assert.match(personalKarteSource, /buildConstitutionWeatherAffinityV2/);
  assert.match(personalKarteSource, /temp_swing: \{ label: "寒暖差", exact: \["temp_shift"\] \}/);
  assert.doesNotMatch(resultPageSource, /buildPersonalWeatherAffinityProfile/);
  assert.doesNotMatch(personalKarteSource, /buildPersonalWeatherAffinityProfile/);
});

test("forecast and constitution copy reflect the V2 hierarchy without removing useful metaphors", () => {
  assert.equal((radarPageSource.match(/対策ケア/g) || []).length, 1);
  assert.match(resultPageSource, /寒さ・暑さへの感じ方、天気への感じやすさ、気・血・水の6つの傾向/);
  assert.doesNotMatch(resultPageSource, /天候の影響がストレートに現れやすくなります/);
  assert.match(radarUtilsSource, /胃腸が水を含んだスポンジみたいに重く感じやすい日/);
  assert.doesNotMatch(radarUtilsSource, /湿気の重い膜|胃腸を止めっぱなし/);
  assert.doesNotMatch(pointExplanationSource, /湿気の重い膜/);
  assert.doesNotMatch(lifestyleRulesSource, /胃腸を止めっぱなし/);
});

test("constitution care tab states the seven care goals in plain current language", () => {
  const preferences = constitutionCare.buildBaseCarePreferences({
    answers: { env_vectors: ["humidity_up"], symptom_focus: "digestion" },
    computed: {
      core_code: "brake_batt_small",
      sub_labels: ["fluid_damp", "qi_deficiency"],
      symptom_focus: "digestion",
    },
  });

  assert.deepEqual(preferences.items.map((item) => item.key), ["sasaeru", "nagasu", "nukumeru"]);
  assert.deepEqual(preferences.items.map((item) => item.rankLabel), ["基本にしたい", "次に意識したい", "補助として取り入れたい"]);
  assert.equal(preferences.summary, "重だるさをためず、疲れを増やさない整え方が合いやすいです。");
  assert.equal(constitutionCare.getCarePolicyDefinition("meguraseru").guide, "滞りをほどき、巡りを保つ");
  assert.equal(constitutionCare.getCarePolicyDefinition("sasaeru").guide, "胃腸をいたわり、疲れを増やさない");
  assert.match(resultPageSource, /この整え方が合いやすい理由/);
  assert.match(resultPageSource, /パーソナルケアショップの商品選び、Ekkenへの相談/);
  assert.doesNotMatch(constitutionCareSource, /巡りの逃げ道|回復しやすい余白|まず合いやすい/);
  assert.doesNotMatch(resultPageSource, /今後の整うアイテム検索|見立ての補足/);
});

test("three weather loads persist for signed-in and public forecasts", () => {
  assert.match(riskContextSource, /weather_load_groups: personalized\?\.meta\?\.weather_load_groups/);
  assert.match(radarPlanSource, /weather_load_groups: riskContext\.summary\.weather_load_groups/);
  assert.match(publicForecastSource, /weather_load_groups: weatherLoadGroups/);
  assert.match(publicForecastSource, /personalizePublicForecastV2/);
  assert.doesNotMatch(publicForecastSource, /calcUniversalSignal|buildUniversalChannelRanking/);
});

test("pressure response reaches prose care points prompts and product selection", () => {
  assert.match(radarUtilsSource, /first\?\.careKey \|\| getLegacyCareTriggerKey/);
  assert.match(radarUtilsSource, /rewriteBodyCopyForPressure/);
  assert.match(careSource, /getLegacyCareTriggerKey\(physicalTrigger, responseSource\)/);
  assert.match(careSource, /rewritePressureBodyCopyDeep\(enhancedPlan, responseSource\)/);
  assert.match(motherChildSource, /pressure_accel_release/);
  assert.match(motherChildSource, /pressure_brake_support/);
  assert.match(tcmPointSource, /ACTION_BONUS_BY_TRIGGER\[bodyTrigger\]/);
  assert.match(tcmPointSource, /care_body_trigger/);
  assert.match(pointExplanationSource, /getBodyExact/);
  assert.match(pointExplanationSource, /readPressureResponseDirection\(riskContext \|\| point\)/);
  assert.match(promptContextSource, /must_separate_pressure_direction_and_response/);
  assert.match(partnerOfferSource, /factor\?\.careKey \|\| factor\?\.key/);
  assert.match(todayCareSource, /getLegacyCareTriggerKey\(triggerKey, riskContext \|\| forecast\)/);
  assert.match(todayCareSource, /triggerKey: careTriggerKey/);
});

test("temperature wording separates change absolute load and safety caution", () => {
  assert.match(radarUtilsSource, /if \(exact === "cold"\) return "低温"/);
  assert.match(radarUtilsSource, /if \(exact === "heat"\) return "高温"/);
  assert.match(radarUtilsSource, /if \(direction === "down"\) return "気温低下"/);
  assert.match(radarUtilsSource, /return "寒暖差"/);
  assert.doesNotMatch(radarUtilsSource, /気温差/);
  assert.match(radarPageSource, /体質別予報とは別の気温注意/);
  assert.match(radarPageSource, /公的な警戒アラートではありません/);
});
