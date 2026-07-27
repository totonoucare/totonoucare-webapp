// app/api/premium/status/route.js
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireUser";
import { getBillingStatus } from "@/lib/billingStatus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
};

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);

    if (error || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    const billing = await getBillingStatus(user.id);
    return NextResponse.json(billing, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("[premium.status]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load premium status" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
