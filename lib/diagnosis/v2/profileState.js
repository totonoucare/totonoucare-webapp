// Only use after authorizing access to the result. Exposes no answers or identity.
export async function loadResultProfileState(supabase, userId, eventId) {
  const empty = { has_current_profile: false, is_current: false, current_core_code: null };
  if (!userId) return empty;
  const { data: profile, error } = await supabase.from("constitution_profiles")
    .select("latest_event_id,core_code").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!profile) return empty;
  let currentSourceId = null;
  if (profile.latest_event_id) {
    const { data: current, error: currentError } = await supabase.from("constitution_events")
      .select("source_event_id").eq("id", profile.latest_event_id).eq("user_id", userId).maybeSingle();
    if (currentError) throw currentError;
    currentSourceId = current?.source_event_id || null;
  }
  return {
    has_current_profile: true,
    is_current: currentSourceId === eventId,
    current_core_code: profile.core_code || null,
  };
}
