import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dailySource = await readFile(new URL("../lib/radar_v1/careRules/dailyCareV2.js", import.meta.url), "utf8");
const pageSource = await readFile(new URL("../app/radar/page.js", import.meta.url), "utf8");
const foodSource = await readFile(new URL("../lib/radar_v1/careRules/foodIngredientRules.js", import.meta.url), "utf8");
const dailyUrl = `data:text/javascript;base64,${Buffer.from(dailySource).toString("base64")}`;
const preparedFoodSource = foodSource.replace(/from "\.\/dailyCareV2";/, `from "${dailyUrl}";`);
const daily = await import(dailyUrl);
const foodRules = await import(`data:text/javascript;base64,${Buffer.from(preparedFoodSource).toString("base64")}`);

function buildCare(mode = "today") {
  const date = mode === "today" ? "2026-08-07" : "2026-08-08";
  return daily.enhanceDailyCarePlan({
    baseCarePlan: {},
    forecast: {
      target_date: date,
      signal: 2,
      personal_main_trigger_exact: "heat",
      personal_secondary_trigger_exact: "pressure_up",
      reaction_direction: "accel",
    },
    riskContext: {
      summary: {
        main_trigger_exact: "heat",
        secondary_trigger_exact: "pressure_up",
        reaction_direction: "accel",
      },
      target: { signal: 2 },
      constitution_context: {
        core_code: "accel_batt_large",
        sub_labels: ["qi_stagnation"],
        symptom_focus: "neck_shoulder",
        manifestation: { reaction_direction: "accel" },
      },
    },
    mode,
    targetDate: date,
    symptomFocus: "neck_shoulder",
  });
}

test("食事理由は学術体系のような見出しや書き出しを使わない", () => {
  const food = foodRules.buildIngredientFoodContext({
    mode: "today",
    triggerKey: "heat",
    secondaryKey: "pressure_up",
    signal: 2,
    symptomFocus: "neck_shoulder",
    subLabels: ["qi_stagnation"],
    targetDate: "2026-08-07",
    riskContext: {
      summary: { reaction_direction: "accel" },
      constitution_context: { manifestation: { reaction_direction: "accel" } },
    },
  });
  for (const card of food.action_cards) {
    for (const detail of card.item_details || []) {
      assert.equal(detail.reasons?.[0]?.label, "体調との相性");
      assert.doesNotMatch(detail.reasons?.[0]?.text || "", /食養生では/);
    }
  }
  assert.match(pageSource, />\s*食事ケア\s*</);
  assert.doesNotMatch(pageSource, />\s*食養生\s*</);
});

test("暮らすケアにも天気・反応・不調・ケア方針の導入文を出す", () => {
  const today = buildCare("today").lifestyle_plan;
  const tomorrow = buildCare("tomorrow").lifestyle_plan;
  assert.match(today.recommendation, /^今日は高温と気圧変化の予報/);
  assert.match(today.recommendation, /アクセル寄りの反応/);
  assert.match(today.recommendation, /首肩のつらさが出やすい見込み/);
  assert.match(today.recommendation, /暮らしでは、(?:身体の使い方|道具や配置)/);
  assert.match(tomorrow.recommendation, /^明日は高温と気圧変化の予報/);
  assert.match(tomorrow.recommendation, /今夜からの暮らしでは、/);
  assert.match(pageSource, /lifestylePlan\?\.recommendation/);
});

test("食べる・暮らすの主要本文は15px以上を基準にする", () => {
  assert.match(pageSource, /text-\[15px\][^\n]*[\s\S]{0,100}\{food\.recommendation \|\| food\.focus\}/);
  assert.match(pageSource, /text-\[15px\][^\n]*[\s\S]{0,100}\{lifestylePlan\.recommendation\}/);
  assert.match(pageSource, /text-\[16px\][^\n]*[\s\S]{0,100}\{lifestylePrimaryAction\?\.label/);
  assert.match(pageSource, /text-\[16px\][^\n]*[\s\S]{0,140}itemDetail\.focus_ingredients/);
});
