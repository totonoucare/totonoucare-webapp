import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireUser";
import { hasActiveAiConsent } from "@/lib/records/aiEvents";
import { getRecordsAccess } from "@/lib/records/access";
import { enforcePublicApiRateLimit } from "@/lib/publicApiRateLimit";
import { loadResultSubject, loadForecastSubject, insightError } from "@/lib/mimoru/subjects";
import { ensureInsight } from "@/lib/mimoru/insightService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;
const reply = (data, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(req) {
  try {
    const { user } = await requireUser(req);
    if (!user) return reply({ error: "ログインしてください。", code: "auth_required" }, 401);
    const raw = await req.text();
    if (raw.length > 2048) return reply({ error: "リクエストが大きすぎます。" }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return reply({ error: "リクエストを確認してください。" }, 400); }
    if (!["result", "forecast"].includes(body?.kind)) return reply({ error: "解説の種類を確認してください。" }, 400);
    const limited = await enforcePublicApiRateLimit(req, { route: "mimoru_insights", limit: 30, windowSeconds: 60 });
    if (limited) return limited;
    if (!await hasActiveAiConsent(user.id)) return reply({ error: "AI解説の利用確認が必要です。", code: "ai_consent_required" }, 403);
    if (body.kind === "forecast") {
      const access = await getRecordsAccess(user.id, { userCreatedAt: user.created_at });
      if (!access.personalized_forecast_enabled) return reply({ error: "予報の利用期間を確認してください。", code: "forecast_access_required" }, 403);
    }
    const subject = body.kind === "result"
      ? await loadResultSubject({ req, user, eventId: body.result_id })
      : await loadForecastSubject({ user, forecastId: body.forecast_id, mode: body.mode, lifestyleScene: body.lifestyle_scene || "general", forecastRevision: body.expected_revision || null });
    if (body.symptom_focus && body.symptom_focus !== subject.profile.symptom_focus) {
      throw insightError("不調が更新されました。画面を読み直してください。", "subject_changed", 409);
    }
    const base = await ensureInsight({ userId: user.id, kind: "constitution", input: subject.base, eventId: subject.eventId });
    if (base.state !== "ready" || body.kind === "result") return reply({ data: base }, base.state === "pending" ? 202 : 200);
    const input = { ...subject.daily, constitution: subject.base.constitution, constitution_insight: base.insight };
    const daily = await ensureInsight({ userId: user.id, kind: "forecast", input, forecastId: subject.forecastId, targetDate: subject.targetDate });
    return reply({ data: daily }, daily.state === "pending" ? 202 : 200);
  } catch (error) {
    return reply({ error: error?.status ? error.message : "AI解説を読み込めませんでした。", code: error?.code || "insight_unavailable" }, error?.status || 503);
  }
}

