import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireUser";
import { supabaseServer } from "@/lib/supabaseServer";
import { isMissingRecordsSchemaError } from "@/lib/records/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUS_VALUES = new Set(["interested", "purchased"]);
const CATEGORY_VALUES = new Set(["live", "eat", "point"]);
const SELECT = [
  "id",
  "user_id",
  "item_key",
  "status",
  "category",
  "title",
  "item_url",
  "image_url",
  "source",
  "shop_name",
  "price",
  "product_role",
  "item_snapshot",
  "purchased_at",
  "created_at",
  "updated_at",
].join(",");

function compact(value, limit = 200) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, limit);
}

function nullableText(value, limit) {
  return compact(value, limit) || null;
}

function cleanUrl(value) {
  const url = compact(value, 1600);
  return /^https?:\/\//i.test(url) ? url : null;
}

function cleanItem(input) {
  const item = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const category = CATEGORY_VALUES.has(item.category) ? item.category : "live";
  const price = Number(item.price);
  return {
    title: compact(item.title || item.query || "ケアアイテム", 300),
    category,
    imageUrl: cleanUrl(item.imageUrl),
    itemUrl: cleanUrl(item.itemUrl || item.clickUrl),
    clickUrl: cleanUrl(item.clickUrl),
    query: compact(item.query, 240),
    source: compact(item.source || item.sourceType || "item", 60),
    sourceType: compact(item.sourceType, 60),
    shopName: compact(item.shopName, 160),
    price: Number.isFinite(price) && price >= 0 ? Math.round(price) : null,
    buttonText: compact(item.buttonText, 60),
    useGuide: compact(item.useGuide, 300),
    reason: compact(item.reason, 300),
    productRole: compact(item.productRole || item.role, 100),
  };
}

function rowFromEntry(userId, entry, existingStatus = "") {
  const itemKey = compact(entry?.item_key, 200);
  const item = cleanItem(entry?.item);
  const requestedStatus = STATUS_VALUES.has(entry?.status) ? entry.status : "interested";
  const status = existingStatus === "purchased" ? "purchased" : requestedStatus;
  if (!itemKey || !item.title) return null;
  return {
    user_id: userId,
    item_key: itemKey,
    status,
    category: item.category,
    title: item.title,
    item_url: item.itemUrl,
    image_url: item.imageUrl,
    source: nullableText(item.source, 60),
    shop_name: nullableText(item.shopName, 160),
    price: item.price,
    product_role: nullableText(item.productRole, 100),
    item_snapshot: item,
    purchased_at: status === "purchased" ? new Date().toISOString() : null,
  };
}

async function listItems(userId, status = "") {
  let query = supabaseServer
    .from("user_care_shop_items")
    .select(SELECT)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (STATUS_VALUES.has(status)) query = query.eq("status", status);
  const result = await query;
  if (result.error) {
    if (isMissingRecordsSchemaError(result.error)) return { schemaReady: false, items: [] };
    throw result.error;
  }
  return { schemaReady: true, items: result.data || [] };
}

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });
    const status = new URL(req.url).searchParams.get("status") || "";
    const result = await listItems(user.id, status);
    return NextResponse.json({ data: { schema_ready: result.schemaReady, items: result.items } });
  } catch (error) {
    console.error("/api/care-shop/items GET error:", error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const entries = Array.isArray(body?.entries)
      ? body.entries.slice(0, 40)
      : [{ item_key: body?.item_key, status: body?.status, item: body?.item }];

    let existingStatuses = new Map();
    if (body?.preserve_purchased) {
      const existing = await listItems(user.id);
      if (!existing.schemaReady) {
        return NextResponse.json({ error: "ショップ保存用DBが未適用です", code: "care_shop_schema_required" }, { status: 503 });
      }
      existingStatuses = new Map(existing.items.map((item) => [item.item_key, item.status]));
    }

    const rows = entries
      .map((entry) => rowFromEntry(user.id, entry, existingStatuses.get(compact(entry?.item_key, 200))))
      .filter(Boolean);
    if (!rows.length) return NextResponse.json({ error: "shop item invalid" }, { status: 400 });

    const written = await supabaseServer
      .from("user_care_shop_items")
      .upsert(rows, { onConflict: "user_id,item_key" });
    if (written.error) {
      if (isMissingRecordsSchemaError(written.error)) {
        return NextResponse.json({ error: "ショップ保存用DBが未適用です", code: "care_shop_schema_required" }, { status: 503 });
      }
      throw written.error;
    }
    const result = await listItems(user.id);
    return NextResponse.json({ data: { schema_ready: result.schemaReady, items: result.items } });
  } catch (error) {
    console.error("/api/care-shop/items POST error:", error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const itemKey = compact(body?.item_key, 200);
    if (!itemKey) return NextResponse.json({ error: "item_key required" }, { status: 400 });
    const removed = await supabaseServer
      .from("user_care_shop_items")
      .delete()
      .eq("user_id", user.id)
      .eq("item_key", itemKey);
    if (removed.error) {
      if (isMissingRecordsSchemaError(removed.error)) {
        return NextResponse.json({ error: "ショップ保存用DBが未適用です", code: "care_shop_schema_required" }, { status: 503 });
      }
      throw removed.error;
    }
    const result = await listItems(user.id);
    return NextResponse.json({ data: { schema_ready: result.schemaReady, items: result.items } });
  } catch (error) {
    console.error("/api/care-shop/items DELETE error:", error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
