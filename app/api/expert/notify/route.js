import { deliverExpertNotices } from "@/lib/expertServer";
export const dynamic = "force-dynamic";
export async function POST(req) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== "Bearer " + process.env.CRON_SECRET)
    return Response.json({ error: "unauthorized" }, { status: 401 });
  try { return Response.json({ processed: await deliverExpertNotices() }); }
  catch { return Response.json({ error: "retry_pending" }, { status: 503 }); }
}
