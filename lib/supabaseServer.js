import { createClient } from "@supabase/supabase-js";

let serverClient = null;

export function createServerClient() {
  if (serverClient) return serverClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  serverClient = createClient(supabaseUrl, serviceRoleKey, {
    global: {
      // Private records such as guest locations must reflect the latest write.
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serverClient;
}

export const supabaseServer = createServerClient();
