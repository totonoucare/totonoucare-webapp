import test from "node:test";
import assert from "node:assert/strict";
import { createScenarioRunner } from "./helpers/forecast-scenarios.mjs";

const { load } = await createScenarioRunner();
const { observeResultSaveCtaScroll } = await load("lib/resultSaveCta.js");
const { loadSignupResultIdentity, getSignupResultIdentity } = await load("lib/signupResultIdentity.js");
const { CORE_LABELS } = await load("lib/diagnosis/v2/labels.js");
const resultId = "00000000-0000-4000-8000-000000000101";
const event = (code = "brake_batt_small") => ({ id: resultId, computed: { core_code: code } });

function scrollTarget(y = 0) {
  const listeners = new Set();
  return {
    scrollY: y,
    addEventListener(name, listener) { assert.equal(name, "scroll"); listeners.add(listener); },
    removeEventListener(name, listener) { assert.equal(name, "scroll"); listeners.delete(listener); },
    scroll(y) { this.scrollY = y; for (const listener of [...listeners]) listener(); },
    get listening() { return listeners.size; },
  };
}

test("CTA starts hidden, reveals after 100px and stays revealed while scrolling back", () => {
  const target = scrollTarget();
  let shown = 0;
  const stop = observeResultSaveCtaScroll(target, () => shown++);
  assert.equal(shown, 0);
  target.scroll(1); target.scroll(99);
  assert.equal(shown, 0);
  target.scroll(100);
  assert.equal(shown, 1);
  assert.equal(target.listening, 0);
  target.scroll(0); target.scroll(200);
  assert.equal(shown, 1);
  stop(); stop();
});

test("restored page position waits for the next scroll instead of opening on mount", () => {
  const target = scrollTarget(500);
  let shown = 0;
  observeResultSaveCtaScroll(target, () => shown++);
  assert.equal(shown, 0);
  target.scroll(499);
  assert.equal(shown, 1);
});

test("leaving the result before scrolling removes the pending listener", () => {
  const target = scrollTarget();
  let shown = 0;
  const stop = observeResultSaveCtaScroll(target, () => shown++);
  stop(); target.scroll(200);
  assert.equal(shown, 0);
  assert.equal(target.listening, 0);
});

test("effect cleanup and re-subscription do not cause duplicate reveals", () => {
  const target = scrollTarget();
  let shown = 0;
  observeResultSaveCtaScroll(target, () => shown++)();
  const stop = observeResultSaveCtaScroll(target, () => shown++);
  target.scroll(200);
  assert.equal(shown, 1);
  stop();
});

test("signup identity uses the exact result and all six existing animal labels", () => {
  assert.equal(Object.keys(CORE_LABELS).length, 6);
  for (const [code, label] of Object.entries(CORE_LABELS)) {
    assert.deepEqual(getSignupResultIdentity(event(code), resultId), { resultId, coreCode: code, title: label.title });
  }
});

test("unknown types, old results and another result never get a fallback animal", () => {
  for (const code of [undefined, "", "unknown", "__proto__", "constructor", "toString", {}, 1]) {
    assert.equal(getSignupResultIdentity({ id: resultId, computed: { core_code: code } }, resultId), null);
  }
  assert.equal(getSignupResultIdentity(null, resultId), null);
  assert.equal(getSignupResultIdentity(event(), "another-result"), null);
  assert.equal(getSignupResultIdentity(event(), ""), null);
  assert.equal(getSignupResultIdentity({ ...event(), retake_required: true }, resultId), null);
});

test("guest identity uses the existing cookie-protected GET without saving or generating forecasts", async () => {
  const requests = [];
  const identity = await loadSignupResultIdentity({ resultId }, async (url, options) => {
    requests.push({ url, options });
    return { ok: true, json: async () => ({ data: { ...event(), answers: { private: true } } }) };
  });
  assert.deepEqual(identity, { resultId, coreCode: "brake_batt_small", title: "ハリネズミ型" });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, `/api/diagnosis/v2/events/${resultId}`);
  assert.equal(requests[0].options.credentials, "include");
  assert.equal(requests[0].options.cache, "no-store");
  assert.equal(requests[0].options.headers, undefined);
  assert.equal(requests[0].options.body, undefined);
  assert.equal(requests[0].options.method || "GET", "GET");
  assert.ok(!("answers" in identity));
});

test("signed-in identity sends the bearer token to the same result API", async () => {
  let captured;
  await loadSignupResultIdentity({ resultId, accessToken: "test-token" }, async (_url, options) => {
    captured = options;
    return { ok: true, json: async () => ({ data: event() }) };
  });
  assert.equal(captured.headers.Authorization, "Bearer test-token");
});

test("result id is encoded as one path segment", async () => {
  let url;
  assert.equal(await loadSignupResultIdentity({ resultId: "one/two?x=1" }, async (u) => {
    url = u;
    return { ok: false };
  }), null);
  assert.equal(url, "/api/diagnosis/v2/events/one%2Ftwo%3Fx%3D1");
});

test("denied access, missing results, offline and malformed responses allow the generic signup identity", async () => {
  for (const status of [403, 404, 500]) {
    assert.equal(await loadSignupResultIdentity({ resultId }, async () => ({ ok: false, status })), null);
  }
  for (const fetchImpl of [
    async () => { throw Error("offline"); },
    async () => ({ ok: true, json: async () => { throw Error("invalid JSON"); } }),
    async () => ({ ok: true, json: async () => ({}) }),
    async () => ({ ok: true, json: async () => ({ data: { ...event(), id: "other" } }) }),
  ]) assert.equal(await loadSignupResultIdentity({ resultId }, fetchImpl), null);
});

test("empty ids and already-aborted loads make no request", async () => {
  const controller = new AbortController(); controller.abort();
  let calls = 0;
  const fetchImpl = async () => { calls++; };
  assert.equal(await loadSignupResultIdentity({ resultId: "" }, fetchImpl), null);
  assert.equal(await loadSignupResultIdentity({ resultId, signal: controller.signal }, fetchImpl), null);
  assert.equal(calls, 0);
});

test("leaving signup during the request or JSON read discards the decoration", async () => {
  for (const abortDuringJson of [false, true]) {
    const controller = new AbortController();
    const identity = await loadSignupResultIdentity({ resultId, signal: controller.signal }, async () => {
      if (!abortDuringJson) controller.abort();
      return { ok: true, json: async () => { controller.abort(); return { data: event() }; } };
    });
    assert.equal(identity, null);
  }
});
