import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dailySource = await readFile(new URL("../lib/radar_v1/careRules/dailyCareV2.js", import.meta.url), "utf8");
const dailyUrl = `data:text/javascript;base64,${Buffer.from(dailySource).toString("base64")}`;
const daily = await import(dailyUrl);
const foodSource = await readFile(new URL("../lib/radar_v1/careRules/foodIngredientRules.js", import.meta.url), "utf8");
const preparedFoodSource = foodSource.replace(/from "\.\/dailyCareV2";/, `from "${dailyUrl}";`);
const foodRules = await import(`data:text/javascript;base64,${Buffer.from(preparedFoodSource).toString("base64")}`);
const radarPageSource = await readFile(new URL("../app/radar/page.js", import.meta.url), "utf8");

const PERSONAS = {
  A: { core: "accel_batt_small", reaction: "accel", symptom: "neck_shoulder", subs: ["qi_stagnation", "fluid_deficiency"], meridian: "lung_li" },
  B: { core: "brake_batt_small", reaction: "brake", symptom: "digestion", subs: ["qi_deficiency", "fluid_damp"], meridian: "spleen_st" },
  C: { core: "accel_batt_large", reaction: "accel", symptom: "low_back_pain", subs: ["blood_stasis", "qi_stagnation"], meridian: "kidney_bl" },
};

const SEASONS = {
  spring: { date: "2026-04-08", primary: "pressure_down", secondary: "temp_shift" },
  summer: { date: "2026-08-08", primary: "heat", secondary: "damp" },
  autumn: { date: "2026-10-08", primary: "dry", secondary: "pressure_up" },
  winter: { date: "2026-12-08", primary: "cold", secondary: "dry" },
};

function addDay(date) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + 1);
  return parsed.toISOString().slice(0, 10);
}

function riskContext(persona, season) {
  return {
    summary: {
      main_trigger_exact: season.primary,
      secondary_trigger_exact: season.secondary,
      reaction_direction: persona.reaction,
    },
    target: { signal: 2 },
    constitution_context: {
      core_code: persona.core,
      sub_labels: persona.subs,
      symptom_focus: persona.symptom,
      primary_meridian: persona.meridian,
      manifestation: { reaction_direction: persona.reaction },
    },
  };
}

function buildPlan(persona, season, mode, date) {
  return daily.enhanceDailyCarePlan({
    baseCarePlan: {},
    forecast: {
      target_date: date,
      signal: 2,
      score_display_0_10: 7.2,
      personal_main_trigger_exact: season.primary,
      personal_secondary_trigger_exact: season.secondary,
      reaction_direction: persona.reaction,
    },
    riskContext: riskContext(persona, season),
    mode,
    targetDate: date,
    symptomFocus: persona.symptom,
    triggerKey: season.primary,
    secondaryKey: season.secondary,
  });
}

function buildFood(persona, season, mode, date) {
  return foodRules.buildIngredientFoodContext({
    mode,
    triggerKey: season.primary,
    secondaryKey: season.secondary,
    signal: 2,
    symptomFocus: persona.symptom,
    subLabels: persona.subs,
    targetDate: date,
    riskContext: riskContext(persona, season),
  });
}

test("3人×四季の12条件で、暮らす・食べる・ほぐすの時間差と根拠を保つ", () => {
  let total = 0;
  for (const [personaKey, persona] of Object.entries(PERSONAS)) {
    for (const [seasonKey, season] of Object.entries(SEASONS)) {
      const tomorrowDate = addDay(season.date);
      const today = buildPlan(persona, season, "today", season.date);
      const tomorrow = buildPlan(persona, season, "tomorrow", tomorrowDate);
      const todayFood = buildFood(persona, season, "today", season.date);
      const tomorrowFood = buildFood(persona, season, "tomorrow", tomorrowDate);
      const key = `${personaKey}/${seasonKey}`;

      assert.notEqual(today.lifestyle_plan.primary_action?.id, tomorrow.lifestyle_plan.primary_action?.id, `${key}/live`);
      assert.notEqual(today.night_food.primary_action?.id, tomorrow.night_food.primary_action?.id, `${key}/meal`);
      assert.notEqual(today.night_tsubo_set.line_care?.label, tomorrow.night_tsubo_set.line_care?.label, `${key}/loosen`);
      assert.match(today.lifestyle_plan.recommendation, /予報に.+反応が重なり/);
      assert.match(tomorrow.lifestyle_plan.recommendation, /^明日は/);

      const tomorrowDrink = tomorrowFood.action_cards.find((card) => card.key === "drink");
      assert.ok(todayFood.action_cards.find((card) => card.key === "drink")?.items?.length, `${key}/today-drink`);
      assert.match(tomorrowDrink?.body || "", /今日と同じ候補が残る場合/);
      total += 1;
    }
  }
  assert.equal(total, 12);
});

test("夏の胃腸弱めと冬の腰ケアは、季節を無視したように見える第一候補を避ける", () => {
  const summerFood = buildFood(PERSONAS.B, SEASONS.summer, "today", SEASONS.summer.date);
  const summerDrink = summerFood.action_cards.find((card) => card.key === "drink");
  assert.notEqual(summerDrink.items[0], "白湯", summerDrink.items.join(" / "));

  const winter = buildPlan(PERSONAS.C, SEASONS.winter, "today", SEASONS.winter.date);
  assert.match(winter.night_food.primary_action.label, /温|根菜|生姜|ねぎ|煮|汁|カレー/);
});

test("7方針は体質の土台と今日の条件を分けて見せる", () => {
  assert.match(radarPageSource, /体質の土台 × 今日の条件/);
  assert.match(radarPageSource, /lifestylePlan\?\.recommendation/);
});

