import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dailySource = await readFile(new URL("../lib/radar_v1/careRules/dailyCareV2.js", import.meta.url), "utf8");
const dailyUrl = `data:text/javascript;base64,${Buffer.from(dailySource).toString("base64")}`;
const daily = await import(dailyUrl);
const foodSource = await readFile(new URL("../lib/radar_v1/careRules/foodIngredientRules.js", import.meta.url), "utf8");
const preparedFoodSource = foodSource.replace(/from "\.\/dailyCareV2";/, `from "${dailyUrl}";`);
const foodRules = await import(`data:text/javascript;base64,${Buffer.from(preparedFoodSource).toString("base64")}`);

const PERSONAS = [
  {
    name: "首肩に力が集まりやすい・余力少なめ",
    coreCode: "accel_batt_small",
    reactionDirection: "accel",
    symptomFocus: "neck_shoulder",
    subLabels: ["qi_stagnation", "fluid_deficiency"],
    primaryMeridian: "lung_li",
  },
  {
    name: "胃腸が重くなりやすい・余力少なめ",
    coreCode: "brake_batt_small",
    reactionDirection: "brake",
    symptomFocus: "digestion",
    subLabels: ["qi_deficiency", "fluid_damp"],
    primaryMeridian: "spleen_st",
  },
  {
    name: "腰が固まりやすい・余力あり",
    coreCode: "accel_batt_large",
    reactionDirection: "accel",
    symptomFocus: "low_back_pain",
    subLabels: ["blood_stasis", "qi_stagnation"],
    primaryMeridian: "kidney_bl",
  },
];

const SEASONS = [
  { name: "春", date: "2026-04-08", trigger: "pressure_down", secondary: "temp_shift" },
  { name: "夏", date: "2026-08-08", trigger: "heat", secondary: "damp" },
  { name: "秋", date: "2026-10-08", trigger: "dry", secondary: "pressure_up" },
  { name: "冬", date: "2026-12-08", trigger: "cold", secondary: "dry" },
];

function riskContext(persona, season) {
  const brake = persona.reactionDirection === "brake";
  return {
    summary: {
      main_trigger_exact: season.trigger,
      secondary_trigger_exact: season.secondary,
      reaction_direction: persona.reactionDirection,
    },
    target: { signal: 2 },
    constitution_context: {
      core_code: persona.coreCode,
      sub_labels: persona.subLabels,
      symptom_focus: persona.symptomFocus,
      primary_meridian: persona.primaryMeridian,
      manifestation: { reaction_direction: persona.reactionDirection },
      axes: {
        yin_yang_score: brake ? -0.8 : 0.8,
        drive_score: brake ? -0.7 : 0.3,
        obstruction_score: 0.55,
      },
      split_scores: {
        qi: { deficiency: brake ? 3 : 0.4, stagnation: brake ? 0.4 : 3 },
        blood: { deficiency: 0.4, stasis: persona.subLabels.includes("blood_stasis") ? 3 : 0.7 },
        fluid: { deficiency: persona.subLabels.includes("fluid_deficiency") ? 2 : 0.2, damp: brake ? 4 : 0.2 },
      },
    },
  };
}

function buildDaily(persona, season, mode) {
  const context = riskContext(persona, season);
  return daily.enhanceDailyCarePlan({
    baseCarePlan: {},
    forecast: {
      target_date: season.date,
      signal: 2,
      personal_main_trigger_exact: season.trigger,
      personal_secondary_trigger_exact: season.secondary,
      reaction_direction: persona.reactionDirection,
    },
    riskContext: context,
    mode,
    targetDate: season.date,
    symptomFocus: persona.symptomFocus,
    triggerKey: season.trigger,
    secondaryKey: season.secondary,
  });
}

function buildFood(persona, season, mode) {
  return foodRules.buildIngredientFoodContext({
    mode,
    triggerKey: season.trigger,
    secondaryKey: season.secondary,
    signal: 2,
    symptomFocus: persona.symptomFocus,
    subLabels: persona.subLabels,
    riskContext: riskContext(persona, season),
    targetDate: season.date,
  });
}

test("3人×春夏秋冬の12通りで、予報・暮らす・食べる・ほぐすが一つの条件を向く", () => {
  let checked = 0;
  const forbidden = /今日と同じ候補が残る場合|栄養を足し続けるより|胃腸の調子が出やすい|食事を小さく区切る|食養生では/;

  for (const persona of PERSONAS) {
    for (const season of SEASONS) {
      const today = buildDaily(persona, season, "today");
      const tomorrow = buildDaily(persona, season, "tomorrow");
      const todayFood = buildFood(persona, season, "today");
      const tomorrowFood = buildFood(persona, season, "tomorrow");
      const audited = JSON.stringify({ today, tomorrow, todayFood, tomorrowFood });

      assert.ok(today.care_theme.policies.length >= 1, `${persona.name}×${season.name}: 7方針がありません`);
      assert.ok(today.lifestyle_plan.forecast_insight, `${persona.name}×${season.name}: 暮らすの予報導入がありません`);
      assert.ok(today.lifestyle_plan.primary_action?.label, `${persona.name}×${season.name}: 暮らすの主提案がありません`);
      assert.ok(today.lifestyle_plan.alternatives?.length, `${persona.name}×${season.name}: 暮らすの別方向の一手がありません`);
      assert.ok(today.night_tsubo_set?.line_care?.action, `${persona.name}×${season.name}: ほぐすの一手がありません`);
      assert.ok(tomorrow.night_tsubo_set?.line_care?.action, `${persona.name}×${season.name}: 今夜の先回りケアがありません`);

      for (const food of [todayFood, tomorrowFood]) {
        assert.ok(food.recommendation, `${persona.name}×${season.name}: 食べる導入がありません`);
        const meal = food.action_cards.find((card) => card.key === "choice");
        const drink = food.action_cards.find((card) => card.key === "drink");
        assert.ok(meal?.items?.[0], `${persona.name}×${season.name}: 食事候補がありません`);
        assert.ok(drink?.items?.[0], `${persona.name}×${season.name}: 飲み物候補がありません`);
        assert.equal(meal.item_details[0].reasons[0].label, "体調との相性");
        assert.equal(drink.item_details[0].reasons[0].label, "体調との相性");
      }

      if (season.name === "夏" && persona.symptomFocus === "digestion") {
        const drink = todayFood.action_cards.find((card) => card.key === "drink");
        assert.ok(["とうもろこし茶", "麦茶"].includes(drink.items[0]));
        assert.notEqual(drink.items[0], "ほうじ茶");
      }
      if (season.name === "冬") {
        const breakfast = tomorrowFood.action_cards.find((card) => card.key === "choice")?.items?.[0] || "";
        assert.match(breakfast, /温か|スープ|汁|生姜|ねぎ|みそ/);
      }

      assert.doesNotMatch(audited, forbidden, `${persona.name}×${season.name}: 不自然語が残っています`);
      checked += 1;
    }
  }

  assert.equal(checked, 12);
});
