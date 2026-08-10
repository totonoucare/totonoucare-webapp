import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dailySource = await readFile(new URL("../lib/radar_v1/careRules/dailyCareV2.js", import.meta.url), "utf8");
const dailyUrl = `data:text/javascript;base64,${Buffer.from(dailySource).toString("base64")}`;
const foodSource = await readFile(new URL("../lib/radar_v1/careRules/foodIngredientRules.js", import.meta.url), "utf8");
const preparedFoodSource = foodSource.replace(/from "\.\/dailyCareV2";/, `from "${dailyUrl}";`);
const foodRules = await import(`data:text/javascript;base64,${Buffer.from(preparedFoodSource).toString("base64")}`);

function buildFood({
  mode = "today",
  date = "2026-08-08",
  triggerKey = "heat",
  secondaryKey = "damp",
  symptomFocus = "digestion",
  reactionDirection = "brake",
  subLabels = ["qi_deficiency", "fluid_damp"],
  coreCode = "brake_batt_small",
} = {}) {
  return foodRules.buildIngredientFoodContext({
    mode,
    triggerKey,
    secondaryKey,
    signal: 2,
    symptomFocus,
    subLabels,
    targetDate: date,
    riskContext: {
      summary: { reaction_direction: reactionDirection },
      constitution_context: {
        core_code: coreCode,
        sub_labels: subLabels,
        symptom_focus: symptomFocus,
        manifestation: { reaction_direction: reactionDirection },
      },
    },
  });
}

test("高温多湿で胃腸が気になる日は、温寄りのほうじ茶を第一候補にしない", () => {
  const food = buildFood();
  const drink = food.action_cards.find((card) => card.key === "drink");
  assert.ok(drink, JSON.stringify(food));
  assert.ok(["とうもろこし茶", "麦茶"].includes(drink.items[0]), drink.items.join(" / "));
  assert.notEqual(drink.items[0], "ほうじ茶");
  assert.deepEqual(drink.item_details[0].reasons.map((reason) => reason.label), ["体調との相性", "成分・飲み方"]);
  assert.match(drink.item_details[0].reasons[1].text, /常温|冷やしすぎず/);
});

test("胃腸の予報文を、調子が出るではなく調子が崩れると表現する", () => {
  const food = buildFood();
  assert.match(food.recommendation, /胃腸の調子が崩れやすい見込み/);
  assert.doesNotMatch(food.recommendation, /胃腸の調子が出やすい/);
});

test("料理理由は天気と不調を代表する食材を主役にする", () => {
  let target = null;
  for (let day = 1; day <= 31 && !target; day += 1) {
    const food = buildFood({ date: `2026-08-${String(day).padStart(2, "0")}` });
    for (const card of food.action_cards) {
      const index = (card.items || []).findIndex((item) => item.includes("豚しゃぶと焼きなすのみょうが梅だれ"));
      if (index >= 0) target = card.item_details[index];
    }
  }
  assert.ok(target, "監修候補の豚しゃぶ・なす・みょうが梅だれがテスト期間に選ばれませんでした");
  const reason = target.reasons.find((item) => item.label === "体調との相性")?.text || "";
  assert.match(reason, /なす/);
  assert.match(reason, /みょうが|梅/);
  assert.doesNotMatch(reason, /^豚肉を消耗した日の食事を支える/);
});

test("冬の明朝候補は温かさが画面上でも分かる", () => {
  const food = buildFood({
    mode: "tomorrow",
    date: "2026-12-08",
    triggerKey: "cold",
    secondaryKey: "dry",
    symptomFocus: "low_back_pain",
    reactionDirection: "accel",
    subLabels: ["blood_stasis", "qi_stagnation"],
    coreCode: "accel_batt_large",
  });
  const primary = food.action_cards.find((card) => card.key === "choice")?.items?.[0] || "";
  assert.match(primary, /温か|スープ|汁|生姜|ねぎ|みそ/);
});

test("選定ロジックの事情をユーザー向け本文へ出さない", () => {
  const audited = `${dailySource}\n${foodSource}`;
  assert.doesNotMatch(audited, /今日と同じ候補が残る場合|同じ候補が残る/);
});
