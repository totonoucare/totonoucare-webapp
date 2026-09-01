import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  getBetaWindow,
  resolveRecordsAccess,
} from "../lib/records/accessPolicy.js";
import {
  entitlementMatchesStripeEnvironment,
  stripeModeFromSecret,
} from "../lib/stripeMode.js";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const BETA = {
  enabled: true,
  startsAt: "2026-07-15",
  endsAt: "2026-09-30",
};

test("free AI beta ends exactly at 2026-10-01 00:00 JST", () => {
  const before = getBetaWindow(Date.parse("2026-09-30T14:59:59.999Z"), BETA);
  const boundary = getBetaWindow(Date.parse("2026-09-30T15:00:00.000Z"), BETA);

  assert.equal(before.active, true);
  assert.equal(before.expired, false);
  assert.equal(boundary.active, false);
  assert.equal(boundary.expired, true);
});

test("record calendar stays free while analysis and consult require a subscription after beta", () => {
  const access = resolveRecordsAccess({
    beta: getBetaWindow(Date.parse("2026-10-01T00:00:00+09:00"), BETA),
    entitlement: null,
  });

  assert.equal(access.records_enabled, true);
  assert.equal(access.mode, "free");
  assert.equal(access.analysis_enabled, false);
  assert.equal(access.consult_enabled, false);
  assert.equal(access.analysis_requires_subscription, true);
  assert.equal(access.consult_requires_subscription, true);
});

test("settings and live checkout copy use the extended beta boundary", async () => {
  const settings = await source("app/settings/page.js");
  const checkout = await source("app/api/stripe/checkout/route.js");

  assert.match(settings, /2026年9月30日まで/);
  assert.match(settings, /10月1日以降も記録カレンダーは無料/);
  assert.match(checkout, /プレミアムの申込みは2026年10月1日から開始します/);
});

test("beta and active subscription each unlock both paid surfaces", () => {
  const betaAccess = resolveRecordsAccess({
    beta: getBetaWindow(Date.parse("2026-09-30T23:59:00+09:00"), BETA),
    entitlement: null,
  });
  assert.equal(betaAccess.mode, "beta");
  assert.equal(betaAccess.analysis_enabled, true);
  assert.equal(betaAccess.consult_enabled, true);

  const paidAccess = resolveRecordsAccess({
    beta: getBetaWindow(Date.parse("2026-10-01T00:00:00+09:00"), BETA),
    entitlement: {
      product: "radar_subscription",
      status: "active",
      source: "stripe",
    },
  });
  assert.equal(paidAccess.mode, "paid");
  assert.equal(paidAccess.analysis_enabled, true);
  assert.equal(paidAccess.consult_enabled, true);
});

test("test-mode Stripe entitlements never unlock the live environment", () => {
  const testEntitlement = {
    source: "stripe",
    stripe_livemode: false,
  };
  const liveEntitlement = {
    source: "stripe",
    stripe_livemode: true,
  };

  assert.equal(stripeModeFromSecret("sk_test_example"), "test");
  assert.equal(stripeModeFromSecret("sk_live_example"), "live");
  assert.equal(entitlementMatchesStripeEnvironment(testEntitlement, "sk_test_example"), true);
  assert.equal(entitlementMatchesStripeEnvironment(testEntitlement, "sk_live_example"), false);
  assert.equal(entitlementMatchesStripeEnvironment(liveEntitlement, "sk_live_example"), true);
  assert.equal(entitlementMatchesStripeEnvironment(liveEntitlement, "sk_test_example"), false);
});

test("records UI gates the whole analysis and consult tabs while leaving expert consultation separate", async () => {
  const page = await source("components/records/RecordsPageClient.jsx");
  const paywall = await source("components/billing/SubscriptionPaywall.jsx");

  assert.match(page, /featureAccess\?\.analysis_enabled/);
  assert.match(page, /featureAccess\?\.consult_enabled/);
  assert.match(page, /<SubscriptionPaywall feature="analysis"/);
  assert.match(page, /<SubscriptionPaywall feature="consult"/);
  assert.match(page, /<ExpertConsultPreview/);
  assert.match(paywall, /記録カレンダーはこれからも無料/);
});

test("paid APIs enforce analysis and consultation entitlements independently", async () => {
  const analysisRoutes = [
    await source("app/api/records/analysis/route.js"),
    await source("app/api/records/chat/route.js"),
    await source("app/api/records/threads/route.js"),
  ].join("\n");
  const consultRoute = await source("app/api/records/live-chat/route.js");

  assert.match(analysisRoutes, /access\.analysis_enabled/);
  assert.doesNotMatch(analysisRoutes, /if \(!access\.ai_enabled\)/);
  assert.match(consultRoute, /access\.consult_enabled/);
  assert.doesNotMatch(consultRoute, /if \(!access\.ai_enabled\)/);
});

test("Stripe subscription flow includes test-safe launch, portal and webhook lifecycle", async () => {
  const checkout = await source("app/api/stripe/checkout/route.js");
  const portal = await source("app/api/stripe/portal/route.js");
  const webhook = await source("app/api/stripe/webhook/route.js");
  const migration = await source("supabase/migrations/20260727_add_stripe_subscription_identity_v7790.sql");

  assert.match(checkout, /mode: "subscription"/);
  assert.match(checkout, /billing_not_started/);
  assert.match(checkout, /2026年10月1日から開始/);
  assert.match(checkout, /stripeModeFromSecret\(\) === "test"/);
  assert.match(checkout, /CHECKOUT_SESSION_ID/);
  assert.match(portal, /billingPortal\.sessions\.create/);
  assert.match(webhook, /checkout\.session\.completed/);
  assert.match(webhook, /customer\.subscription\.created/);
  assert.match(webhook, /customer\.subscription\.updated/);
  assert.match(webhook, /customer\.subscription\.deleted/);
  assert.match(webhook, /invoice\.paid/);
  assert.match(webhook, /invoice\.payment_failed/);
  assert.match(migration, /stripe_subscription_id/);
  assert.match(migration, /stripe_livemode/);
  assert.match(migration, /create unique index/);
});
