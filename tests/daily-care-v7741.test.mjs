import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dailySource = await readFile(new URL("../lib/radar_v1/careRules/dailyCareV2.js", import.meta.url), "utf8");
const daily = await import(`data:text/javascript;base64,${Buffer.from(dailySource).toString("base64")}`);
const pageSource = await readFile(new URL("../app/radar/page.js", import.meta.url), "utf8");
const foodRulesSource = await readFile(new URL("../lib/radar_v1/careRules/foodIngredientRules.js", import.meta.url), "utf8");

const riskContext = {
  constitution_context: {
    core_code: "accel_batt_small",
    sub_labels: ["qi_stagnation", "qi_deficiency"],
    symptom_focus: "mood",
    primary_meridian: "lung_li",
    secondary_meridian: "liver_gb",
  },
};

function buildFood(date = "2026-07-18") {
  const theme = daily.buildDailyCareTheme({
    targetDate: date,
    triggerKey: "damp",
    secondaryKey: "heat",
    signal: 1,
    symptomFocus: "mood",
    riskContext,
  });
  return daily.enhanceFoodContext({
    baseFood: {
      action_cards: [
        { key: "drink", label: "飲み物", body: "少しずつ", items: ["ほうじ茶", "麦茶"] },
      ],
      caution_items: ["冷たい甘い飲み物を一気に飲む"],
    },
    theme,
    targetDate: date,
    symptomFocus: "mood",
    subLabels: riskContext.constitution_context.sub_labels,
    mode: "today",
  });
}

test("food main area gives the concrete meal and the subtraction habit equal prominence", () => {
  const food = buildFood();
  const prominent = food.action_cards.filter((card) => card.prominent);
  assert.deepEqual(prominent.map((card) => card.key), ["choice", "caution"]);
  assert.equal(prominent[0].items.length, 1);
  assert.equal(prominent[1].label, "今日は控えたい");
  assert.equal(prominent[1].items.length, 1);
});

test("subtraction advice is concrete, reasoned and not the old generic heading", () => {
  const food = buildFood();
  const caution = food.action_cards.find((card) => card.key === "caution");
  assert.ok(caution);
  assert.equal(caution.items.length, 1);
  assert.equal(caution.items[0], food.subtraction_action.label);
  assert.ok(food.subtraction_action.reason.length > 20);
  assert.doesNotMatch(caution.label, /重ねない/);
  assert.doesNotMatch(dailySource, /今日は重ねない/);
});

test("subtraction advice is stable on reload and rotates across similar forecast dates", () => {
  const day1a = buildFood("2026-07-18");
  const day1b = buildFood("2026-07-18");
  const day2 = buildFood("2026-07-19");
  assert.equal(day1a.subtraction_action.id, day1b.subtraction_action.id);
  assert.notEqual(day1a.subtraction_action.id, day2.subtraction_action.id);
});

test("food subtraction changes with constitution even under the same weather", () => {
  const date = "2026-07-18";
  const dampRisk = {
    constitution_context: {
      core_code: "brake_batt_large",
      sub_labels: ["dampness", "blood_stasis"],
      symptom_focus: "swelling",
    },
  };
  const theme = daily.buildDailyCareTheme({
    targetDate: date,
    triggerKey: "damp",
    secondaryKey: "heat",
    signal: 1,
    symptomFocus: "swelling",
    riskContext: dampRisk,
  });
  const food = daily.enhanceFoodContext({
    baseFood: {},
    theme,
    targetDate: date,
    symptomFocus: "swelling",
    subLabels: dampRisk.constitution_context.sub_labels,
  });
  assert.notEqual(food.subtraction_action.id, buildFood(date).subtraction_action.id);
  assert.match(food.subtraction_action.reason, /湿|重|冷|甘|胃腸/);
});

test("the disclosure label describes its actual contents", () => {
  const food = buildFood();
  assert.equal(food.detail_eyebrow, "ほかの選び方");
  assert.equal(food.detail_title, "別案・飲み物・選んだ理由");
  assert.match(pageSource, /visiblePrimaryFoodCards/);
  assert.match(pageSource, /food\.detail_eyebrow \|\| "ほかの選び方"/);
  assert.match(pageSource, /別案・飲み物・選んだ理由/);
  assert.doesNotMatch(foodRulesSource, /なぜこの食材\?|なぜ明日の候補\?/);
});
