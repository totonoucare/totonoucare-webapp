import { randomUUID } from "node:crypto";
import { supabaseServer } from "@/lib/supabaseServer";
import { generateStructured } from "@/lib/openai/server";
import { OPENAI_RECORDS_LIVE_CHAT_MODEL } from "@/lib/records/policy";
import { buildSafetyIdentifier } from "@/lib/records/server";
import { INSIGHT_VERSION, INSIGHT_LEASE_MS, INSIGHT_DAILY_LIMIT, INSIGHT_INSTRUCTIONS, insightKey, insightSchema, validateInsight } from "./insightModel";
import { insightError } from "./subjects";
import { buildInsightGenerationInput } from "./explanationContext";

const running = new Map();
const MODEL = OPENAI_RECORDS_LIVE_CHAT_MODEL;
export async function findInsight(userId, kind, input) {
  const cacheKey = insightKey(kind, input, MODEL);
  const result = await supabaseServer.from("mimoru_insights").select("*").eq("user_id", userId).eq("cache_key", cacheKey).maybeSingle();
  if (result.error) throw insightError("AI解説の準備が完了していません。基本の結果は引き続き使えます。", "insight_schema_required", 503);
  return { cacheKey, row: result.data };
}
export async function ensureInsight({ userId, kind, input, eventId = null, forecastId = null, targetDate = null }) {
  const { cacheKey, row } = await findInsight(userId, kind, input);
  if (row?.state === "ready") return { state: "ready", insight: row.payload, model: row.model, generated_at: row.generated_at };
  const runningKey = userId + ":" + cacheKey;
  if (running.has(runningKey)) return running.get(runningKey);
  if (row && Date.parse(row.lease_until) > Date.now()) {
    if (row.state === "failed") throw insightError("少し待ってから、AI解説をもう一度お試しください。", "insight_backoff", 503);
    return { state: "pending" };
  }
  const promise = generate();
  running.set(runningKey, promise);
  try { return await promise; } finally { running.delete(runningKey); }
  async function generate() {
    const since = new Date(Date.now() - 86400000).toISOString();
    const count = await supabaseServer.from("mimoru_insights").select("generation_attempts,attempts_window_started_at")
      .eq("user_id", userId).gte("updated_at", since);
    if (count.error) throw insightError("AI解説を準備できませんでした。", "insight_schema_required", 503);
    const attemptTotal = (count.data || []).reduce((sum, entry) => sum + (entry.generation_attempts || 1), 0);
    if (attemptTotal >= INSIGHT_DAILY_LIMIT) throw insightError("本日のAI解説の更新上限に達しました。保存済みの解説は見返せます。", "insight_daily_limit", 429);
    const sameWindow = row && Date.parse(row.attempts_window_started_at) > Date.now() - 86400000;
    if (sameWindow && row.generation_attempts >= 3) throw insightError("この解説の生成を一時休止しました。時間をおいてお試しください。", "insight_retry_limit", 429);
    const token = randomUUID();
    const now = new Date().toISOString();
    const pending = { generation_attempts: sameWindow ? row.generation_attempts + 1 : 1, attempts_window_started_at: sameWindow ? row.attempts_window_started_at : now, state: "pending", generation_token: token, lease_until: new Date(Date.now() + INSIGHT_LEASE_MS).toISOString(), updated_at: now };
    let claim;
    if (!row) {
      claim = await supabaseServer.from("mimoru_insights").insert({
        user_id: userId, cache_key: cacheKey, kind, source_event_id: eventId, forecast_id: forecastId,
        target_date: targetDate, symptom_focus: input.constitution?.symptom_focus?.code || input.symptom_focus,
        prompt_version: INSIGHT_VERSION, model: MODEL, ...pending,
      }).select("cache_key");
      if (claim.error?.code === "23505") return { state: "pending" };
    } else {
      claim = await supabaseServer.from("mimoru_insights").update(pending).eq("user_id", userId).eq("cache_key", cacheKey)
        .in("state", ["pending", "failed"]).lt("lease_until", now).select("cache_key");
    }
    if (claim.error) throw insightError("AI解説を保存できませんでした。", "insight_schema_required", 503);
    if (!claim.data?.length) return { state: "pending" };
    try {
      const result = await generateStructured({
        model: MODEL, instructions: INSIGHT_INSTRUCTIONS,
        input: JSON.stringify(buildInsightGenerationInput(kind, input)), schema: insightSchema(kind, input),
        schemaName: "mimoru_" + kind + "_insight", max_output_tokens: kind === "constitution" ? 2400 : 3600,
        reasoning: { effort: "medium" }, safety_identifier: buildSafetyIdentifier(userId), store: false,
        request_options: { timeout: kind === "constitution" ? 45000 : 60000, maxRetries: 0 },
      });
      const payload = validateInsight(kind, result.data, input);
      const generatedAt = new Date().toISOString();
      const saved = await supabaseServer.from("mimoru_insights").update({
        state: "ready", payload, model: result.model || MODEL, generated_at: generatedAt, updated_at: generatedAt,
        input_tokens: result.usage?.input_tokens || 0, output_tokens: result.usage?.output_tokens || 0,
      }).eq("user_id", userId).eq("cache_key", cacheKey).eq("generation_token", token).select("cache_key");
      if (saved.error || !saved.data?.length) throw new Error("insight_save_failed");
      return { state: "ready", insight: payload, model: result.model || MODEL, generated_at: generatedAt };
    } catch (error) {
      await supabaseServer.from("mimoru_insights").update({ state: "failed", lease_until: new Date(Date.now() + 30000).toISOString(), updated_at: new Date().toISOString() })
        .eq("user_id", userId).eq("cache_key", cacheKey).eq("generation_token", token);
      console.warn("mimoru insight generation failed", { kind, code: error?.code || error?.status || "generation_failed" });
      throw insightError("AI解説を生成できませんでした。基本の結果を見ながら、時間をおいてお試しください。", "insight_generation_failed", 503);
    }
  }
}
export async function readConstitutionInsight(userId, input) {
  const { row } = await findInsight(userId, "constitution", input);
  return row?.state === "ready" ? row.payload : null;
}

