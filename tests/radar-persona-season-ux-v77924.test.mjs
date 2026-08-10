import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dailySource = await readFile(new URL("../lib/radar_v1/careRules/dailyCareV2.js", import.meta.url), "utf8");
const dailyUrl = `data:text/javascript;base64,${Buffer.from(dailySource).toString("base64")}`;
const daily = await import(dailyUrl);
const foodSource = await readFile(new URL("../lib/radar_v1/careRules/foodIngredientRules.js", import.meta.url), "utf8");
const foodPrepared = foodSource.replace(/from "\.\/dailyCareV2";/, `from "${dailyUrl}";`);
const foodRules = await import(`data:text/javascript;base64,${Buffer.from(foodPrepared).toString("base64")}`);

const SEASONS = {
  spring: { trigger: "temp_shift", secondary: "pressure_up", today: "2026-04-15", tomorrow: "2026-04-16" },
  summer: { trigger: "heat", secondary: "damp", today: "2026-08-04", tomorrow: "2026-08-05" },
  autumn: { trigger: "dry", secondary: "temp_shift", today: "2026-10-20", tomorrow: "2026-10-21" },
  winter: { trigger: "cold", secondary: "pressure_down", today: "2026-01-20", tomorrow: "2026-01-21" },
};

// バランス型を作らず、実在する二つの反応方向と余力の大小だけで置く。
const PERSONAS = [
  { id: "P1", symptom: "neck_shoulder", reaction: "accel", core: "accel_batt_large", sub: ["qi_stagnation"] },
  { id: "P2", symptom: "digestion", reaction: "brake", core: "brake_batt_small", sub: ["fluid_damp", "qi_deficiency"] },
  { id: "P3", symptom: "low_back_pain", reaction: "brake", core: "brake_batt_small", sub: ["qi_deficiency", "blood_stasis"] },
  { id: "P4", symptom: "headache", reaction: "accel", core: "accel_batt_large", sub: ["qi_stagnation", "fluid_deficiency"] },
  { id: "P5", symptom: "sleep", reaction: "brake", core: "brake_batt_small", sub: ["blood_deficiency", "fluid_deficiency"] },
];

function buildRisk(persona, season) {
  const brake = persona.reaction === "brake";
  return {
    summary: {
      main_trigger_exact: season.trigger,
      secondary_trigger_exact: season.secondary,
      reaction_direction: persona.reaction,
    },
    target: { signal: 1 },
    constitution_context: {
      core_code: persona.core,
      sub_labels: persona.sub,
      symptom_focus: persona.symptom,
      manifestation: { reaction_direction: persona.reaction },
      axes: {
        yin_yang_score: brake ? -0.8 : 0.8,
        drive_score: persona.core.includes("small") ? -0.8 : 0.35,
        obstruction_score: 0.45,
      },
      split_scores: {
        qi: {
          deficiency: persona.sub.includes("qi_deficiency") ? 3.2 : 0.3,
          stagnation: persona.sub.includes("qi_stagnation") ? 3.2 : 0.3,
        },
        blood: {
          deficiency: persona.sub.includes("blood_deficiency") ? 3.2 : 0.3,
          stasis: persona.sub.includes("blood_stasis") ? 3.2 : 0.3,
        },
        fluid: {
          deficiency: persona.sub.includes("fluid_deficiency") ? 3.2 : 0.3,
          damp: persona.sub.includes("fluid_damp") ? 3.2 : 0.3,
        },
      },
    },
  };
}

function buildLifestyle(persona, season, mode) {
  const date = mode === "today" ? season.today : season.tomorrow;
  return daily.enhanceDailyCarePlan({
    baseCarePlan: {},
    forecast: {
      target_date: date,
      signal: 1,
      personal_main_trigger_exact: season.trigger,
      personal_secondary_trigger_exact: season.secondary,
      reaction_direction: persona.reaction,
    },
    riskContext: buildRisk(persona, season),
    mode,
    targetDate: date,
    symptomFocus: persona.symptom,
  }).lifestyle_plan;
}

function buildFood(persona, season, mode) {
  const date = mode === "today" ? season.today : season.tomorrow;
  return foodRules.buildIngredientFoodContext({
    mode,
    triggerKey: season.trigger,
    secondaryKey: season.secondary,
    signal: 1,
    symptomFocus: persona.symptom,
    subLabels: persona.sub,
    targetDate: date,
    riskContext: buildRisk(persona, season),
  });
}

function cases() {
  return PERSONAS.flatMap((persona) => Object.entries(SEASONS).map(([seasonName, season]) => {
    const lifestyleToday = buildLifestyle(persona, season, "today");
    const lifestyleTomorrow = buildLifestyle(persona, season, "tomorrow");
    const foodToday = buildFood(persona, season, "today");
    const foodTomorrow = buildFood(persona, season, "tomorrow");
    return { persona, seasonName, season, lifestyleToday, lifestyleTomorrow, foodToday, foodTomorrow };
  }));
}

const ALL_CASES = cases();

test("5人×春夏秋冬の20条件で、暮らす・食事・飲み物が欠けない", () => {
  assert.equal(ALL_CASES.length, 20);
  for (const item of ALL_CASES) {
    const key = `${item.persona.id}/${item.seasonName}`;
    assert.ok(item.lifestyleToday.primary_action, `${key}/lifestyle today`);
    assert.ok(item.lifestyleTomorrow.primary_action, `${key}/lifestyle tomorrow`);
    assert.ok(item.foodToday.action_cards.find((card) => card.key === "choice"), `${key}/meal today`);
    assert.ok(item.foodTomorrow.action_cards.find((card) => card.key === "choice"), `${key}/meal tomorrow`);
    assert.ok(item.foodToday.action_cards.find((card) => card.key === "drink"), `${key}/drink today`);
    assert.ok(item.foodTomorrow.action_cards.find((card) => card.key === "drink"), `${key}/drink tomorrow`);
  }
});

test("暮らすの予測文はカード理由を重ねず、不調ごとの崩れ方を先に伝える", () => {
  for (const item of ALL_CASES) {
    const insight = item.lifestyleToday.forecast_insight;
    const reason = item.lifestyleToday.primary_action.reason;
    assert.ok(insight.length >= 25);
    assert.equal(insight.includes(reason), false, `${item.persona.id}/${item.seasonName}`);
    assert.match(insight, /予報.*反応.*見込み/);
  }
});

test("胃腸を含む全ペルソナで、四季の暮らす主提案が一種類へ固定されない", () => {
  for (const persona of PERSONAS) {
    const ids = ALL_CASES
      .filter((item) => item.persona.id === persona.id)
      .map((item) => item.lifestyleToday.primary_action.id);
    assert.ok(new Set(ids).size >= 2, `${persona.id}: ${ids.join(" / ")}`);
  }
  const digestionIds = ALL_CASES
    .filter((item) => item.persona.id === "P2")
    .map((item) => item.lifestyleToday.primary_action.id);
  assert.ok(new Set(digestionIds).size >= 3, digestionIds.join(" / "));
});

test("秋冬の主献立へ、季節外れの夏料理と料理名内の飲み物を出さない", () => {
  const obviousSummer = /トマト・きゅうり.*柑橘|ズッキーニ.*バジルトマト|焼きなす.*みょうが|冬瓜/;
  const embeddedDrink = /麦茶|ほうじ茶|緑茶|ルイボス|白湯/;
  for (const item of ALL_CASES) {
    const todayMeal = item.foodToday.action_cards.find((card) => card.key === "choice")?.items?.[0] || "";
    const tomorrowMeal = item.foodTomorrow.action_cards.find((card) => card.key === "choice")?.items?.[0] || "";
    assert.doesNotMatch(todayMeal, embeddedDrink, `${item.persona.id}/${item.seasonName}/today`);
    assert.doesNotMatch(tomorrowMeal, embeddedDrink, `${item.persona.id}/${item.seasonName}/tomorrow`);
    if (["autumn", "winter"].includes(item.seasonName)) {
      assert.doesNotMatch(todayMeal, obviousSummer, `${item.persona.id}/${item.seasonName}/today`);
      assert.doesNotMatch(tomorrowMeal, obviousSummer, `${item.persona.id}/${item.seasonName}/tomorrow`);
    }
  }
});

test("今日と明日は主献立を変え、飲み物は同名でも用途と時間帯を書き分ける", () => {
  for (const item of ALL_CASES) {
    const key = `${item.persona.id}/${item.seasonName}`;
    const todayMeal = item.foodToday.action_cards.find((card) => card.key === "choice")?.items?.[0];
    const tomorrowMeal = item.foodTomorrow.action_cards.find((card) => card.key === "choice")?.items?.[0];
    const todayDrink = item.foodToday.action_cards.find((card) => card.key === "drink");
    const tomorrowDrink = item.foodTomorrow.action_cards.find((card) => card.key === "drink");
    assert.notEqual(todayMeal, tomorrowMeal, `${key}/meal`);
    assert.equal(todayDrink.label, "今日、食事と合わせる飲み物");
    assert.equal(tomorrowDrink.label, "今夜〜明朝の飲み物");
    assert.notEqual(todayDrink.body, tomorrowDrink.body, `${key}/drink body`);
    assert.match(todayDrink.item_details[0].reasons.at(-1).text, /今日は食事中から食後/);
    assert.match(tomorrowDrink.item_details[0].reasons.at(-1).text, /今夜|明日の朝/);
  }
});

test("ユーザー表示へ開発者文・不自然な比喩・曖昧な操作語を戻さない", () => {
  const forbidden = /今日と同じ候補が残る場合|しっくりこない時|栄養を足し続けるより|一皿で食事を小さく区切る|刺激を押すより|指先を追いかけず|手のひらを端末へ押しつける|細い持ち手|電池切れ|エンジンがかからない/;
  for (const item of ALL_CASES) {
    assert.doesNotMatch(JSON.stringify(item), forbidden, `${item.persona.id}/${item.seasonName}`);
  }
});
