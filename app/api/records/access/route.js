import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireUser";
import { getRecordsAccess } from "@/lib/records/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });
    const access = await getRecordsAccess(user.id);
    return NextResponse.json({ data: { access } });
  } catch (error) {
    console.error("/api/records/access GET error:", error);
    return NextResponse.json(
      { error: "利用プランを確認できませんでした", code: "records_access_failed" },
      { status: 500 }
    );
  }
}
