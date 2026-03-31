import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";
import { jstDateString } from "@/lib/dateJST";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function normalizeDate(value) {
  return value || jstDateString(new Date());
}

async function findLatestReview(userId, targetDate) {
  const { data, error } = await supabaseServer
    .from("radar_reviews")
    .select("id, user_id, target_date, condition_level, prevent_level, note, action_tags, created_at")
    .eq("user_id", userId)
    .eq("target_date", targetDate)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return Array.isArray(data) ? data[0] || null : null;
}

async function findForecast(userId, targetDate) {
  const { data, error } = await supabaseServer
    .from("radar_forecasts")
    .select("id, target_date, score_0_10, signal, main_trigger, trigger_dir, why_short")
    .eq("user_id", userId)
    .eq("target_date", targetDate)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return Array.isArray(data) ? data[0] || null : null;
}

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const url = new URL(req.url);
    const targetDate = normalizeDate(url.searchParams.get("date"));

    const [review, forecast] = await Promise.all([
      findLatestReview(user.id, targetDate),
      findForecast(user.id, targetDate),
    ]);

    return NextResponse.json({
      data: {
        date: targetDate,
        review,
        forecast,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const targetDate = normalizeDate(body?.date);
    const conditionLevel = Number(body?.condition_level);
    const preventLevel = Number(body?.prevent_level);
    const actionTags = Array.isArray(body?.action_tags)
      ? body.action_tags.filter((x) => typeof x === "string" && x.trim())
      : [];
    const note = typeof body?.note === "string" ? body.note.trim() : "";

    if (![0, 1, 2].includes(conditionLevel)) {
      return NextResponse.json({ error: "condition_level invalid" }, { status: 400 });
    }
    if (![0, 1, 2].includes(preventLevel)) {
      return NextResponse.json({ error: "prevent_level invalid" }, { status: 400 });
    }

    const existing = await findLatestReview(user.id, targetDate);

    let result = null;
    if (existing?.id) {
      const { data, error: updateErr } = await supabaseServer
        .from("radar_reviews")
        .update({
          condition_level: conditionLevel,
          prevent_level: preventLevel,
          action_tags: actionTags,
          note: note || null,
        })
        .eq("id", existing.id)
        .select("id, user_id, target_date, condition_level, prevent_level, note, action_tags, created_at")
        .single();

      if (updateErr) throw updateErr;
      result = data;
    } else {
      const { data, error: insertErr } = await supabaseServer
        .from("radar_reviews")
        .insert({
          user_id: user.id,
          target_date: targetDate,
          condition_level: conditionLevel,
          prevent_level: preventLevel,
          action_tags: actionTags,
          note: note || null,
        })
        .select("id, user_id, target_date, condition_level, prevent_level, note, action_tags, created_at")
        .single();

      if (insertErr) throw insertErr;
      result = data;
    }

    const forecast = await findForecast(user.id, targetDate);

    return NextResponse.json({
      data: {
        date: targetDate,
        review: result,
        forecast,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
