import { NextResponse } from "next/server";
import { getStripeServer } from "@/lib/stripe";
import { requireUser } from "@/lib/requireUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { user, error } = await requireUser(req);

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stripe = getStripeServer();

    const body = await req.json().catch(() => ({}));
    const returnPath =
      typeof body?.returnPath === "string" && body.returnPath.startsWith("/")
        ? body.returnPath
        : "/records";

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      req.headers.get("origin") ||
      "http://localhost:3000";

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
      line_items: [{ price: priceId, quantity: 1 }],
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
  } catch (error) {
    console.error("[stripe.checkout]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
