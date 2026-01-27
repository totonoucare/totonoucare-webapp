// app/api/diagnosis/v2/submit/route.js
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";
import { buildConstitutionProfilePayload, scoreDiagnosis } from "@/lib/diagnosis/v2/scoring";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function validateAnswers(answers) {
  const requiredKeys = [
    "symptom_focus",
    "qi_state",
    "blood_state",
    "fluid_state",
    "cold_heat",
    "resilience",
    "meridian_test",
  ];

  const missing = requiredKeys.filter((k) => !answers?.[k]);
  if (missing.length) return `Missing answers: ${missing.join(", ")}`;

  const allowedSymptom = new Set([
    "fatigue",
    "sleep",
    "mood",
    "neck_shoulder",
    "low_back_pain",
    "swelling",
    "headache",
    "dizziness",
  ]);
  if (!allowedSymptom.has(answers.symptom_focus)) return "Invalid symptom_focus";

  const allowedQi = new Set(["deficiency", "balanced", "stagnation"]);
  if (!allowedQi.has(answers.qi_state)) return "Invalid qi_state";

  const allowedBlood = new Set(["deficiency", "balanced", "stasis"]);
  if (!allowedBlood.has(answers.blood_state)) return "Invalid blood_state";

  const allowedFluid = new Set(["deficiency", "balanced", "damp"]);
  if (!allowedFluid.has(answers.fluid_state)) return "Invalid fluid_state";

  const allowedColdHeat = new Set(["cold", "neutral", "heat"]);
  if (!allowedColdHeat.has(answers.cold_heat)) return "Invalid cold_heat";

  const allowedRes = new Set(["low", "medium", "high"]);
  if (!allowedRes.has(answers.resilience)) return "Invalid resilience";

  const allowedMeridian = new Set(["A", "B", "C", "D", "E"]);
  if (!allowedMeridian.has(answers.meridian_test)) return "Invalid meridian_test";

  return null;
}

export async function POST(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const body = await req.json();
    const answers = body?.answers || body; // どちらでも受ける

    const vErr = validateAnswers(answers);
    if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });

    // 1) compute
    const computed = scoreDiagnosis(answers);

    // 2) store history event
    const { data: eventRow, error: e1 } = await supabaseServer
      .from("diagnosis_events")
      .insert([
        {
          user_id: user.id,
          symptom_focus: computed.symptom_focus,
          answers,
          computed,
          version: "v2",
        },
      ])
      .select("id, user_id, created_at, symptom_focus, version")
      .single();
    if (e1) throw e1;

    // 3) upsert latest profile
    const profilePayload = buildConstitutionProfilePayload(user.id, answers);

    const { data: profileRow, error: e2 } = await supabaseServer
      .from("constitution_profiles")
      .upsert([profilePayload], { onConflict: "user_id" })
      .select(
        "user_id, symptom_focus, qi, blood, fluid, cold_heat, resilience, primary_meridian, secondary_meridian, version, updated_at"
      )
      .single();
    if (e2) throw e2;

    return NextResponse.json({
      data: {
        event: eventRow,
        profile: profileRow,
        computed, // UI/AIがすぐ使えるように返す
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
