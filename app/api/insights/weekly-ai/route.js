import crypto from "crypto";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";
import { jstDateString } from "@/lib/dateJST";
import { generateText } from "@/lib/openai/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const REPORT_TYPE = "weekly_radar";
const MAX_GENERATIONS_PER_WEEK = 2;
const MODEL = process.env.OPENAI_WEEKLY_REPORT_MODEL || process.env.OPENAI_RADAR_MODEL || "gpt-5.4";

function addDays(ymd, delta) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function getWeekRangeJst(weekStartInput = null) {
  if (weekStartInput && /^\d{4}-\d{2}-\d{2}$/.test(weekStartInput)) {
    return {
      week_start: weekStartInput,
      week_end: addDays(weekStartInput, 6),
    };
  }

  const today = jstDateString(new Date());
  const [y, m, d] = today.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay(); // 0 Sun ... 6 Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = addDays(today, diffToMonday);

  return {
    week_start: monday,
    week_end: addDays(monday, 6),
  };
}

function mostFrequent(values) {
  const counts = new Map();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function topItems(values, limit = 3) {
  const counts = new Map();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

function triggerLabel(mainTrigger) {
  if (mainTrigger === "pressure") return "気圧";
  if (mainTrigger === "temp") return "気温";
  if (mainTrigger === "humidity") return "湿度";
  return null;
}

function safeArr(v) {
  return Array.isArray(v) ? v : [];
}

function trimText(v) {
  return String(v || "").trim();
}

function stableValue(value) {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
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

function sha256Of(value) {
  const json = JSON.stringify(stableValue(value));
  return crypto.createHash("sha256").update(json).digest("hex");
}

function extractJson(text) {
  const raw = String(text || "").trim();
  if (!raw) throw new Error("OpenAI returned empty text");

  try {
    return JSON.parse(raw);
  } catch {}

  const fenceStripped = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(fenceStripped);
  } catch {}

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(raw.slice(start, end + 1));
  }

  throw new Error("Failed to parse OpenAI JSON");
}

function buildRows({ start, end, forecasts, reviews }) {
  const forecastMap = new Map((forecasts || []).map((row) => [String(row.target_date), row]));
  const reviewMap = new Map();

  for (const row of reviews || []) {
    const date = String(row.target_date);
    const prev = reviewMap.get(date);
    if (!prev || String(row.created_at) > String(prev.created_at || "")) {
      reviewMap.set(date, row);
    }
  }

  const rows = [];
  const days = 7;

  for (let i = 0; i < days; i += 1) {
    const date = addDays(start, i);
    const forecast = forecastMap.get(date) || null;
    const review = reviewMap.get(date) || null;

    rows.push({
      date,
      forecast: forecast
        ? {
            score_0_10: forecast.score_0_10 ?? null,
            signal: forecast.signal ?? null,
            main_trigger: forecast.main_trigger || null,
            trigger_dir: forecast.trigger_dir || null,
            why_short: trimText(forecast.why_short),
          }
        : null,
      review: review
        ? {
            condition_level: review.condition_level ?? null,
            prevent_level: review.prevent_level ?? null,
            action_tags: safeArr(review.action_tags).slice().sort(),
            note: trimText(review.note),
          }
        : null,
    });
  }

  return rows;
}

function buildSummary(rows) {
  const recordedRows = rows.filter((row) => row.review);
  const scoredRows = rows.filter((row) => row.forecast?.score_0_10 != null);
  const badRows = recordedRows.filter(
    (row) => row.review?.condition_level === 0 || row.review?.condition_level === 1
  );

  const topTriggerOnBadDays = mostFrequent(
    badRows.map((row) => row.forecast?.main_trigger || null)
  );

  const topActionTags = topItems(
    recordedRows.flatMap((row) => row.review?.action_tags || []),
    3
  );

  const avgScore =
    scoredRows.length > 0
      ? scoredRows.reduce((sum, row) => sum + row.forecast.score_0_10, 0) / scoredRows.length
      : 0;

  return {
    recorded_days: recordedRows.length,
    total_days: 7,
    hard_days: recordedRows.filter((row) => row.review?.condition_level === 0).length,
    mild_bad_days: recordedRows.filter((row) => row.review?.condition_level === 1).length,
    good_days: recordedRows.filter((row) => row.review?.condition_level === 2).length,
    well_prevented_days: recordedRows.filter((row) => row.review?.prevent_level === 2).length,
    strong_forecast_days: rows.filter((row) => (row.forecast?.signal ?? 0) >= 2).length,
    avg_score: avgScore,
    top_trigger_on_bad_days: topTriggerOnBadDays,
    top_trigger_on_bad_days_label: triggerLabel(topTriggerOnBadDays),
    top_action_tags: topActionTags,
  };
}

function latestSourceAt({ reviews, profile }) {
  const timestamps = [];

  for (const row of reviews || []) {
    if (row?.created_at) timestamps.push(String(row.created_at));
  }
  if (profile?.updated_at) timestamps.push(String(profile.updated_at));

  return timestamps.sort().slice(-1)[0] || null;
}

function buildInputPayload({ weekStart, weekEnd, profile, rows, summary }) {
  return {
    week_start: weekStart,
    week_end: weekEnd,
    constitution: {
      core_code: profile?.core_code || null,
      sub_labels: safeArr(profile?.sub_labels),
      symptom_focus: profile?.symptom_focus || null,
    },
    summary,
    rows: rows.map((row) => ({
      date: row.date,
      forecast: row.forecast
        ? {
            score_0_10: row.forecast.score_0_10,
            signal: row.forecast.signal,
            main_trigger: row.forecast.main_trigger,
            trigger_dir: row.forecast.trigger_dir,
          }
        : null,
      review: row.review
        ? {
            condition_level: row.review.condition_level,
            prevent_level: row.review.prevent_level,
            action_tags: safeArr(row.review.action_tags),
            note: trimText(row.review.note),
          }
        : null,
    })),
  };
}

function reportTextFromJson(report) {
  const parts = [
    report?.summary ? `今週の傾向\n${report.summary}` : "",
    report?.patterns ? `響きやすかった条件\n${report.patterns}` : "",
    report?.wins ? `今週うまくいったこと\n${report.wins}` : "",
    report?.next_week ? `来週の一言\n${report.next_week}` : "",
  ].filter(Boolean);

  return parts.join("\n\n");
}

async function generateWeeklyAiReport({ weekStart, weekEnd, profile, rows, summary }) {
  const promptInput = {
    week_start: weekStart,
    week_end: weekEnd,
    constitution: {
      core_code: profile?.core_code || null,
      sub_labels: safeArr(profile?.sub_labels),
      symptom_focus: profile?.symptom_focus || null,
    },
    summary,
    rows: rows.map((row) => ({
      date: row.date,
      forecast: row.forecast
        ? {
            score_0_10: row.forecast.score_0_10,
            signal: row.forecast.signal,
            main_trigger: row.forecast.main_trigger,
            trigger_dir: row.forecast.trigger_dir,
          }
        : null,
      review: row.review
        ? {
            condition_level: row.review.condition_level,
            prevent_level: row.review.prevent_level,
            action_tags: safeArr(row.review.action_tags),
            note: trimText(row.review.note).slice(0, 180),
          }
        : null,
    })),
  };

  const prompt = `
あなたは未病レーダーの週次レポート作成AIです。

# 役割
- このレポートは「今週の記録を意味づける」ためのものです
- 数字の言い換えではなく、今週どんな傾向があったかを短く整理してください
- 診断や治療の断定はしません
- 動物名などの比喩タイトルは使わず、体の反応として表現してください

# 重要ルール
- summary は「今週全体の流れ」
- patterns は「何が響きやすかったか」「予報との一致やズレ」
- wins は「先回りできたこと」「比較的保てたこと」
- next_week は「来週の意識ポイント」
- 記録が少ない場合は、無理に断定せず「まだ傾向は仮説段階」と書いてください
- 一般ユーザー向けの自然な日本語で、やさしいが甘すぎない文体にしてください
- 各項目は2〜4文以内、簡潔にしてください

# 出力
必ずJSONのみを返してください:
{
  "summary": "...",
  "patterns": "...",
  "wins": "...",
  "next_week": "..."
}

入力JSON:
${JSON.stringify(promptInput, null, 2)}
`.trim();

  const text = await generateText({
    model: MODEL,
    input: prompt,
    max_output_tokens: 1200,
    reasoning: { effort: "low" },
  });

  const json = extractJson(text);

  return {
    summary: trimText(json?.summary),
    patterns: trimText(json?.patterns),
    wins: trimText(json?.wins),
    next_week: trimText(json?.next_week),
  };
}

async function getSourceBundle(userId, weekStart, weekEnd) {
  const [{ data: forecasts, error: forecastErr }, { data: reviews, error: reviewErr }, { data: profile, error: profileErr }] =
    await Promise.all([
      supabaseServer
        .from("radar_forecasts")
        .select("target_date, score_0_10, signal, main_trigger, trigger_dir, why_short, created_at")
        .eq("user_id", userId)
        .gte("target_date", weekStart)
        .lte("target_date", weekEnd),
      supabaseServer
        .from("radar_reviews")
        .select("target_date, condition_level, prevent_level, action_tags, note, created_at")
        .eq("user_id", userId)
        .gte("target_date", weekStart)
        .lte("target_date", weekEnd),
      supabaseServer
        .from("constitution_profiles")
        .select("core_code, sub_labels, symptom_focus, updated_at")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  if (forecastErr) throw forecastErr;
  if (reviewErr) throw reviewErr;
  if (profileErr) throw profileErr;

  const rows = buildRows({ start: weekStart, end: weekEnd, forecasts: forecasts || [], reviews: reviews || [] });
  const summary = buildSummary(rows);

  return {
    profile: profile || null,
    rows,
    summary,
    latest_source_at: latestSourceAt({ reviews: reviews || [], profile }),
  };
}

function makeResponseData({ status, weekStart, weekEnd, record }) {
  const generationCount = Number(record?.generation_count || 0);
  return {
    status,
    week_start: weekStart,
    week_end: weekEnd,
    generation_count: generationCount,
    remaining_regenerations: Math.max(0, MAX_GENERATIONS_PER_WEEK - generationCount),
    report: record?.report_json || null,
    report_text: record?.report_text || "",
    generated_at: record?.generated_at || null,
    model: record?.model || null,
  };
}

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const url = new URL(req.url);
    const { week_start, week_end } = getWeekRangeJst(url.searchParams.get("week_start"));

    const { data: record, error: reportErr } = await supabaseServer
      .from("weekly_ai_reports")
      .select("*")
      .eq("user_id", user.id)
      .eq("week_start", week_start)
      .eq("report_type", REPORT_TYPE)
      .maybeSingle();

    if (reportErr) throw reportErr;

    return NextResponse.json({
      data: record
        ? makeResponseData({
            status: "cached",
            weekStart: week_start,
            weekEnd: week_end,
            record,
          })
        : {
            status: "empty",
            week_start,
            week_end,
            generation_count: 0,
            remaining_regenerations: MAX_GENERATIONS_PER_WEEK,
            report: null,
            report_text: "",
            generated_at: null,
            model: null,
          },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { week_start, week_end } = getWeekRangeJst(body?.week_start || null);

    const source = await getSourceBundle(user.id, week_start, week_end);
    const inputPayload = buildInputPayload({
      weekStart: week_start,
      weekEnd: week_end,
      profile: source.profile,
      rows: source.rows,
      summary: source.summary,
    });
    const inputHash = sha256Of(inputPayload);

    const { data: existing, error: reportErr } = await supabaseServer
      .from("weekly_ai_reports")
      .select("*")
      .eq("user_id", user.id)
      .eq("week_start", week_start)
      .eq("report_type", REPORT_TYPE)
      .maybeSingle();

    if (reportErr) throw reportErr;

    // 同内容ならキャッシュ返却
    if (existing && existing.input_hash === inputHash) {
      return NextResponse.json({
        data: makeResponseData({
          status: "cached",
          weekStart: week_start,
          weekEnd: week_end,
          record: existing,
        }),
      });
    }

    // 上限到達なら保存済み返却
    if (existing && Number(existing.generation_count || 0) >= MAX_GENERATIONS_PER_WEEK) {
      return NextResponse.json({
        data: makeResponseData({
          status: "limit_reached",
          weekStart: week_start,
          weekEnd: week_end,
          record: existing,
        }),
      });
    }

    const reportJson = await generateWeeklyAiReport({
      weekStart: week_start,
      weekEnd: week_end,
      profile: source.profile,
      rows: source.rows,
      summary: source.summary,
    });

    const reportText = reportTextFromJson(reportJson);
    const now = new Date().toISOString();

    if (!existing) {
      const insertPayload = {
        user_id: user.id,
        week_start,
        week_end,
        report_type: REPORT_TYPE,
        input_hash: inputHash,
        latest_source_at: source.latest_source_at,
        generation_count: 1,
        report_json: reportJson,
        report_text: reportText,
        model: MODEL,
        generated_at: now,
        updated_at: now,
      };

      const { data: inserted, error: insertErr } = await supabaseServer
        .from("weekly_ai_reports")
        .insert(insertPayload)
        .select("*")
        .single();

      if (insertErr) throw insertErr;

      return NextResponse.json({
        data: makeResponseData({
          status: "generated",
          weekStart: week_start,
          weekEnd: week_end,
          record: inserted,
        }),
      });
    }

    const nextGenerationCount = Math.min(
      MAX_GENERATIONS_PER_WEEK,
      Number(existing.generation_count || 0) + 1
    );

    const updatePayload = {
      week_end,
      input_hash: inputHash,
      latest_source_at: source.latest_source_at,
      generation_count: nextGenerationCount,
      report_json: reportJson,
      report_text: reportText,
      model: MODEL,
      generated_at: now,
      updated_at: now,
    };

    const { data: updated, error: updateErr } = await supabaseServer
      .from("weekly_ai_reports")
      .update(updatePayload)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({
      data: makeResponseData({
        status: "regenerated",
        weekStart: week_start,
        weekEnd: week_end,
        record: updated,
      }),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
