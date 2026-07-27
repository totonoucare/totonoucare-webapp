import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireUser";
import { getBillingStatus } from "@/lib/billingStatus";
import { syncStripeCheckoutSessionById } from "@/lib/stripeSubscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
};

export async function POST(req) {
  try {
    const { user, error } = await requireUser(req);
    if (error || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    const body = await req.json().catch(() => ({}));
    await syncStripeCheckoutSessionById(body?.session_id, user.id);
    const billing = await getBillingStatus(user.id);

    if (!billing.isPremium && !billing.access?.entitled) {
      return NextResponse.json(
        {
          error: "決済は確認できましたが、プレミアム権限を反映できませんでした",
          code: "premium_sync_failed",
          billing,
        },
        { status: 409, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      { ok: true, billing },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("[stripe.checkout.confirm]", error);
    return NextResponse.json(
      {
        error: error?.message || "決済情報を確認できませんでした",
        code: error?.code || "checkout_confirmation_failed",
      },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }
}
