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

/**
 * Attach flow (robust):
 * 1) validate bearer -> user
 * 2) load diagnosis_events
 * 3) create/find constitution_events row by source_event_id
 * 4) upsert constitution_profiles (latest cache) with latest_event_id
 * 5) finally set diagnosis_events.user_id (only after above success)
 */
export async function POST(req, { params }) {
  try {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // --- Auth: Bearer token -> user
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

    // --- 1) load diagnosis_events
    const { data: ev, error: e0 } = await supabaseServer
      .from("diagnosis_events")
      .select(
        [
          "id",
          "user_id",
          "symptom_focus",
          "answers",
          "computed",
          "version",
          "created_at",
          "ai_explain_text",
          "ai_explain_model",
          "ai_explain_created_at",
        ].join(",")
      )
      .eq("id", id)
      .single();

    if (e0) throw e0;
    if (!ev) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // --- 2) already attached to another user -> forbid
    if (ev.user_id && ev.user_id !== user.id) {
      return NextResponse.json(
        { error: "This result is already attached to another account." },
        { status: 403 }
      );
    }

    const answers = ev.answers || {};
    const computed = scoreDiagnosis(answers);

    // --- 3) ensure constitution_events exists (idempotent-ish)
    // NOTE:
    // - 本当は DB に unique(source_event_id) があるのが理想（推奨）
    // - uniqueが無い場合でも、まず既存を探し、無ければ insert
    // - 同時実行の完全排除は unique 制約が必要
    const eventRow = {
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

      source_event_id: id,
      notes: { source_event_id: id },

      // もし診断側でAI解説が既にあれば、コピーしておく（nullでもOK）
      ai_explain_text: ev.ai_explain_text || null,
      ai_explain_model: ev.ai_explain_model || null,
      ai_explain_created_at: ev.ai_explain_created_at || null,
    };

    // 3-1) find existing by source_event_id (and user_id)
    const { data: ceExisting, error: eFind } = await supabaseServer
      .from("constitution_events")
      .select("id, user_id, source_event_id, created_at")
      .eq("source_event_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (eFind) throw eFind;

    let ceId = null;

    if (ceExisting?.id) {
      // 既にある：ユーザー違いなら（本来は起こらないが）拒否
      if (ceExisting.user_id && ceExisting.user_id !== user.id) {
        return NextResponse.json(
          { error: "This result is already attached to another account." },
          { status: 403 }
        );
      }

      ceId = ceExisting.id;

      // 既存行を「最新仕様で」更新しておく（取りこぼし防止）
      const { error: eUpd } = await supabaseServer
        .from("constitution_events")
        .update(eventRow)
        .eq("id", ceId)
        .eq("user_id", user.id);

      if (eUpd) throw eUpd;
    } else {
      // 無い：insert
      const { data: ceNew, error: eIns } = await supabaseServer
        .from("constitution_events")
        .insert([eventRow])
        .select("id")
        .single();

      if (eIns) throw eIns;
      ceId = ceNew?.id || null;
    }

    if (!ceId) throw new Error("constitution_events の作成に失敗しました（idが取得できません）");

    // --- 4) upsert constitution_profiles (latest cache)
    const profilePayload = buildConstitutionProfilePayload(user.id, answers);
    profilePayload.latest_event_id = ceId;

    const { error: eProf } = await supabaseServer
      .from("constitution_profiles")
      .upsert([profilePayload], { onConflict: "user_id" });

    if (eProf) throw eProf;

    // --- 5) finally attach diagnosis_events.user_id (only after success)
    if (!ev.user_id) {
      const { error: eAttach } = await supabaseServer
        .from("diagnosis_events")
        .update({ user_id: user.id })
        .eq("id", id)
        .is("user_id", null);

      if (eAttach) throw eAttach;
    }

    return NextResponse.json({
      data: {
        ok: true,
        attached: true,
        eventId: id,
        userId: user.id,
        latest_event_id: ceId,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
