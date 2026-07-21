import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dailySource = await readFile(new URL("../lib/radar_v1/careRules/dailyCareV2.js", import.meta.url), "utf8");
const daily = await import(`data:text/javascript;base64,${Buffer.from(dailySource).toString("base64")}`);
const pageSource = await readFile(new URL("../app/radar/page.js", import.meta.url), "utf8");
const tsuboSource = await readFile(new URL("../lib/radar_v1/careRules/todayTsuboRules.js", import.meta.url), "utf8");
const actionSource = await readFile(new URL("../lib/radar_v1/careActionItems.js", import.meta.url), "utf8");
const radarPlanSource = await readFile(new URL("../lib/radar_v1/buildRadarPlan.js", import.meta.url), "utf8");
const actions = await import(`data:text/javascript;base64,${Buffer.from(actionSource).toString("base64")}`);

const riskContext = {
  constitution_context: {
    core_code: "accel_batt_small",
    sub_labels: ["qi_stagnation", "qi_deficiency"],
    symptom_focus: "mood",
    primary_meridian: "lung_li",
    secondary_meridian: "liver_gb",
  },
};

function build(date) {
  return daily.enhanceDailyCarePlan({
    baseCarePlan: {
      lifestyle_plan: {
        title: "湿気の日",
        lead: "重さをためない",
        steps: ["5分換気する", "食後に少し歩く", "首元を楽にする"],
        trap: "冷たい甘いものを重ねない",
      },
      tomorrow_food_context: {
        action_cards: [
          { key: "drink", label: "飲み物", body: "少しずつ", items: ["ほうじ茶", "麦茶"] },
          { key: "caution", label: "控える", body: "重ねない", items: ["冷たい甘い飲み物"] },
        ],
        caution_items: ["冷たい甘い飲み物を一気に飲む"],
      },
      night_tsubo_set: { points: [{ code: "PC6", name_ja: "内関" }] },
    },
    forecast: { target_date: date, signal: 1 },
    riskContext: {
      ...riskContext,
      summary: {
        main_trigger_exact: "damp",
        secondary_trigger_exact: "heat",
      },
      target: { signal: 1 },
    },
    mode: "today",
    targetDate: date,
    symptomFocus: "mood",
  });
}

test("Daily Care v2 uses one shared theme for lifestyle, food and loosen care", () => {
  const plan = build("2026-07-18");
  assert.equal(plan.version, daily.DAILY_CARE_LOGIC_VERSION);
  assert.ok(plan.care_theme.policies.slice(0, 2).some((policy) => policy.key === "nagasu"));
  assert.equal(plan.lifestyle_plan.care_theme, plan.care_theme);
  assert.equal(plan.tomorrow_food_context.care_theme, plan.care_theme);
  assert.equal(plan.night_tsubo_set.care_theme, plan.care_theme);
  assert.match(plan.care_theme.summary, /重だるさ|重さ|ながす|逃が/);
});

test("same conditions rotate the concrete daily action across adjacent dates but stay stable on reload", () => {
  const day1a = build("2026-07-18");
  const day1b = build("2026-07-18");
  const day2 = build("2026-07-19");

  assert.equal(day1a.lifestyle_plan.primary_action.id, day1b.lifestyle_plan.primary_action.id);
  assert.equal(day1a.tomorrow_food_context.primary_action.id, day1b.tomorrow_food_context.primary_action.id);
  assert.notEqual(day1a.lifestyle_plan.primary_action.id, day2.lifestyle_plan.primary_action.id);
  assert.notEqual(day1a.tomorrow_food_context.primary_action.id, day2.tomorrow_food_context.primary_action.id);
});

test("the main display is concise and keeps alternatives behind secondary fields", () => {
  const plan = build("2026-07-18");
  const food = plan.tomorrow_food_context;
  assert.equal(food.action_cards.filter((card) => card.primary).length, 1);
  assert.equal(food.action_cards[0].items.length, 1);
  assert.ok(food.alternatives.length <= 2);
  assert.equal(food.caution_items.length, 1);
  assert.equal(plan.lifestyle_plan.steps.length, 3);
  assert.ok(plan.lifestyle_plan.primary_action.label.length > 0);
  assert.match(pageSource, /primaryFoodCard/);
  assert.match(pageSource, /lifestylePrimaryAction/);
  assert.match(pageSource, /別案・気をつけたいこと/);
});

test("reserve and forecast mode change the permitted stimulus instead of changing the forecast", () => {
  const small = daily.buildDailyCareTheme({
    triggerKey: "pressure_up",
    signal: 2,
    riskContext,
  });
  const large = daily.buildDailyCareTheme({
    triggerKey: "pressure_up",
    signal: 0,
    riskContext: {
      constitution_context: { ...riskContext.constitution_context, core_code: "accel_batt_large" },
    },
  });
  assert.equal(small.stimulus, "弱め・短め");
  assert.equal(small.intensity, "high");
  assert.equal(large.intensity, "low");
  assert.notEqual(small.stimulus, large.stimulus);
});

test("meridian line care is a first-class recordable Daily Care item", () => {
  const plan = build("2026-07-18");
  assert.equal(plan.night_tsubo_set.line_care.meridian_code, "lung_li");
  assert.match(plan.night_tsubo_set.line_care.label, /鎖骨/);
  const displayed = actions.buildDisplayedCareItems({
    sourceMode: "today",
    lifestylePlan: plan.lifestyle_plan,
    food: plan.tomorrow_food_context,
    tsuboSet: plan.night_tsubo_set,
    tsuboPoints: plan.night_tsubo_set.points,
  });
  const line = displayed.find((item) => item.kind === "tsubo_line_care");
  assert.ok(line);
  assert.equal(line.meta.meridian_code, "lung_li");
  assert.match(line.item_key, /^v3:loosen:line_care:/);
});


test("Daily Care enhancement leaves the calculated forecast object untouched", () => {
  const forecast = {
    target_date: "2026-07-18",
    signal: 2,
    score_display_0_10: 7.4,
    personal_main_trigger_exact: "damp",
    personal_secondary_trigger_exact: "heat",
  };
  const before = structuredClone(forecast);
  daily.enhanceDailyCarePlan({
    baseCarePlan: {},
    forecast,
    riskContext,
    mode: "today",
    targetDate: forecast.target_date,
    symptomFocus: "mood",
  });
  assert.deepEqual(forecast, before);
});

test("today point selection explicitly scores registered meridian lines", () => {
  assert.match(tsuboSource, /POINTS_BY_MERIDIAN_LINE/);
  assert.match(tsuboSource, /primaryMeridian/);
  assert.match(tsuboSource, /secondaryMeridian/);
  assert.match(tsuboSource, /主経絡ライン/);
});

test("tomorrow care plans persist the enhanced food and meridian-line structure", () => {
  assert.match(radarPlanSource, /enhanceDailyCarePlan/);
  assert.match(radarPlanSource, /finalTsuboSet/);
  assert.match(radarPlanSource, /tomorrowFoodContext = dailyCarePlan\.tomorrow_food_context/);
});
