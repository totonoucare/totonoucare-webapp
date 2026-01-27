import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * UI側が使いやすいように、構造化のまま返す
 */
const ExplainTodaySchema = z.object({
  headline: z.string(), // 1行（短く）
  assessment: z.string(), // 2〜3行
  why_alert: z.string(), // 1行
  why_this_care: z.string(), // 1行
  goal: z.string(), // 1行
  logging_tip: z.string(), // 1行
  safety_note: z.string(), // 1行
});

function round0(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return Math.round(n);
}

/**
 * 六淫タグ（内部）→ ユーザー日本語（UI）
 * ※「風」は風速ではなく「ゆらぎ（変動）」として扱う方針
 */
function sixinJa(x) {
  const map = {
    wind: "ゆらぎ",
    cold: "冷え",
    heat: "暑さ",
    damp: "湿気",
    dry: "乾燥",
  };
  return map[x] || x;
}

function symptomJa(x) {
  const map = {
    fatigue: "だるさ・疲れ",
    sleep: "睡眠",
    neck_shoulder: "首肩の重さ",
    swelling: "むくみ",
    headache: "頭痛",
    low_back_pain: "腰の重さ",
  };
  return map[x] || x;
}

/**
 * flow/organ の “ユーザー向け1行メモ” を作る（最重要）
 * - あなたの本診断に完全接続するのは後でOK
 * - 今は「絡めてる感」を最大化するための翻訳層
 */
function constitutionMemo({ flowType, organType }) {
  const f = String(flowType || "").toLowerCase();
  const o = String(organType || "").toLowerCase();

  const flowMemo =
    f.includes("suitai") || f.includes("水")
      ? "水はけが滞りやすい"
      : f.includes("kite") || f.includes("気")
      ? "巡りが詰まりやすい"
      : f.includes("oketsu") || f.includes("瘀") || f.includes("血")
      ? "巡りが固まりやすい"
      : f
      ? "体のバランスが偏りやすい"
      : null;

  // organは「臓器名」を出さず、体感に寄せる（専門用語回避）
  const organMemo =
    o.includes("spleen") || o.includes("脾") || o.includes("stomach") || o.includes("胃")
      ? "胃腸（消化）が揺れやすい"
      : o.includes("lung") || o.includes("肺")
      ? "呼吸・乾燥の影響を受けやすい"
      : o.includes("liver") || o.includes("肝")
      ? "緊張が溜まりやすい"
      : o.includes("kidney") || o.includes("腎")
      ? "冷えの影響を受けやすい"
      : o.includes("heart") || o.includes("心")
      ? "睡眠の質が揺れやすい"
      : o
      ? "体調の波が出やすい"
      : null;

  if (!flowMemo && !organMemo) return "体質情報はまだ未設定です（体質チェックで精度が上がります）";
  if (flowMemo && organMemo) return `体質メモ：${flowMemo}／${organMemo}`;
  return `体質メモ：${flowMemo || organMemo}`;
}

/**
 * AIに渡す入力を “安全・短い・説明可能” に整形する
 */
function buildSafeInput({ symptom_focus, tcm_profile, weather_summary, main_card, food_card }) {
  const top = Array.isArray(weather_summary?.top_sixin) ? weather_summary.top_sixin : [];
  const topJa = top.map(sixinJa);

  const flowType = tcm_profile?.flowType ?? null;
  const organType = tcm_profile?.organType ?? null;

  return {
    symptom: symptomJa(symptom_focus),

    constitution: {
      flowType,
      organType,
      memo: constitutionMemo({ flowType, organType }),
    },

    today_weather: {
      level: weather_summary?.level ?? null, // 0..3
      type: topJa, // 例: ["冷え","ゆらぎ"]
      temp_c: round0(weather_summary?.temp),
      humidity_pct: round0(weather_summary?.humidity),
      d_pressure_24h_hpa: round0(weather_summary?.d_pressure_24h),
      d_temp_24h_c: typeof weather_summary?.d_temp_24h === "number" ? Number(weather_summary.d_temp_24h.toFixed(1)) : null,
      d_humidity_24h_pct: round0(weather_summary?.d_humidity_24h),
    },

    care_today: {
      main: {
        title: main_card?.title,
        kind: main_card?.kind,
        steps: main_card?.body_steps || [],
        cautions: main_card?.cautions || [],
      },
      food: food_card
        ? {
            title: food_card?.title,
            steps: food_card?.body_steps || [],
          }
        : null,
    },
  };
}

export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY is not set" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      symptom_focus,
      tcm_profile,
      weather_summary,
      main_card,
      food_card,
      locale = "ja-JP",
      // デフォルトは “最新の5.2” に
      model = "gpt-5.2",
    } = body || {};

    if (!symptom_focus || !main_card) {
      return new Response(JSON.stringify({ error: "symptom_focus and main_card are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const safeInput = buildSafeInput({
      symptom_focus,
      tcm_profile,
      weather_summary,
      main_card,
      food_card,
    });

    const system = `
あなたは「未病レーダー」の編集者。
目的：入力（症状・体質メモ・天気の数字・今日のケアカード）だけを使い、「今日の状態」と「今日の一手」が腑に落ちる短い文章を作る。

【絶対に守る】
- 医療行為の断定/診断/治療はしない（セルフケアの範囲）。恐怖煽り禁止。
- 入力にない新しい医学知識・病名・メカニズムを作らない（例：自律神経/血行/ホルモン等の断定説明は避ける）。
- 専門用語禁止：「外因」「六淫」「臓腑英語」「cold/damp/wind」等。必ず自然な日本語（ゆらぎ/冷え/湿気/暑さ/乾燥）に言い換える。
- 冗長禁止。短く。

【必須要件】
- 体質メモを必ず1回使って「あなたの場合は〜」の一文を入れる（未設定なら未設定と明記）。
- 数字は最大2つまで（例：気温と気圧差）。数字を盛り過ぎない。

【文字数目安（厳守）】
- headline：全角20字以内・1行
- assessment：全角160〜240字（2〜3行）
- why_alert：全角60字以内・1行
- why_this_care：全角70字以内・1行
- goal/logging_tip/safety_note：各 全角50字以内・1行

言語：${locale}
`.trim();

    const user = `
入力（ユーザー向けに整形済み）：
${JSON.stringify(safeInput, null, 2)}

出力は「なるほど、だから今日はこれなんだ」と思える内容に。
`.trim();

    const resp = await openai.responses.parse({
      model,
      reasoning: { effort: "low" },
      input: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      text: { format: zodTextFormat(ExplainTodaySchema, "explain_today") },
    });

    return new Response(JSON.stringify(resp.output_parsed), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || "unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
