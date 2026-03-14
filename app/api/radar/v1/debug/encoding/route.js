// app/api/radar/v1/debug/encoding/route.js
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

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

export async function GET() {
  try {
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
      .from("radar_tsubo_points")
      .select("code, name_ja")
      .in("code", ["CV6", "LU9"])
      .order("code");

    if (error) {
      return new Response(
        JSON.stringify({ ok: false, error: error.message }, null, 2),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
        }
      );
    }

    const payload = {
      ok: true,

      // ASCIIだけで書いた Unicode escape
      from_code_escaped: {
        signal_label: "\u5b89\u5b9a",
        trigger_label: "\u51b7\u3048\u8fbc\u307f\u3084\u3059\u3044\u65e5",
        note_title: "\u4eca\u591c\u306e\u6ce8\u610f",
      },

      // 直接日本語で書いた文字列
      from_code_raw: {
        signal_label: "安定",
        trigger_label: "冷え込みやすい日",
        note_title: "今夜の注意",
      },

      // DBから取得した文字列
      from_db: data || [],
    };

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }, null, 2),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      }
    );
  }
}
