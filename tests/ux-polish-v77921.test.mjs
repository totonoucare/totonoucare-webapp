import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dailySource = await readFile(new URL("../lib/radar_v1/careRules/dailyCareV2.js", import.meta.url), "utf8");
const dailyUrl = `data:text/javascript;base64,${Buffer.from(dailySource).toString("base64")}`;
const daily = await import(dailyUrl);
const foodSource = await readFile(new URL("../lib/radar_v1/careRules/foodIngredientRules.js", import.meta.url), "utf8");
const preparedFoodSource = foodSource.replace(/from "\.\/dailyCareV2";/, `from "${dailyUrl}";`);
const foodRules = await import(`data:text/javascript;base64,${Buffer.from(preparedFoodSource).toString("base64")}`);
const radarPageSource = await readFile(new URL("../app/radar/page.js", import.meta.url), "utf8");
const navSource = await readFile(new URL("../components/nav/BottomTabs.js", import.meta.url), "utf8");
const checkSource = await readFile(new URL("../app/check/page.js", import.meta.url), "utf8");
const homeSource = await readFile(new URL("../app/HomeClient.jsx", import.meta.url), "utf8");

test("明日のほぐすは時制と行う場面が今日から変わる", () => {
  const today = daily.buildMeridianLineCare({
    theme: { mode: "today", primary_meridian: "lung_li", stimulus: "やさしく短く" },
  });
  const tomorrow = daily.buildMeridianLineCare({
    theme: { mode: "tomorrow", primary_meridian: "lung_li", stimulus: "やさしく短く" },
  });
  assert.match(today.label, /鎖骨の下を内側から肩先へ/);
  assert.match(tomorrow.label, /寝る前/);
  assert.notEqual(today.label, tomorrow.label);
  assert.match(radarPageSource, /selectedIsToday \? "今日の一手" : "今夜〜明朝の一手"/);
});

test("記録ナビは記録トップへ着地し、全画面共通文字は12px以上にする", async () => {
  assert.match(navSource, /"記録・相談", IconChat, "\/records"/);
  assert.doesNotMatch(navSource, /"記録・相談", IconChat, "\/records\?tab=consult"/);
  const uiFiles = [
    "../app/HomeClient.jsx",
    "../app/check/page.js",
    "../app/radar/page.js",
    "../app/care-navi/page.js",
    "../app/guide/GuideClient.jsx",
    "../components/nav/BottomTabs.js",
    "../components/records/DailyRecordCard.jsx",
    "../components/records/RecordsTrendChart.jsx",
    "../components/records/AiAnalysisPanel.jsx",
    "../components/records/LiveSupportPanel.jsx",
  ];
  for (const path of uiFiles) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.doesNotMatch(source, /text-\[(?:8|8\.5|9|9\.5|10|11)px\]/, path);
  }
});

test("体質チェックは最大問数に合う時間を示し、古い機械比喩を使わない", () => {
  const combined = `${checkSource}\n${homeSource}`;
  assert.match(combined, /約4〜6分/);
  assert.match(combined, /最大5問/);
  assert.doesNotMatch(combined, /約3分/);
  assert.doesNotMatch(dailySource, /食養生では/);
});

test("高温と湿気が主条件の日は、胃腸が弱くても白湯を第一候補へ固定しない", () => {
  const food = foodRules.buildIngredientFoodContext({
    mode: "today",
    triggerKey: "heat",
    secondaryKey: "damp",
    signal: 2,
    symptomFocus: "digestion",
    subLabels: ["qi_deficiency", "fluid_damp"],
    targetDate: "2026-08-08",
    riskContext: {
      summary: { reaction_direction: "brake" },
      constitution_context: {
        sub_labels: ["qi_deficiency", "fluid_damp"],
        manifestation: { reaction_direction: "brake" },
      },
    },
  });
  const drink = food.action_cards.find((card) => card.key === "drink");
  assert.ok(drink?.items?.length);
  assert.notEqual(drink.items[0], "白湯", drink.items.join(" / "));
});

test("明日の飲み物が同じ時の理由と、寒い日の麻婆豆腐の温かさを画面文で説明する", () => {
  const food = foodRules.buildIngredientFoodContext({
    mode: "tomorrow",
    triggerKey: "cold",
    secondaryKey: "dry",
    signal: 1,
    symptomFocus: "low_back_pain",
    subLabels: ["blood_stasis", "qi_stagnation"],
    targetDate: "2026-12-08",
    riskContext: {
      summary: { reaction_direction: "accel" },
      constitution_context: {
        sub_labels: ["blood_stasis", "qi_stagnation"],
        manifestation: { reaction_direction: "accel" },
      },
    },
  });
  const drink = food.action_cards.find((card) => card.key === "drink");
  assert.match(drink.body, /今日と同じ候補が残る場合/);
  assert.match(dailySource, /生姜とねぎを使った辛くない麻婆豆腐/);
  assert.match(dailySource, /温かい豆腐料理/);
});

