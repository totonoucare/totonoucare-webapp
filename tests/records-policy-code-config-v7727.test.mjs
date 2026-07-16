import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  OPENAI_RECORDS_ANALYSIS_MODEL,
  OPENAI_RECORDS_CHAT_MODEL,
  OPENAI_RECORDS_INPUT_USD_PER_MTOK,
  OPENAI_RECORDS_LIVE_CHAT_MODEL,
  OPENAI_RECORDS_OUTPUT_USD_PER_MTOK,
  RECORDS_AI_BETA,
  RECORDS_AI_DAILY_ANALYSIS_LIMIT,
  RECORDS_AI_MONTHLY_CHAT_LIMIT,
  RECORDS_AI_PER_MINUTE_LIMIT,
  RECORDS_EDIT_LOOKBACK_DAYS,
} from "../lib/records/policy.js";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const policy = read("lib/records/policy.js");
const access = read("lib/records/access.js");
const events = read("lib/records/aiEvents.js");
const routes = [
  read("app/api/records/analysis/route.js"),
  read("app/api/records/chat/route.js"),
  read("app/api/records/live-chat/route.js"),
  read("app/api/radar/review/route.js"),
  read("app/api/radar/care-actions/route.js"),
].join("\n");

const removedEnvNames = [
  "RECORDS_ENABLED",
  "RECORDS_EDIT_LOOKBACK_DAYS",
  "RECORDS_AI_ENABLED",
  "RECORDS_AI_BETA_ENABLED",
  "RECORDS_AI_BETA_STARTS_AT",
  "RECORDS_AI_BETA_ENDS_AT",
  "RECORDS_AI_ENTITLEMENT_PRODUCTS",
  "RECORDS_AI_MONTHLY_CHAT_LIMIT",
  "RECORDS_AI_DAILY_ANALYSIS_LIMIT",
  "RECORDS_AI_PER_MINUTE_LIMIT",
  "OPENAI_RECORDS_ANALYSIS_MODEL",
  "OPENAI_RECORDS_CHAT_MODEL",
  "OPENAI_RECORDS_LIVE_CHAT_MODEL",
  "OPENAI_RECORDS_INPUT_USD_PER_MTOK",
  "OPENAI_RECORDS_OUTPUT_USD_PER_MTOK",
];

test("v7.72.7 operational values are centralized with the intended launch policy", () => {
  assert.deepEqual(RECORDS_AI_BETA, {
    enabled: true,
    startsAt: "2026-07-15",
    endsAt: "2026-08-31",
  });
  assert.equal(RECORDS_EDIT_LOOKBACK_DAYS, 7);
  assert.equal(RECORDS_AI_MONTHLY_CHAT_LIMIT, 100);
  assert.equal(RECORDS_AI_DAILY_ANALYSIS_LIMIT, 1);
  assert.equal(RECORDS_AI_PER_MINUTE_LIMIT, 6);
  assert.equal(OPENAI_RECORDS_ANALYSIS_MODEL, "gpt-5.6-luna");
  assert.equal(OPENAI_RECORDS_CHAT_MODEL, "gpt-5.6-luna");
  assert.equal(OPENAI_RECORDS_LIVE_CHAT_MODEL, "gpt-5.6-luna");
  assert.equal(OPENAI_RECORDS_INPUT_USD_PER_MTOK, 1);
  assert.equal(OPENAI_RECORDS_OUTPUT_USD_PER_MTOK, 6);
});

test("runtime modules import the code policy and no longer read removed environment variables", () => {
  const runtime = [access, events, routes].join("\n");
  assert.match(runtime, /@\/lib\/records\/policy/);
  for (const name of removedEnvNames) {
    assert.doesNotMatch(runtime, new RegExp(`process\\.env\\.${name}`));
  }
});

test("env example keeps records AI secrets but not non-secret operational knobs", () => {
  const envExample = read(".env.example");
  assert.match(envExample, /OPENAI_API_KEY=/);
  assert.match(envExample, /SUPABASE_SERVICE_ROLE_KEY=/);
  assert.match(envExample, /OPENAI_SAFETY_IDENTIFIER_SECRET=/);
  for (const name of removedEnvNames) {
    assert.doesNotMatch(envExample, new RegExp(`^${name}=`, "m"));
  }
});
