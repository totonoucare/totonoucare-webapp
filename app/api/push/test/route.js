import { requireUser } from "@/lib/requireUser";
import { getActivePushSubscriptions } from "@/lib/push/pushRepo";
import { sendWebPush } from "@/lib/push/webPush";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonUtf8(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function POST(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user?.id) return jsonUtf8({ ok: false, error: error || "Unauthorized" }, 401);

    const subscriptions = await getActivePushSubscriptions({ userId: user.id });
    if (!subscriptions.length) {
      return jsonUtf8({ ok: false, error: "No active push subscription" }, 400);
    }

    const payload = {
      title: "未病レーダーの通知テスト",
      body: "通知設定は有効です。いたわりモード・守りモードの日に、前日夜と当日朝のお知らせが届きます。",
      url: "/radar",
      tag: "mibyo-radar-test",
      data: { kind: "test" },
    };

    let sent = 0;
    const errors = [];
    for (const subscription of subscriptions) {
      try {
        await sendWebPush({ subscription, payload });
        sent += 1;
      } catch (e) {
        errors.push(String(e?.message || e));
      }
    }

    return jsonUtf8({ ok: sent > 0, sent, errors });
  } catch (error) {
    console.error("/api/push/test POST error:", error);
    return jsonUtf8({ ok: false, error: String(error?.message || error) }, 500);
  }
}
