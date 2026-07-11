import crypto from "crypto";
import { supabaseServer } from "@/lib/supabaseServer";

export const RECORDS_AI_MONTHLY_CHAT_LIMIT = Number(
  process.env.RECORDS_AI_MONTHLY_CHAT_LIMIT || 100
);

export function makeAiRequestId(prefix = "records") {
  return `${prefix}_${crypto.randomUUID()}`;
}

function monthStartIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function getMonthlyChatUsage(userId) {
  try {
    const { count, error } = await supabaseServer
      .from("records_ai_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_type", "chat_response")
      .gte("created_at", monthStartIso());

    if (error) throw error;
    return {
      available: true,
      used: Number(count || 0),
      limit: RECORDS_AI_MONTHLY_CHAT_LIMIT,
    };
  } catch (error) {
    // Keep beta usable before the optional migration is applied.
    console.warn("records AI usage check skipped:", error?.message || error);
    return {
      available: false,
      used: 0,
      limit: RECORDS_AI_MONTHLY_CHAT_LIMIT,
    };
  }
}

export async function logRecordsAiEvent({
  userId,
  eventType,
  requestId = null,
  periodKey = null,
  source = null,
  model = null,
  feedback = null,
  feedbackReason = null,
  metadata = {},
}) {
  try {
    const { error } = await supabaseServer.from("records_ai_events").insert({
      user_id: userId,
      event_type: eventType,
      request_id: requestId,
      period_key: periodKey,
      source,
      model,
      feedback,
      feedback_reason: feedbackReason,
      metadata,
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn("records AI event log skipped:", error?.message || error);
    return false;
  }
}
