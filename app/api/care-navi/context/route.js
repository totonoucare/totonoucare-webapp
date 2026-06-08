import { requireUser } from "@/lib/requireUser";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { SYMPTOM_LABELS } from "@/lib/diagnosis/v2/labels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
};

function jsonUtf8(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: NO_STORE_HEADERS,
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

function shapeProfile(profile, { missingActiveColumn = false } = {}) {
  if (!profile) return null;

  const computed = profile.computed || {};
  const diagnosisSymptomFocus = profile.symptom_focus || computed.symptom_focus || null;
  const activeSymptomFocus = profile.active_symptom_focus || diagnosisSymptomFocus;

  return {
    user_id: profile.user_id,
    core_code: profile.core_code || computed.core_code || null,
    sub_labels: Array.isArray(profile.sub_labels) ? profile.sub_labels : Array.isArray(computed.sub_labels) ? computed.sub_labels : [],
    primary_meridian: profile.primary_meridian || computed.primary_meridian || null,
    secondary_meridian: profile.secondary_meridian || computed.secondary_meridian || null,
    computed,
    symptom_focus: activeSymptomFocus,
    diagnosis_symptom_focus: diagnosisSymptomFocus,
    diagnosis_symptom_label: diagnosisSymptomFocus ? SYMPTOM_LABELS[diagnosisSymptomFocus] || diagnosisSymptomFocus : null,
    active_symptom_focus: activeSymptomFocus,
    active_symptom_label: activeSymptomFocus ? SYMPTOM_LABELS[activeSymptomFocus] || activeSymptomFocus : null,
    latest_event_id: profile.latest_event_id || null,
    updated_at: profile.updated_at || null,
    missing_active_symptom_column: Boolean(missingActiveColumn),
  };
}

async function loadProfile(admin, userId) {
  const selectWithActive = [
    "user_id",
    "core_code",
    "sub_labels",
    "primary_meridian",
    "secondary_meridian",
    "computed",
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
    .select("user_id,core_code,sub_labels,primary_meridian,secondary_meridian,computed,symptom_focus,latest_event_id,updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (fallbackError) throw fallbackError;
  return { profile: fallback, missingActiveColumn: true };
}

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user?.id) return jsonUtf8({ ok: false, error: error || "Unauthorized" }, 401);

    const admin = createAdminClient();
    const { profile, missingActiveColumn } = await loadProfile(admin, user.id);

    if (!profile) {
      return jsonUtf8({ ok: false, error: "未病カルテがまだ保存されていません。" }, 404);
    }

    return jsonUtf8({
      ok: true,
      profile: shapeProfile(profile, { missingActiveColumn }),
      symptom_options: Object.entries(SYMPTOM_LABELS).map(([value, label]) => ({ value, label })),
    });
  } catch (error) {
    console.error("/api/care-navi/context GET error:", error);
    return jsonUtf8({ ok: false, error: String(error?.message || error) }, 500);
  }
}
