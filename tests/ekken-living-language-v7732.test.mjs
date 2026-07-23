import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const importSource = async (relativePath) => {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
};

const prompts = await importSource("../lib/records/aiPrompts.js");
const promptText = String(prompts.LIVE_SUPPORT_INSTRUCTIONS);
const contextSource = await readFile(new URL("../lib/records/aiContext.js", import.meta.url), "utf8");
const liveRoute = await readFile(new URL("../app/api/records/live-chat/route.js", import.meta.url), "utf8");

test("live support invites plain-language translation without forcing metaphors", () => {
  assert.match(promptText, /生活者が身体感覚として想像できる現代語へ翻訳/);
  assert.match(promptText, /比喩は理解を助ける時だけ自然に使う/);
  assert.match(promptText, /毎回入れたり/);
  assert.match(promptText, /定型句として使い回したりしない/);
  assert.ok(promptText.length < 2600, `live prompt length was ${promptText.length}`);
});

test("product context carries translation sensitivity examples rather than a mandatory dictionary", () => {
  assert.match(contextSource, /communication_translation/);
  assert.match(contextSource, /定型句や置換辞書ではなく、翻訳の感度を示す作例/);
  assert.match(contextSource, /身体を養う材料のストックが少なめ/);
  assert.doesNotMatch(contextSource, /材料や栄養を運ぶ便/);
});

test("repeated professional guidance is suppressed generically within one conversation", () => {
  const prior = [{ role: "assistant", content: "前回の案内", safety_level: "professional" }];
  assert.equal(prompts.shouldAppendSafetyMessage({
    safetyMessage: prompts.PROFESSIONAL_MESSAGE,
    conversation: prior,
  }), false);
  assert.equal(prompts.shouldAppendSafetyMessage({
    safetyMessage: "今回新しく必要になった個別の注意です。",
    conversation: prior,
  }), true);
  assert.equal(prompts.shouldAppendSafetyMessage({
    safetyMessage: "すでに伝えた注意です。",
    conversation: [{ role: "assistant", content: "すでに伝えた注意です。", safety_level: "routine" }],
  }), false);
});

test("live route exposes prior safety level to the model and applies duplicate suppression", () => {
  assert.match(liveRoute, /safety_level: row\.safety_level \|\| "routine"/);
  assert.match(liveRoute, /shouldAppendSafetyMessage/);
  assert.match(liveRoute, /professionalMessage\(output, conversation\)/);
  assert.match(liveRoute, /records_live_support_v13_pressure_response_2026-07-23/);
});
