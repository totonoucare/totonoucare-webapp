import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireUser";
import { enforcePublicApiRateLimit } from "@/lib/publicApiRateLimit";
import { generateStructured } from "@/lib/openai/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYMPTOM_KEYS = ["fatigue", "sleep", "digestion", "neck_shoulder", "low_back_pain", "swelling", "headache", "dizziness", "mood", "other"];

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "symptom_keys", "terms", "duration_hint", "location_terms", "quality_terms", "uncertain_terms"],
  properties: {
    summary: { type: "string", maxLength: 120 },
    symptom_keys: { type: "array", maxItems: 3, items: { type: "string", enum: SYMPTOM_KEYS } },
    terms: { type: "array", maxItems: 8, items: { type: "string", maxLength: 30 } },
    duration_hint: { type: "string", enum: ["unknown", "today", "days", "weeks", "months"] },
    location_terms: { type: "array", maxItems: 6, items: { type: "string", maxLength: 20 } },
    quality_terms: { type: "array", maxItems: 6, items: { type: "string", maxLength: 30 } },
    uncertain_terms: { type: "array", maxItems: 6, items: { type: "string", maxLength: 30 } },
  },
};

function compact(value, limit = 500) {
  return String(value || "").normalize("NFKC").trim().replace(/\s+/g, " ").slice(0, limit);
}

function safetyIdentifier(userId) {
  const secret = process.env.OPENAI_SAFETY_IDENTIFIER_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "care-shop";
  return createHash("sha256").update(secret).update("\0").update(String(userId)).digest("hex");
}

export async function POST(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user?.id) return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });

    const rateLimited = await enforcePublicApiRateLimit(req, { route: "care-shop-interpret", limit: 12, windowSeconds: 3600 });
    if (rateLimited) return rateLimited;

    const body = await req.json().catch(() => ({}));
    const text = compact(body?.text);
    if (text.length < 2) return NextResponse.json({ error: "入力内容が短すぎます。" }, { status: 400 });

    const result = await generateStructured({
      model: "gpt-5.6-luna",
      reasoning: { effort: "low" },
      max_output_tokens: 260,
      safety_identifier: safetyIdentifier(user.id),
      store: false,
      schema: SCHEMA,
      schemaName: "care_shop_concern_normalization",
      instructions: [
        "あなたは日本語の短い体調メモを、商品探索フォームの項目へ整理する入力補助です。",
        "診断、原因推定、重症度判定、受診判断、商品・成分・漢方処方の推薦は絶対にしません。",
        "書かれていない事実を補わず、曖昧な語は uncertain_terms に残してください。",
        "summary は『いつから・どこに・どのような体感』を、入力にある範囲だけで自然な日本語一文にします。",
        "symptom_keys は最も近いものを最大3件。該当しなければ other のみです。",
      ].join("\n"),
      input: text,
    });

    return NextResponse.json({ data: result.data, meta: { model: result.model, usage: result.usage } });
  } catch (error) {
    console.error("/api/care-shop/interpret POST error:", error);
    return NextResponse.json({ error: "AI整理を一時的に使えません。選択項目だけでも検索できます。" }, { status: 503 });
  }
}
