import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function importSource(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

const weather = await importSource("../lib/radar_v1/weatherStressV2.js");
const forecast = await importSource("../lib/radar_v1/personalizeForecastV2.js");
const careSource = await readFile(new URL("../lib/radar_v1/careRules/dailyCareV2.js", import.meta.url), "utf8");
const workflowSource = await readFile(new URL("../.github/workflows/radar-forecast-snapshots.yml", import.meta.url), "utf8");
const notificationSource = await readFile(new URL("../lib/push/runRadarNotificationCron.js", import.meta.url), "utf8");
const radarPageSource = await readFile(new URL("../app/radar/page.js", import.meta.url), "utf8");
const radarUtilsSource = await readFile(new URL("../app/radar/utils.js", import.meta.url), "utf8");
const resultPageSource = await readFile(new URL("../app/result/[id]/page.js", import.meta.url), "utf8");
const personalKarteSource = await readFile(new URL("../lib/personalKarte.js", import.meta.url), "utf8");
const pointExplanationSource = await readFile(new URL("../lib/radar_v1/explainPointSelection.js", import.meta.url), "utf8");
const lifestyleRulesSource = await readFile(new URL("../lib/radar_v1/careRules/lifestyleRules.js", import.meta.url), "utf8");
const publicForecastSource = await readFile(new URL("../app/api/radar/v1/forecast/public/route.js", import.meta.url), "utf8");
const riskContextSource = await readFile(new URL("../lib/radar_v1/buildRiskContext.js", import.meta.url), "utf8");
const radarPlanSource = await readFile(new URL("../lib/radar_v1/buildRadarPlan.js", import.meta.url), "utf8");

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

test("summer evening cooling is temperature change, not cold exposure", () => {
  const result = weather.buildWeatherStressV2({
    points: linearPoints({ start: 14, end: 20, field: "temp_c", from: 34, to: 28, base: { dew_point_c: 21 } }),
  });

  assert.equal(result.cold_strength, 0);
  assert.ok(result.temperature_shift_strength > 0.3);
  assert.ok(result.heat_strength > 0);
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

test("forecast UI shows temperature moisture and pressure loads in three columns", () => {
  assert.match(radarPageSource, /天気負荷と注意時間/);
  assert.match(radarPageSource, /grid grid-cols-3 gap-2/);
  assert.match(radarPageSource, /高・中・低の目安/);
  assert.match(radarPageSource, /WEATHER_LOAD_SHORT_LABELS/);
  assert.match(radarPageSource, /compactPeakLabel/);
  assert.match(radarPageSource, /IconAttention/);
  assert.match(radarPageSource, />負荷<\/span>/);
  assert.match(radarUtilsSource, /temperature: "気温負荷"/);
  assert.match(radarUtilsSource, /moisture: "湿度負荷"/);
  assert.match(radarUtilsSource, /pressure: "気圧負荷"/);
  assert.match(radarUtilsSource, /load >= 0\.67 \? "高" : load >= 0\.34 \? "中" : "低"/);
  assert.match(radarPageSource, /factor\.loadLevelLabel/);
  assert.doesNotMatch(radarPageSource, /factor\.loadPercent/);
  assert.doesNotMatch(radarPageSource, /天気ストレスと注意時間/);
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

test("three weather loads persist for signed-in and public forecasts", () => {
  assert.match(riskContextSource, /weather_load_groups: personalized\?\.meta\?\.weather_load_groups/);
  assert.match(radarPlanSource, /weather_load_groups: riskContext\.summary\.weather_load_groups/);
  assert.match(publicForecastSource, /weather_load_groups: weatherLoadGroups/);
  assert.match(publicForecastSource, /buildUniversalWeatherLoadGroups/);
});
