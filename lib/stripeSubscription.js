import { getStripeServer } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { RECORDS_SUBSCRIPTION_PRODUCT } from "@/lib/records/policy";
import { stripeLivemodeForCurrentEnvironment } from "@/lib/stripeMode";

const PRODUCT = RECORDS_SUBSCRIPTION_PRODUCT;
const SOURCE = "stripe";

function unixToIso(value) {
  if (!value) return null;
  return new Date(value * 1000).toISOString();
}

function mapStripeStatus(subscription) {
  if (!subscription?.status) return "inactive";
  if (subscription.status === "active" || subscription.status === "trialing") {
    return "active";
  }
  if (subscription.status === "canceled") return "canceled";
  return "inactive";
}

function stripeObjectId(value) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id || null;
}

function subscriptionPriceId(subscription) {
  return subscription?.items?.data?.[0]?.price?.id || null;
}

function subscriptionUserId(subscription) {
  return subscription?.metadata?.supabase_user_id || null;
}

function checkoutUserId(session) {
  return session?.metadata?.supabase_user_id || session?.client_reference_id || null;
}

function assertCurrentStripeMode(livemode) {
  const expected = stripeLivemodeForCurrentEnvironment();
  if (expected === null) {
    const error = new Error("Stripe環境が設定されていません");
    error.code = "stripe_mode_unconfigured";
    throw error;
  }
  if (Boolean(livemode) !== expected) {
    const error = new Error("決済環境が現在のStripe設定と一致しません");
    error.code = "stripe_mode_mismatch";
    throw error;
  }
}

function assertExpectedUser(actualUserId, expectedUserId) {
  if (!actualUserId) {
    const error = new Error("決済情報にユーザーIDがありません");
    error.code = "stripe_user_missing";
    throw error;
  }
  if (expectedUserId && actualUserId !== expectedUserId) {
    const error = new Error("この決済情報は現在のアカウントに属していません");
    error.code = "stripe_user_mismatch";
    throw error;
  }
}

async function findLatestEntitlement(supabase, userId) {
  const { data, error } = await supabase
    .from("entitlements")
    .select("id,user_id,status,starts_at,ends_at,created_at,stripe_customer_id,stripe_subscription_id,stripe_price_id,stripe_livemode")
    .eq("user_id", userId)
    .eq("product", PRODUCT)
    .eq("source", SOURCE)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] ?? null;
}

export async function upsertStripeEntitlement({
  userId,
  status,
  startsAt = null,
  endsAt = null,
  customerId = null,
  subscriptionId = null,
  priceId = null,
  livemode = null,
}) {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const payload = {
    user_id: userId,
    product: PRODUCT,
    source: SOURCE,
    status,
    starts_at: startsAt || now,
    ends_at: endsAt,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    stripe_price_id: priceId,
    stripe_livemode: typeof livemode === "boolean" ? livemode : null,
    updated_at: now,
  };

  if (subscriptionId) {
    const { error } = await supabase
      .from("entitlements")
      .upsert(payload, { onConflict: "stripe_subscription_id" });
    if (error) throw error;
    return payload;
  }

  const existing = await findLatestEntitlement(supabase, userId);
  if (existing) {
    const updatePayload = {
      status,
      ends_at: endsAt,
      updated_at: now,
    };
    if (!existing.starts_at && startsAt) updatePayload.starts_at = startsAt;
    if (!existing.stripe_customer_id && customerId) updatePayload.stripe_customer_id = customerId;
    if (priceId) updatePayload.stripe_price_id = priceId;
    if (typeof livemode === "boolean") updatePayload.stripe_livemode = livemode;

    const { error } = await supabase
      .from("entitlements")
      .update(updatePayload)
      .eq("id", existing.id);
    if (error) throw error;
    return { ...existing, ...updatePayload };
  }

  const { error } = await supabase.from("entitlements").insert(payload);
  if (error) throw error;
  return payload;
}

export async function syncStripeSubscription(
  subscription,
  {
    expectedUserId = null,
    requireProduct = true,
    ignoreOtherProduct = false,
  } = {}
) {
  if (requireProduct && subscription?.metadata?.product !== PRODUCT) {
    if (ignoreOtherProduct) return null;
    const error = new Error("対象外のStripe契約です");
    error.code = "stripe_product_mismatch";
    throw error;
  }

  const userId = subscriptionUserId(subscription);
  assertExpectedUser(userId, expectedUserId);
  assertCurrentStripeMode(subscription?.livemode);

  const status = mapStripeStatus(subscription);
  const customerId = stripeObjectId(subscription.customer);
  const subscriptionId = subscription.id || null;
  const priceId = subscriptionPriceId(subscription);
  const configuredPriceId = process.env.STRIPE_PREMIUM_PRICE_ID || null;

  if (configuredPriceId && priceId && priceId !== configuredPriceId) {
    const error = new Error("決済された料金プランが現在の設定と一致しません");
    error.code = "stripe_price_mismatch";
    throw error;
  }

  const startsAt =
    unixToIso(subscription.current_period_start) ||
    unixToIso(subscription.start_date) ||
    new Date().toISOString();

  let endsAt = null;
  if (subscription.status === "canceled") {
    endsAt =
      unixToIso(subscription.ended_at) ||
      unixToIso(subscription.canceled_at) ||
      unixToIso(subscription.current_period_end) ||
      new Date().toISOString();
  } else if (subscription.cancel_at_period_end) {
    endsAt = unixToIso(subscription.current_period_end);
  }

  await upsertStripeEntitlement({
    userId,
    status,
    startsAt,
    endsAt,
    customerId,
    subscriptionId,
    priceId,
    livemode: Boolean(subscription.livemode),
  });

  return {
    userId,
    status,
    subscriptionId,
    customerId,
    priceId,
    livemode: Boolean(subscription.livemode),
  };
}

export async function syncStripeCheckoutSession(
  session,
  { expectedUserId = null, ignoreOtherProduct = false } = {}
) {
  if (session?.mode !== "subscription" || session?.metadata?.product !== PRODUCT) {
    if (ignoreOtherProduct) return null;
    const error = new Error("対象外のStripe Checkoutです");
    error.code = "stripe_checkout_product_mismatch";
    throw error;
  }
  if (session?.status && session.status !== "complete") {
    const error = new Error("Stripe Checkoutが完了していません");
    error.code = "stripe_checkout_incomplete";
    throw error;
  }

  const userId = checkoutUserId(session);
  assertExpectedUser(userId, expectedUserId);
  assertCurrentStripeMode(session?.livemode);

  const subscriptionId = stripeObjectId(session.subscription);
  if (!subscriptionId) {
    const error = new Error("CheckoutにSubscriptionがありません");
    error.code = "stripe_subscription_missing";
    throw error;
  }

  const stripe = getStripeServer();
  const subscription =
    typeof session.subscription === "object" && session.subscription?.status
      ? session.subscription
      : await stripe.subscriptions.retrieve(subscriptionId);

  return syncStripeSubscription(subscription, {
    expectedUserId: userId,
    requireProduct: true,
    ignoreOtherProduct,
  });
}

export async function syncStripeCheckoutSessionById(sessionId, expectedUserId) {
  if (!/^cs_(test_|live_)?[A-Za-z0-9_]+$/.test(String(sessionId || ""))) {
    const error = new Error("Checkout Session IDが正しくありません");
    error.code = "stripe_checkout_session_invalid";
    throw error;
  }
  const stripe = getStripeServer();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });
  return syncStripeCheckoutSession(session, { expectedUserId });
}

export async function syncStripeInvoice(
  invoice,
  { ignoreOtherProduct = false } = {}
) {
  const subscriptionId = stripeObjectId(
    invoice?.subscription ||
    invoice?.parent?.subscription_details?.subscription
  );
  if (!subscriptionId) return null;
  const stripe = getStripeServer();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return syncStripeSubscription(subscription, { ignoreOtherProduct });
}
