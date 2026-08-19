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
import { validateDiagnosisAnswers } from "@/lib/diagnosis/v2/validateAnswers";
import { enforcePublicApiRateLimit } from "@/lib/publicApiRateLimit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req) {
  try {
    const limited = await enforcePublicApiRateLimit(req, {
      route: "diagnosis_v2_submit",
      limit: 20,
      windowSeconds: 600,
    });
    if (limited) return limited;

    const contentLength = Number(req.headers.get("content-length") || 0);
    if (Number.isFinite(contentLength) && contentLength > 24_000) {
      return NextResponse.json({ error: "回答データが大きすぎます" }, { status: 413 });
    }

    const body = await req.json().catch(() => ({}));
    const validation = validateDiagnosisAnswers(body?.answers);
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error, code: validation.code },
        { status: 400 }
      );
    }
    const answers = validation.answers;

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
    return NextResponse.json(
      { error: "診断結果の保存に失敗しました。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }
}
