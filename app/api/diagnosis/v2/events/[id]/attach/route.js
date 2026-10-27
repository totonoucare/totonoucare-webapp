// app/api/diagnosis/v2/events/[id]/attach/route.js
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { buildConstitutionProfilePayload, scoreDiagnosis } from "@/lib/diagnosis/v2/scoring";
import { validateDiagnosisAnswers } from "@/lib/diagnosis/v2/validateAnswers";
import {
  clearGuestTokenCookie,
  hasValidGuestToken,
} from "@/lib/diagnosisGuestAccess";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getBearer(req) {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

/**
 * Attach flow:
 * 1) validate bearer -> user
 * 2) load diagnosis_events, require the owner or a valid pending-result cookie
 * 3) always archive a completed result; only the initial result auto-adopts
 * 4) require explicit consent before replacing an existing forecast profile
 * 5) atomically persist with the diagnosis-row lock shared with body-line saves
 */
export async function POST(req, { params }) {
  try {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // --- Auth
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

    // --- Load diagnosis_events
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

    // already attached to another user -> forbid
    if (ev.user_id && ev.user_id !== user.id) {
      return NextResponse.json(
        { error: "This result is already attached to another account." },
        { status: 403 }
      );
    }

    // Saved results belong to their authenticated owner; pending rechecks still
    // require their private guest cookie. Another account's result is never claimable.
    if (!ev.user_id && !await hasValidGuestToken({ req, supabase: supabaseServer, eventId: id })) {
      return NextResponse.json(
        { error: "この体質結果を引き継ぐ権限がありません。結果ページからもう一度お試しください。" },
        { status: 403 }
      );
    }
    let body = {};
    try { body = await req.json(); } catch { /* Initial automatic save has no body. */ }

    const validation = validateDiagnosisAnswers(ev.answers || {});
    if (!validation.ok) {
      return NextResponse.json(
        { error: "判定ロジックが更新されました。現在の質問でもう一度チェックしてください。", code: "RETAKE_REQUIRED" },
        { status: 409 }
      );
    }
    const answers = { ...validation.answers };
    const bodyLineValues = new Set(["A", "B", "C", "D", "E", "F", "none"]);
    if (bodyLineValues.has(ev.answers?.body_line_primary)) {
      answers.body_line_primary = ev.answers.body_line_primary;
    }
    if (bodyLineValues.has(ev.answers?.body_line_secondary)) {
      answers.body_line_secondary = ev.answers.body_line_secondary;
    }
    const computed = scoreDiagnosis(answers);

    // --- Upsert constitution_events by source_event_id
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

      ai_explain_text: ev.ai_explain_text || null,
      ai_explain_model: ev.ai_explain_model || null,
      ai_explain_created_at: ev.ai_explain_created_at || null,
    };

    // One transaction shares the diagnosis lock with body-line saves.
    const profilePayload = buildConstitutionProfilePayload(user.id, answers);
    const { data: saved, error: attachError } = await supabaseServer.rpc(
      "save_diagnosis_v779107",
      {
        p_event_id: id,
        p_user_id: user.id,
        p_expected_user_id: ev.user_id || null,
        p_expected_answers: ev.answers,
        p_expected_computed: ev.computed,
        p_event_payload: eventRow,
        p_profile_payload: profilePayload,
        p_confirm_replace: body?.confirm_update === true,
      }
    );
    if (attachError?.code === "P0106") {
      return NextResponse.json(
        { error: "この結果を予報・ケアに反映するか選んでください。反映中の体質は変更していません。", code: "PROFILE_UPDATE_CONFIRMATION_REQUIRED" },
        { status: 409 }
      );
    }
    if (attachError?.code === "PGRST202" || attachError?.code === "42883") {
      return NextResponse.json(
        { error: "保存機能の更新準備中です。少し時間をおいて再試行してください。", code: "PROFILE_UPDATE_SETUP_REQUIRED" },
        { status: 503 }
      );
    }
    if (attachError?.code === "40001") {
      return NextResponse.json(
        { error: "診断情報が更新されました。ページを読み直してからお試しください。", code: "DIAGNOSIS_CHANGED" },
        { status: 409 }
      );
    }
    if (attachError) throw attachError;
    if (!saved?.constitution_event_id) throw new Error("constitution_events の作成に失敗しました");

    const res = NextResponse.json({
      data: {
        ok: true,
        saved: true,
        attached: true,
        eventId: id,
        userId: user.id,
        constitution_event_id: saved.constitution_event_id,
        current_event_id: saved.current_event_id,
        latest_event_id: saved.current_event_id,
        has_current_profile: saved.has_current_profile === true,
        is_current: saved.is_current === true,
        current_core_code: saved.current_core_code || null,
      },
    });

    clearGuestTokenCookie(res, id);
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
