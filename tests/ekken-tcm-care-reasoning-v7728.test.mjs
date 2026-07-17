import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const importSource = async (relativePath) => {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
};

const prompts = await importSource("../lib/records/aiPrompts.js");
const promptSource = await readFile(new URL("../lib/records/aiPrompts.js", import.meta.url), "utf8");
const contextSource = await readFile(new URL("../lib/records/aiContext.js", import.meta.url), "utf8");
const liveRoute = await readFile(new URL("../app/api/records/live-chat/route.js", import.meta.url), "utf8");
const periodRoute = await readFile(new URL("../app/api/records/chat/route.js", import.meta.url), "utf8");
const livePanel = await readFile(new URL("../components/records/LiveSupportPanel.jsx", import.meta.url), "utf8");

test("Ekken can expand displayed care with broad TCM freedom", () => {
  assert.match(promptSource, /displayed_care以外の低リスクな応用案も提案してよい/);
  assert.match(promptSource, /食性・五味・五臓・寒熱燥湿・調理法/);
  assert.match(promptSource, /陰陽・季節・時刻・環境・休息と活動/);
  assert.match(promptSource, /経絡・身体反応・刺激量/);
  assert.match(promptSource, /今回に関係する材料を自由に選び、統合して考える/);
});

test("product context carries separate reasoning axes for eat live and loosen", () => {
  assert.match(contextSource, /寒涼平温熱の食性/);
  assert.match(contextSource, /酸苦甘辛鹹の五味/);
  assert.match(contextSource, /季節と時刻/);
  assert.match(contextSource, /押す・さする・動かす・呼吸/);
  assert.match(contextSource, /表示済みケアは土台だが提案可能範囲の上限ではない/);
});

test("general OTC kampo and supplement guidance is not deterministically blocked", () => {
  for (const message of [
    "市販の漢方を買う時の選び方を教えて",
    "この漢方とあの漢方の違いを比べて",
    "サプリの成分とパッケージの見方を教えて",
    "この症状なら市販品で様子を見る範囲はどこまで？",
  ]) {
    assert.equal(prompts.isProfessionalText(message), false, message);
  }
});

test("final medication actions still receive deterministic professional confirmation", () => {
  for (const message of [
    "この漢方を飲み始めても大丈夫？",
    "処方薬をやめても大丈夫？",
    "何錠に増量したらいい？",
    "この薬とサプリを一緒に飲んで大丈夫？",
    "副作用が出たかもしれない。どうしたらいい？",
  ]) {
    assert.equal(prompts.isProfessionalText(message), true, message);
  }
  assert.match(prompts.PROFESSIONAL_MESSAGE, /一般的な違い、選び方、確認ポイントまではEkkenと整理できます/);
  assert.match(prompts.PROFESSIONAL_MESSAGE, /最終判断だけ/);
});

test("live and period chat use the richer prompt versions and medium reasoning", () => {
  assert.match(liveRoute, /records_live_support_v11_living_language_2026-07-17/);
  assert.match(periodRoute, /records_chat_v11_forecast_hierarchy_2026-07-16/);
  assert.match(liveRoute, /max_output_tokens: 1800/);
  assert.match(periodRoute, /max_output_tokens: 1700/);
  assert.match(liveRoute, /reasoning: \{ effort: "medium" \}/);
  assert.match(periodRoute, /reasoning: \{ effort: "medium" \}/);
});

test("visible disclaimer describes the actual medication boundary", () => {
  assert.match(livePanel, /一般的な違い・選び方・確認点を整理できます/);
  assert.match(livePanel, /開始・中止・用量・併用可否の最終判断/);
  assert.doesNotMatch(livePanel, /薬・漢方・サプリの個別判断を行いません/);
});
