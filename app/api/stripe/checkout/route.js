import { NextResponse } from "next/server";
import { getStripeServer } from "@/lib/stripe";
import { requireUser } from "@/lib/requireUser";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { hasValidGuestToken } from "@/lib/diagnosisGuestAccess";
import { PERSONAL_KARTE_PRODUCT } from "@/lib/personalKarte";

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

async function createPersonalKarteCheckout({ req, stripe, user, body }) {
  const priceId = process.env.STRIPE_PERSONAL_KARTE_PRICE_ID;
  if (!priceId) {
    return NextResponse.json(
      { error: "STRIPE_PERSONAL_KARTE_PRICE_ID is not set" },
      { status: 500 }
    );
  }

  const resultId = body?.resultId || body?.diagnosisEventId;
  if (typeof resultId !== "string" || !resultId) {
    return NextResponse.json(
      { error: "診断結果IDが必要です。" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: event, error } = await admin
    .from("diagnosis_events")
    .select("id,user_id")
    .eq("id", resultId)
    .maybeSingle();

  if (error) throw error;
  if (!event?.id) {
    return NextResponse.json(
      { error: "診断結果が見つかりません。" },
      { status: 404 }
    );
  }

  const ownedByUser = Boolean(event.user_id && event.user_id === user.id);
  const guestAllowed = !event.user_id
    ? await hasValidGuestToken({ req, supabase: admin, eventId: resultId })
    : false;

  if (event.user_id && !ownedByUser) {
    return NextResponse.json(
      { error: "この診断結果の体質トリセツを購入する権限がありません。" },
      { status: 403 }
    );
  }

  if (!event.user_id && !guestAllowed) {
    return NextResponse.json(
      { error: "この診断結果の確認に必要な情報がありません。" },
      { status: 403 }
    );
  }

  const origin = getOrigin(req);
  if (!origin) {
    return NextResponse.json(
      { error: "App URL is not configured" },
      { status: 500 }
    );
  }

  const successUrl = `${origin}/karte/${encodeURIComponent(resultId)}?checkout=success`;
  const cancelUrl = `${origin}/karte/${encodeURIComponent(resultId)}?checkout=cancel`;

  const metadata = {
    product: PERSONAL_KARTE_PRODUCT,
    supabase_user_id: user.id,
    user_id: user.id,
    diagnosis_event_id: resultId,
    result_id: resultId,
  };

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
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
    metadata,
    payment_intent_data: {
      metadata,
    },
    allow_promotion_codes: false,
  });

  return NextResponse.json({ url: session.url });
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

    if (body?.product === PERSONAL_KARTE_PRODUCT) {
      return await createPersonalKarteCheckout({ req, stripe, user, body });
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

