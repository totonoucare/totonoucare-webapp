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

/**
 * Fetch latest constitution profile for Radar.
 * @param {{ userId: string }} args
 */
export async function getRadarConstitutionProfile({ userId }) {
  if (!userId) {
    throw new Error("getRadarConstitutionProfile: userId is required");
  }

  const supabase = getServiceSupabase();

  const { data, error } = await supabase
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

  if (error) {
    throw new Error(`getRadarConstitutionProfile failed: ${error.message}`);
  }

  if (!data) return null;

  const computed = data.computed || {};

  return {
    user_id: data.user_id,
    core_code: data.core_code || null,
    sub_labels: Array.isArray(data.sub_labels) ? data.sub_labels : [],
    primary_meridian: data.primary_meridian || null,
    secondary_meridian: data.secondary_meridian || null,
    symptom_focus: data.symptom_focus || null,
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
