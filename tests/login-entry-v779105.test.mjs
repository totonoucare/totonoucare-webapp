import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createScenarioRunner } from "./helpers/forecast-scenarios.mjs";

const { load } = await createScenarioRunner();
const { resolveSignupFlow } = await load("lib/checkRegistration.js");
const source = name => readFile(new URL(`../${name}`, import.meta.url), "utf8");
const id = "00000000-0000-4000-8000-000000000105";

test("every normal explicit destination overrides abandoned check and result flows", () => {
  for (const nextPath of ["/", "/radar", "/records", "/settings", "/feedback", "/history", "/records?tab=chat#today"]) {
    for (const pending of [{ resultId: "", nextPath: "/check/run" }, { resultId: id, nextPath: "/radar?saved=1" }]) {
      assert.deepEqual(resolveSignupFlow({ nextPath, pending }), { resultId: "", nextPath, isBeforeCheck: false });
    }
  }
});

test("check entry and callback recovery still return to the questionnaire", () => {
  assert.deepEqual(resolveSignupFlow({ nextPath: "/check/run", pending: { resultId: id, nextPath: "/radar" } }), {
    resultId: "", nextPath: "/check/run", isBeforeCheck: true,
  });
  assert.deepEqual(resolveSignupFlow({ pending: { resultId: "", nextPath: "/check/run" } }), {
    resultId: "", nextPath: "/check/run", isBeforeCheck: true,
  });
});

test("explicit result links never inherit a different pending result's destination", () => {
  assert.deepEqual(resolveSignupFlow({ resultId: id, pending: { resultId: "another-id", nextPath: "/check/run" } }), {
    resultId: id, nextPath: `/result/${id}?attach=1`, isBeforeCheck: false,
  });
  const pending = { resultId: id, nextPath: "/radar?saved=1" };
  assert.deepEqual(resolveSignupFlow({ pending }), { ...pending, isBeforeCheck: false });
});

test("external return URLs remain blocked", () => {
  for (const nextPath of ["https://evil.example", "//evil.example", "/\\evil.example", "/radar\n"]) {
    assert.equal(resolveSignupFlow({ nextPath }).nextPath.startsWith("/"), true);
    assert.equal(resolveSignupFlow({ nextPath }).nextPath.includes("evil.example"), false);
  }
});

test("ordinary login is neutral and uses the same app palette and orbit motif", async () => {
  const welcome = await source("components/auth/AppLoginWelcome.jsx");
  assert.match(welcome, /未病レーダーに<br \/>ログイン/);
  assert.match(welcome, /予報やケア、体調の記録/);
  assert.match(welcome, /#71AC90/);
  assert.match(welcome, /#E2AA3B/);
  assert.doesNotMatch(welcome, /14日|無料登録|支払い|自動課金|580円|体質チェックを始める|自分の体質を/);
  const signup = await source("app/signup/SignupClient.js");
  assert.match(signup, /params\.isBeforeCheck \? <CheckLoginWelcome \/> : !params\.resultId \? <AppLoginWelcome/);
  assert.match(signup, /pending: sp\?\.get\("code"\) \? fallbackPending : null/);
});

test("all normal entry buttons explicitly retain their originating page", async () => {
  for (const [file, page] of [
    ["app/HomeClient.jsx", "/"], ["app/radar/page.js", "/radar"],
    ["components/records/RecordsPageClient.jsx", "/records"], ["app/settings/page.js", "/settings"],
    ["app/feedback/page.js", "/feedback"], ["app/history/page.js", "/history"],
  ]) {
    const text = await source(file);
    assert.ok(text.includes(`/signup?next=${encodeURIComponent(page)}`), file);
    assert.equal(text.includes('router.push("/signup")'), false, file);
  }
});
