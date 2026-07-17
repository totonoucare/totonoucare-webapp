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

test("Ekken can expand displayed care using explicit TCM reasoning", () => {
  assert.match(promptSource, /displayed_careは優先する土台だが、提案可能範囲の上限ではない/);
  assert.match(promptSource, /寒涼平温熱の食性/);
  assert.match(promptSource, /酸苦甘辛鹹の五味/);
  assert.match(promptSource, /陰陽、寒熱、燥湿、昇降・出入/);
  assert.match(promptSource, /経絡・体のライン・左右差・動作反応/);
  assert.match(promptSource, /一般的な栄養学・睡眠衛生・運動一般論だけで終えず/);
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
  assert.match(liveRoute, /records_live_support_v9_forecast_hierarchy_2026-07-16/);
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
