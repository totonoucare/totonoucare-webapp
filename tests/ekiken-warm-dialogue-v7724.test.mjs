import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const promptsSource = await readFile(new URL("../lib/records/aiPrompts.js", import.meta.url), "utf8");
const liveRoute = await readFile(new URL("../app/api/records/live-chat/route.js", import.meta.url), "utf8");
const livePanel = await readFile(new URL("../components/records/LiveSupportPanel.jsx", import.meta.url), "utf8");
const analysisPanel = await readFile(new URL("../components/records/AiAnalysisPanel.jsx", import.meta.url), "utf8");

test("live support prompt uses app forecasts confidently without repetitive disclaimers", () => {
  assert.match(promptsSource, /毎回「あくまで目安」「原因ではない」「信じすぎないで」と弱めず/);
  assert.match(promptsSource, /アプリの事実は落ち着いて言い切ってよい/);
  assert.match(promptsSource, /直後に統計的な注意書きで打ち消さない/);
  assert.match(promptsSource, /再現回数・比較条件・因果の慎重な検討は期間のAI分析が主に担う/);
  assert.match(promptsSource, /今後の振り返りの手がかりになりますね/);
});

test("live support prompt version is bumped for the warmer dialogue behavior", () => {
  assert.match(liveRoute, /records_live_support_v6_reply_context_2026-07-15/);
});

test("follow-up option chips place only the natural answer in the input", () => {
  assert.match(livePanel, /onClick=\{\(\) => fillFollowUpOption\(option\)\}/);
  assert.match(analysisPanel, /onClick=\{\(\) => fillFollowUpOption\(option\)\}/);
  assert.doesNotMatch(livePanel, /Ekikenからの確認への回答：/);
  assert.doesNotMatch(analysisPanel, /AIからの確認への回答：/);
});
