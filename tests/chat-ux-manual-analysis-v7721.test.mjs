import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("live support quick prompts and follow-up choices fill the input instead of sending immediately", async () => {
  const panel = await source("components/records/LiveSupportPanel.jsx");
  assert.match(panel, /onClick=\{\(\) => fillInput\(question\)\}/);
  assert.match(panel, /fillInput\(option\)/);
  assert.match(panel, /送る前に編集できます/);
  assert.doesNotMatch(panel, /onClick=\{\(\) => sendMessage\(question\)\}/);
});

test("both AI chats follow new messages with scroll containers", async () => {
  const live = await source("components/records/LiveSupportPanel.jsx");
  const analysis = await source("components/records/AiAnalysisPanel.jsx");
  assert.match(live, /chatScrollRef/);
  assert.match(live, /scrollTo\(\{ top: element.scrollHeight/);
  assert.match(analysis, /chatScrollRef/);
  assert.match(analysis, /scrollTo\(\{ top: element.scrollHeight/);
});

test("AI analysis lookup is automatic but generation is manual", async () => {
  const panel = await source("components/records/AiAnalysisPanel.jsx");
  const route = await source("app/api/records/analysis/route.js");
  assert.match(panel, /loadAnalysis\(\{ generate: false \}\)/);
  assert.match(panel, /onClick=\{\(\) => loadAnalysis\(\{ generate: true \}\)\}/);
  assert.match(panel, /タブを開くだけでは回数を使いません/);
  assert.match(route, /const generate = body\?\.generate === true/);
  assert.match(route, /if \(!generate\)/);
  assert.match(route, /records_changed_since_saved_analysis/);
});

test("live support stores consultation status without consuming a chat message", async () => {
  const panel = await source("components/records/LiveSupportPanel.jsx");
  const route = await source("app/api/records/live-chat/route.js");
  const support = await source("lib/records/liveSupport.js");
  assert.match(panel, /method: "PATCH"/);
  assert.match(panel, /現在の受診・相談状況/);
  assert.match(route, /export async function PATCH/);
  assert.match(route, /consultation_status: consultationStatusFromThread\(thread\)/);
  assert.match(support, /checked_no_major_issue/);
});

test("home subtitle represents the whole service instead of only today's forecast", async () => {
  const home = await source("app/HomeClient.jsx");
  assert.match(home, /subtitle="体質・予報・ケアをつなぐ"/);
});
