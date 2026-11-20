import { randomUUID } from "node:crypto";
import { supabaseServer } from "@/lib/supabaseServer";
import { upsertPrimaryRadarLocation } from "@/lib/radar_v1/radarRepo";
import { FORECAST_AI_CONSENT_SCOPE, FORECAST_AI_CONSENT_VERSION, RECORDS_AI_CONSENT_VERSION } from "@/lib/records/aiEvents";

// Called only after the existing atomic attach RPC has verified ownership and
// saved the constitution. Retrying does not create another diagnosis/profile.
export async function saveGuestExperience({ resultId, userId, isCurrent }) {
  const state = await supabaseServer.from("guest_experiences_v126").select("*").eq("result_id", resultId).maybeSingle();
  if (["42P01", "PGRST205"].includes(state.error?.code)) return; // Pre-v126 member result.
  if (state.error) throw state.error;
  const guest = state.data;
  if (!guest || guest.claimed_by === userId) return;
  if (guest.claimed_by) throw new Error("guest_experience_already_claimed");
  if (isCurrent && guest.location) {
    const location = guest.location;
    await upsertPrimaryRadarLocation({ userId, lat: Number(location.lat), lon: Number(location.lon), timezone: "Asia/Tokyo",
      label: location.label, displayName: location.display_name, regionName: location.region_name });
  }
  if (guest.ai_consented_at && guest.ai_consent_version === RECORDS_AI_CONSENT_VERSION) {
    const consent = await supabaseServer.from("records_ai_consents").upsert({
      user_id: userId, consent_version: RECORDS_AI_CONSENT_VERSION, consented_at: guest.ai_consented_at, revoked_at: null,
      updated_at: new Date().toISOString(), consent_scope: {
        destination: "OpenAI API", source: "guest_experience_v126",
        fields: ["interpreted_constitution_summary", "constitution_symptom_insights", "forecast_symptom_insights", "displayed_care", "selected_care_question_context", "selected_period_forecasts", "today_tomorrow_forecasts", "recent_daily_records", "notes", "live_support_chat_messages", "period_review_chat_messages"],
        excludes: ["account_profile_name", "account_email", "account_address", "raw_constitution_answers"], responses_store: false,
      },
    }, { onConflict: "user_id", ignoreDuplicates: true });
    if (consent.error) throw consent.error;
  }
  if (isCurrent && guest.ai_consented_at && guest.ai_consent_version === FORECAST_AI_CONSENT_VERSION) {
    const { error } = await supabaseServer.from("records_ai_consents").upsert({
      user_id: userId,
      consent_version: FORECAST_AI_CONSENT_VERSION,
      consent_scope: FORECAST_AI_CONSENT_SCOPE,
      consented_at: guest.ai_consented_at,
      revoked_at: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id", ignoreDuplicates: true });
    if (error) throw error;
  }
  const cache = await supabaseServer.from("mimoru_guest_insights_v126").select("*").eq("user_id", resultId).eq("state", "ready");
  if (cache.error) throw cache.error;
  if (cache.data?.length) {
    const rows = cache.data.map(row => ({ user_id: userId, cache_key: row.cache_key, kind: row.kind,
      source_event_id: resultId, forecast_id: null, target_date: row.target_date, symptom_focus: row.symptom_focus,
      prompt_version: row.prompt_version, model: row.model, state: "ready", payload: row.payload,
      generation_token: randomUUID(), lease_until: row.generated_at, generated_at: row.generated_at,
      // These are reused outputs, not a second billed API request.
      input_tokens: 0, output_tokens: 0,
    }));
    const saved = await supabaseServer.from("mimoru_insights").upsert(rows, { onConflict: "user_id,cache_key", ignoreDuplicates: true });
    if (saved.error) throw saved.error;
  }
  const claimed = await supabaseServer.from("guest_experiences_v126").update({ claimed_by: userId }).eq("result_id", resultId).is("claimed_by", null);
  if (claimed.error) throw claimed.error;
}
