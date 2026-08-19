import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const helperSource = await readFile(
  new URL("../lib/radar_v1/upstreamResilience.js", import.meta.url),
  "utf8"
);
const helper = await import(
  `data:text/javascript;base64,${Buffer.from(helperSource).toString("base64")}`
);

test("Cloudflare 522 HTML is classified as a transient upstream failure", () => {
  const error = new Error(
    '<!DOCTYPE html><title>supabase.co | 522: Connection timed out</title><div id="cf-error-details">Error code 522</div>'
  );
  assert.equal(helper.isTransientRadarUpstreamError(error), true);
});

test("a quickly returned transient failure is retried once", async () => {
  let calls = 0;
  let sleeps = 0;
  let clock = 0;

  const result = await helper.runSupabaseOperationWithFastRetry(
    async () => {
      calls += 1;
      clock += 100;
      if (calls === 1) {
        return {
          data: null,
          error: { status: 503, message: "Service unavailable" },
        };
      }
      return { data: [{ id: "ok" }], error: null };
    },
    {
      sleep: async () => {
        sleeps += 1;
      },
      now: () => clock,
    }
  );

  assert.equal(calls, 2);
  assert.equal(sleeps, 1);
  assert.equal(result.data[0].id, "ok");
});

test("a thrown transient failure is retried once", async () => {
  let calls = 0;

  const result = await helper.runSupabaseOperationWithFastRetry(
    async () => {
      calls += 1;
      if (calls === 1) {
        throw new Error("Connection timed out. Error code 522");
      }
      return { data: { user: { id: "user-1" } }, error: null };
    },
    { sleep: async () => {} }
  );

  assert.equal(calls, 2);
  assert.equal(result.data.user.id, "user-1");
});

test("a long timeout is not immediately repeated", async () => {
  let calls = 0;
  let clock = 0;

  await assert.rejects(
    helper.runSupabaseOperationWithFastRetry(
      async () => {
        calls += 1;
        clock += 5000;
        return {
          data: null,
          error: new Error("Connection timed out. Error code 522"),
        };
      },
      { sleep: async () => {}, now: () => clock }
    ),
    (error) => error?.code === helper.RADAR_UPSTREAM_UNAVAILABLE_CODE
  );

  assert.equal(calls, 1);
});

test("public API errors never expose upstream HTML or project hosts", () => {
  const raw = new Error(
    "getForecastBundle forecast failed: <!DOCTYPE html><title>sbmdbobllxnjtubhjghs.supabase.co | 522</title>"
  );
  const result = helper.toPublicRadarApiError(raw);
  const serialized = JSON.stringify(result);

  assert.equal(result.status, 503);
  assert.equal(result.payload.retryable, true);
  assert.equal(result.payload.code, helper.RADAR_UPSTREAM_UNAVAILABLE_CODE);
  assert.doesNotMatch(serialized, /<!DOCTYPE|supabase\.co|getForecastBundle/);
});

test("forecast route retries read paths and uses the safe API formatter", async () => {
  const routeSource = await readFile(
    new URL("../app/api/radar/v1/forecast/route.js", import.meta.url),
    "utf8"
  );
  const repoSource = await readFile(
    new URL("../lib/radar_v1/radarRepo.js", import.meta.url),
    "utf8"
  );

  assert.match(routeSource, /toPublicRadarApiError\(error\)/);
  assert.match(routeSource, /label: "getAuthenticatedUser"/);
  assert.doesNotMatch(routeSource, /error:\s*String\(error\)/);
  assert.match(repoSource, /label: "getPrimaryRadarLocation"/);
  assert.match(repoSource, /label: "getForecastBundle\.forecast"/);
  assert.match(repoSource, /label: "getForecastBundle\.carePlan"/);
});
