import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // ビルド時に落とさないため。実行時に気づけるようにする。
  console.warn("Supabase env vars are missing.");
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");
