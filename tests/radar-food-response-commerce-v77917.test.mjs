import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "./helpers/rule-read.mjs";

const dailySource = await readFile(new URL("../lib/radar_v1/careRules/dailyCareV2.js", import.meta.url), "utf8");
const radarPageSource = await readFile(new URL("../app/radar/page.js", import.meta.url), "utf8");
const careNaviSource = await readFile(new URL("../app/care-navi/page.js", import.meta.url), "utf8");
const rakutenSource = await readFile(new URL("../app/api/care-navi/rakuten/route.js", import.meta.url), "utf8");
const partnerSource = await readFile(new URL("../lib/care-navi/partnerOffers.js", import.meta.url), "utf8");
const daily = await import(`data:text/javascript;base64,${Buffer.from(dailySource).toString("base64")}`);

function build({
  trigger = "damp",
  symptomFocus = "digestion",
  coreCode = "brake_batt_small",
  reactionDirection = "brake",
  subLabels = ["fluid_damp", "qi_deficiency"],
  mode = "today",
  date = "2026-08-06",
} = {}) {
  return daily.enhanceDailyCarePlan({
    baseCarePlan: {},
    forecast: {
      target_date: date,
      signal: 1,
      personal_main_trigger_exact: trigger,
      reaction_direction: reactionDirection,
    },
    riskContext: {
      summary: { main_trigger_exact: trigger, reaction_direction: reactionDirection },
      target: { signal: 1 },
      constitution_context: {
        core_code: coreCode,
        sub_labels: subLabels,
        symptom_focus: symptomFocus,
        manifestation: { reaction_direction: reactionDirection },
      },
    },
    mode,
    targetDate: date,
    symptomFocus,
  }).tomorrow_food_context;
}

function block(name, nextName) {
  const start = dailySource.indexOf(`const ${name} = [`);
  const end = dailySource.indexOf(`const ${nextName} = [`, start + 1);
  return dailySource.slice(start, end < 0 ? undefined : end);
}

test("完成料理・買い合わせ・外食・朝食・夜食を別カタログで十分に持つ", () => {
  const catalogs = [
    ["RESPONSE_MEAL_CATALOG", "BUY_MEAL_CATALOG", 56],
    ["BUY_MEAL_CATALOG", "EAT_OUT_MEAL_CATALOG", 28],
    ["EAT_OUT_MEAL_CATALOG", "TOMORROW_BREAKFAST_CATALOG", 21],
    ["TOMORROW_BREAKFAST_CATALOG", "NIGHT_SNACK_CATALOG", 35],
  ];
  for (const [name, nextName, minimum] of catalogs) {
    const count = (block(name, nextName).match(/mealCandidate\("/g) || []).length;
    assert.ok(count >= minimum, `${name}/${count}`);
  }
  const nightBlock = dailySource.slice(dailySource.indexOf("const NIGHT_SNACK_CATALOG = ["), dailySource.indexOf("// 「何を足すか」"));
  assert.ok((nightBlock.match(/mealCandidate\("/g) || []).length >= 21);
});

test("今日の食材には実名・個別の料理例・選定根拠がある", () => {
 for(const trigger of ["damp","heat","dry","cold","pressure_down","pressure_up","temp_shift"])
 for(const symptomFocus of ["fatigue","sleep","digestion","neck_shoulder","low_back_pain","swelling","headache","dizziness","mood"]){
  const food=build({trigger,symptomFocus});
  const main=food.action_cards.find(c=>c.key==="choice").item_details[0];
  assert.ok(main.consumed_id);assert.ok(main.meal_example.includes(main.label));
  assert.ok(main.selection_basis.matched_functions.length,`${trigger}/${symptomFocus}/${main.label}`);
  assert.equal(main.recordable,true);
 }
});

test("明日は控えたいものを先頭に置き、任意の夜食と翌朝の食材を区別する", () => {
 const tomorrow=build({mode:"tomorrow"});
 assert.equal(tomorrow.action_cards[0].key,"caution");
 assert.equal(tomorrow.action_cards[0].primary,true);
 const night=tomorrow.action_cards.find(c=>c.key==="night");
 assert.match(night.label,/小腹が空いたときだけ/);
 assert.equal(night.item_details[0].consumption_slot,"tonight");
 assert.equal(night.item_details[0].recordable,true);
 const breakfast=tomorrow.action_cards.find(c=>c.key==="choice");
 assert.match(breakfast.label,/明日の朝/);
 assert.equal(breakfast.item_details[0].recordable,false);
 assert.equal(tomorrow.recommendation,null);
});

test("料理選定は同じ天気でも身体反応・不調で変わる", () => {
  const heavy = build({
    trigger: "damp",
    symptomFocus: "digestion",
    coreCode: "brake_batt_small",
    reactionDirection: "brake",
    subLabels: ["fluid_damp", "qi_deficiency"],
  });
  const tense = build({
    trigger: "damp",
    symptomFocus: "headache",
    coreCode: "accel_batt_large",
    reactionDirection: "accel",
    subLabels: ["qi_stagnation", "fluid_deficiency"],
  });
  assert.notDeepEqual(heavy.selected_foods.map(x=>x.basis), tense.selected_foods.map(x=>x.basis));
  assert.notEqual(heavy.food_care_profile.response_key, tense.food_care_profile.response_key);
  assert.notDeepEqual(heavy.food_care_profile.context_chips, tense.food_care_profile.context_chips);
});

test("ショップ用プロファイルは料理名や単日の天気ではなく、体質・不調・余力から作る", () => {
  const damp = build({ trigger: "damp" }).commerce_context;
  const heat = build({ trigger: "heat" }).commerce_context;
  assert.equal(damp.version, "food_commerce_context_v2_tcm");
  assert.equal(damp.horizon, "habit");
  assert.deepEqual(damp.policy_keys, heat.policy_keys);
  assert.deepEqual(damp.tcm_function_keys, heat.tcm_function_keys);
  assert.deepEqual(damp.nutrition_need_keys, heat.nutrition_need_keys);
  assert.deepEqual(damp.product_role_keys,["daily_tea","food_therapy"]);
  assert.deepEqual(damp.nutrition_need_keys,[]);
  assert.doesNotMatch(JSON.stringify(damp), /meal_id|recipe_id|鶏むね|おにぎり|フォー/);
});

test("予報からショップへは継続ケア軸だけを渡し、楽天・提携商品双方で使う", () => {
  assert.match(radarPageSource, /eatPolicies/);
  assert.match(radarPageSource, /eatFunctions/);
  assert.match(radarPageSource, /eatNeeds/);
  assert.match(radarPageSource, /eatRoles/);
  assert.doesNotMatch(radarPageSource, /mealId.*care-navi|recipeId.*care-navi/i);
  assert.match(careNaviSource, /FOOD_TCM_FUNCTION_LABELS/);
  assert.match(careNaviSource, /foodCommerceContext\.needKeys/);
  assert.match(careNaviSource, /policyKeys: categoryKey === "eat" \? policyKeys : basePolicyKeys/);
  assert.match(rakutenSource, /FOOD_COMMERCE_QUERY_ROWS/);
  assert.match(rakutenSource, /source: "food_commerce"/);
  assert.match(partnerSource, /foodProductRoleKeys/);
  assert.match(partnerSource, /commerceRoleMatch/);
});
