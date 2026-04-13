// app/api/diagnosis/v2/submit/route.js
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { scoreDiagnosis } from "@/lib/diagnosis/v2/scoring";
import {
  createGuestToken,
  getGuestTokenExpiry,
  hashGuestToken,
  setGuestTokenCookie,
} from "@/lib/diagnosisGuestAccess";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const answers = body?.answers || {};

    const computed = scoreDiagnosis(answers);

    const { data, error } = await supabaseServer
      .from("diagnosis_events")
      .insert([
        {
          user_id: null,
          symptom_focus: computed.symptom_focus || "fatigue",
          answers,
          computed,
          version: "v2",
        },
      ])
      .select("id")
      .single();

    if (error) throw error;

    const guestToken = createGuestToken();
    const guestTokenHash = hashGuestToken(guestToken);
    const expiresAt = getGuestTokenExpiry();

    const { error: guestErr } = await supabaseServer.from("diagnosis_guest_access").insert([
      {
        event_id: data.id,
        token_hash: guestTokenHash,
        expires_at: expiresAt.toISOString(),
      },
    ]);

    if (guestErr) throw guestErr;

    const res = NextResponse.json({
      data: {
        id: data.id,
        eventId: data.id, // legacy compatibility
      },
    });

    setGuestTokenCookie(res, data.id, guestToken);
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
