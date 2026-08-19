import { NextResponse } from "next/server";
import { getStripeServer } from "@/lib/stripe";
import { requireUser } from "@/lib/requireUser";
import { getPremiumStatus } from "@/lib/premium";
import { safeLocalPath } from "@/lib/safeReturnPath";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getOrigin(req) {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
}

export async function POST(req) {
  try {
    const { user, error } = await requireUser(req);
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const returnPath = safeLocalPath(body?.returnPath, "/settings");
    const origin = getOrigin(req);
    if (!origin) {
      return NextResponse.json({ error: "App URL is not configured" }, { status: 500 });
    }

    const premium = await getPremiumStatus(user.id);
    const customerId = premium?.entitlement?.stripe_customer_id || null;
    if (!premium?.isPremium || !customerId) {
      return NextResponse.json(
        { error: "管理できる有効なStripe契約が見つかりません" },
        { status: 409 }
      );
    }

    const stripe = getStripeServer();
    const returnUrl = new URL(returnPath, origin);
    returnUrl.searchParams.set("billing", "return");
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl.toString(),
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[stripe.portal]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create billing portal session" },
      { status: 500 }
    );
  }
}
