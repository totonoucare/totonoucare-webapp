import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { hasValidGuestToken } from "@/lib/diagnosisGuestAccess";
import { scoreDiagnosis } from "@/lib/diagnosis/v2/scoring";
import { buildPersonalKarte, getKartePreviewSections } from "@/lib/personalKarte";
import {
  buildKarteSourcePayload,
  generatePersonalKarteAi,
  getPersonalKarteModel,
  getPersonalKartePromptVersion,
  hashKarteSource,
  isPersonalKarteAiEnabled,
} from "@/lib/personalKarteAi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

function jsonNoStore(body, init = {}) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...NO_STORE_HEADERS,
      ...(init.headers || {}),
    },
  });
}

function isMissingReportTableError(error) {
  const message = String(error?.message || "");
  return error?.code === "42P01" || error?.code === "PGRST205" || message.includes("personal_karte_reports");
}

async function getUserFromRequest(req) {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const token = auth.match(/^Bearer\s+(.+)$/i)?.[1] || null;

  if (!token) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

async function hasUnlockedKarte(admin, userId, diagnosisEventId) {
  if (!userId || !diagnosisEventId) return false;

  const { data, error } = await admin
    .from("personal_karte_unlocks")
    .select("id,status")
    .eq("user_id", userId)
    .eq("diagnosis_event_id", diagnosisEventId)
    .in("status", ["active", "paid"])
    .limit(1);

  if (error) {
    console.warn("[api.karte] personal_karte_unlocks lookup skipped:", error.message);
    return false;
  }

  return Array.isArray(data) && data.length > 0;
}

async function hasAnyUnlockedKarteForEvent(admin, diagnosisEventId) {
  if (!diagnosisEventId) return false;

  const { data, error } = await admin
    .from("personal_karte_unlocks")
    .select("id,status")
    .eq("diagnosis_event_id", diagnosisEventId)
    .in("status", ["active", "paid"])
    .limit(1);

  if (error) {
    console.warn("[api.karte] event unlock lookup skipped:", error.message);
    return false;
  }

  return Array.isArray(data) && data.length > 0;
}

async function loadSavedAiKarte(admin, { diagnosisEventId, sourceHash }) {
  const { data, error } = await admin
    .from("personal_karte_reports")
    .select("id,report_json,model,prompt_version,generation_status,created_at,updated_at")
    .eq("diagnosis_event_id", diagnosisEventId)
    .eq("source_hash", sourceHash)
    .eq("generation_status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingReportTableError(error)) {
      console.warn("[api.karte] personal_karte_reports table is not available yet. Falling back to rules.");
      return null;
    }
    throw error;
  }

  return data?.report_json || null;
}

async function saveAiKarte(admin, { userId, diagnosisEventId, sourceHash, karte }) {
  const { error } = await admin.from("personal_karte_reports").upsert(
    {
      user_id: userId,
      diagnosis_event_id: diagnosisEventId,
      prompt_version: getPersonalKartePromptVersion(),
      model: getPersonalKarteModel(),
      source_hash: sourceHash,
      generation_status: "completed",
      report_json: karte,
      generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "diagnosis_event_id,source_hash" }
  );

  if (error) {
    if (isMissingReportTableError(error)) {
      console.warn("[api.karte] personal_karte_reports save skipped. Table not found.");
      return;
    }
    throw error;
  }
}

async function getOrCreatePurchasedKarte({ admin, event, computed, baseKarte, userId }) {
  if (!isPersonalKarteAiEnabled()) {
    return { karte: baseKarte, source: "rules", aiEnabled: false };
  }

  const sourcePayload = buildKarteSourcePayload({ event, computed, baseKarte });
  const sourceHash = hashKarteSource(sourcePayload);

  const saved = await loadSavedAiKarte(admin, {
    diagnosisEventId: event.id,
    sourceHash,
  });

  if (saved) {
    return { karte: saved, source: "openai-cache", aiEnabled: true };
  }

  try {
    const generated = await generatePersonalKarteAi({ source: sourcePayload, baseKarte });
    await saveAiKarte(admin, {
      userId: userId || event.user_id,
      diagnosisEventId: event.id,
      sourceHash,
      karte: generated,
    });
    return { karte: generated, source: "openai-generated", aiEnabled: true };
  } catch (error) {
    console.error("[api.karte.ai] generation failed; falling back to rules", error);
    return {
      karte: {
        ...baseKarte,
        meta: {
          ...(baseKarte.meta || {}),
          aiFallbackReason: error?.message || "generation failed",
        },
      },
      source: "rules-ai-fallback",
      aiEnabled: true,
    };
  }
}

export async function GET(req, { params }) {
  try {
    const id = params?.id;
    if (!id) {
      return jsonNoStore({ error: "診断結果IDが必要です。" }, { status: 400 });
    }

    const admin = createAdminClient();
    const user = await getUserFromRequest(req);

    const { data: event, error } = await admin
      .from("diagnosis_events")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!event) {
      return jsonNoStore({ error: "診断結果が見つかりません。" }, { status: 404 });
    }

    const ownedByUser = Boolean(user?.id && event.user_id === user.id);

    // アカウントに紐づいた診断結果は、本人以外には返さない。
    if (event.user_id && !ownedByUser) {
      return jsonNoStore(
        { error: "このカルテを見る権限がありません。" },
        { status: 403 }
      );
    }

    const guestAllowed = !event.user_id
      ? await hasValidGuestToken({ req, supabase: admin, eventId: id })
      : false;

    const userUnlocked = await hasUnlockedKarte(admin, user?.id, id);
    const ownerUnlocked = event.user_id
      ? await hasUnlockedKarte(admin, event.user_id, id)
      : false;
    const eventUnlocked = ownedByUser || guestAllowed
      ? await hasAnyUnlockedKarteForEvent(admin, id)
      : false;

    const unlocked = Boolean(userUnlocked || ownerUnlocked || eventUnlocked);

    // 匿名診断結果は、ゲストトークンを持つ人、または購入済みのログインユーザーだけ表示できる。
    if (!event.user_id && !guestAllowed && !unlocked) {
      return jsonNoStore(
        { error: "診断結果の確認に必要な情報がありません。" },
        { status: 403 }
      );
    }

    const computed = scoreDiagnosis(event.answers || {});
    const eventForKarte = {
      ...event,
      computed,
      symptom_focus: computed.symptom_focus || event.symptom_focus,
    };
    const baseKarte = buildPersonalKarte(eventForKarte);

    if (!unlocked) {
      return jsonNoStore({
        unlocked,
        generation: { source: "preview", aiEnabled: isPersonalKarteAiEnabled() },
        event: {
          id: event.id,
          user_id: event.user_id,
          created_at: event.created_at,
          computed,
        },
        karte: {
          productName: baseKarte.productName,
          subtitle: baseKarte.subtitle,
          coreTitle: baseKarte.coreTitle,
          coreShort: baseKarte.coreShort,
          symptomLabel: baseKarte.symptomLabel,
          // 未アンロックのプレビューでも、本人の実データを反映するために必要な表示用メタデータ。
          // ここを落とすと、フロント側が「気血津液の偏り」「注意天気」などの汎用文言にフォールバックする。
          primarySub: baseKarte.primarySub,
          secondarySub: baseKarte.secondarySub,
          mainWeather: baseKarte.mainWeather,
          mainWeatherLabel: baseKarte.mainWeatherLabel,
          meridianPreview: baseKarte.meridianPreview,
          weatherRankings: baseKarte.weatherRankings,
          envVectors: baseKarte.envVectors,
          heroLead: baseKarte.heroLead,
          quickTakeaways: baseKarte.quickTakeaways,
          mapFlow: baseKarte.mapFlow,
          forecastUsage: baseKarte.forecastUsage,
          beautyColumn: baseKarte.beautyColumn,
          sections: getKartePreviewSections(baseKarte),
        },
      });
    }

    const purchased = await getOrCreatePurchasedKarte({
      admin,
      event,
      computed,
      baseKarte,
      userId: user?.id,
    });

    return jsonNoStore({
      unlocked,
      generation: {
        source: purchased.source,
        aiEnabled: purchased.aiEnabled,
      },
      event: {
        id: event.id,
        user_id: event.user_id,
        created_at: event.created_at,
        computed,
      },
      karte: purchased.karte,
    });
  } catch (error) {
    console.error("[api.karte]", error);
    return jsonNoStore(
      { error: error?.message || "カルテの取得に失敗しました。" },
      { status: 500 }
    );
  }
}
