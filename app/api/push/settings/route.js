import { requireUser } from "@/lib/requireUser";
import {
  getNotificationSettings,
  upsertNotificationSettings,
} from "@/lib/push/pushRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonUtf8(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user?.id) return jsonUtf8({ ok: false, error: error || "Unauthorized" }, 401);

    const settings = await getNotificationSettings({ userId: user.id });
    return jsonUtf8({
      ok: true,
      settings: settings || {
        enabled: false,
        night_enabled: true,
        morning_enabled: true,
        min_score: 6,
      },
    });
  } catch (error) {
    console.error("/api/push/settings GET error:", error);
    return jsonUtf8({ ok: false, error: String(error?.message || error) }, 500);
  }
}

export async function POST(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user?.id) return jsonUtf8({ ok: false, error: error || "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const settings = await upsertNotificationSettings({
      userId: user.id,
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      nightEnabled: typeof body.night_enabled === "boolean" ? body.night_enabled : undefined,
      morningEnabled: typeof body.morning_enabled === "boolean" ? body.morning_enabled : undefined,
      minScore: body.min_score,
    });

    return jsonUtf8({ ok: true, settings });
  } catch (error) {
    console.error("/api/push/settings POST error:", error);
    return jsonUtf8({ ok: false, error: String(error?.message || error) }, 500);
  }
}
