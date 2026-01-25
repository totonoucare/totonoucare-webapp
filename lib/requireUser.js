import { supabaseServer } from "@/lib/supabaseServer";

/**
 * API Route Handler用：Authorization Bearer token から user を確定
 */
export async function requireUser(req) {
  const authHeader = req.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1];

  if (!token) {
    return { user: null, error: "Missing Authorization Bearer token" };
  }

  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error || !data?.user) {
    return { user: null, error: error?.message || "Invalid token" };
  }

  return { user: data.user, error: null };
}
