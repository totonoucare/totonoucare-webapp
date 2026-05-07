import { supabaseServer } from "@/lib/supabaseServer";

/**
 * API Route Handler用：Authorization Bearer token を取り出す
 */
export function getBearerToken(req) {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

/**
 * ログインしていれば user を返し、未ログインなら null を返す。
 * ログイン必須ではないAPIで使う。
 */
export async function getOptionalUser(req) {
  const token = getBearerToken(req);

  if (!token) {
    return { user: null, error: null };
  }

  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error || !data?.user) {
    return { user: null, error: error?.message || "Invalid token" };
  }

  return { user: data.user, error: null };
}

/**
 * API Route Handler用：Authorization Bearer token から user を確定
 */
export async function requireUser(req) {
  const { user, error } = await getOptionalUser(req);

  if (!user) {
    return { user: null, error: error || "Missing Authorization Bearer token" };
  }

  return { user, error: null };
}
