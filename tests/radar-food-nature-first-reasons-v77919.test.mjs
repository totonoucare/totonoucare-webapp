import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dailySource = await readFile(new URL("../lib/radar_v1/careRules/dailyCareV2.js", import.meta.url), "utf8");
const dailyUrl = `data:text/javascript;base64,${Buffer.from(dailySource).toString("base64")}`;
const foodSource = await readFile(new URL("../lib/radar_v1/careRules/foodIngredientRules.js", import.meta.url), "utf8");
const preparedFoodSource = foodSource.replace(/from "\.\/dailyCareV2";/, `from "${dailyUrl}";`);
const foodRules = await import(`data:text/javascript;base64,${Buffer.from(preparedFoodSource).toString("base64")}`);
const pageSource = await readFile(new URL("../app/radar/page.js", import.meta.url), "utf8");

function buildHeatContext(mode = "today") {
  return foodRules.buildIngredientFoodContext({
    mode,
    triggerKey: "heat",
    secondaryKey: "pressure_up",
    signal: 2,
    symptomFocus: "neck_shoulder",
    subLabels: ["qi_stagnation"],
    targetDate: mode === "today" ? "2026-08-07" : "2026-08-08",
    riskContext: {
      summary: { reaction_direction: "accel" },
      constitution_context: {
        sub_labels: ["qi_stagnation"],
        manifestation: { reaction_direction: "accel" },
      },
    },
  });
}

test("実際の飲み物辞書も食養生を先、成分と飲み方を補足にする", () => {
  const food = buildHeatContext();
  const drink = food.action_cards.find((card) => card.key === "drink");
  assert.ok(drink);
  assert.ok(drink.items.length >= 2);
  for (const detail of drink.item_details) {
    assert.deepEqual(detail.reasons.map((reason) => reason.label), ["食養生", "成分・飲み方"]);
    assert.match(detail.reasons[0].text, /食養生では/);
    assert.match(detail.reasons[0].text, /温める|冷ます|偏りが少ない/);
    assert.match(detail.reasons[1].text, /カフェイン/);
  }
});

test("高温日の麦茶には冷ます食性とカフェインなしの理由が出る", () => {
  const food = buildHeatContext();
  const drink = food.action_cards.find((card) => card.key === "drink");
  const index = drink.items.indexOf("麦茶");
  assert.ok(index >= 0, drink.items.join(" / "));
  assert.match(drink.item_details[index].reasons[0].text, /熱を冷ます方向/);
  assert.match(drink.item_details[index].reasons[1].text, /カフェインを含みません/);
});

test("料理は取り入れたい食材を先に見せ、料理名を料理案へ下げる", () => {
  const food = buildHeatContext();
  const meal = food.action_cards.find((card) => card.key === "choice")?.item_details?.[0];
  assert.ok(meal.focus_ingredients.length >= 2, JSON.stringify(meal));
  assert.ok(meal.meal_example.length > 0);
  assert.deepEqual(meal.reasons.map((reason) => reason.label), ["食養生", "栄養面"]);
  assert.match(meal.reasons[0].text, /食養生では/);
  assert.match(pageSource, /取り入れたい食材/);
  assert.match(pageSource, /itemDetail\?\.meal_example/);
});

test("今日と明日は用途・日付・天気を選定キーに持ち、同じ候補へ固定しない", () => {
  const today = buildHeatContext("today");
  const tomorrow = buildHeatContext("tomorrow");
  assert.notEqual(today.primary_action.id, tomorrow.primary_action.id);
  assert.notEqual(today.primary_action.label, tomorrow.primary_action.label);
  assert.match(today.action_cards.find((card) => card.key === "choice").label, /今日/);
  assert.match(tomorrow.action_cards.find((card) => card.key === "choice").label, /明日/);
});

test("全条件で取り入れたい食材を出し、空いたらを魚のたらと誤認しない", () => {
  const triggers = ["damp", "heat", "dry", "cold", "pressure_down", "pressure_up", "temp_shift"];
  const symptoms = ["fatigue", "sleep", "digestion", "neck_shoulder", "low_back_pain", "swelling", "headache", "dizziness", "mood"];
  for (const triggerKey of triggers) {
    for (const symptomFocus of symptoms) {
      const food = foodRules.buildIngredientFoodContext({
        mode: "tomorrow",
        triggerKey,
        signal: 1,
        symptomFocus,
        targetDate: "2026-08-08",
        riskContext: {
          summary: { reaction_direction: "accel" },
          constitution_context: { manifestation: { reaction_direction: "accel" } },
        },
      });
      for (const card of food.action_cards.filter((item) => ["choice", "alternative", "night"].includes(item.key))) {
        for (const detail of card.item_details || []) {
          assert.ok(detail.focus_ingredients.length >= 1, `${triggerKey}/${symptomFocus}/${detail.label}`);
          if (!/(?:^|[＋・、])たら(?=と|の|・|＋|、|$)/.test(detail.meal_example)) {
            assert.equal(detail.focus_ingredients.includes("たら"), false, detail.meal_example);
          }
        }
      }
    }
  }
});
