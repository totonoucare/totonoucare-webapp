// app/api/diagnosis/v2/events/[id]/route.js
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { scoreDiagnosis } from "@/lib/diagnosis/v2/scoring";
import { validateDiagnosisAnswers } from "@/lib/diagnosis/v2/validateAnswers";
import { hasValidGuestToken } from "@/lib/diagnosisGuestAccess";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getBearer(req) {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}


function isMissingActiveSymptomColumn(error) {
  const message = String(error?.message || "");
  return (
    error?.code === "42703" ||
    error?.code === "PGRST204" ||
    message.includes("active_symptom_focus") ||
    message.includes("Could not find")
  );
}

async function getActiveSymptomForUser(userId) {
  if (!userId) return null;

  const { data, error } = await supabaseServer
    .from("constitution_profiles")
    .select("symptom_focus,active_symptom_focus")
    .eq("user_id", userId)
    .maybeSingle();

  if (!error) return data?.active_symptom_focus || data?.symptom_focus || null;
  if (!isMissingActiveSymptomColumn(error)) throw error;

  const { data: fallback, error: fallbackError } = await supabaseServer
    .from("constitution_profiles")
    .select("symptom_focus")
    .eq("user_id", userId)
    .maybeSingle();

  if (fallbackError) throw fallbackError;
  return fallback?.symptom_focus || null;
}

async function getAuthedUser(req) {
  const token = getBearer(req);
  if (!token) return null;

  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export async function GET(req, { params }) {
  try {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { data, error } = await supabaseServer
      .from("diagnosis_events")
      .select(
        [
          "id",
          "created_at",
          "symptom_focus",
          "answers",
          "computed",
          "version",
          "user_id",
          "ai_explain_text",
          "ai_explain_model",
          "ai_explain_created_at",
        ].join(",")
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const authedUser = await getAuthedUser(req);

    if (data.user_id) {
      if (!authedUser || authedUser.id !== data.user_id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      const guestOk = await hasValidGuestToken({ req, supabase: supabaseServer, eventId: id });
      if (!guestOk) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const answers = data.answers || {};
    const validation = validateDiagnosisAnswers(answers);
    if (!validation.ok) {
      return NextResponse.json({
        data: {
          id: data.id,
          created_at: data.created_at,
          version: data.version || "v2",
          is_attached: !!data.user_id,
          retake_required: true,
        },
      });
    }
    const scoringAnswers = { ...validation.answers };
    if (BODY_LINE_VALUES.has(answers.body_line_primary)) {
      scoringAnswers.body_line_primary = answers.body_line_primary;
    }
    if (BODY_LINE_VALUES.has(answers.body_line_secondary)) {
      scoringAnswers.body_line_secondary = answers.body_line_secondary;
    }
    const computed = scoreDiagnosis(scoringAnswers); // always recompute from current v2 answers
    const diagnosisSymptomFocus = computed.symptom_focus || data.symptom_focus || "fatigue";
    const activeSymptomFocus = data.user_id
      ? await getActiveSymptomForUser(data.user_id) || diagnosisSymptomFocus
      : diagnosisSymptomFocus;

    const safe = {
      id: data.id,
      created_at: data.created_at,
      symptom_focus: diagnosisSymptomFocus,
      diagnosis_symptom_focus: diagnosisSymptomFocus,
      active_symptom_focus: activeSymptomFocus,
      answers: scoringAnswers,
      computed,
      version: data.version || "v2",
      is_attached: !!data.user_id,

      ai_explain_text: data.ai_explain_text || null,
      ai_explain_model: data.ai_explain_model || null,
      ai_explain_created_at: data.ai_explain_created_at || null,
    };

    return NextResponse.json({ data: safe });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

const BODY_LINE_VALUES = new Set(["A", "B", "C", "D", "E", "F", "none"]);

export async function PATCH(req, { params }) {
  try {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const primary = String(body?.body_line_primary || "none");
    let secondary = String(body?.body_line_secondary || "none");
    if (!BODY_LINE_VALUES.has(primary) || !BODY_LINE_VALUES.has(secondary)) {
      return NextResponse.json({ error: "体のラインの回答が正しくありません" }, { status: 400 });
    }
    if (primary === "none" || primary === secondary) secondary = "none";

    const { data: current, error: loadError } = await supabaseServer
      .from("diagnosis_events")
      .select("id,user_id,answers")
      .eq("id", id)
      .single();
    if (loadError) throw loadError;
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const authedUser = await getAuthedUser(req);
    if (current.user_id) {
      if (!authedUser || authedUser.id !== current.user_id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      const guestOk = await hasValidGuestToken({ req, supabase: supabaseServer, eventId: id });
      if (!guestOk) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const currentValidation = validateDiagnosisAnswers(current.answers || {});
    if (!currentValidation.ok) {
      return NextResponse.json(
        { error: "新しい質問で体質チェックをやり直してください。", code: "RETAKE_REQUIRED" },
        { status: 409 }
      );
    }
    const answers = {
      ...currentValidation.answers,
      body_line_primary: primary,
      body_line_secondary: secondary,
    };
    const computed = scoreDiagnosis(answers);

    const { error: updateError } = await supabaseServer
      .from("diagnosis_events")
      .update({ answers, computed })
      .eq("id", id);
    if (updateError) throw updateError;

    if (current.user_id) {
      const { error: profileError } = await supabaseServer
        .from("constitution_profiles")
        .update({
          answers,
          computed,
          primary_meridian: computed.primary_meridian,
          secondary_meridian: computed.secondary_meridian,
        })
        .eq("user_id", current.user_id);
      if (profileError) throw profileError;

      const { error: eventError } = await supabaseServer
        .from("constitution_events")
        .update({
          answers,
          primary_meridian: computed.primary_meridian,
          secondary_meridian: computed.secondary_meridian,
        })
        .eq("source_event_id", id)
        .eq("user_id", current.user_id);
      if (eventError) throw eventError;
    }

    return NextResponse.json({ data: { answers, computed } });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "体のラインを保存できませんでした。時間をおいてもう一度お試しください。" },
      { status: 500 }
    );
  }
}
