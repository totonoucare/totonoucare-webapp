import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "./helpers/rule-read.mjs";

const dailySource = await readFile(new URL("../lib/radar_v1/careRules/dailyCareV2.js", import.meta.url), "utf8");
const dailyUrl = `data:text/javascript;base64,${Buffer.from(dailySource).toString("base64")}`;
const daily = await import(dailyUrl);
const foodSource = await readFile(new URL("../lib/radar_v1/careRules/foodIngredientRules.js", import.meta.url), "utf8");
const foodPrepared = foodSource.replace(/from "\.\/dailyCareV2";/, `from "${dailyUrl}";`);
const foodRules = await import(`data:text/javascript;base64,${Buffer.from(foodPrepared).toString("base64")}`);
const bodySignSource = await readFile(new URL("../lib/radar_v1/bodySignInsights.js", import.meta.url), "utf8");
const bodySigns = await import(`data:text/javascript;base64,${Buffer.from(bodySignSource).toString("base64")}`);

function buildRisk({ symptomFocus = "neck_shoulder", trigger = "temp_shift", secondary = "pressure_up" } = {}) {
  return {
    summary: {
      main_trigger_exact: trigger,
      secondary_trigger_exact: secondary,
      reaction_direction: "accel",
    },
    target: { signal: 1 },
    constitution_context: {
      core_code: "accel_batt_large",
      sub_labels: ["qi_stagnation"],
      symptom_focus: symptomFocus,
      manifestation: { reaction_direction: "accel" },
      axes: { yin_yang_score: 0.8, drive_score: 0.35, obstruction_score: 0.45 },
      split_scores: {
        qi: { deficiency: 0.3, stagnation: 3.2 },
        blood: { deficiency: 0.3, stasis: 0.3 },
        fluid: { deficiency: 0.3, damp: 0.3 },
      },
    },
  };
}

test("乾燥日の睡眠・胃腸サインを具体的な生活語で示す", () => {
  const sleep = bodySigns.buildGroundedBodySignDetails({
    weatherKey: "dry",
    symptomFocus: "sleep",
    signal: 1,
    targetDate: "2026-10-20",
    constitutionContext: buildRisk({ symptomFocus: "sleep", trigger: "dry", secondary: "temp_shift" }),
  });
  const digestion = bodySigns.buildGroundedBodySignDetails({
    weatherKey: "dry",
    symptomFocus: "digestion",
    signal: 1,
    targetDate: "2026-10-21",
    constitutionContext: buildRisk({ symptomFocus: "digestion", trigger: "dry", secondary: "temp_shift" }),
  });

  assert.match(sleep.join(" "), /口や喉の乾燥感が寝つきに響きやすい/);
  assert.match(digestion.join(" "), /喉の乾きや便の硬さが気になりやすい/);
  assert.doesNotMatch([...sleep, ...digestion].join(" "), /乾きで休まりにくい|のどや便通の乾き/);
});

test("水の理由へ香りを持ち込まず水分補給として説明する", () => {
  const riskContext = buildRisk();
  const context = foodRules.buildIngredientFoodContext({
    mode: "today",
    triggerKey: "temp_shift",
    secondaryKey: "pressure_up",
    signal: 1,
    symptomFocus: "neck_shoulder",
    subLabels: ["qi_stagnation"],
    targetDate: "2026-04-15",
    riskContext,
  });
  const drink = context.action_cards.find((card) => card.key === "drink");
  const water = foodRules.DRINK_ITEMS.find((item) => item.name === "水");
  assert.ok(water);
  const copy=water.note;
  assert.match(copy, /水分補給/);
  assert.doesNotMatch(copy, /香りや温度で、手元作業の区切り/);
});

test("保存済み飲み物も現在の主訴と対象日の天気で再選定する", () => {
  const riskContext = buildRisk();
  const plan = daily.enhanceDailyCarePlan({
    baseCarePlan: {
      version: "daily_care_v2_24_2026-08-10_ux_followup_polish",
      tomorrow_food_context: {
        action_cards: [{
          key: "drink",
          label: "今日、食事と合わせる飲み物",
          items: ["水"],
          item_details: [{
            label: "水",
            reasons: [{
              label: "体調との相性",
              text: "水は、温める・冷ますの偏りが少ない飲み物です。香りや温度で、手元作業の区切りをつくる一杯です。",
            }],
          }],
        }],
      },
    },
    forecast: {
      target_date: "2026-04-15",
      signal: 1,
      personal_main_trigger_exact: "temp_shift",
      personal_secondary_trigger_exact: "pressure_up",
      reaction_direction: "accel",
    },
    riskContext,
    mode: "today",
    targetDate: "2026-04-15",
    symptomFocus: "neck_shoulder",
  });
  const drink = plan.tomorrow_food_context.action_cards.find((card) => card.key === "drink");
  const copy = drink.item_details[0].reasons.map((reason) => reason.text).join(" ");

  assert.equal(plan.version, daily.DAILY_CARE_LOGIC_VERSION);
  assert.equal(drink.items.length, 2);
  assert.ok(drink.items.every(name => ['ほうじ茶','デカフェコーヒー','コーヒー','黒豆茶'].includes(name)));
  assert.ok(!drink.items.includes('水'));
  for (const detail of drink.item_details) {
    assert.equal(detail.selection_basis.symptom_focus, 'neck_shoulder');
    assert.equal(detail.selection_basis.target_date, '2026-04-15');
    assert.equal(detail.selection_basis.trigger_key, plan.care_theme.trigger_key);
  }
  assert.match(copy, /香り/);
  assert.doesNotMatch(copy, /香りや温度で、手元作業の区切り/);
});
