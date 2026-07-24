import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const promptsSource = await readFile(new URL("../lib/records/aiPrompts.js", import.meta.url), "utf8");
const liveRoute = await readFile(new URL("../app/api/records/live-chat/route.js", import.meta.url), "utf8");
const livePanel = await readFile(new URL("../components/records/LiveSupportPanel.jsx", import.meta.url), "utf8");
const analysisPanel = await readFile(new URL("../components/records/AiAnalysisPanel.jsx", import.meta.url), "utf8");

test("live support prompt prioritizes natural conversation over repetitive disclaimers", () => {
  assert.match(promptsSource, /まずユーザーの本題に答える/);
  assert.match(promptsSource, /定型の共感、免責、受診確認を毎回挟まない/);
  assert.match(promptsSource, /網羅性やルール遵守を見せるための回答ではなく/);
  assert.match(promptsSource, /不要な危機対応文を差し込まない/);
});

test("live support prompt version is bumped for the prompt reset", () => {
  assert.match(liveRoute, /records_live_support_v14_weather_peak_semantics_2026-07-24/);
});

test("follow-up option chips place only the natural answer in the input", () => {
  assert.match(livePanel, /onClick=\{\(\) => fillFollowUpOption\(option\)\}/);
  assert.match(analysisPanel, /onClick=\{\(\) => fillFollowUpOption\(option\)\}/);
  assert.doesNotMatch(livePanel, /Ekkenからの確認への回答：/);
  assert.doesNotMatch(analysisPanel, /AIからの確認への回答：/);
});
