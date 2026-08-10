import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dailySource = await readFile(new URL("../lib/radar_v1/careRules/dailyCareV2.js", import.meta.url), "utf8");
const dailyUrl = `data:text/javascript;base64,${Buffer.from(dailySource).toString("base64")}`;
const daily = await import(dailyUrl);
const foodSource = (await readFile(new URL("../lib/radar_v1/careRules/foodIngredientRules.js", import.meta.url), "utf8"))
  .replace(/from "\.\/dailyCareV2";/, `from "${dailyUrl}";`);
const foodRules = await import(`data:text/javascript;base64,${Buffer.from(foodSource).toString("base64")}`);
const radarPageSource = await readFile(new URL("../app/radar/page.js", import.meta.url), "utf8");

const PERSONAS = [
  { id: "accel-small-neck", core: "accel_batt_small", direction: "accel", symptom: "neck_shoulder", subLabels: ["qi_stagnation", "fluid_deficiency"], meridian: "lung_li" },
  { id: "brake-small-digestion", core: "brake_batt_small", direction: "brake", symptom: "digestion", subLabels: ["qi_deficiency", "fluid_damp"], meridian: "spleen_st" },
  { id: "accel-large-low-back", core: "accel_batt_large", direction: "accel", symptom: "low_back_pain", subLabels: ["blood_stasis", "qi_stagnation"], meridian: "kidney_bl" },
  { id: "brake-standard-sleep", core: "brake_batt_standard", direction: "brake", symptom: "sleep", subLabels: ["qi_deficiency", "blood_deficiency"], meridian: "heart_si" },
  { id: "accel-standard-headache", core: "accel_batt_standard", direction: "accel", symptom: "headache", subLabels: ["blood_stasis", "fluid_deficiency"], meridian: "liver_gb" },
];

const SEASONS = [
  { id: "spring", trigger: "pressure_down", secondary: "temp_shift", date: "2026-04-08" },
  { id: "summer", trigger: "heat", secondary: "damp", date: "2026-08-08" },
  { id: "autumn", trigger: "dry", secondary: "pressure_up", date: "2026-10-08" },
  { id: "winter", trigger: "cold", secondary: "dry", date: "2026-12-08" },
];

function riskContext(persona, season) {
  return {
    summary: {
      main_trigger_exact: season.trigger,
      secondary_trigger_exact: season.secondary,
      reaction_direction: persona.direction,
    },
    target: { signal: 1 },
    constitution_context: {
      core_code: persona.core,
      sub_labels: persona.subLabels,
      symptom_focus: persona.symptom,
      primary_meridian: persona.meridian,
      manifestation: { reaction_direction: persona.direction },
    },
  };
}

function build(persona, season, mode = "today") {
  const context = riskContext(persona, season);
  const plan = daily.enhanceDailyCarePlan({
    forecast: {
      target_date: season.date,
      signal: 1,
      personal_main_trigger_exact: season.trigger,
      personal_secondary_trigger_exact: season.secondary,
      reaction_direction: persona.direction,
    },
    riskContext: context,
    mode,
    targetDate: season.date,
    symptomFocus: persona.symptom,
  });
  const food = foodRules.buildIngredientFoodContext({
    mode,
    triggerKey: season.trigger,
    secondaryKey: season.secondary,
    signal: 1,
    symptomFocus: persona.symptom,
    subLabels: persona.subLabels,
    riskContext: context,
    targetDate: season.date,
  });
  return { plan, food };
}

test("実在する5体質×春夏秋冬の20条件を欠落なく組み立てる", () => {
  let count = 0;
  for (const persona of PERSONAS) {
    assert.ok(["accel", "brake"].includes(persona.direction));
    assert.doesNotMatch(persona.core, /balanced/);
    for (const season of SEASONS) {
      const { plan, food } = build(persona, season);
      assert.equal(plan.care_theme.reaction_direction, persona.direction);
      assert.ok(plan.lifestyle_plan.primary_action?.label, `${persona.id}/${season.id}/lifestyle`);
      assert.ok(plan.lifestyle_plan.forecast_insight, `${persona.id}/${season.id}/insight`);
      assert.ok(food.primary_action?.label, `${persona.id}/${season.id}/food`);
      assert.ok(food.action_cards.find((card) => card.key === "drink")?.items?.length, `${persona.id}/${season.id}/drink`);
      assert.ok(plan.night_tsubo_set.line_care?.action, `${persona.id}/${season.id}/line-care`);
      count += 1;
    }
  }
  assert.equal(count, 20);
});

test("冬の主食事へ盛夏向けの料理を出さない", () => {
  const winter = SEASONS.find((item) => item.id === "winter");
  for (const persona of PERSONAS) {
    const meal = build(persona, winter).food.primary_action.label;
    assert.doesNotMatch(meal, /ズッキーニ.*バジルトマト|焼きなす.*みょうが|南蛮漬け|きゅうり.*柑橘/, `${persona.id}: ${meal}`);
  }
});

test("胃腸と睡眠の環境調整は、身体反応につながる内容を優先する", () => {
  const digestion = PERSONAS.find((item) => item.symptom === "digestion");
  const sleep = PERSONAS.find((item) => item.symptom === "sleep");
  for (const season of SEASONS) {
    const digestionAction = build(digestion, season).plan.lifestyle_plan.primary_action;
    assert.match(`${digestionAction.scene} ${digestionAction.label} ${digestionAction.reason}`, /お腹|胃腸|みぞおち/);

    const sleepAction = build(sleep, season).plan.lifestyle_plan.primary_action;
    assert.notEqual(sleepAction.id, "tool-screen-height");
    assert.match(`${sleepAction.scene} ${sleepAction.label} ${sleepAction.reason}`, /眠|光|音|脚|布団|寝/);
  }
});

test("ほぐす一手は同じ経絡でも季節と今日・明日の場面を反映する", () => {
  for (const persona of PERSONAS) {
    const todayActions = SEASONS.map((season) => build(persona, season, "today").plan.night_tsubo_set.line_care.action);
    assert.ok(new Set(todayActions).size >= 3, `${persona.id}: ${todayActions.join(" / ")}`);
    const spring = SEASONS[0];
    const today = build(persona, spring, "today").plan.night_tsubo_set.line_care.action;
    const tomorrow = build(persona, spring, "tomorrow").plan.night_tsubo_set.line_care.action;
    assert.notEqual(today, tomorrow, persona.id);
  }
});

test("高温×アクセル寄り×頭痛では、最初の飲み物へカフェイン飲料を置かない", () => {
  const persona = PERSONAS.find((item) => item.symptom === "headache");
  const summer = SEASONS.find((item) => item.id === "summer");
  const drink = build(persona, summer).food.action_cards.find((card) => card.key === "drink").items[0];
  assert.doesNotMatch(drink, /緑茶|コーヒー|紅茶|烏龍茶/);
});

test("暮らすの気づきを根拠ピルより先に表示し、開発者向け文言を出さない", () => {
  const insightAt = radarPageSource.indexOf("lifestylePlan.forecast_insight || lifestylePlan.lead");
  const chipsAt = radarPageSource.indexOf("lifestyleContextChips.length > 0", insightAt);
  assert.ok(insightAt > 0 && chipsAt > insightAt);
  assert.doesNotMatch(`${dailySource}\n${radarPageSource}`, /今日と同じ候補が残る場合|しっくりこない時|道具と配置|刺激を押すより|指先を追いかけず|細い持ち手/);
});
