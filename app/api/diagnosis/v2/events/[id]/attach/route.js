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

    // Bearer token で user を特定
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

    // 0) すでにこの source_event_id が constitution_events に存在するなら冪等に成功返し
    //    （DBに unique index: constitution_events_source_event_uniq がある前提）
    const { data: already, error: eAlready } = await supabaseServer
      .from("constitution_events")
      .select("id, user_id, created_at")
      .eq("source_event_id", id)
      .limit(1);

    if (eAlready) throw eAlready;

    if (already && already.length > 0) {
      // すでに誰かに紐付いてるならガード（通常はこの user のはず）
      const row = already[0];
      if (row.user_id && row.user_id !== user.id) {
        return NextResponse.json(
          { error: "This result is already attached to another account." },
          { status: 403 }
        );
      }
      return NextResponse.json({
        data: {
          ok: true,
          attached: true,
          eventId: id,
          userId: user.id,
          skipped: true,
          constitution_event_id: row.id,
        },
      });
    }

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

    // 3) diagnosis_events に user_id を埋める（同一ユーザーなら何度でもOK）
    if (!ev.user_id) {
      const { error: e1 } = await supabaseServer
        .from("diagnosis_events")
        .update({ user_id: user.id })
        .eq("id", id)
        .is("user_id", null);
      if (e1) throw e1;
    }

    const answers = ev.answers || {};
    const computed = scoreDiagnosis(answers);

    // 4) constitution_events を INSERT（source_event_id を使う）
    //    unique 制約で二重保存が弾かれたら成功扱いで握りつぶす
    const insertPayload = {
      user_id: user.id,
      symptom_focus: computed.symptom_focus,
      answers,

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
      notes: { source_event_id: id }, // 互換のため残す
      source_event_id: id,
    };

    let constitutionEventId = null;

    const { data: ins, error: e3 } = await supabaseServer
      .from("constitution_events")
      .insert([insertPayload])
      .select("id")
      .single();

    if (e3) {
      // すでに保存済み（unique制約違反）は成功扱い
      // Supabase/Postgres: unique violation = 23505
      if (e3.code === "23505") {
        const { data: row2, error: eGet2 } = await supabaseServer
          .from("constitution_events")
          .select("id")
          .eq("source_event_id", id)
          .single();
        if (eGet2) throw eGet2;
        constitutionEventId = row2?.id || null;
      } else {
        throw e3;
      }
    } else {
      constitutionEventId = ins?.id || null;
    }

    // 5) constitution_profiles upsert（最新キャッシュ）
    //    既存 helper をベースにしつつ、あなたのDBにある追加カラムも埋める
    const baseProfile = buildConstitutionProfilePayload(user.id, answers);

    const profilePayload = {
      ...baseProfile,

      // あなたの current schema に存在する追加カラム
      latest_event_id: constitutionEventId,
      thermo: computed.thermo,
      is_mixed: computed.is_mixed,
      core_code: computed.core_code,
      sub_labels: computed.sub_labels,
      engine_version: "v2",
      version: "v2",
      // updated_at は DB デフォルト/trigger に任せる（入れてもOKだがここでは触らない）
    };

    const { error: e2 } = await supabaseServer
      .from("constitution_profiles")
      .upsert([profilePayload], { onConflict: "user_id" });

    if (e2) throw e2;

    return NextResponse.json({
      data: {
        ok: true,
        attached: true,
        eventId: id,
        userId: user.id,
        constitution_event_id: constitutionEventId,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
