// Only use after authorizing access to the result. Exposes no answers or identity.
export async function loadResultProfileState(supabase, userId, eventId) {
  const empty = { has_current_profile: false, is_current: false, current_core_code: null, is_first_result: false };
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
  const isCurrent = currentSourceId === eventId;
  let isFirstResult = false;
  if (isCurrent) {
    const { data: history, error: historyError } = await supabase.from("constitution_events")
      .select("id").eq("user_id", userId).limit(2);
    if (historyError) throw historyError;
    isFirstResult = history?.length === 1 && history[0].id === profile.latest_event_id;
  }
  return {
    has_current_profile: true,
    is_current: isCurrent,
    current_core_code: profile.core_code || null,
    is_first_result: isFirstResult,
  };
}
