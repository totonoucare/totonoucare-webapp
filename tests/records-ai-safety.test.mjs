import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../lib/records/aiPrompts.js", import.meta.url), "utf8");
const prompts = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

test("urgent phrases are caught before an external AI call", () => {
  assert.equal(prompts.isUrgentText("急に強い胸の痛みが出て息ができない"), true);
  assert.equal(prompts.isUrgentText("今日は肩が少しこった"), false);
});

test("medication and treatment decisions are deterministically routed to professionals", () => {
  assert.equal(prompts.isProfessionalText("この漢方を飲み始めてもいい？"), true);
  assert.equal(prompts.isProfessionalText("処方薬をやめたい"), true);
  assert.equal(prompts.isProfessionalText("湿気の日の暮らすケアを振り返りたい"), false);
  assert.match(prompts.PROFESSIONAL_MESSAGE, /専門家/);
});

test("chat output is restricted to known moods, safety levels, and follow-up kinds", () => {
  const result = prompts.cleanChatOutput({
    message: "記録を一緒に見ましょう。",
    mood: "invented",
    suggested_questions: ["a", "b", "c", "d"],
    follow_up: { kind: "unsafe_kind", question: "q", options: ["1"], date: "not-a-date" },
    safety_level: "unknown",
    safety_message: "",
  });

  assert.equal(result.mood, "listening");
  assert.equal(result.safety_level, "routine");
  assert.equal(result.follow_up.kind, "none");
  assert.equal(result.follow_up.date, "");
  assert.equal(result.suggested_questions.length, 3);
});

test("structured schemas require medical-safety fields", () => {
  assert.ok(prompts.CHAT_SCHEMA.required.includes("safety_level"));
  assert.ok(prompts.CHAT_SCHEMA.required.includes("safety_message"));
  assert.ok(prompts.CHAT_SCHEMA.required.includes("follow_up"));
  assert.equal(prompts.CHAT_SCHEMA.additionalProperties, false);
});

test("AI instructions explicitly separate facts, hypotheses, and prohibited decisions", () => {
  assert.match(prompts.ANALYSIS_INSTRUCTIONS, /事実/);
  assert.match(prompts.ANALYSIS_INSTRUCTIONS, /仮説/);
  assert.match(prompts.CHAT_INSTRUCTIONS, /診断/);
  assert.match(prompts.CHAT_INSTRUCTIONS, /薬、漢方、サプリ/);
});
