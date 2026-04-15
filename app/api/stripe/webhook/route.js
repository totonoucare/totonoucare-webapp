// app/api/stripe/webhook/route.js
import { NextResponse } from "next/server";
import { getStripeServer } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRODUCT = "radar_subscription";
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

async function findLatestEntitlement(supabase, userId) {
  const { data, error } = await supabase
    .from("entitlements")
    .select("id, user_id, status, starts_at, ends_at, created_at")
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
}) {
  const supabase = createAdminClient();
  const existing = await findLatestEntitlement(supabase, userId);

  if (existing) {
    const payload = {
      status,
      ends_at: endsAt,
    };

    if (!existing.starts_at && startsAt) {
      payload.starts_at = startsAt;
    }

    const { error } = await supabase
      .from("entitlements")
      .update(payload)
      .eq("id", existing.id);

    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("entitlements").insert({
    user_id: userId,
    product: PRODUCT,
    source: SOURCE,
    status,
    starts_at: startsAt || new Date().toISOString(),
    ends_at: endsAt,
  });

  if (error) throw error;
}

async function handleCheckoutCompleted(session) {
  if (session.mode !== "subscription") return;

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

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    status = mapStripeStatus(subscription);
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
  });
}

async function handleSubscriptionChanged(subscription) {
  const userId = subscription?.metadata?.supabase_user_id;

  if (!userId) {
    throw new Error("supabase_user_id is missing in subscription metadata");
  }

  const status = mapStripeStatus(subscription);

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
  });
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
        case "customer.subscription.deleted": {
          await handleSubscriptionChanged(event.data.object);
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
