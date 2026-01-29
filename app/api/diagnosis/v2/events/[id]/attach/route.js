// app/api/diagnosis/v2/events/[id]/attach/route.js
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { buildConstitutionProfilePayload, scoreDiagnosis } from "@/lib/diagnosis/v2/scoring";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getBearer(req) {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

export async function POST(req, { params }) {
  try {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // ✅ cookieセッション前提にせず、Bearer token で user を特定する
    const token = getBearer(req);
    if (!token) return NextResponse.json({ error: "Missing Bearer token" }, { status: 401 });

    const { data: userData, error: userErr } = await supabaseServer.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json(
        { error: `Invalid session: ${userErr?.message || "no user"}` },
        { status: 401 }
      );
    }
    const user = userData.user;

    // 1) 該当イベント取得
    const { data: ev, error: e0 } = await supabaseServer
      .from("diagnosis_events")
      .select("id, user_id, symptom_focus, answers, computed, version, created_at")
      .eq("id", id)
      .single();
    if (e0) throw e0;

    // 2) 他人に既にattachされていたら拒否
    if (ev.user_id && ev.user_id !== user.id) {
      return NextResponse.json(
        { error: "This result is already attached to another account." },
        { status: 403 }
      );
    }

    // 3) attach（user_id を埋める）
    //    すでに user_id が入っている場合は更新しない（同一ユーザーならOK）
    if (!ev.user_id) {
      const { error: e1 } = await supabaseServer
        .from("diagnosis_events")
        .update({ user_id: user.id })
        .eq("id", id)
        .is("user_id", null);
      if (e1) throw e1;
    }

    // 4) constitution_profiles upsert（最新キャッシュ）
    const answers = ev.answers || {};
    const profilePayload = buildConstitutionProfilePayload(user.id, answers);

    const { error: e2 } = await supabaseServer
      .from("constitution_profiles")
      .upsert([profilePayload], { onConflict: "user_id" });

    if (e2) throw e2;

    // 5) constitution_events へ履歴保存（ユーザーに紐づいた形で）
    const computed = scoreDiagnosis(answers);

    const { error: e3 } = await supabaseServer.from("constitution_events").insert([
      {
        user_id: user.id,
        symptom_focus: computed.symptom_focus,
        answers: answers,

        thermo: computed.thermo, // scoring.js が thermo を返す設計
        resilience: computed.resilience,
        is_mixed: computed.is_mixed,

        qi: computed.qi,
        blood: computed.blood,
        fluid: computed.fluid,

        primary_meridian: computed.primary_meridian,
        secondary_meridian: computed.secondary_meridian,

        core_code: computed.core_code,
        sub_labels: computed.sub_labels,

        engine_version: "v2",
        notes: { source_event_id: id },
      },
    ]);
    if (e3) throw e3;

    return NextResponse.json({
      data: { ok: true, attached: true, eventId: id, userId: user.id },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
