import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("user-facing care feature name is 対策ケア across records, guide, shop, result and settings", async () => {
  const paths = [
    "components/records/DailyRecordCard.jsx",
    "app/api/radar/review/route.js",
    "app/care-navi/page.js",
    "app/guide/GuideClient.jsx",
    "app/result/[id]/page.js",
    "app/settings/page.js",
  ];
  const texts = await Promise.all(paths.map(source));
  for (const text of texts) {
    assert.doesNotMatch(text, /Daily Care|デイリーケア|ケア提案/);
  }
  assert.match(texts[0], /対策ケアで「やってみた」と記録した内容です/);
  assert.match(texts[2], /体調予報の対策ケアから使用を記録できます/);
  assert.match(texts[3], /今日・明日に行う対策ケアを確認/);
  assert.match(texts[5], /トリセツ、体調予報、対策ケアの見方/);
});

test("records use the same forecast mode and weather labels as the forecast page", async () => {
  const configSource = await source("components/records/reviewConfig.js");
  const config = await import(
    `data:text/javascript;base64,${Buffer.from(configSource).toString("base64")}`
  );
  assert.equal(config.signalLabel(0), "安定");
  assert.equal(config.signalLabel(1), "いたわり");
  assert.equal(config.signalLabel(2), "守り");
  assert.equal(config.triggerLabel("temp", "down"), "低温");
  assert.equal(config.triggerLabel("temp", "up"), "高温");
  assert.equal(config.triggerLabel("humidity", "up"), "湿気");

  const recordsUi = [
    await source("components/records/DailyRecordCard.jsx"),
    await source("components/records/ForecastPatternCards.jsx"),
    await source("components/records/RecordsTrendChart.jsx"),
    await source("components/records/RecordsPageClient.jsx"),
    await source("app/guide/GuideClient.jsx"),
  ].join("\n");
  assert.doesNotMatch(recordsUi, /注意予報|要警戒/);
  assert.match(recordsUi, /いたわり・守り/);
});

test("Ekken receives the current care and forecast terminology", async () => {
  const aiContext = await source("lib/records/aiContext.js");
  const aiPrompts = await source("lib/records/aiPrompts.js");
  const analysis = await source("lib/records/analysis.js");
  for (const text of [aiContext, aiPrompts, analysis]) {
    assert.doesNotMatch(text, /Daily Care|注意予報/);
  }
  assert.match(aiContext, /対策ケアカード/);
  assert.match(aiPrompts, /performed_care_itemsは、対策ケアでアプリが提案/);
  assert.match(analysis, /いたわり・守り予報でも穏やか/);
});

test("internal Daily Care module name remains compatible", async () => {
  const internalModule = await source("lib/radar_v1/careRules/dailyCareV2.js");
  assert.match(internalModule, /Daily Care v2/);
});
