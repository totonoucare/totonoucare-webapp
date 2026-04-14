// app/api/stripe/checkout/route.js
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { requireUser } from "@/lib/requireUser";

export async function POST(req) {
  try {
    const { user, errorResponse } = await requireUser(req);
    if (!user) return errorResponse;

    const priceId = process.env.STRIPE_PREMIUM_PRICE_ID;
    if (!priceId) {
      return NextResponse.json(
        { error: "STRIPE_PREMIUM_PRICE_ID is not set" },
        { status: 500 }
      );
    }

    const origin = req.headers.get("origin") || req.nextUrl.origin;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/records?premium=success`,
      cancel_url: `${origin}/records?premium=cancel`,
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("stripe checkout error", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
