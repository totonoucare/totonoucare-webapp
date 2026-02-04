// lib/openai/server.js
import OpenAI from "openai";

/**
 * Server-side OpenAI helper (SDK)
 * - Centralizes API key handling
 * - Uses Responses API
 * - Keeps call sites clean / consistent
 */

let _client = null;

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  if (!_client) _client = new OpenAI({ apiKey });
  return _client;
}

/**
 * Generate plain text via Responses API
 */
export async function generateText({
  model = "gpt-5.2",
  input,
  max_output_tokens = 1200,
  reasoning = { effort: "low" },
}) {
  if (!input || typeof input !== "string") throw new Error("generateText: input must be a string");

  const client = getOpenAIClient();

  const resp = await client.responses.create({
    model,
    reasoning,
    input,
    max_output_tokens,
  });

  return (resp.output_text || "").trim();
}
