import { requireUser } from "@/lib/requireUser";
import {
  deactivatePushSubscriptionByEndpoint,
  upsertPushSubscription,
} from "@/lib/push/pushRepo";
import { getVapidPublicKey } from "@/lib/push/webPush";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonUtf8(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function GET() {
  return jsonUtf8({
    ok: true,
    public_key: getVapidPublicKey(),
  });
}

export async function POST(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user?.id) return jsonUtf8({ ok: false, error: error || "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const subscription = body?.subscription || body;

    const saved = await upsertPushSubscription({
      userId: user.id,
      subscription,
      userAgent: req.headers.get("user-agent") || null,
    });

    return jsonUtf8({
      ok: true,
      subscription_id: saved.id,
    });
  } catch (error) {
    console.error("/api/push/register POST error:", error);
    return jsonUtf8({ ok: false, error: String(error?.message || error) }, 500);
  }
}

export async function DELETE(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user?.id) return jsonUtf8({ ok: false, error: error || "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const endpoint = body?.endpoint || body?.subscription?.endpoint;
    if (!endpoint) return jsonUtf8({ ok: false, error: "endpoint is required" }, 400);

    const rows = await deactivatePushSubscriptionByEndpoint({
      userId: user.id,
      endpoint,
      reason: "user_unsubscribed",
    });

    return jsonUtf8({ ok: true, count: rows.length });
  } catch (error) {
    console.error("/api/push/register DELETE error:", error);
    return jsonUtf8({ ok: false, error: String(error?.message || error) }, 500);
  }
}
