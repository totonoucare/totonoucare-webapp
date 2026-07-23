import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const importSource = async (relativePath) => {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
};

const prompts = await importSource("../lib/records/aiPrompts.js");
const liveRoute = await readFile(new URL("../app/api/records/live-chat/route.js", import.meta.url), "utf8");
const panel = await readFile(new URL("../components/records/AiAnalysisPanel.jsx", import.meta.url), "utf8");
const guide = await readFile(new URL("../app/guide/GuideClient.jsx", import.meta.url), "utf8");

test("direct current emergency wording still enters the fixed safety route", () => {
  for (const text of ["胸が痛い", "息苦しい", "突然ひどい頭痛", "生きることに疲れた"]) {
    const result = prompts.classifySafetyText(text);
    assert.equal(result.should_route, true, text);
    assert.equal(result.context, "current_direct", text);
  }
});

test("negated past quoted and third-party safety wording does not hard-stop normal conversation", () => {
  const cases = [
    ["胸が痛いわけではない", "negated"],
    ["息苦しい感じはありません", "negated"],
    ["昔、胸が痛い時期がありました", "past"],
    ["『生きることに疲れた』という人をどう支えたらいい？", "third_party_or_quote"],
    ["友人が胸が痛いと言っています", "third_party_or_quote"],
  ];
  for (const [text, context] of cases) {
    const result = prompts.classifySafetyText(text);
    assert.equal(result.should_route, false, text);
    assert.equal(result.context, context, text);
    assert.ok(prompts.potentialSafetySignal(text), text);
  }
});

test("a direct urgent phrase still wins when another phrase is negated", () => {
  const result = prompts.classifySafetyText("胸が痛いわけではないけど、息苦しい");
  assert.equal(result.should_route, true);
  assert.equal(result.kind, "medical");
});

test("quoted first-person current self-harm wording remains urgent", () => {
  const result = prompts.classifySafetyText("『死にたい』と思っています");
  assert.equal(result.should_route, true);
  assert.equal(result.kind, "self_harm");
});

test("live support sends contextual safety signals without forcing a fixed reply length", () => {
  assert.match(liveRoute, /potential_safety_signal/);
  assert.match(liveRoute, /records_live_support_v13_pressure_response/);
  assert.match(String(prompts.LIVE_SUPPORT_INSTRUCTIONS), /回答の順序、長さ、提案数、質問数を型にはめず/);
  assert.match(String(prompts.LIVE_SUPPORT_INSTRUCTIONS), /それだけで本人の現在の緊急状態と断定しない/);
  assert.doesNotMatch(String(prompts.LIVE_SUPPORT_INSTRUCTIONS), /300〜500文字程度/);
});

test("pre-consent and guide copy distinguish account fields from user-entered text", () => {
  for (const source of [panel, guide]) {
    assert.match(source, /アカウントに登録された氏名・メールアドレス・住所/);
    assert.match(source, /記録メモや会話欄に自分で入力した内容/);
  }
  assert.doesNotMatch(panel, /体質チェックの生回答、氏名、メール、住所は送りません/);
  assert.doesNotMatch(guide, /体質チェックの生回答や氏名・住所は送りません/);
});
