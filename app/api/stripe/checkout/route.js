import { NextResponse } from "next/server";

import { getStripeServer } from "@/lib/stripe";
import { createClient } from "@/lib/supabaseServer";

function normalizeReturnPath(value) {
  if (typeof value !== "string") return "/records";
  if (!value.startsWith("/")) return "/records";
  if (value.startsWith("//")) return "/records";
  return value;
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    const priceId = process.env.STRIPE_PREMIUM_PRICE_ID;

    if (!priceId) {
      return NextResponse.json(
        { error: "STRIPE_PREMIUM_PRICE_ID が未設定です。" },
        { status: 500 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const returnPath = normalizeReturnPath(body?.returnPath);
    const origin = request.nextUrl.origin;

    const successUrl = new URL(returnPath, origin);
    successUrl.searchParams.set("checkout", "success");

    const cancelUrl = new URL(returnPath, origin);
    cancelUrl.searchParams.set("checkout", "cancel");

    const stripe = getStripeServer();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl.toString(),
      cancel_url: cancelUrl.toString(),
      allow_promotion_codes: true,
      locale: "ja",
      client_reference_id: data.user.id,
      customer_email: data.user.email ?? undefined,
      metadata: {
        supabase_user_id: data.user.id,
        plan_key: "mibyo_radar_premium",
      },
      subscription_data: {
        metadata: {
          supabase_user_id: data.user.id,
          plan_key: "mibyo_radar_premium",
        },
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Checkout URL の作成に失敗しました。" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("stripe checkout create error", error);
    return NextResponse.json(
      { error: "Checkout セッションの作成に失敗しました。" },
      { status: 500 },
    );
  }
}
