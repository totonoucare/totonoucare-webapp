import crypto from "crypto";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  OPENAI_RECORDS_INPUT_USD_PER_MTOK,
  OPENAI_RECORDS_OUTPUT_USD_PER_MTOK,
  RECORDS_AI_DAILY_ANALYSIS_LIMIT,
  RECORDS_AI_MONTHLY_CHAT_LIMIT,
  RECORDS_AI_PER_MINUTE_LIMIT,
} from "@/lib/records/policy";

export const RECORDS_AI_CONSENT_VERSION = "records_ai_v6_precise_free_text_scope_2026-07-14";

export function makeAiRequestId(prefix = "records") {
  return `${prefix}_${crypto.randomUUID()}`;
}

function jstParts(now = new Date()) {
  const shifted = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
}

function jstMonthStartIso(now = new Date()) {
  const { year, month } = jstParts(now);
  return new Date(Date.UTC(year, month, 1, -9, 0, 0)).toISOString();
}

function jstDayStartIso(now = new Date()) {
  const { year, month, day } = jstParts(now);
  return new Date(Date.UTC(year, month, day, -9, 0, 0)).toISOString();
}

async function countEvents(userId, eventType, since) {
  const { count, error } = await supabaseServer
    .from("records_ai_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", eventType)
    .gte("created_at", since);
  if (error) {
    const wrapped = new Error(`records AI infrastructure is not ready: ${error.message}`);
    wrapped.code = "records_ai_schema_required";
    throw wrapped;
  }
  return Number(count || 0);
}

export async function getAiUsage(userId) {
  const now = new Date();
  const minuteStart = new Date(now.getTime() - 60 * 1000).toISOString();
  const [chatUsed, analysisUsed, recentChat, recentAnalysis] = await Promise.all([
    countEvents(userId, "chat_response", jstMonthStartIso(now)),
    countEvents(userId, "analysis_response", jstDayStartIso(now)),
    countEvents(userId, "chat_response", minuteStart),
    countEvents(userId, "analysis_response", minuteStart),
  ]);
  return {
    available: true,
    chat: { used: chatUsed, limit: RECORDS_AI_MONTHLY_CHAT_LIMIT },
    analysis: { used: analysisUsed, limit: RECORDS_AI_DAILY_ANALYSIS_LIMIT },
    recent: recentChat + recentAnalysis,
    per_minute_limit: RECORDS_AI_PER_MINUTE_LIMIT,
  };
}

export function assertQuota(usage, kind) {
  if (Number(usage?.recent || 0) >= Number(usage?.per_minute_limit || RECORDS_AI_PER_MINUTE_LIMIT)) {
    const error = new Error("短時間に利用が集中しています。少し待ってからもう一度お試しください。");
    error.code = "rate_limit";
    error.status = 429;
    throw error;
  }
  if (kind === "chat" && Number(usage?.chat?.used || 0) >= Number(usage?.chat?.limit || 0)) {
    const error = new Error("今月のAI相談上限に達しました。翌月に再び利用できます。");
    error.code = "monthly_chat_limit";
    error.status = 429;
    throw error;
  }
  if (kind === "analysis" && Number(usage?.analysis?.used || 0) >= Number(usage?.analysis?.limit || 0)) {
    const error = new Error("本日のAI分析更新上限に達しました。保存済みの分析は引き続き確認できます。");
    error.code = "daily_analysis_limit";
    error.status = 429;
    throw error;
  }
}

function estimatedCostUsd(usage = {}) {
  const inputRate = Number(OPENAI_RECORDS_INPUT_USD_PER_MTOK);
  const outputRate = Number(OPENAI_RECORDS_OUTPUT_USD_PER_MTOK);
  if (!Number.isFinite(inputRate) || !Number.isFinite(outputRate)) return null;
  const input = Number(usage.input_tokens || 0);
  const output = Number(usage.output_tokens || 0);
  return Number(((input * inputRate + output * outputRate) / 1_000_000).toFixed(8));
}

export async function logRecordsAiEvent({
  userId,
  eventType,
  requestId = null,
  periodKey = null,
  source = null,
  model = null,
  responseId = null,
  feedback = null,
  feedbackReason = null,
  usage = {},
  metadata = {},
}) {
  const payload = {
    user_id: userId,
    event_type: eventType,
    request_id: requestId,
    period_key: periodKey,
    source,
    model,
    response_id: responseId,
    feedback,
    feedback_reason: feedbackReason,
    input_tokens: Number(usage?.input_tokens || 0),
    output_tokens: Number(usage?.output_tokens || 0),
    total_tokens: Number(usage?.total_tokens || 0),
    estimated_cost_usd: estimatedCostUsd(usage),
    metadata,
  };
  const { data, error } = await supabaseServer
    .from("records_ai_events")
    .insert(payload)
    .select("id")
    .single();
  if (error) {
    const wrapped = new Error(`records AI event could not be saved: ${error.message}`);
    wrapped.code = error.code === "23505" ? "23505" : "records_ai_schema_required";
    throw wrapped;
  }
  return data?.id || null;
}

export async function hasActiveAiConsent(userId) {
  const { data, error } = await supabaseServer
    .from("records_ai_consents")
    .select("consent_version,consented_at,revoked_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    const wrapped = new Error(`AI consent could not be verified: ${error.message}`);
    wrapped.code = "records_ai_schema_required";
    throw wrapped;
  }
  return Boolean(
    data?.consented_at
    && !data?.revoked_at
    && data?.consent_version === RECORDS_AI_CONSENT_VERSION
  );
}
