import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

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

test("今日の一食と作らずに食べる案は具体名で、一般名一語へ戻さない", () => {
  const triggers = ["damp", "heat", "dry", "cold", "pressure_down", "pressure_up", "temp_shift"];
  const symptoms = ["fatigue", "sleep", "digestion", "neck_shoulder", "low_back_pain", "swelling", "headache", "dizziness", "mood"];
  for (const trigger of triggers) {
    for (const symptomFocus of symptoms) {
      const food = build({ trigger, symptomFocus });
      const noCook = food.action_cards.find((card) => card.key === "no_cook");
      assert.equal(noCook?.items?.length, 2, `${trigger}/${symptomFocus}`);
      assert.match(noCook.items[0], /^コンビニ・スーパー｜.+＋.+/);
      assert.match(noCook.items[1], /^外食｜.{12,}/);
      assert.doesNotMatch(noCook.items[0], /｜(?:おにぎり|パン|サンド|スープ|弁当|麺|サラダ)$/);
      assert.equal(noCook.item_details?.length, 2);
      assert.ok(food.scene_options.home && food.scene_options.buy && food.scene_options.eat_out);
    }
  }
});

test("明日は完成夕食を流用せず、朝食・空腹時の夜食・今夜の準備を書き分ける", () => {
  const today = build({ mode: "today" });
  const tomorrow = build({ mode: "tomorrow" });
  assert.notEqual(today.primary_action.id, tomorrow.primary_action.id);
  assert.match(tomorrow.action_cards[0].label, /明日の朝/);
  assert.ok(tomorrow.action_cards.find((card) => card.key === "night")?.items?.[0]);
  assert.ok(tomorrow.action_cards.find((card) => card.key === "prep")?.items?.[0]);
  assert.doesNotMatch(tomorrow.action_cards.find((card) => card.key === "night").items[0], /^小腹が空いたら、/);
  assert.match(tomorrow.recommendation, /^明日は/);
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
  assert.notEqual(heavy.primary_action.id, tense.primary_action.id);
  assert.notEqual(heavy.food_care_profile.response_key, tense.food_care_profile.response_key);
  assert.notDeepEqual(heavy.food_care_profile.context_chips, tense.food_care_profile.context_chips);
});

test("ショップ用プロファイルは料理名や単日の天気ではなく、体質・不調・余力から作る", () => {
  const damp = build({ trigger: "damp" }).commerce_context;
  const heat = build({ trigger: "heat" }).commerce_context;
  assert.equal(damp.version, "food_commerce_context_v1");
  assert.equal(damp.horizon, "habit");
  assert.deepEqual(damp.policy_keys, heat.policy_keys);
  assert.deepEqual(damp.tcm_function_keys, heat.tcm_function_keys);
  assert.deepEqual(damp.nutrition_need_keys, heat.nutrition_need_keys);
  assert.ok(damp.product_role_keys.includes("daily_tea"));
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
