import { runRadarSnapshotCron } from "@/lib/radar_v1/runRadarSnapshotCron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonUtf8(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function authorize(req) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  return token && token === expected;
}

function asBool(value, fallback = false) {
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

export async function GET(req) {
  try {
    if (!authorize(req)) return jsonUtf8({ ok: false, error: "Unauthorized" }, 401);

    const { searchParams } = new URL(req.url);
    const result = await runRadarSnapshotCron({
      dates: searchParams.get("dates") || "today,tomorrow",
      limit: searchParams.get("limit") || 100,
      force: asBool(searchParams.get("force"), true),
      enrich: asBool(searchParams.get("enrich"), true),
      dryRun: searchParams.get("dry_run") === "1",
      userId: searchParams.get("user_id") || null,
    });

    return jsonUtf8(result);
  } catch (error) {
    console.error("/api/cron/radar-forecast-snapshots error:", error);
    return jsonUtf8({ ok: false, error: String(error?.message || error) }, 500);
  }
}
