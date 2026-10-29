import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = name => readFile(new URL("../" + name, import.meta.url), "utf8");
const events = await import("data:text/javascript;base64," + Buffer.from(await source("lib/journeyEvents.js")).toString("base64"));
const eventId = "11111111-1111-4111-8111-111111111111";
const body = { event: "forecast_cta_click", event_id: eventId, position: "floating_save", tab: "overview", state: "current" };
const apiSource = (await source("app/api/journey/route.js")).replace(/^import .*;\n/gm, "").replace(/export /g, "");
function harness({ user = { id: "owner" }, count = 0, failCount = false, failWrite = false } = {}) {
  const writes = [], filters = [], records = new Map();
  const db = { from(table) {
    assert.equal(table, "app_experience_events");
    const q = { select(){ return q; }, eq(...v){ filters.push(v); return q; }, like(...v){ filters.push(v); return q; }, gte(...v){ filters.push(v); return q; },
      then(resolve){ return Promise.resolve({ count, error: failCount ? Error("db") : null }).then(resolve); },
      async upsert(row, options) { writes.push({ row, options }); if (!failWrite) records.set(row.user_id + row.event_key, row); return { error: failWrite ? Error("db") : null }; } };
    return q;
  } };
  const POST = new Function("NextResponse", "requireUser", "supabaseServer", "sanitizeJourneyEvent", "JOURNEY_MAX_DAILY_EVENTS", apiSource + ";return POST;")(
    { json: (data, options) => ({ data, ...options }) }, async () => ({ user }), db, events.sanitizeJourneyEvent, events.JOURNEY_MAX_DAILY_EVENTS);
  return { POST, writes, filters, records };
}
const request = b => ({ text: async () => JSON.stringify(b) });

test("every new metric is allowlisted; arbitrary health/location/text data is not retained", () => {
  for (const event of events.JOURNEY_EVENTS) assert.ok(events.sanitizeJourneyEvent({ event, event_id: eventId }));
  const clean = events.sanitizeJourneyEvent({ ...body, user_id: "victim", email: "private", result_id: "private", lat: 35, lon: 139, text: "private" });
  assert.deepEqual(clean.payload, { version: "v779109", position: "floating_save", tab: "overview", state: "current" });
  for (const value of ["bad", null, [eventId], 123]) assert.equal(events.sanitizeJourneyEvent({ ...body, event_id: value }), null);
  assert.equal(events.sanitizeJourneyEvent({ ...body, event: "arbitrary" }), null);
  assert.equal(events.sanitizeJourneyEvent({ ...body, method: "raw-coordinates" }), null);
});
test("server uses the authenticated owner, idempotent key, and owner-scoped rate count", async () => {
  const h = harness();
  assert.equal((await h.POST(request({ ...body, user_id: "victim" }))).status, 200);
  await h.POST(request(body));
  assert.equal(h.writes[0].row.user_id, "owner");
  assert.equal(h.writes[0].row.event_key, "journey:forecast_cta_click:" + eventId);
  assert.equal(h.writes[0].options.ignoreDuplicates, true);
  assert.equal(h.records.size, 1);
  assert.ok(h.filters.some(([key, value]) => key === "user_id" && value === "owner"));
});
test("anonymous, malformed, oversized, invalid and over-limit writes are rejected", async () => {
  assert.equal((await harness({ user: null }).POST(request(body))).status, 401);
  assert.equal((await harness().POST({ text: async () => "{" })).status, 400);
  assert.equal((await harness().POST({ text: async () => "x".repeat(1025) })).status, 400);
  assert.equal((await harness().POST(request({ ...body, event: "unknown" }))).status, 400);
  const limited = harness({ count: 300 });
  assert.equal((await limited.POST(request(body))).status, 429);
  assert.equal(limited.writes.length, 0);
});
test("database failures are honest and never write to another table", async () => {
  assert.equal((await harness({ failCount: true }).POST(request(body))).status, 503);
  assert.equal((await harness({ failWrite: true }).POST(request(body))).status, 503);
});
const clientSource = (await source("lib/journeyClient.js")).replace(/^import .*;\n/gm, "").replace(/export /g, "");
function client({ token = "token", fail = false, host = "mibyo-radar.totonoucare.com" } = {}) {
  const sent = [];
  const track = new Function("supabase", "sanitizeJourneyEvent", "window", "crypto", "fetch", clientSource + ";return trackJourney;")(
    { auth: { getSession: async () => ({ data: { session: token ? { access_token: token } : null } }) } }, events.sanitizeJourneyEvent,
    { location: { hostname: host } }, { randomUUID: () => eventId }, async (url, options) => { if (fail) throw Error("offline"); sent.push({ url, options }); return {}; });
  return { track, sent };
}
test("client queues a first-party keepalive request and does not wait or send sensitive details", async () => {
  const c = client();
  assert.equal(c.track("forecast_cta_click", { position: "floating_save", email: "private", lat: 35 }), true);
  await new Promise(setImmediate);
  assert.equal(c.sent.length, 1);
  assert.equal(c.sent[0].url, "/api/journey");
  assert.equal(c.sent[0].options.keepalive, true);
  assert.equal(c.sent[0].options.headers.Authorization, "Bearer token");
  assert.doesNotMatch(c.sent[0].options.body, /private|email|lat/);
});
test("no session, development hosts and telemetry failure never block application actions", async () => {
  const anonymous = client({ token: null }), offline = client({ fail: true }), development = client({ host: "localhost" });
  assert.doesNotThrow(() => anonymous.track("forecast_page_view"));
  assert.doesNotThrow(() => offline.track("forecast_page_view"));
  assert.equal(development.track("forecast_page_view"), false);
  await new Promise(setImmediate);
  assert.equal(anonymous.sent.length, 0);
  assert.equal(development.sent.length, 0);
});
test("CTA and location stages are distinct, and journey metrics do not crowd popup state", async () => {
  const result = await source("app/result/[id]/page.js");
  const radar = await source("app/radar/page.js");
  for (const name of ["forecast_cta_view", "forecast_cta_click", "forecast_cta_close"]) assert.ok(result.includes(name));
  assert.match(result, /if \(ctaLocation\) trackJourney\("forecast_cta_click"/, "automatic legacy continuation is not a click");
  for (const name of ["forecast_page_view", "location_setup_view", "location_save_start", "location_save_success", "location_save_error"]) assert.ok(radar.includes(name));
  assert.match(radar, /needsLocation && !loadingAuth && !loadingAccess && !loading/);
  assert.match(radar, /if \(json\?\.location\) trackJourney\("location_save_success"/);
  assert.match(await source("app/api/experience/route.js"), /\.not\('event_key','like','journey:%'\)/);
});
