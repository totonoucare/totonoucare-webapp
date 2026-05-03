import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { hasValidGuestToken } from "@/lib/diagnosisGuestAccess";
import { scoreDiagnosis } from "@/lib/diagnosis/v2/scoring";
import { buildPersonalKarte, getKartePreviewSections } from "@/lib/personalKarte";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

function jsonNoStore(body, init = {}) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...NO_STORE_HEADERS,
      ...(init.headers || {}),
    },
  });
}

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
    .in("status", ["active", "paid"])
    .limit(1);

  if (error) {
    console.warn("[api.karte] personal_karte_unlocks lookup skipped:", error.message);
    return false;
  }

  return Array.isArray(data) && data.length > 0;
}

async function hasAnyUnlockedKarteForEvent(admin, diagnosisEventId) {
  if (!diagnosisEventId) return false;

  const { data, error } = await admin
    .from("personal_karte_unlocks")
    .select("id,status")
    .eq("diagnosis_event_id", diagnosisEventId)
    .in("status", ["active", "paid"])
    .limit(1);

  if (error) {
    console.warn("[api.karte] event unlock lookup skipped:", error.message);
    return false;
  }

  return Array.isArray(data) && data.length > 0;
}

export async function GET(req, { params }) {
  try {
    const id = params?.id;
    if (!id) {
      return jsonNoStore({ error: "診断結果IDが必要です。" }, { status: 400 });
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
      return jsonNoStore({ error: "診断結果が見つかりません。" }, { status: 404 });
    }

    const ownedByUser = Boolean(user?.id && event.user_id === user.id);

    // アカウントに紐づいた診断結果は、本人以外には返さない。
    if (event.user_id && !ownedByUser) {
      return jsonNoStore(
        { error: "このカルテを見る権限がありません。" },
        { status: 403 }
      );
    }

    const guestAllowed = !event.user_id
      ? await hasValidGuestToken({ req, supabase: admin, eventId: id })
      : false;

    // 1. ログインユーザー本人の購入レコードを見る。
    // 2. event.user_id がある場合、本人確認済みなら event.user_id でも見る。
    // 3. 本人確認済みの保存済み診断 or ゲストトークン保有中の匿名診断では、
    //    diagnosis_event_id に紐づく active/paid unlock があればアンロック扱いにする。
    //    これにより、決済後に auth session の取得タイミングやキャッシュで判定がズレる問題を避ける。
    const userUnlocked = await hasUnlockedKarte(admin, user?.id, id);
    const ownerUnlocked = event.user_id
      ? await hasUnlockedKarte(admin, event.user_id, id)
      : false;
    const eventUnlocked = ownedByUser || guestAllowed
      ? await hasAnyUnlockedKarteForEvent(admin, id)
      : false;

    const unlocked = Boolean(userUnlocked || ownerUnlocked || eventUnlocked);

    // 匿名診断結果は、ゲストトークンを持つ人、または購入済みのログインユーザーだけ表示できる。
    if (!event.user_id && !guestAllowed && !unlocked) {
      return jsonNoStore(
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

    return jsonNoStore({
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
    return jsonNoStore(
      { error: error?.message || "カルテの取得に失敗しました。" },
      { status: 500 }
    );
  }
}

