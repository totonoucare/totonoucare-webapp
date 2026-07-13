import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../lib/radar_v1/careRules/foodIngredientRules.js", import.meta.url), "utf8");
const foodRules = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

function firstFoodItems(context) {
  return context?.action_cards?.find((card) => card.key === "add")?.items || [];
}

test("English fluid_damp sub label changes today's food candidates", () => {
  const base = foodRules.buildIngredientFoodContext({
    mode: "today",
    triggerKey: "default",
    signal: 0,
    subLabels: [],
  });
  const adjusted = foodRules.buildIngredientFoodContext({
    mode: "today",
    triggerKey: "default",
    signal: 0,
    subLabels: ["fluid_damp"],
  });

  assert.notDeepEqual(firstFoodItems(adjusted), firstFoodItems(base));
  assert.match(firstFoodItems(adjusted).join(" "), /大根/);
});

test("English and Japanese fluid-damp labels produce the same food adjustment", () => {
  const english = foodRules.buildIngredientFoodContext({
    mode: "today",
    triggerKey: "default",
    signal: 0,
    subLabels: ["fluid_damp"],
  });
  const japanese = foodRules.buildIngredientFoodContext({
    mode: "today",
    triggerKey: "default",
    signal: 0,
    subLabels: ["痰湿"],
  });

  assert.deepEqual(firstFoodItems(english), firstFoodItems(japanese));
});

test("Tomorrow food candidates also carry constitution sub-label adjustments", () => {
  const damp = foodRules.buildIngredientFoodContext({
    mode: "tomorrow",
    triggerKey: "default",
    signal: 0,
    subLabels: ["fluid_damp"],
  });
  const dry = foodRules.buildIngredientFoodContext({
    mode: "tomorrow",
    triggerKey: "default",
    signal: 0,
    subLabels: ["fluid_deficiency"],
  });

  assert.match(firstFoodItems(damp).join(" "), /大根/);
  assert.match(firstFoodItems(dry).join(" "), /白菜/);
  assert.notDeepEqual(firstFoodItems(damp), firstFoodItems(dry));
});

test("English and Japanese blood-deficiency labels match without collapsing into qi deficiency", () => {
  const englishBlood = foodRules.buildIngredientFoodContext({
    mode: "today",
    triggerKey: "default",
    signal: 0,
    subLabels: ["blood_deficiency"],
  });
  const japaneseBlood = foodRules.buildIngredientFoodContext({
    mode: "today",
    triggerKey: "default",
    signal: 0,
    subLabels: ["血虚"],
  });
  const qiDeficiency = foodRules.buildIngredientFoodContext({
    mode: "today",
    triggerKey: "default",
    signal: 0,
    subLabels: ["qi_deficiency"],
  });

  assert.deepEqual(firstFoodItems(englishBlood), firstFoodItems(japaneseBlood));
  assert.notDeepEqual(firstFoodItems(englishBlood), firstFoodItems(qiDeficiency));
});
