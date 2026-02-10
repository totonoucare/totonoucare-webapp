// app/api/ai/explain-today/route.js
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";
import {
  SYMPTOM_LABELS,
  getCoreLabel,
  getSubLabels,
  getMeridianLine,
} from "@/lib/diagnosis/v2/labels";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function tokyoDateISO() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}

const ENV_VECTOR_JA = {
  pressure_shift: "気圧の変化",
  temp_swing: "寒暖差",
  humidity_up: "湿度が上がる",
  dryness_up: "乾燥が強まる",
  wind_strong: "強風・冷風",
  none: "特になし",
};

const SIXIN_JA = { wind: "ゆらぎ", cold: "冷え", heat: "暑さ", damp: "湿気", dry: "乾燥" };
const sixinJa = (x) => SIXIN_JA[x] || null;

function safeArr(v) {
  return Array.isArray(v) ? v : [];
}

function pickTopSixinJa(arr) {
  return safeArr(arr).map(sixinJa).filter(Boolean).slice(0, 2);
}

function tryParseJson(text) {
  const t = String(text || "").trim();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

function normalizeExplainJson(obj) {
  // 欠けててもUIが壊れないようにデフォルト埋め
  const o = obj && typeof obj === "object" ? obj : {};
  return {
    headline: String(o.headline || "").trim(),
    because: String(o.because || "").trim(),
    time_windows_tip: String(o.time_windows_tip || "").trim(),
    today_care: {
      lifestyle: String(o.today_care?.lifestyle || "").trim(),
      body: String(o.today_care?.body || "").trim(),
      food: String(o.today_care?.food || "").trim(),
    },
    tomorrow_hint: String(o.tomorrow_hint || "").trim(),
    logging_tip: String(o.logging_tip || "").trim(),
    safety: String(o.safety || "").trim(),
  };
}

async function openaiExplainJSON(input) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  const client = new OpenAI({ apiKey });

  const prompt = `
あなたは「未病レーダー」の解説AI。
**出力は必ずJSONのみ**（前後に説明文や見出し、番号、括弧注釈、Markdown、改行装飾を入れない）。
ユーザーを不安に煽らず、セルフケア支援として安全な範囲で具体的に。

【入力データ】
${JSON.stringify(input, null, 2)}

【出力JSONスキーマ】
{
  "headline": "今日のひとこと（短い1文）",
  "because": "なぜそう言える？（2〜4文）",
  "time_windows_tip": "注意が必要な時間帯（短め。ピークが無ければ『山は少なめ』）",
  "today_care": {
    "lifestyle": "衣食住の注意（1〜2文）",
    "body": "体のケア（1〜2文。痛み誘発しない）",
    "food": "食の一手（1〜2文。無料版は“やりすぎないが具体性は保つ”）"
  },
  "tomorrow_hint": "明日に備える（1〜2文）",
  "logging_tip": "記録のコツ（1文）",
  "safety": "注意（1文。強い症状は無理しない/受診も検討）"
}
`.trim();

  const resp = await client.responses.create({
    model: "gpt-5.2",
    reasoning: { effort: "low" },
    input: prompt,
    max_output_tokens: 650,
  });

  return (resp.output_text || "").trim();
}

export async function POST(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const date = tokyoDateISO();

    // 1) profile
    const { data: profile, error: e0 } = await supabaseServer
      .from("constitution_profiles")
      .select("symptom_focus, qi, blood, fluid, cold_heat, resilience, primary_meridian, secondary_meridian, core_code, sub_labels, computed, answers, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (e0) throw e0;

    if (!profile) {
      return NextResponse.json({
        data: { text: "体質情報はまだ未設定です（体質チェックで精度が上がります）。", date },
      });
    }

    // 2) today radar + external
    const { data: radar, error: e1 } = await supabaseServer
      .from("daily_radar")
      .select("level, top_sixin, reason_text")
      .eq("user_id", user.id)
      .eq("date", date)
      .maybeSingle();
    if (e1) throw e1;

    const { data: def, error: e2 } = await supabaseServer
      .from("daily_external_factors")
      .select("pressure,temp,humidity,wind,precip,d_pressure_24h,d_temp_24h,d_humidity_24h,top_sixin")
      .eq("user_id", user.id)
      .eq("date", date)
      .maybeSingle();
    if (e2) throw e2;

    // 3) labels.jsで“プロンプト投入前に”日本語化
    const symptomJa = SYMPTOM_LABELS[profile.symptom_focus] || "なんとなく不調";
    const core = getCoreLabel(profile.core_code);
    const subs = getSubLabels(profile.sub_labels).map((x) => x.title);
    const mer = getMeridianLine(profile.primary_meridian)?.title || "未設定";
    const envVec = safeArr(profile?.computed?.env?.vectors || profile?.answers?.env_vectors)
      .map((x) => ENV_VECTOR_JA[x] || null)
      .filter(Boolean)
      .slice(0, 2);

    const input = {
      user_profile: {
        symptom: symptomJa,
        core_title: core?.title || "",
        core_hint: core?.tcm_hint || "",
        sub_traits: subs,
        meridian_line: mer,
        env_triggers: envVec,
        // tri-stateは“表示ラベル”に寄せる（数値そのままは入れない）
        tendency: {
          qi: profile.qi,
          blood: profile.blood,
          fluid: profile.fluid,
          cold_heat: profile.cold_heat,
          resilience: profile.resilience,
        },
      },
      today: {
        level: radar?.level ?? 0,
        top_sixin: pickTopSixinJa(radar?.top_sixin || def?.top_sixin),
        reason_text: radar?.reason_text || "",
        weather_now: {
          temp_c: def?.temp ?? null,
          humidity_pct: def?.humidity ?? null,
          pressure_hpa: def?.pressure ?? null,
        },
        delta_24h: {
          d_pressure_hpa: def?.d_pressure_24h ?? null,
          d_temp_c: def?.d_temp_24h ?? null,
          d_humidity_pct: def?.d_humidity_24h ?? null,
        },
      },
      // ここは将来：risk.jsが返す time_windows の要約を入れると強い
      time_windows_summary: null,
    };

    const raw = await openaiExplainJSON(input);
    const parsed = tryParseJson(raw);

    if (!parsed) {
      // 万が一JSON失敗したらテキストとして返す（UI側で段落分割できる）
      return NextResponse.json({ data: { date, text: raw, format: "text_fallback" } });
    }

    const json = normalizeExplainJson(parsed);

    // UIは今 text 前提なので、暫定で “読みやすいテキスト” も同梱
    const text =
      [
        json.headline,
        json.because,
        json.time_windows_tip,
        `【基本対策】\n・生活：${json.today_care.lifestyle}\n・体：${json.today_care.body}\n・食：${json.today_care.food}`,
        json.tomorrow_hint ? `【明日に備える】\n${json.tomorrow_hint}` : "",
        json.logging_tip ? `【記録】\n${json.logging_tip}` : "",
        json.safety ? `【注意】\n${json.safety}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

    return NextResponse.json({ data: { date, json, text, format: "json" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
