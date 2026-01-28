// app/api/diagnosis/v2/events/[id]/attach/route.js
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";
import { buildConstitutionProfilePayload, scoreDiagnosis } from "@/lib/diagnosis/v2/scoring";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req, { params }) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const id = params?.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // 1) 該当イベント取得
    const { data: ev, error: e0 } = await supabaseServer
      .from("diagnosis_events")
      .select("id, user_id, symptom_focus, answers, computed, version, created_at")
      .eq("id", id)
      .single();
    if (e0) throw e0;

    // 2) 他人に既にattachされていたら拒否
    if (ev.user_id && ev.user_id !== user.id) {
      return NextResponse.json({ error: "This result is already attached to another account." }, { status: 403 });
    }

    // 3) attach（user_id を埋める）
    const { error: e1 } = await supabaseServer
      .from("diagnosis_events")
      .update({ user_id: user.id })
      .eq("id", id);
    if (e1) throw e1;

    // 4) constitution_profiles upsert（最新キャッシュ）
    const answers = ev.answers || {};
    const profilePayload = buildConstitutionProfilePayload(user.id, answers);

    const { data: profileRow, error: e2 } = await supabaseServer
      .from("constitution_profiles")
      .upsert([profilePayload], { onConflict: "user_id" })
      .select("user_id, symptom_focus, version, updated_at, core_code, sub_labels, primary_meridian, secondary_meridian")
      .single();
    // ↑ select項目に core_code/sub_labels が無いなら削ってOK（スキーマ差異対策）
    if (e2) {
      // スキーマ差異があるとここで落ちるので、保険でselectなしupsertにfallback
      const { error: e2b } = await supabaseServer
        .from("constitution_profiles")
        .upsert([profilePayload], { onConflict: "user_id" });
      if (e2b) throw e2b;
    }

    // 5) constitution_events へ履歴保存（ユーザーに紐づいた形で）
    const computed = scoreDiagnosis(answers);

    const { error: e3 } = await supabaseServer
      .from("constitution_events")
      .insert([
        {
          user_id: user.id,
          symptom_focus: computed.symptom_focus,
          answers: answers,
          thermo: computed.thermo,
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
      data: {
        ok: true,
        attached: true,
        eventId: id,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
