import { NextResponse } from "next/server";
import { getStripeServer } from "@/lib/stripe";
import { requireUser } from "@/lib/requireUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getOrigin(req) {
  return process.env.NEXT_PUBLIC_APP_URL || req.headers.get("origin");
}

function safeReturnPath(value, fallback = "/records") {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

async function createRadarSubscriptionCheckout({ req, stripe, user, body }) {
  const returnPath = safeReturnPath(body?.returnPath, "/records");
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

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${origin}${returnPath}?checkout=success`,
    cancel_url: `${origin}${returnPath}?checkout=cancel`,
    client_reference_id: user.id,
    metadata: {
      supabase_user_id: user.id,
      product: "radar_subscription",
    },
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        product: "radar_subscription",
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

    return await createRadarSubscriptionCheckout({ req, stripe, user, body });
  } catch (error) {
    console.error("[stripe.checkout]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
