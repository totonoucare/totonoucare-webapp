import { NextResponse } from "next/server";
import { getStripeServer } from "@/lib/stripe";
import { requireUser } from "@/lib/requireUser";
import { getBillingStatus } from "@/lib/billingStatus";
import { RECORDS_SUBSCRIPTION_PRODUCT } from "@/lib/records/policy";
import { stripeModeFromSecret } from "@/lib/stripeMode";
import { safeLocalPath } from "@/lib/safeReturnPath";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getOrigin(req) {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
}

function checkoutReturnUrls(origin, returnPath) {
  const success = new URL(returnPath, origin);
  success.searchParams.set("checkout", "success");
  success.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
  const cancel = new URL(returnPath, origin);
  cancel.searchParams.set("checkout", "cancel");
  return {
    successUrl: success.toString().replace("%7BCHECKOUT_SESSION_ID%7D", "{CHECKOUT_SESSION_ID}"),
    cancelUrl: cancel.toString(),
  };
}

async function createRadarSubscriptionCheckout({ req, stripe, user, body }) {
  const returnPath = safeLocalPath(body?.returnPath, "/records");
  const origin = getOrigin(req);

  if (!origin) {
    return NextResponse.json(
      { error: "App URL is not configured" },
      { status: 500 }
    );
  }

  const priceId = process.env.STRIPE_PREMIUM_PRICE_ID;
  if (!priceId) {
    return NextResponse.json(
      { error: "STRIPE_PREMIUM_PRICE_ID is not set" },
      { status: 500 }
    );
  }
  const { successUrl, cancelUrl } = checkoutReturnUrls(origin, returnPath);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: user.id,
    customer_email: user.email || undefined,
    metadata: {
      supabase_user_id: user.id,
      product: RECORDS_SUBSCRIPTION_PRODUCT,
    },
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        product: RECORDS_SUBSCRIPTION_PRODUCT,
      },
    },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}

export async function POST(req) {
  try {
    const { user, error } = await requireUser(req);

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stripe = getStripeServer();
    const body = await req.json().catch(() => ({}));
    const billing = await getBillingStatus(user.id, { userCreatedAt: user.created_at });
    if (billing.isPremium || billing.access?.entitled) {
      return NextResponse.json(
        {
          error: "すでにプレミアムを利用中です",
          code: "already_subscribed",
          billing,
        },
        { status: 409 }
      );
    }
    const stripeTestMode = stripeModeFromSecret() === "test";
    if (billing.access?.beta_enabled && !stripeTestMode) {
      return NextResponse.json(
        {
          error: "プレミアムの申込みは2026年10月1日から開始します",
          code: "billing_not_started",
        },
        { status: 409 }
      );
    }

    return await createRadarSubscriptionCheckout({ req, stripe, user, body });
  } catch (error) {
    console.error("[stripe.checkout]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
