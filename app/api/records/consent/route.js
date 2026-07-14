import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireUser";
import { supabaseServer } from "@/lib/supabaseServer";
import { getRecordsAccess } from "@/lib/records/access";
import { RECORDS_AI_CONSENT_VERSION } from "@/lib/records/aiEvents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadConsent(userId) {
  const { data, error } = await supabaseServer
    .from("records_ai_consents")
    .select("consent_version,consent_scope,consented_at,revoked_at,updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

function publicConsent(row) {
  const currentVersion = row?.consent_version === RECORDS_AI_CONSENT_VERSION;
  return {
    active: Boolean(row?.consented_at && !row?.revoked_at && currentVersion),
    requires_renewal: Boolean(row?.consented_at && !row?.revoked_at && !currentVersion),
    consent_version: row?.consent_version || null,
    consented_at: row?.consented_at || null,
    revoked_at: row?.revoked_at || null,
  };
}

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });
    const [consent, access] = await Promise.all([
      loadConsent(user.id),
      getRecordsAccess(user.id),
    ]);
    return NextResponse.json({ data: { consent: publicConsent(consent), access } });
  } catch (error) {
    console.error("/api/records/consent GET error:", error);
    return NextResponse.json(
      { error: "AI利用の準備が完了していません", code: "records_ai_schema_required" },
      { status: 503 }
    );
  }
}

export async function POST(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    if (body?.consent !== true) {
      return NextResponse.json({ error: "consent must be true" }, { status: 400 });
    }
    const now = new Date().toISOString();
    const { data, error: saveError } = await supabaseServer
      .from("records_ai_consents")
      .upsert({
        user_id: user.id,
        consent_version: RECORDS_AI_CONSENT_VERSION,
        consent_scope: {
          destination: "OpenAI API",
          fields: ["interpreted_constitution_summary", "selected_period_forecasts", "today_tomorrow_forecasts", "forecast_reasoning", "displayed_care", "performed_concrete_care_items", "care_timing_relation", "recent_daily_records", "notes", "period_review_chat_messages", "live_support_chat_messages"],
          excludes: ["name", "email", "address"],
          responses_store: false,
          provider_monitoring_logs: "subject_to_provider_policy",
        },
        consented_at: now,
        revoked_at: null,
        updated_at: now,
      }, { onConflict: "user_id" })
      .select("consent_version,consent_scope,consented_at,revoked_at,updated_at")
      .single();
    if (saveError) throw saveError;
    return NextResponse.json({ data: { consent: publicConsent(data) } });
  } catch (error) {
    console.error("/api/records/consent POST error:", error);
    return NextResponse.json(
      { error: "AI利用の同意を保存できませんでした", code: "records_ai_schema_required" },
      { status: 503 }
    );
  }
}

export async function DELETE(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });
    const now = new Date().toISOString();
    const { data, error: saveError } = await supabaseServer
      .from("records_ai_consents")
      .update({ revoked_at: now, updated_at: now })
      .eq("user_id", user.id)
      .select("consent_version,consented_at,revoked_at,updated_at")
      .maybeSingle();
    if (saveError) throw saveError;
    return NextResponse.json({ data: { consent: publicConsent(data) } });
  } catch (error) {
    console.error("/api/records/consent DELETE error:", error);
    return NextResponse.json({ error: "同意を取り消せませんでした" }, { status: 500 });
  }
}
