import { createHash } from "node:crypto";
import { supabaseServer } from "@/lib/supabaseServer";

let warnedUnavailable = false;

function clientIdentity(req) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip =
    req.headers.get("cf-connecting-ip") ||
    forwarded?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = (req.headers.get("user-agent") || "unknown").slice(0, 300);
  return `${ip}|${userAgent}`;
}

function identityHash(req) {
  const secret =
    process.env.RATE_LIMIT_HASH_SECRET ||
    process.env.OPENAI_SAFETY_IDENTIFIER_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "totonoucare-rate-limit";

  return createHash("sha256")
    .update(secret)
    .update("\0")
    .update(clientIdentity(req))
    .digest("hex");
}

function jsonRateLimitResponse({ limit, retryAfter }) {
  return new Response(
    JSON.stringify({
      ok: false,
      error: "アクセスが集中しています。少し時間をおいて再度お試しください。",
      code: "RATE_LIMITED",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Retry-After": String(Math.max(1, retryAfter || 1)),
        "RateLimit-Limit": String(limit),
        "RateLimit-Remaining": "0",
      },
    }
  );
}

/**
 * Distributed fixed-window rate limit backed by Supabase.
 *
 * It deliberately fails open if the migration has not yet been applied so a
 * deployment-order mistake does not take the public app down. The migration
 * should be applied before deploying this code.
 */
export async function enforcePublicApiRateLimit(
  req,
  { route, limit, windowSeconds }
) {
  try {
    const safeLimit = Math.max(1, Math.min(10_000, Math.round(Number(limit) || 1)));
    const safeWindow = Math.max(
      1,
      Math.min(86_400, Math.round(Number(windowSeconds) || 60))
    );

    const { data, error } = await supabaseServer.rpc("consume_api_rate_limit", {
      p_route: String(route || "unknown").slice(0, 120),
      p_key_hash: identityHash(req),
      p_limit: safeLimit,
      p_window_seconds: safeWindow,
    });

    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    if (result?.allowed === false) {
      return jsonRateLimitResponse({
        limit: safeLimit,
        retryAfter: Number(result.retry_after_seconds) || safeWindow,
      });
    }
  } catch (error) {
    if (!warnedUnavailable) {
      warnedUnavailable = true;
      console.warn("[public-api-rate-limit] unavailable; allowing request:", error?.message || error);
    }
  }

  return null;
}
