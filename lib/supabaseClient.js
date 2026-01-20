import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ✅ env が無い/未反映なら null
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          // ここが重要：自動処理が詰まると getSession が返らないことがあるので止める
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: true,
          flowType: "pkce",
        },
      })
    : null;
