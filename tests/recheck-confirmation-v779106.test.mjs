import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createScenarioRunner } from "./helpers/forecast-scenarios.mjs";

const { load } = await createScenarioRunner();
const { completeConstitutionCheck } = await load("lib/completeConstitutionCheck.js");
const { loadResultProfileState } = await load("lib/diagnosis/v2/profileState.js");
const { resultCtaDismissed, dismissResultCta } = await load("lib/resultSaveCta.js");
const { scoreDiagnosis, buildConstitutionProfilePayload } = await load("lib/diagnosis/v2/scoring.js");
const { validateDiagnosisAnswers } = await load("lib/diagnosis/v2/validateAnswers.js");
const { QUESTIONS_V2_BASE } = await load("lib/diagnosis/v2/questions.js");
const answers = { ...Object.fromEntries(QUESTIONS_V2_BASE.map(q => [q.key, "never"])), reaction_tiebreak: "brake", symptom_focus: "fatigue" };
const id = "00000000-0000-4000-8000-000000000106";
const userId = "00000000-0000-4000-8000-000000001106";
const source = name => readFile(new URL(`../${name}`, import.meta.url), "utf8");

test("a recheck reaches its preview without pretending adoption was saved", async () => {
  let saved = 0;
  const calls = [];
  const result = await completeConstitutionCheck({ answers, accessToken: "token", onSaved: () => saved++ }, async (url, options) => {
    calls.push({ url, options });
    return url.endsWith("/submit")
      ? { ok: true, json: async () => ({ data: { id } }) }
      : { ok: false, status: 409, json: async () => ({ code: "PROFILE_UPDATE_CONFIRMATION_REQUIRED" }) };
  });
  assert.equal(result, id);
  assert.equal(saved, 0);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.body, undefined);
});

test("initial automatic save signals success only after the attach response", async () => {
  const steps = [];
  await completeConstitutionCheck({ answers, accessToken: "token", onCreated: () => steps.push("created"), onSaved: () => steps.push("saved") }, async url => {
    steps.push(url.endsWith("/submit") ? "submit" : "attach");
    return { ok: true, json: async () => ({ data: { id } }) };
  });
  assert.deepEqual(steps, ["submit", "created", "attach", "saved"]);
});

test("unrelated conflicts and missing SQL do not become successful previews", async () => {
  for (const [status, code] of [[409, "DIAGNOSIS_CHANGED"], [503, "PROFILE_UPDATE_SETUP_REQUIRED"], [401, "AUTH_REQUIRED"]]) {
    await assert.rejects(completeConstitutionCheck({ eventId: id, accessToken: "token" }, async () => ({ ok: false, status, json: async () => ({ code, error: "failed" }) })), error => error.status === status && error.code === code);
  }
});

function profileDb(profile, event, error = null) {
  const calls = [];
  return { calls, from(table) { const filters = []; calls.push({ table, filters }); return { select() { return this; }, eq(k, v) { filters.push([k,v]); return this; }, async maybeSingle() { return { data: table === "constitution_profiles" ? profile : event, error }; } }; } };
}

test("profile state compares the source event, not animal label or result ownership", async () => {
  let db = profileDb({ latest_event_id: "ce", core_code: "brake_batt_small" }, { source_event_id: id });
  assert.deepEqual(await loadResultProfileState(db, userId, id), { has_current_profile: true, is_current: true, current_core_code: "brake_batt_small" });
  assert.ok(db.calls.every(c => c.filters.some(([key,value]) => key === "user_id" && value === userId)));
  db = profileDb({ latest_event_id: "ce", core_code: "brake_batt_small" }, { source_event_id: "another" });
  assert.equal((await loadResultProfileState(db, userId, id)).is_current, false);
  db = profileDb({ latest_event_id: null, core_code: null }, null);
  assert.equal((await loadResultProfileState(db, userId, id)).has_current_profile, true);
});

test("anonymous profile lookup makes no DB call and unavailable state fails closed", async () => {
  const db = profileDb(null, null);
  assert.equal((await loadResultProfileState(db, null, id)).has_current_profile, false);
  assert.equal(db.calls.length, 0);
  await assert.rejects(loadResultProfileState(profileDb(null, null, Error("offline")), userId, id), /offline/);
});

async function attachRoute({ user = { id: userId }, owner = null, guest = true, rpcError = null } = {}) {
  const calls = [], cookies = [];
  const body = (await source("app/api/diagnosis/v2/events/[id]/attach/route.js")).replace(/^import[\s\S]*?;\n/gm, "").replaceAll("export ", "");
  const db = {
    auth: { getUser: async () => ({ data: { user } }) },
    from() { return { select() { return this; }, eq() { return this; }, single: async () => ({ data: { id, user_id: owner, answers, computed: scoreDiagnosis(answers) } }) }; },
    rpc: async (name, args) => { calls.push({name,args}); return { data: rpcError ? null : "ce", error: rpcError }; },
  };
  const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
  const post = await new AsyncFunction("NextResponse", "supabaseServer", "buildConstitutionProfilePayload", "scoreDiagnosis", "validateDiagnosisAnswers", "clearGuestTokenCookie", "hasValidGuestToken", body + "\nreturn POST;")(
    { json: (body, options) => ({ body, status: options?.status || 200 }) }, db,
    buildConstitutionProfilePayload, scoreDiagnosis, validateDiagnosisAnswers,
    (_res, eventId) => cookies.push(eventId), async () => guest,
  );
  const request = value => ({ headers: { get: () => "Bearer test-token" }, json: async () => value });
  return { calls, cookies, run: value => post(request(value), { params: { id } }) };
}

test("attachment uses the guarded transaction and only a literal true confirms", async () => {
  for (const value of [undefined, {}, { confirm_update: "true" }, { confirm_update: 1 }, { confirm_update: false }, { confirm_update: true }]) {
    const route = await attachRoute();
    assert.equal((await route.run(value)).status, 200);
    assert.equal(route.calls[0].name, "attach_diagnosis_v779106");
    assert.equal(route.calls[0].args.p_confirm_replace, value?.confirm_update === true);
  }
});

test("confirmation-required preserves the guest preview and emits no save success", async () => {
  const route = await attachRoute({ rpcError: { code: "P0106" } });
  const response = await route.run({});
  assert.equal(response.status, 409);
  assert.equal(response.body.code, "PROFILE_UPDATE_CONFIRMATION_REQUIRED");
  assert.equal(route.cookies.length, 0);
});

test("missing migration is an actionable failure with no unsafe old-RPC fallback", async () => {
  for (const code of ["42883", "PGRST202"]) {
    const route = await attachRoute({ rpcError: { code } });
    const response = await route.run({ confirm_update: true });
    assert.equal(response.status, 503);
    assert.equal(response.body.code, "PROFILE_UPDATE_SETUP_REQUIRED");
    assert.equal(route.calls.length, 1);
    assert.equal(route.cookies.length, 0);
  }
});

test("unauthorized, other-owner and missing-cookie requests cannot write", async () => {
  for (const opts of [{ user: null }, { owner: "other-user", guest: true }, { guest: false }]) {
    const route = await attachRoute(opts);
    assert.ok([401,403].includes((await route.run({ confirm_update: true })).status));
    assert.equal(route.calls.length, 0);
  }
  const owner = await attachRoute({ owner: userId, guest: false });
  assert.equal((await owner.run({ confirm_update: true })).status, 200);
});

test("CTA dismissal is per-result, survives remount and tolerates blocked storage", () => {
  const storage = new Map();
  globalThis.window = { sessionStorage: { getItem: k => storage.get(k), setItem: (k,v) => storage.set(k,v) } };
  try {
    assert.equal(resultCtaDismissed(id), false);
    dismissResultCta(id);
    assert.equal(resultCtaDismissed(id), true);
    assert.equal(resultCtaDismissed("other"), false);
    Object.defineProperty(window, "sessionStorage", { get() { throw Error("blocked"); } });
    assert.doesNotThrow(() => dismissResultCta(id));
    assert.equal(resultCtaDismissed(id), false);
  } finally { delete globalThis.window; }
});

test("all result CTAs use the same choice and callback recovery never auto-confirms", async () => {
  const page = await source("app/result/[id]/page.js");
  assert.match(page, /if \(needsConfirmation\)/);
  assert.match(page, /onUpdate=\{\(\) => attachToAccount\(true\)\}/);
  assert.match(page, /onKeep=\{\(\) => \{ if \(!attachingRef.current\) router.push\("\/radar"\)/);
  for (const location of ["floating_save", "overview_footer", "compat_footer", "care_footer"]) assert.ok(page.includes(`continueToForecast("${location}")`));
  for (const file of ["app/signup/SignupClient.js", "app/auth/callback/AuthCallbackClient.js"]) {
    const auth = await source(file);
    assert.match(auth, /PROFILE_UPDATE_CONFIRMATION_REQUIRED/);
    assert.doesNotMatch(auth, /confirm_update:\s*true/);
  }
});
