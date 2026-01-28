// app/api/diagnosis/v2/submit/route.js
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { scoreDiagnosis } from "@/lib/diagnosis/v2/scoring";

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

  const allowedColdHeat = new Set(["cold", "neutral", "heat", "mixed"]);
  if (!allowedColdHeat.has(answers.cold_heat)) return "Invalid cold_heat";

  const allowedRes = new Set(["low", "medium", "high"]);
  if (!allowedRes.has(answers.resilience)) return "Invalid resilience";

  const allowedMeridian = new Set(["A", "B", "C", "D", "E"]);
  if (!allowedMeridian.has(answers.meridian_test)) return "Invalid meridian_test";

  return null;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const answers = body?.answers || body;

    const vErr = validateAnswers(answers);
    if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });

    const computed = scoreDiagnosis(answers);

    // 匿名で diagnosis_events を作る（user_id = null）
    const { data: row, error: e1 } = await supabaseServer
      .from("diagnosis_events")
      .insert([
        {
          user_id: null,
          symptom_focus: computed.symptom_focus,
          answers,
          computed,
          version: "v2",
        },
      ])
      .select("id, created_at, symptom_focus, version")
      .single();

    if (e1) throw e1;

    return NextResponse.json({
      data: {
        eventId: row.id,
        event: row,
        computed,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
