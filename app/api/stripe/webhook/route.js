// app/api/stripe/webhook/route.js
import { NextResponse } from "next/server";
import { getStripeServer } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { RECORDS_SUBSCRIPTION_PRODUCT } from "@/lib/records/policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  if (subscription.status === "canceled") {
    return "canceled";
  }

  return "inactive";
}

function stripeObjectId(value) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id || null;
}

function subscriptionPriceId(subscription) {
  return subscription?.items?.data?.[0]?.price?.id || null;
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

async function upsertEntitlement({
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
    return;
  }

  const existing = await findLatestEntitlement(supabase, userId);

  if (existing) {
    const updatePayload = {
      status,
      ends_at: endsAt,
      updated_at: now,
    };

    if (!existing.starts_at && startsAt) {
      updatePayload.starts_at = startsAt;
    }
    if (!existing.stripe_customer_id && customerId) updatePayload.stripe_customer_id = customerId;
    if (!existing.stripe_subscription_id && subscriptionId) updatePayload.stripe_subscription_id = subscriptionId;
    if (priceId) updatePayload.stripe_price_id = priceId;
    if (typeof livemode === "boolean") updatePayload.stripe_livemode = livemode;

    const { error } = await supabase
      .from("entitlements")
      .update(updatePayload)
      .eq("id", existing.id);

    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("entitlements").insert(payload);

  if (error) throw error;
}

async function handleCheckoutCompleted(session) {
  if (session.mode !== "subscription") return;
  if (session?.metadata?.product !== PRODUCT) return;

  const userId =
    session?.metadata?.supabase_user_id ||
    session?.client_reference_id ||
    null;

  if (!userId) {
    throw new Error("supabase_user_id is missing in checkout session");
  }

  const stripe = getStripeServer();

  let startsAt = new Date().toISOString();
  let endsAt = null;
  let status = "active";
  let customerId = stripeObjectId(session.customer);
  let priceId = null;

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    status = mapStripeStatus(subscription);
    customerId = stripeObjectId(subscription.customer) || customerId;
    priceId = subscriptionPriceId(subscription);
    startsAt =
      unixToIso(subscription.current_period_start) ||
      unixToIso(subscription.start_date) ||
      startsAt;

    if (subscription.cancel_at_period_end) {
      endsAt = unixToIso(subscription.current_period_end);
    }
  }

  await upsertEntitlement({
    userId,
    status,
    startsAt,
    endsAt,
    customerId,
    subscriptionId,
    priceId,
    livemode: Boolean(session.livemode),
  });
}

async function handleSubscriptionChanged(subscription) {
  if (subscription?.metadata?.product !== PRODUCT) return;

  const userId = subscription?.metadata?.supabase_user_id;

  if (!userId) {
    throw new Error("supabase_user_id is missing in subscription metadata");
  }

  const status = mapStripeStatus(subscription);
  const customerId = stripeObjectId(subscription.customer);
  const subscriptionId = subscription.id || null;
  const priceId = subscriptionPriceId(subscription);

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

  await upsertEntitlement({
    userId,
    status,
    startsAt,
    endsAt,
    customerId,
    subscriptionId,
    priceId,
    livemode: Boolean(subscription.livemode),
  });
}

async function handleInvoiceChanged(invoice) {
  const subscriptionId = stripeObjectId(
    invoice?.subscription ||
    invoice?.parent?.subscription_details?.subscription
  );
  if (!subscriptionId) return;
  const stripe = getStripeServer();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await handleSubscriptionChanged(subscription);
}

export async function POST(req) {
  try {
    const stripe = getStripeServer();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return NextResponse.json(
        { error: "STRIPE_WEBHOOK_SECRET is not set" },
        { status: 500 }
      );
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    const body = await req.text();

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error) {
      console.error("[stripe.webhook.verify]", error);
      return NextResponse.json(
        { error: `Webhook Error: ${error.message}` },
        { status: 400 }
      );
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          await handleCheckoutCompleted(event.data.object);
          break;
        }

        case "customer.subscription.updated":
        case "customer.subscription.created":
        case "customer.subscription.deleted": {
          await handleSubscriptionChanged(event.data.object);
          break;
        }

        case "invoice.paid":
        case "invoice.payment_failed":
        case "invoice.payment_action_required": {
          await handleInvoiceChanged(event.data.object);
          break;
        }

        default: {
          console.log("[stripe.webhook] unhandled event:", event.type);
          break;
        }
      }

      return NextResponse.json({ received: true });
    } catch (error) {
      console.error("[stripe.webhook.handle]", error);
      return NextResponse.json(
        { error: error?.message || "Webhook handler failed" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[stripe.webhook.fatal]", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
