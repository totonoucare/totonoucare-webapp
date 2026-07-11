import crypto from "crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireUser";
import { supabaseServer } from "@/lib/supabaseServer";
import { generateText } from "@/lib/openai/server";
import { getRecordsAccess } from "@/lib/records/access";
import {
  buildRecordsSummary,
  deterministicAnalysis,
  trimRecordForAi,
} from "@/lib/records/analysis";
import {
  isValidYmd,
  loadRecordsProfile,
  loadRecordsRange,
  latestSourceAt,
} from "@/lib/records/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MODEL =
  process.env.OPENAI_RECORDS_ANALYSIS_MODEL ||
  process.env.OPENAI_RADAR_MODEL ||
  "gpt-5.6-luna";

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = stableValue(value[key]);
        return acc;
      }, {});
  }
  return value;
}

function hashOf(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stableValue(value))).digest("hex");
}

function extractJson(text) {
  const raw = String(text || "").trim();
  if (!raw) throw new Error("AI returned empty text");

  for (const candidate of [
    raw,
    raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim(),
    raw.replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim(),
  ]) {
    try {
      return JSON.parse(candidate);
    } catch {}
  }

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
  throw new Error("AI JSON parse failed");
}

function cleanAnalysis(value, fallback) {
  const validMoods = new Set(["normal", "listening", "thinking", "insight", "complete"]);
  return {
    mood: validMoods.has(value?.mood) ? value.mood : fallback.mood,
    headline: String(value?.headline || fallback.headline).trim().slice(0, 120),
    empathy: String(value?.empathy || fallback.empathy).trim().slice(0, 260),
    observed: String(value?.observed || fallback.observed).trim().slice(0, 360),
    hypotheses: String(value?.hypotheses || fallback.hypotheses).trim().slice(0, 420),
    next_step: String(value?.next_step || fallback.next_step).trim().slice(0, 320),
    question: String(value?.question || fallback.question).trim().slice(0, 220),
    suggested_questions: Array.isArray(value?.suggested_questions)
      ? value.suggested_questions.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 4)
      : fallback.suggested_questions,
  };
}

function reportType(periodKey) {
  return `records_analysis_${String(periodKey || "custom").replace(/[^a-z0-9_-]/gi, "")}`.slice(0, 80);
}

async function findCache(userId, start, periodKey) {
  const { data, error } = await supabaseServer
    .from("weekly_ai_reports")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start", start)
    .eq("report_type", reportType(periodKey))
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function saveCache({
  userId,
  start,
  end,
  periodKey,
  inputHash,
  latestSource,
  analysis,
  existing,
}) {
  const now = new Date().toISOString();
  const payload = {
    user_id: userId,
    week_start: start,
    week_end: end,
    report_type: reportType(periodKey),
    input_hash: inputHash,
    latest_source_at: latestSource,
    generation_count: Number(existing?.generation_count || 0) + 1,
    report_json: analysis,
    report_text: [
      analysis.headline,
      analysis.empathy,
      analysis.observed,
      analysis.hypotheses,
      analysis.next_step,
      analysis.question,
    ].filter(Boolean).join("\n\n"),
    model: MODEL,
    generated_at: now,
    updated_at: now,
  };

  if (existing?.id) {
    const { data, error } = await supabaseServer
      .from("weekly_ai_reports")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabaseServer
    .from("weekly_ai_reports")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function POST(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const access = getRecordsAccess();
    if (!access.ai_enabled) {
      return NextResponse.json(
        { error: "AI分析は現在利用できません", code: "ai_disabled" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const start = String(body?.start || "");
    const end = String(body?.end || "");
    const periodKey = String(body?.period_key || "custom");

    if (!isValidYmd(start) || !isValidYmd(end)) {
      return NextResponse.json({ error: "invalid start/end" }, { status: 400 });
    }

    const [bundle, profile] = await Promise.all([
      loadRecordsRange(user.id, start, end),
      loadRecordsProfile(user.id),
    ]);

    const summary = buildRecordsSummary(bundle.rows);
    const fallback = deterministicAnalysis(summary);

    if (summary.recorded_days < 3 || !process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        data: {
          analysis: fallback,
          summary,
          source: "algorithm",
          model: null,
          cached: false,
          access,
        },
      });
    }

    const input = {
      period: { key: periodKey, start, end },
      profile,
      summary: {
        recorded_days: summary.recorded_days,
        good_days: summary.good_days,
        difficult_days: summary.difficult_days,
        care_days: summary.care_days,
        aligned_days: summary.aligned_days,
        better_than_forecast_days: summary.better_than_forecast_days,
        worse_than_forecast_days: summary.worse_than_forecast_days,
        care_good_days: summary.care_good_days,
        care_difficult_days: summary.care_difficult_days,
        no_care_difficult_days: summary.no_care_difficult_days,
        domain_counts: summary.domain_counts,
        factor_counts: summary.factor_counts,
        top_difficult_trigger: summary.top_difficult_trigger,
      },
      records: summary.rows
        .filter((row) => row.review)
        .slice(-120)
        .map(trimRecordForAi),
    };
    const inputHash = hashOf(input);

    let existing = null;
    try {
      existing = await findCache(user.id, start, periodKey);
      if (existing?.input_hash === inputHash && existing?.report_json) {
        return NextResponse.json({
          data: {
            analysis: cleanAnalysis(existing.report_json, fallback),
            summary,
            source: "ai",
            model: existing.model || MODEL,
            cached: true,
            access,
          },
        });
      }
    } catch (cacheError) {
      console.warn("records analysis cache read skipped:", cacheError?.message || cacheError);
    }

    const prompt = `
あなたは「未病レーダー」の記録分析AIです。
ユーザーの体調を気にかけ、一緒に振り返る伴走役として、日本語で回答してください。

# 役割
- 予報、実際の体調、先回りケア、メモを見比べる
- まず気持ちを受け止め、その後に事実、仮説、次の小さな試し方を整理する
- 予報と実感が違った場合は、ズレを隠さず正直に伝える
- 想定外の記録も「失敗」とせず、その人を知る手がかりとして扱う
- 気にかけてくれる温かさは出すが、人間を装ったり依存を促したりしない

# 絶対ルール
- 診断、治療、薬・漢方・サプリの個別な使用判断はしない
- ケアの効果を断定しない。「可能性」「手がかり」「再現するか見る」と表現する
- 数字は入力JSONにあるものだけを使う
- 記録が少ない場合は断定しない
- つらかった人を責めない
- 一般論だけで終わらず、入力データに触れる
- 文章はやさしく、具体的に、長すぎない
- observed は事実のみ
- hypotheses は複数の可能性を区別する
- next_step は一度に一つか二つ
- question は分析を深めるための自然な追加質問
- suggested_questions はユーザーが次に押せる短い質問を2〜4件

# 出力
JSONのみを返してください。
{
  "mood": "normal | listening | thinking | insight | complete",
  "headline": "...",
  "empathy": "...",
  "observed": "...",
  "hypotheses": "...",
  "next_step": "...",
  "question": "...",
  "suggested_questions": ["...", "..."]
}

入力JSON:
${JSON.stringify(input, null, 2)}
`.trim();

    const text = await generateText({
      model: MODEL,
      input: prompt,
      max_output_tokens: 1500,
      reasoning: { effort: "low" },
      store: false,
    });

    const analysis = cleanAnalysis(extractJson(text), fallback);

    try {
      await saveCache({
        userId: user.id,
        start,
        end,
        periodKey,
        inputHash,
        latestSource: latestSourceAt(bundle, profile),
        analysis,
        existing,
      });
    } catch (cacheError) {
      console.warn("records analysis cache write skipped:", cacheError?.message || cacheError);
    }

    return NextResponse.json({
      data: {
        analysis,
        summary,
        source: "ai",
        model: MODEL,
        cached: false,
        access,
      },
    });
  } catch (error) {
    console.error("/api/records/analysis POST error:", error);
    return NextResponse.json({ error: error?.message || "AI分析に失敗しました" }, { status: 500 });
  }
}
