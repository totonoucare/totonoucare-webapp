import OpenAI from "openai";

/**
 * Server-side OpenAI helper.
 *
 * All health-record features use the Responses API with store:false. Callers
 * may also provide a privacy-preserving safety identifier and a strict JSON
 * schema so that medical-safety fields cannot silently disappear.
 */

let client = null;

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  if (!client) client = new OpenAI({ apiKey });
  return client;
}

function usageFromResponse(response) {
  const inputTokens = Number(response?.usage?.input_tokens || 0);
  const outputTokens = Number(response?.usage?.output_tokens || 0);
  return {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: Number(response?.usage?.total_tokens || inputTokens + outputTokens),
    cached_input_tokens: Number(response?.usage?.input_tokens_details?.cached_tokens || 0),
  };
}

export async function generateTextDetailed({
  model = "gpt-5.6-luna",
  input,
  instructions,
  max_output_tokens = 1200,
  reasoning = { effort: "low" },
  safety_identifier,
  store = false,
}) {
  if (!input || (typeof input !== "string" && !Array.isArray(input))) {
    throw new Error("generateTextDetailed: input must be a string or Responses input array");
  }

  const response = await getOpenAIClient().responses.create({
    model,
    input,
    ...(instructions ? { instructions } : {}),
    reasoning,
    max_output_tokens,
    safety_identifier,
    store,
  });

  return {
    text: String(response.output_text || "").trim(),
    response_id: response.id || null,
    model: response.model || model,
    usage: usageFromResponse(response),
  };
}

export async function generateStructured({
  model = "gpt-5.6-luna",
  input,
  instructions,
  schema,
  schemaName = "structured_response",
  max_output_tokens = 1200,
  reasoning = { effort: "low" },
  safety_identifier,
  store = false,
}) {
  if (!schema || typeof schema !== "object") {
    throw new Error("generateStructured: schema is required");
  }

  const response = await getOpenAIClient().responses.create({
    model,
    input,
    ...(instructions ? { instructions } : {}),
    reasoning,
    max_output_tokens,
    safety_identifier,
    store,
    text: {
      format: {
        type: "json_schema",
        name: schemaName,
        schema,
        strict: true,
      },
    },
  });

  const text = String(response.output_text || "").trim();
  if (!text) throw new Error("OpenAI returned an empty structured response");

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("OpenAI returned invalid structured JSON");
  }

  return {
    data,
    text,
    response_id: response.id || null,
    model: response.model || model,
    usage: usageFromResponse(response),
  };
}

/** Backwards-compatible plain-text helper used by existing v69 features. */
export async function generateText(options) {
  const result = await generateTextDetailed(options);
  return result.text;
}
