import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const importSource = async (relativePath) => {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
};

const prompts = await importSource("../lib/records/aiPrompts.js");
const messageWindow = await importSource("../lib/records/messageWindow.js");
const greeting = await importSource("../lib/records/liveSupportGreeting.js");
const liveUi = await importSource("../lib/records/liveSupportUi.js");

const eventsRoute = await readFile(new URL("../app/api/records/events/route.js", import.meta.url), "utf8");
const consentRoute = await readFile(new URL("../app/api/records/consent/route.js", import.meta.url), "utf8");
const panelSource = await readFile(new URL("../components/records/LiveSupportPanel.jsx", import.meta.url), "utf8");
const qualityMigration = await readFile(new URL("../supabase/migrations/20260714_add_live_support_quality_v7722.sql", import.meta.url), "utf8");

test("latest message window keeps the newest 100 but returns chronological order", () => {
  const newestFirst = Array.from({ length: 150 }, (_, index) => ({ id: 150 - index }));
  const result = messageWindow.chronologicalFromNewest(newestFirst, 100);
  assert.equal(result.length, 100);
  assert.equal(result[0].id, 51);
  assert.equal(result.at(-1).id, 150);
});

test("urgent phrase variants enter a safety route", () => {
  for (const phrase of [
    "息苦しい",
    "胸が痛い",
    "言葉がうまく出ない",
    "突然ひどい頭痛",
    "生きることに疲れた",
  ]) {
    assert.equal(prompts.isUrgentText(phrase), true, phrase);
  }
  assert.equal(prompts.urgentTextKind("生きることに疲れた"), "self_harm");
  assert.equal(prompts.urgentTextKind("胸が痛い"), "medical");
  assert.match(prompts.urgentMessageForText("生きることに疲れた"), /ひとりで抱えない/);
});

test("professional routing is limited to individual medication decisions", () => {
  assert.equal(prompts.isProfessionalText("漢方ってどういうもの？"), false);
  assert.equal(prompts.isProfessionalText("昨日、頭痛薬を飲みました"), false);
  assert.equal(prompts.isProfessionalText("この漢方を飲み始めてもいい？"), true);
  assert.equal(prompts.isProfessionalText("薬の飲み合わせを見てほしい"), true);
});

test("urgent UI hides routine prompts until a later assistant response", () => {
  const urgentMessages = [
    { role: "assistant", safety_level: "urgent", content: "安全を優先してください" },
    { role: "user", content: "近くの人に連絡しました" },
  ];
  assert.ok(liveUi.activeUrgentMessage(urgentMessages));
  assert.equal(liveUi.showRoutinePrompts(urgentMessages, false), false);

  const resolvedMessages = [
    ...urgentMessages,
    { role: "assistant", safety_level: "routine", content: "知らせてくれてありがとうございます" },
  ];
  assert.equal(liveUi.activeUrgentMessage(resolvedMessages), null);
  assert.equal(liveUi.showRoutinePrompts(resolvedMessages, false), true);
});

test("greeting distinguishes actual condition from forecast mode", () => {
  const goodYesterday = {
    review: { condition_level: 2 },
    forecast: { signal: 1 },
    care_actions: [{ id: "care" }],
  };
  const text = greeting.buildLiveSupportGreeting({
    yesterdayRow: goodYesterday,
    todayRow: { forecast: { signal: 0 }, care_actions: [] },
    hour: 12,
  });
  assert.match(text, /穏やかに過ごせた/);
  assert.doesNotMatch(text, /つらい記録/);

  const difficult = greeting.buildLiveSupportGreeting({
    yesterdayRow: { review: { condition_level: 0 }, care_actions: [] },
    todayRow: null,
  });
  assert.match(difficult, /つらい記録/);

  const noRecord = greeting.buildLiveSupportGreeting({
    yesterdayRow: { review: { condition_level: null }, care_actions: [] },
    todayRow: null,
    hour: 12,
  });
  assert.doesNotMatch(noRecord, /つらい記録/);
});

test("live support open analytics is allowed by both API and DB constraint", () => {
  assert.match(eventsRoute, /live_support_opened/);
  assert.match(qualityMigration, /live_support_opened/);
});

test("consent copy distinguishes account fields from user-entered free text", () => {
  assert.match(consentRoute, /account_profile_name/);
  assert.match(consentRoute, /free_text_notice/);
  assert.match(panelSource, /記録メモや会話欄に自分で入力した内容/);
});

test("visible live support branding uses Ekiken casing and includes feedback", () => {
  assert.match(panelSource, /Ekiken/);
  assert.doesNotMatch(panelSource, />EKIKEN</);
  assert.match(panelSource, /役に立った/);
  assert.match(panelSource, /安全確認が多すぎた/);
});
