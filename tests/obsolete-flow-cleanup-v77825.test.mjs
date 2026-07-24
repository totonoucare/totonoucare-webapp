import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("obsolete Karte, forecast GPT, calendar and insight routes are removed", () => {
  const removed = [
    "app/karte/[id]/page.js",
    "app/api/karte/[id]/route.js",
    "lib/personalKarte.js",
    "lib/personalKarteAi.js",
    "app/api/radar/v1/forecast/enrich/route.js",
    "app/api/radar/v1/forecast/live/route.js",
    "lib/radar_v1/gptRadar.js",
    "lib/radar_v1/radarPromptContext.js",
    "app/calendar/page.js",
    "app/insights/page.js",
    "app/api/checkins/route.js",
    "app/api/carelogs/route.js",
  ];

  for (const path of removed) {
    assert.equal(existsSync(`${root}${path}`), false, `${path} should not exist`);
  }
});

test("Stripe checkout and webhook retain only the subscription product", async () => {
  const checkout = await source("app/api/stripe/checkout/route.js");
  const webhook = await source("app/api/stripe/webhook/route.js");

  for (const text of [checkout, webhook]) {
    assert.match(text, /radar_subscription/);
    assert.doesNotMatch(text, /personal_mibyo_karte|STRIPE_PERSONAL_KARTE_PRICE_ID|personal_karte_unlocks/);
  }
  assert.match(checkout, /mode: "subscription"/);
  assert.match(checkout, /STRIPE_PREMIUM_PRICE_ID/);
  assert.match(webhook, /customer\.subscription\.updated/);
  assert.match(webhook, /subscription\?\.metadata\?\.product !== PRODUCT/);
});

test("database cleanup removes only retired models and keeps subscription entitlements", async () => {
  const migration = await source(
    "supabase/migrations/20260724_remove_obsolete_routes_data_v77825.sql"
  );

  for (const table of [
    "personal_karte_reports",
    "personal_karte_unlocks",
    "weekly_ai_reports",
    "daily_care_logs",
    "daily_checkins",
    "care_cards",
    "radar_tsubo_cards",
  ]) {
    assert.match(migration, new RegExp(`drop table if exists public\\.${table}`));
  }

  assert.match(migration, /drop column if exists gpt_summary/);
  assert.doesNotMatch(migration, /drop table if exists public\.entitlements/);
  assert.doesNotMatch(migration, /drop table if exists public\.records_ai_/);
});
