import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createScenarioRunner } from "./helpers/forecast-scenarios.mjs";

const { load } = await createScenarioRunner();
const { CHECK_SIGNUP_HREF, isCheckRegistrationPath, resolveSignupFlow } = await load("lib/checkRegistration.js");
const { clearCheckDraft, CHECK_DRAFT_KEY } = await load("lib/checkRegistration.js");
const { completeConstitutionCheck } = await load("lib/completeConstitutionCheck.js");
const pending = await load("lib/pendingDiagnosisAttach.js");
const id = "00000000-0000-4000-8000-000000000102";
const source = (name) => fs.readFile(new URL(`../${name}`, import.meta.url), "utf8");

test("check signup uses a same-origin return path and suppresses an older pending result", () => {
  assert.equal(CHECK_SIGNUP_HREF, "/signup?next=%2Fcheck%2Frun");
  assert.deepEqual(resolveSignupFlow({ nextPath: "/check/run", pending: { resultId: id, nextPath: "/radar" } }), {
    resultId: "", nextPath: "/check/run", isBeforeCheck: true,
  });
});

test("Google callback can recover check entry from pending state without a result id", () => {
  assert.deepEqual(resolveSignupFlow({ pending: { resultId: "", nextPath: "/check/run" } }), {
    resultId: "", nextPath: "/check/run", isBeforeCheck: true,
  });
});

test("legacy result-saving links and generic login retain their destinations", () => {
  const nextPath = `/radar?saved=1&from_result=1&result=${id}`;
  assert.deepEqual(resolveSignupFlow({ resultId: id, nextPath }), { resultId: id, nextPath, isBeforeCheck: false });
  assert.deepEqual(resolveSignupFlow({ resultId: id }), { resultId: id, nextPath: `/result/${id}?attach=1`, isBeforeCheck: false });
  assert.deepEqual(resolveSignupFlow(), { resultId: "", nextPath: "/radar", isBeforeCheck: false });
  assert.equal(resolveSignupFlow({ resultId: id, fallbackPath: "/radar" }).nextPath, "/radar");
});

test("external destinations and similar path names never become a check entry", () => {
  for (const path of ["https://evil.example/check/run", "//evil.example/check/run", "/\\evil.example/check/run", "/check/runaway", "/check", "", undefined]) {
    assert.equal(isCheckRegistrationPath(path), false);
  }
  assert.equal(isCheckRegistrationPath("/check/run?resume=1"), true);
  assert.equal(resolveSignupFlow({ nextPath: "https://evil.example" }).nextPath, "/radar");
});

test("check return state survives OAuth, replaces stale results and expires after 12 hours", () => {
  const storage = new Map();
  globalThis.window = { sessionStorage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) } };
  try {
    pending.setPendingDiagnosisAttach({ resultId: id, nextPath: "/radar" });
    assert.equal(pending.getPendingDiagnosisAttach().resultId, id);
    pending.setPendingDiagnosisAttach({ resultId: "", nextPath: "/check/run" });
    assert.deepEqual(pending.getPendingDiagnosisAttach(), { resultId: "", nextPath: "/check/run" });
    const [key] = storage.keys();
    const value = JSON.parse(storage.get(key));
    storage.set(key, JSON.stringify({ ...value, savedAt: Date.now() - 13 * 3600000 }));
    assert.equal(pending.getPendingDiagnosisAttach(), null);
    assert.equal(storage.size, 0);
  } finally { delete globalThis.window; }
});

test("return state never stores an invalid result or an arbitrary empty-result destination", () => {
  const storage = new Map();
  globalThis.window = { sessionStorage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) } };
  try {
    for (const input of [{ resultId: "invalid", nextPath: "/check/run" }, { resultId: "", nextPath: "/radar" }, { nextPath: "//evil.example" }]) {
      pending.setPendingDiagnosisAttach(input);
      assert.equal(storage.size, 0);
    }
    pending.clearPendingDiagnosisAttach();
  } finally { delete globalThis.window; }
});

test("blocked browser storage cannot interrupt registration", () => {
  globalThis.window = Object.defineProperty({}, "sessionStorage", { get() { throw new Error("blocked"); } });
  try {
    assert.doesNotThrow(() => pending.setPendingDiagnosisAttach({ nextPath: "/check/run" }));
    assert.equal(pending.getPendingDiagnosisAttach(), null);
    assert.doesNotThrow(() => pending.clearPendingDiagnosisAttach());
    assert.doesNotThrow(clearCheckDraft);
  } finally { delete globalThis.window; }
});

test("a completed save clears the question draft without touching unrelated browser state", () => {
  const storage = new Map([[CHECK_DRAFT_KEY, "answers"], ["other", "keep"]]);
  globalThis.window = { sessionStorage: { removeItem: (key) => storage.delete(key) } };
  try {
    clearCheckDraft();
    assert.equal(storage.has(CHECK_DRAFT_KEY), false);
    assert.equal(storage.get("other"), "keep");
  } finally { delete globalThis.window; }
});

test("authenticated completion creates then atomically attaches using the same bearer and cookies", async () => {
  const requests = [];
  const created = [];
  const answers = { symptom_focus: "fatigue" };
  const result = await completeConstitutionCheck({ answers, accessToken: "test-token", onCreated: (id) => created.push(id) }, async (url, options) => {
    requests.push({ url, options });
    return { ok: true, json: async () => ({ data: url.endsWith("/submit") ? { eventId: id } : { attached: true } }) };
  });
  assert.equal(result, id);
  assert.deepEqual(created, [id]);
  assert.deepEqual(requests.map(r => r.url), ["/api/diagnosis/v2/submit", `/api/diagnosis/v2/events/${id}/attach`]);
  assert.deepEqual(JSON.parse(requests[0].options.body), { answers });
  for (const { options } of requests) {
    assert.equal(options.headers.Authorization, "Bearer test-token");
    assert.equal(options.credentials, "include");
    assert.equal(options.method, "POST");
  }
  assert.equal(requests[1].options.body, undefined);
});

test("retry after attachment failure never creates or scores the diagnosis again", async () => {
  let savedId = "";
  const requests = [];
  await assert.rejects(completeConstitutionCheck({ answers: {}, accessToken: "token", onCreated: (value) => { savedId = value; } }, async (url) => {
    requests.push(url);
    return { ok: url.endsWith("/submit"), status: 500, json: async () => ({ data: { id }, error: "temporary" }) };
  }), /temporary/);
  assert.equal(savedId, id);
  await completeConstitutionCheck({ eventId: savedId, accessToken: "new-token" }, async (url) => {
    requests.push(url);
    return { ok: true, json: async () => ({ data: { attached: true } }) };
  });
  assert.deepEqual(requests, ["/api/diagnosis/v2/submit", `/api/diagnosis/v2/events/${id}/attach`, `/api/diagnosis/v2/events/${id}/attach`]);
});

test("no session makes no submission and an expired session retains HTTP 401 for login recovery", async () => {
  let calls = 0;
  await assert.rejects(completeConstitutionCheck({ answers: {} }, async () => { calls++; }), e => e.status === 401);
  assert.equal(calls, 0);
  await assert.rejects(completeConstitutionCheck({ answers: {}, accessToken: "expired" }, async () => {
    calls++;
    return { ok: false, status: 401, json: async () => ({ error: "login required" }) };
  }), e => e.status === 401);
  assert.equal(calls, 1);
});

test("a missing diagnosis id never reaches attachment", async () => {
  let calls = 0;
  await assert.rejects(completeConstitutionCheck({ answers: {}, accessToken: "token" }, async () => {
    calls++;
    return { ok: true, json: async () => ({}) };
  }), /体質結果を取得/);
  assert.equal(calls, 1);
});

test("submission API rejects anonymous sessions before scoring or writing to the DB", async () => {
  const route = (await source("app/api/diagnosis/v2/submit/route.js"))
    .replace(/import[\s\S]*?from\s+["'][^"']+["'];\s*/g, "")
    .replaceAll("export ", "");
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  let calls = 0;
  const forbidden = () => { calls++; throw new Error("must not reach DB or score"); };
  const POST = new AsyncFunction("NextResponse", "requireUser", "enforcePublicApiRateLimit", "scoreDiagnosis", "supabaseServer", route + "\nreturn POST;")(
    { json: (data, opts) => ({ data, status: opts?.status || 200 }) },
    async () => ({ user: null }), forbidden, forbidden, { from: forbidden }
  );
  const response = await (await POST)(new Request("https://example.invalid/api/diagnosis/v2/submit", { method: "POST" }));
  assert.equal(response.status, 401);
  assert.equal(response.data.code, "AUTH_REQUIRED");
  assert.equal(calls, 0);
});

test("both entry pages enforce registration and completion retains the original result screen", async () => {
  const landing = await source("app/check/page.js");
  const run = await source("app/check/run/page.js");
  assert.match(landing, /isLoggedIn \? CHECK_RUN_PATH : CHECK_SIGNUP_HREF/);
  assert.match(run, /router\.replace\(CHECK_SIGNUP_HREF\)/);
  assert.match(run, /loadingAuth \|\| !session\?\.access_token/);
  assert.match(run, /completeConstitutionCheck/);
  assert.match(run, /router\.push\(`\/result\//);
});

test("signup and Google callback share safe return logic; no forecast preview is introduced", async () => {
  const signup = await source("app/signup/SignupClient.js");
  const callback = await source("app/auth/callback/AuthCallbackClient.js");
  assert.match(signup, /resolveSignupFlow/);
  assert.match(callback, /resolveSignupFlow/);
  assert.match(signup, /params\.isBeforeCheck/);
  assert.doesNotMatch(signup, /SignupForecastPreview/);
});
