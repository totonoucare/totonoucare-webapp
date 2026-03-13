// lib/radar_v1/mtestPointRepo.js
import { createClient } from "@supabase/supabase-js";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

/**
 * Fetch active M-test points for one line block.
 *
 * @param {{ line: string }} args
 * @returns {Promise<Array<any>>}
 */
export async function getMtestPointsByLine({ line }) {
  if (!line) {
    throw new Error("getMtestPointsByLine: line is required");
  }

  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("radar_tsubo_points")
    .select(`
      code,
      name_ja,
      name_en,
      image_path,
      meridian_code,
      line_group,
      point_region,
      mtest_block,
      mtest_meridian_side,
      mtest_role,
      is_active
    `)
    .eq("is_active", true)
    .contains("line_group", [line])
    .not("mtest_block", "is", null)
    .not("mtest_meridian_side", "is", null)
    .not("mtest_role", "is", null);

  if (error) {
    throw new Error(`getMtestPointsByLine failed: ${error.message}`);
  }

  return Array.isArray(data) ? data : [];
}
