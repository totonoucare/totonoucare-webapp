import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../lib/records/aiPrompts.js", import.meta.url), "utf8");
const prompts = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const contextSource = await readFile(new URL("../lib/records/aiContext.js", import.meta.url), "utf8");

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

test("chat output never mixes AI follow-up questions with user suggestion pills", () => {
  const result = prompts.cleanChatOutput({
    message: "少し確認させてください。",
    mood: "listening",
    suggested_questions: ["これはAIからユーザーへの質問ですか？"],
    follow_up: {
      kind: "care_timing",
      question: "ケアをしたのはいつですか？",
      options: ["注意時間の前", "つらくなってから"],
      date: "2026-07-10",
    },
    safety_level: "routine",
    safety_message: "",
  });

  assert.deepEqual(result.suggested_questions, []);
  assert.equal(result.follow_up.kind, "care_timing");
});

test("period analysis is capped to the concise UI contract", () => {
  const fallback = {
    mood: "normal",
    headline: "fallback",
    empathy: "fallback",
    observed: "fallback",
    hypotheses: "fallback",
    next_step: "fallback",
    question: "fallback",
    suggested_questions: ["fallback"],
  };
  const long = "あ".repeat(300);
  const result = prompts.cleanAnalysis({
    mood: "thinking",
    headline: long,
    empathy: long,
    observed: long,
    hypotheses: long,
    next_step: long,
    question: long,
    suggested_questions: [long, long, long, long],
    evidence: [long, long, long],
  }, fallback);

  assert.equal(result.headline.length, 34);
  assert.equal(result.empathy.length, 60);
  assert.equal(result.observed.length, 120);
  assert.equal(result.hypotheses.length, 110);
  assert.equal(result.next_step.length, 90);
  assert.equal(result.question.length, 70);
  assert.equal(result.suggested_questions.length, 3);
  assert.ok(result.suggested_questions.every((item) => item.length <= 60));
  assert.equal(result.evidence.length, 2);
  assert.ok(result.evidence.every((item) => item.length <= 55));
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

test("AI prompts keep AI questions separate from user-to-AI suggestion pills", () => {
  assert.match(prompts.ANALYSIS_INSTRUCTIONS, /ユーザーがAIへ聞くための質問文/);
  assert.match(prompts.CHAT_INSTRUCTIONS, /AIからユーザーへの質問は必ずfollow_up\.question/);
  assert.match(prompts.CHAT_INSTRUCTIONS, /follow_upが必要な返答では空配列/);
});

test("AI instructions understand forecast modes as preparation rather than symptom predictions", () => {
  assert.match(prompts.ANALYSIS_INSTRUCTIONS, /症状の予測値ではなく備えの目安/);
  assert.match(prompts.CHAT_INSTRUCTIONS, /的中率として扱わない/);
  assert.match(prompts.ANALYSIS_INSTRUCTIONS, /displayed_care/);
});

test("product context documents constitution, weather, forecast, and care without raw answers", () => {
  assert.match(contextSource, /constitution_model/);
  assert.match(contextSource, /weather_model/);
  assert.match(contextSource, /forecast_modes/);
  assert.match(contextSource, /care_model/);
  assert.match(contextSource, /without_raw_answers/);
});
