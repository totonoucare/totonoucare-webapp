import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  getBetaWindow,
  resolveRecordsAccess,
} from "../lib/records/accessPolicy.js";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("an active subscription outranks the free beta in the shared access mode", () => {
  const access = resolveRecordsAccess({
    beta: getBetaWindow(Date.parse("2026-07-27T16:30:00+09:00"), {
      enabled: true,
      startsAt: "2026-07-15",
      endsAt: "2026-09-30",
    }),
    entitlement: {
      product: "radar_subscription",
      status: "active",
      source: "stripe",
    },
  });

  assert.equal(access.entitled, true);
  assert.equal(access.beta_enabled, true);
  assert.equal(access.mode, "paid");
});

test("checkout return confirms the authenticated user's Stripe session", async () => {
  const confirmRoute = await source("app/api/stripe/checkout/confirm/route.js");
  const subscription = await source("lib/stripeSubscription.js");

  assert.match(confirmRoute, /requireUser\(req\)/);
  assert.match(confirmRoute, /syncStripeCheckoutSessionById\(body\?\.session_id, user\.id\)/);
  assert.match(confirmRoute, /getBillingStatus\(user\.id, \{ userCreatedAt: user\.created_at \}\)/);
  assert.match(subscription, /stripe_user_mismatch/);
  assert.match(subscription, /stripe_mode_mismatch/);
  assert.match(subscription, /stripe_price_mismatch/);
  assert.match(subscription, /expand: \["subscription"\]/);
});

test("settings consumes session_id once and removes checkout query parameters", async () => {
  const settings = await source("app/settings/page.js");

  assert.match(settings, /\/api\/stripe\/checkout\/confirm/);
  assert.match(settings, /session_id: checkoutSessionId/);
  assert.match(settings, /url\.searchParams\.delete\("checkout"\)/);
  assert.match(settings, /url\.searchParams\.delete\("session_id"\)/);
  assert.match(settings, /onAlreadySubscribed=\{handleAlreadySubscribed\}/);
});

test("already-subscribed responses carry canonical billing state instead of ending as a red error", async () => {
  const checkoutRoute = await source("app/api/stripe/checkout/route.js");
  const checkoutButton = await source("components/billing/CheckoutButton.jsx");

  assert.match(checkoutRoute, /code: "already_subscribed",[\s\S]*?billing/);
  assert.match(checkoutButton, /json\?\.code === "already_subscribed"/);
  assert.match(checkoutButton, /await onAlreadySubscribed\(json\)/);
});

test("paid UI labels outrank beta labels after a test subscription", async () => {
  const analysisPanel = await source("components/records/AiAnalysisPanel.jsx");
  const settings = await source("app/settings/page.js");

  assert.match(analysisPanel, /premiumActive = Boolean\(access\?\.entitled\)/);
  assert.match(analysisPanel, /betaActive = Boolean\(access\?\.beta_enabled && !premiumActive\)/);
  assert.match(settings, /billingStatus\?\.isPremium \|\| billingStatus\?\.access\?\.entitled/);
});

test("premium status and duplicate checkout checks share one canonical billing resolver", async () => {
  const statusRoute = await source("app/api/premium/status/route.js");
  const checkoutRoute = await source("app/api/stripe/checkout/route.js");
  const billingStatus = await source("lib/billingStatus.js");

  assert.match(statusRoute, /getBillingStatus\(user\.id, \{ userCreatedAt: user\.created_at \}\)/);
  assert.match(checkoutRoute, /getBillingStatus\(user\.id, \{ userCreatedAt: user\.created_at \}\)/);
  assert.match(billingStatus, /getPremiumStatus\(userId\)/);
  assert.match(billingStatus, /getRecordsAccess\(userId, \{ userCreatedAt \}\)/);
});
