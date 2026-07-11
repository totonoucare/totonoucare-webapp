import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireUser";
import { getRecordsAccess } from "@/lib/records/access";
import { daysBetween, isValidYmd, loadRecordsRange } from "@/lib/records/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const url = new URL(req.url);
    const start = url.searchParams.get("start") || "";
    const end = url.searchParams.get("end") || "";

    if (!isValidYmd(start) || !isValidYmd(end)) {
      return NextResponse.json({ error: "start/end must be YYYY-MM-DD" }, { status: 400 });
    }

    const span = daysBetween(start, end);
    if (span < 1 || span > 370) {
      return NextResponse.json({ error: "range must be 1-370 days" }, { status: 400 });
    }

    const [bundle, access] = await Promise.all([
      loadRecordsRange(user.id, start, end),
      getRecordsAccess(user.id),
    ]);
    return NextResponse.json({
      data: {
        ...bundle,
        access,
      },
    });
  } catch (error) {
    console.error("/api/records/range GET error:", error);
    return NextResponse.json({ error: error?.message || "unknown error" }, { status: 500 });
  }
}
