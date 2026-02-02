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

    // Bearer token -> user
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

    // 1) load diagnosis_events
    const { data: ev, error: e0 } = await supabaseServer
      .from("diagnosis_events")
      .select("id, user_id, symptom_focus, answers, computed, version, created_at")
      .eq("id", id)
      .single();

    if (e0) throw e0;

    // 2) already attached to another user -> forbid
    if (ev.user_id && ev.user_id !== user.id) {
      return NextResponse.json(
        { error: "This result is already attached to another account." },
        { status: 403 }
      );
    }

    // 3) attach diagnosis_events.user_id (idempotent)
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

    // 4) upsert constitution_events by source_event_id (NO duplicates)
    //    requires unique index on (source_event_id) where not null
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

      // NEW: real column
      source_event_id: id,

      // keep notes for backward compatibility
      notes: { source_event_id: id },
    };

    // ignoreDuplicates=true => if already exists, do nothing
    const { error: e3 } = await supabaseServer
      .from("constitution_events")
      .upsert([eventRow], { onConflict: "source_event_id", ignoreDuplicates: true });

    if (e3) throw e3;

    // fetch the constitution_events id (latest_event_id)
    const { data: ce, error: e4 } = await supabaseServer
      .from("constitution_events")
      .select("id")
      .eq("source_event_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (e4) throw e4;

    // 5) upsert constitution_profiles (latest cache) + latest_event_id
    const profilePayload = buildConstitutionProfilePayload(user.id, answers);
    if (ce?.id) profilePayload.latest_event_id = ce.id;

    const { error: e2 } = await supabaseServer
      .from("constitution_profiles")
      .upsert([profilePayload], { onConflict: "user_id" });

    if (e2) throw e2;

    return NextResponse.json({
      data: { ok: true, attached: true, eventId: id, userId: user.id, latest_event_id: ce?.id || null },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
