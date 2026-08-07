import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dailySource = await readFile(new URL("../lib/radar_v1/careRules/dailyCareV2.js", import.meta.url), "utf8");
const pageSource = await readFile(new URL("../app/radar/page.js", import.meta.url), "utf8");
const daily = await import(`data:text/javascript;base64,${Buffer.from(dailySource).toString("base64")}`);

const WEATHER_LABELS = {
  damp: "湿気",
  heat: "高温",
  dry: "乾燥",
  cold: "低温",
  pressure_down: "気圧低下",
  pressure_up: "気圧上昇",
  temp_shift: "寒暖差",
};

function build({
  trigger = "heat",
  symptomFocus = "neck_shoulder",
  mode = "today",
  date = "2026-08-07",
  coreCode = "accel_batt_large",
  reactionDirection = "accel",
  subLabels = ["qi_stagnation"],
  withDrinks = true,
} = {}) {
  const baseFood = withDrinks ? {
    action_cards: [{
      key: "drink",
      body: `${WEATHER_LABELS[trigger]}の日の温度と量に合わせます。`,
      items: [
        "◎ 麦茶：カフェインを含まず、暑い日の水分補給に取り入れやすい",
        "○ ほうじ茶：香ばしく、温度と量を調整しやすい",
      ],
    }],
  } : {};
  return daily.enhanceDailyCarePlan({
    baseCarePlan: { tomorrow_food_context: baseFood },
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

test("導入文は否定比較から入らず、天気・反応・不調・食べ方を直接示す", () => {
  const heat = build({ trigger: "heat" });
  const dry = build({ trigger: "dry" });
  assert.match(heat.recommendation, /高温の予報/);
  assert.match(heat.recommendation, /アクセル寄りの反応/);
  assert.match(heat.recommendation, /首肩のつらさ/);
  assert.doesNotMatch(heat.recommendation, /より|ではなく|栄養を足し続ける|小さく区切る/);
  assert.match(dry.recommendation, /乾燥の予報/);
  assert.notEqual(heat.recommendation, dry.recommendation);
  assert.notEqual(heat.primary_action.id, dry.primary_action.id);
  assert.ok(heat.context_chips.includes("高温"));
  assert.ok(dry.context_chips.includes("乾燥"));
});

test("食事と飲み物を主表示に残し、控えたい物と追加候補は詳細へ送る", () => {
  const food = build();
  const prominentKeys = food.action_cards.filter((card) => card.primary || card.prominent).map((card) => card.key);
  assert.deepEqual(prominentKeys, ["choice", "drink"]);
  const drink = food.action_cards.find((card) => card.key === "drink");
  assert.deepEqual(drink.items, ["麦茶", "ほうじ茶"]);
  assert.deepEqual(drink.item_details[0].reasons.map((reason) => reason.label), ["体調との相性", "成分・飲み方"]);
  assert.ok(food.action_cards.find((card) => card.key === "caution"));
  assert.match(pageSource, /itemDetail\.reasons/);
});

test("買う・外食は一つの作らない選択へまとめ、入手場面だけ明示する", () => {
  const food = build();
  assert.equal(food.action_cards.some((card) => card.key === "buy" || card.key === "eat_out"), false);
  const noCook = food.action_cards.find((card) => card.key === "no_cook");
  assert.equal(noCook.items.length, 2);
  assert.match(noCook.items[0], /^コンビニ・スーパー｜/);
  assert.match(noCook.items[1], /^外食｜/);
  assert.equal(noCook.item_details.length, 2);
});

test("食事候補は体調との相性を先、栄養面を補足として表示する", () => {
  const food = build();
  for (const card of food.action_cards.filter((item) => ["choice", "no_cook", "alternative", "night"].includes(item.key))) {
    for (const detail of card.item_details || []) {
      assert.deepEqual(detail.reasons.map((reason) => reason.label), ["体調との相性", "栄養面"]);
      assert.ok(detail.reasons.every((reason) => reason.text.length >= 20));
      assert.ok(detail.focus_ingredients.length >= 1);
      assert.equal(detail.meal_example.length > 0, true);
    }
  }
});

test("通常表示へ専門店前提の外国料理名を出さない", () => {
  const triggers = Object.keys(WEATHER_LABELS);
  const symptoms = ["fatigue", "sleep", "digestion", "neck_shoulder", "low_back_pain", "swelling", "headache", "dizziness", "mood"];
  const specialtyNames = /クスクス|タジン|ピタサンド|アクアパッツァ|ブルグル|ファラフェル|ムサカ|ニース風|フォー|トルティーヤ|ブリトー|パエリア|チリコンカン|トルティージャ/;
  for (const trigger of triggers) {
    for (const symptomFocus of symptoms) {
      for (const mode of ["today", "tomorrow"]) {
        const food = build({ trigger, symptomFocus, mode, withDrinks: false });
        const visibleFood = food.action_cards.flatMap((card) => card.items || []).join("\n");
        assert.doesNotMatch(visibleFood, specialtyNames, `${trigger}/${symptomFocus}/${mode}`);
      }
    }
  }
});
