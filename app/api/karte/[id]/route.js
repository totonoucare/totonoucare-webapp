import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { hasValidGuestToken } from "@/lib/diagnosisGuestAccess";
import { scoreDiagnosis } from "@/lib/diagnosis/v2/scoring";
import { buildPersonalKarte, getKartePreviewSections } from "@/lib/personalKarte";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getUserFromRequest(req) {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const token = auth.match(/^Bearer\s+(.+)$/i)?.[1] || null;

  if (!token) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

async function hasUnlockedKarte(admin, userId, diagnosisEventId) {
  if (!userId || !diagnosisEventId) return false;

  const { data, error } = await admin
    .from("personal_karte_unlocks")
    .select("id,status")
    .eq("user_id", userId)
    .eq("diagnosis_event_id", diagnosisEventId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.warn("[api.karte] personal_karte_unlocks lookup skipped:", error.message);
    return false;
  }

  return Boolean(data?.id);
}

export async function GET(req, { params }) {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "診断結果IDが必要です。" }, { status: 400 });
    }

    const admin = createAdminClient();
    const user = await getUserFromRequest(req);

    const { data: event, error } = await admin
      .from("diagnosis_events")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!event) {
      return NextResponse.json({ error: "診断結果が見つかりません。" }, { status: 404 });
    }

    const ownedByUser = Boolean(user?.id && event.user_id === user.id);

    // アカウントに紐づいた診断結果は、購入済みレコードがあっても本人以外には返さない。
    if (event.user_id && !ownedByUser) {
      return NextResponse.json(
        { error: "このカルテを見る権限がありません。" },
        { status: 403 }
      );
    }

    const guestAllowed = !event.user_id
      ? await hasValidGuestToken({ req, supabase: admin, eventId: id })
      : false;

    const unlocked = await hasUnlockedKarte(admin, user?.id, id);

    // 匿名診断結果は、ゲストトークンを持つ人、または購入済みのログインユーザーだけ表示できる。
    if (!event.user_id && !guestAllowed && !unlocked) {
      return NextResponse.json(
        { error: "診断結果の確認に必要な情報がありません。" },
        { status: 403 }
      );
    }

    const computed = scoreDiagnosis(event.answers || {});
    const eventForKarte = {
      ...event,
      computed,
      symptom_focus: computed.symptom_focus || event.symptom_focus,
    };
    const karte = buildPersonalKarte(eventForKarte);

    return NextResponse.json({
      unlocked,
      event: {
        id: event.id,
        user_id: event.user_id,
        created_at: event.created_at,
        computed,
      },
      karte: unlocked
        ? karte
        : {
            productName: karte.productName,
            subtitle: karte.subtitle,
            coreTitle: karte.coreTitle,
            coreShort: karte.coreShort,
            symptomLabel: karte.symptomLabel,
            heroLead: karte.heroLead,
            sections: getKartePreviewSections(karte),
          },
    });
  } catch (error) {
    console.error("[api.karte]", error);
    return NextResponse.json(
      { error: error?.message || "カルテの取得に失敗しました。" },
      { status: 500 }
    );
  }
}
