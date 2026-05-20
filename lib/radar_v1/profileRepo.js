// lib/radar_v1/profileRepo.js
import { createClient } from "@supabase/supabase-js";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
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

function shapeRadarProfile(data) {
  if (!data) return null;

  const computed = data.computed || {};
  const activeSymptomFocus = data.active_symptom_focus || data.symptom_focus || computed.symptom_focus || null;

  return {
    user_id: data.user_id,
    core_code: data.core_code || null,
    sub_labels: Array.isArray(data.sub_labels) ? data.sub_labels : [],
    primary_meridian: data.primary_meridian || null,
    secondary_meridian: data.secondary_meridian || null,
    symptom_focus: activeSymptomFocus,
    diagnosis_symptom_focus: data.symptom_focus || computed.symptom_focus || null,
    env: computed?.env
      ? {
          sensitivity: Number(computed.env.sensitivity ?? 0),
          vectors: Array.isArray(computed.env.vectors) ? computed.env.vectors : [],
        }
      : {
          sensitivity: 0,
          vectors: [],
        },
    raw: data,
  };
}

/**
 * Fetch latest constitution profile for Radar.
 * symptom_focus returned from this function is the user-editable active symptom.
 * The original check-time symptom remains available as diagnosis_symptom_focus.
 * @param {{ userId: string }} args
 */
export async function getRadarConstitutionProfile({ userId }) {
  if (!userId) {
    throw new Error("getRadarConstitutionProfile: userId is required");
  }

  const supabase = getServiceSupabase();

  const selectWithActive = `
      user_id,
      core_code,
      sub_labels,
      primary_meridian,
      secondary_meridian,
      computed,
      symptom_focus,
      active_symptom_focus
    `;

  const { data, error } = await supabase
    .from("constitution_profiles")
    .select(selectWithActive)
    .eq("user_id", userId)
    .maybeSingle();

  if (!error) return shapeRadarProfile(data);

  if (!isMissingActiveSymptomColumn(error)) {
    throw new Error(`getRadarConstitutionProfile failed: ${error.message}`);
  }

  const { data: fallback, error: fallbackError } = await supabase
    .from("constitution_profiles")
    .select(`
      user_id,
      core_code,
      sub_labels,
      primary_meridian,
      secondary_meridian,
      computed,
      symptom_focus
    `)
    .eq("user_id", userId)
    .maybeSingle();

  if (fallbackError) {
    throw new Error(`getRadarConstitutionProfile fallback failed: ${fallbackError.message}`);
  }

  return shapeRadarProfile(fallback);
}

