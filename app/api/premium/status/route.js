// app/api/premium/status/route.js
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireUser";
import { getPremiumStatus } from "@/lib/premium";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await getPremiumStatus(user.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[premium.status]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load premium status" },
      { status: 500 }
    );
  }
}
