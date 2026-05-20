import { requireUser } from "@/lib/requireUser";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { SYMPTOM_LABELS } from "@/lib/diagnosis/v2/labels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_SYMPTOM_KEYS = Object.keys(SYMPTOM_LABELS);

function jsonUtf8(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}

function isMissingActiveSymptomColumn(error) {
  const message = String(error?.message || "");
  return (
    error?.code === "42703" ||
    error?.code === "PGRST204" ||
    message.includes("active_symptom_focus") ||
    message.includes("Could not find")
  );
}

async function loadProfile(admin, userId) {
  const selectWithActive = [
    "user_id",
    "symptom_focus",
    "active_symptom_focus",
    "latest_event_id",
    "updated_at",
  ].join(",");

  const { data, error } = await admin
    .from("constitution_profiles")
    .select(selectWithActive)
    .eq("user_id", userId)
    .maybeSingle();

  if (!error) return { profile: data, missingActiveColumn: false };

  if (!isMissingActiveSymptomColumn(error)) throw error;

  const { data: fallback, error: fallbackError } = await admin
    .from("constitution_profiles")
    .select("user_id,symptom_focus,latest_event_id,updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (fallbackError) throw fallbackError;
  return { profile: fallback, missingActiveColumn: true };
}

function shapeProfile(profile, { missingActiveColumn = false } = {}) {
  const diagnosisSymptomFocus = profile?.symptom_focus || null;
  const activeSymptomFocus = profile?.active_symptom_focus || diagnosisSymptomFocus;

  return {
    diagnosis_symptom_focus: diagnosisSymptomFocus,
    diagnosis_symptom_label: diagnosisSymptomFocus ? SYMPTOM_LABELS[diagnosisSymptomFocus] || diagnosisSymptomFocus : null,
    active_symptom_focus: activeSymptomFocus,
    active_symptom_label: activeSymptomFocus ? SYMPTOM_LABELS[activeSymptomFocus] || activeSymptomFocus : null,
    latest_event_id: profile?.latest_event_id || null,
    updated_at: profile?.updated_at || null,
    missing_active_symptom_column: Boolean(missingActiveColumn),
  };
}

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user?.id) return jsonUtf8({ ok: false, error: error || "Unauthorized" }, 401);

    const admin = createAdminClient();
    const { profile, missingActiveColumn } = await loadProfile(admin, user.id);

    if (!profile) {
      return jsonUtf8({ ok: false, error: "体質チェック結果がまだ保存されていません。" }, 404);
    }

    return jsonUtf8({ ok: true, profile: shapeProfile(profile, { missingActiveColumn }) });
  } catch (error) {
    console.error("/api/profile/active-symptom-focus GET error:", error);
    return jsonUtf8({ ok: false, error: String(error?.message || error) }, 500);
  }
}

export async function PATCH(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user?.id) return jsonUtf8({ ok: false, error: error || "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const nextSymptom = String(body?.active_symptom_focus || body?.symptom_focus || "").trim();

    if (!VALID_SYMPTOM_KEYS.includes(nextSymptom)) {
      return jsonUtf8({ ok: false, error: "選択された不調の種類が正しくありません。" }, 400);
    }

    const admin = createAdminClient();
    const { profile, missingActiveColumn } = await loadProfile(admin, user.id);

    if (!profile) {
      return jsonUtf8({ ok: false, error: "先に体質チェックを保存してください。" }, 404);
    }

    if (missingActiveColumn) {
      return jsonUtf8(
        {
          ok: false,
          error: "active_symptom_focus カラムが未追加です。付属SQLをSupabaseに適用してください。",
        },
        409
      );
    }

    const { data: updated, error: updateError } = await admin
      .from("constitution_profiles")
      .update({
        active_symptom_focus: nextSymptom,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .select("user_id,symptom_focus,active_symptom_focus,latest_event_id,updated_at")
      .single();

    if (updateError) throw updateError;

    return jsonUtf8({
      ok: true,
      profile: shapeProfile(updated),
      changed: (profile?.active_symptom_focus || profile?.symptom_focus || null) !== nextSymptom,
      should_refresh_forecast: true,
    });
  } catch (error) {
    console.error("/api/profile/active-symptom-focus PATCH error:", error);
    return jsonUtf8({ ok: false, error: String(error?.message || error) }, 500);
  }
}
