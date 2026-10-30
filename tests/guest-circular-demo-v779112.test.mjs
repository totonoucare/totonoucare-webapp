import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createScenarioRunner } from "./helpers/forecast-scenarios.mjs";

const source = path => readFile(new URL("../" + path, import.meta.url), "utf8");
const home = await source("app/HomeClient.jsx");
const demo = await source("components/forecast/GuestForecastDemo.jsx");
const gauge = await source("app/radar/ForecastGauge.jsx");
const { load } = await createScenarioRunner();
const { getForecastWeatherLoadGroups } = await load("app/radar/utils.js");

test("guest demo reuses the real forecast gauge, without inventing another scale or animal", () => {
  assert.match(demo, /import \{ ForecastGauge \} from "@\/app\/radar\/ForecastGauge"/);
  assert.match(demo, /<ForecastGauge/);
  assert.match(demo, /coreCode=\{null\}/);
  assert.doesNotMatch(demo, /<svg|ForecastBar|hedgehog|brake_batt_small/);
  assert.match(gauge, /animatedScore \* 10/);
  assert.ok(demo.includes("[&_.backdrop-blur-sm]:whitespace-nowrap"));
});

test("the display score preserves precision and zero before falling back to the raw score", () => {
  assert.match(demo, /forecast\.score_display_0_10 \?\? forecast\.score_precise_0_10 \?\? forecast\.score_0_10/);
  assert.match(demo, /score=\{score\}/);
  assert.match(demo, /Math\.round\(scoreToPercent\(score\)\)/);
});

test("hero, both CTA entries, region choice, signs and start-guide order remain", () => {
  const guest = home.slice(home.indexOf("  if (!isLoggedIn) {"), home.indexOf("  if (featureAccess?.personalized_forecast_enabled === false) {"));
  assert.ok(guest.indexOf("<HeroTitleMark") < guest.indexOf("<HeroGuideBot"));
  assert.ok(guest.indexOf("<HeroGuideBot") < guest.indexOf("{HOME_CHECK_CTA}"));
  assert.ok(guest.indexOf("{HOME_CHECK_CTA}") < guest.indexOf("<GuestForecastDemo"));
  assert.ok(guest.indexOf("<GuestForecastDemo") < guest.indexOf("<GuestStartCta"));
  for (const text of ["{botMessage}", "PUBLIC_FORECAST_PRESETS", "参考体質", "guestSignHints.map"]) assert.ok(guest.includes(text));
  assert.match(guest, /onStart=\{\(\) => router\.push\("\/check"\)\}/);
  const signedIn = home.slice(home.indexOf("  if (featureAccess?.personalized_forecast_enabled === false) {"));
  assert.match(signedIn, /<ForecastMiniCard/);
  assert.doesNotMatch(signedIn, /<GuestForecastDemo/);
});

test("weather loads use the same shared presentation function as the real forecast", async () => {
  assert.match(demo, /buildForecastWeatherLoadGroups\(forecast, getForecastTriggerFactors\(forecast\)\)/);
  assert.match(await source("app/radar/utils.js"), /buildForecastWeatherLoadGroups\(forecast, forecast \? getForecastTriggerFactors\(forecast\) : \[\]\)/);
  assert.match(demo, /factor\.loadLevelLabel/);
  assert.match(demo, /factor\.detailLabel/);
  assert.match(demo, /triggerKey=\{factor\.key\}/);
  assert.match(await source("app/radar/page.js"), /getForecastWeatherLoadGroups\(forecast\)/);
});

test("all three public weather groups keep their phenomenon labels and high/middle/low values", () => {
  const groups = getForecastWeatherLoadGroups({ weather_load_groups: {
    temperature: { exact: "cold", personal_load: 0.8, personalized: false },
    moisture: { exact: "dry", personal_load: 0.45, personalized: false },
    pressure: { exact: "pressure_up", personal_load: 0.12, personalized: false },
  } });
  assert.deepEqual(groups.map(g => [g.detailLabel, g.loadLevelLabel, g.personalized]), [["低温", "高", false], ["乾燥", "中", false], ["気圧上昇", "低", false]]);
});

test("unknown loads remain unknown instead of becoming a misleading low value", () => {
  const groups = getForecastWeatherLoadGroups({ main_trigger: "pressure", trigger_dir: "down" });
  assert.equal(groups.length, 3);
  assert.deepEqual(groups.map(g => g.loadLevelLabel), ["—", "—", "—"]);
});

test("public weather level boundaries stay identical to the real forecast", () => {
  for (const [value, level] of [[0, "低"], [0.339, "低"], [0.34, "中"], [0.669, "中"], [0.67, "高"], [1, "高"]]) {
    const groups = getForecastWeatherLoadGroups({ weather_load_groups: { temperature: { exact: "heat", personal_load: value, personalized: false } } });
    assert.equal(groups[0].loadLevelLabel, level);
  }
});

test("loading and failures are explicit, with no generated preview or private forecast request", () => {
  assert.ok(demo.indexOf("if (loading)") < demo.indexOf("<ForecastGauge"));
  assert.ok(demo.indexOf("if (!bundle?.ok || !bundle.forecast)") < demo.indexOf("<ForecastGauge"));
  assert.match(demo, /role="status"/);
  assert.match(demo, /onClick=\{onStart\}/);
  assert.doesNotMatch(demo, /fetch\(|supabase|trackJourney|Math\.random|44\s*\/\s*100/);
});
