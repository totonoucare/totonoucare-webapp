import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonUtf8(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function asText(value, maxLength = 500) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

function asTextArray(value, maxItems = 12, maxLength = 80) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function asInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.round(number);
}

function asNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return number;
}

function asDateText(value) {
  const text = asText(value, 20);
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return text;
}

function safeJsonObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

function getClientIp(req) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return req.headers.get("x-real-ip") || null;
}

async function getAuthenticatedUser(req) {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return null;

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const { data, error } = await authClient.auth.getUser();
  if (error) return null;
  return data?.user || null;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const user = await getAuthenticatedUser(req);
    const supabase = createAdminClient();

    const item = body?.item || {};
    const context = body?.context || {};

    const row = {
      user_id: user?.id || null,
      anon_id: asText(body?.anonId, 120),

      page: "care_navi",

      basis: asText(context?.basis, 40),
      category: asText(context?.category, 40),
      price_band: asText(context?.priceBand, 40),
      symptom_key: asText(context?.symptomKey, 80),

      core_code: asText(context?.coreCode, 80),
      sub_codes: asTextArray(context?.subCodes, 8, 80),

      policy_keys: asTextArray(context?.policyKeys, 8, 80),
      clicked_policy_key: asText(item?.policyKey, 80),

      source_type: asText(item?.sourceType, 40),
      source_key: asText(item?.sourceKey, 80),

      item_position: asInteger(body?.itemPosition),

      item_code: asText(item?.itemCode, 300),
      item_title: asText(item?.title, 500),
      item_price: asInteger(item?.price),
      shop_name: asText(item?.shopName, 200),
      review_average: asNumber(item?.reviewAverage),
      review_count: asInteger(item?.reviewCount),

      query: asText(item?.query, 200),
      tags: asTextArray(item?.tags, 12, 80),

      item_url: asText(item?.itemUrl, 1200),
      affiliate_url: asText(item?.itemUrl, 1200),
      source: asText(item?.source, 60) || "rakuten",

      weather_date: asDateText(context?.weatherDate),
      weather_risk_level: asText(context?.weatherRiskLevel, 80),
      weather_summary: safeJsonObject(context?.weatherSummary),

      life_keys: asTextArray(context?.lifeKeys, 8, 80),

      user_agent: asText(req.headers.get("user-agent"), 500),
      referrer: asText(req.headers.get("referer"), 800),
      client_ip: getClientIp(req),
    };

    if (!row.user_id && !row.anon_id) {
      return jsonUtf8({ ok: false, error: "Missing user_id or anon_id" }, 400);
    }

    if (!row.item_url && !row.item_code && !row.item_title) {
      return jsonUtf8({ ok: false, error: "Missing item payload" }, 400);
    }

    const { data, error } = await supabase
      .from("care_item_click_events")
      .insert(row)
      .select("id")
      .single();

    if (error) {
      console.error("/api/care-navi/click insert error:", error);
      return jsonUtf8({ ok: false, error: error.message }, 500);
    }

    return jsonUtf8({ ok: true, id: data?.id || null });
  } catch (error) {
    console.error("/api/care-navi/click POST error:", error);
    return jsonUtf8({ ok: false, error: error?.message || String(error) }, 500);
  }
}
