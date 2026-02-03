// app/api/diagnosis/v2/events/[id]/explain/route.js
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function safeArr(v) {
  return Array.isArray(v) ? v : [];
}

function symptomJa(code) {
  const map = {
    fatigue: "だるさ・疲労",
    sleep: "睡眠",
    neck_shoulder: "首肩のつらさ",
    low_back_pain: "腰のつらさ",
    swelling: "むくみ",
    headache: "頭痛",
    dizziness: "めまい",
    mood: "気分の浮き沈み",
  };
  return map[code] || "不調";
}

function envVectorJa(v) {
  const map = {
    cold_shift: "冷え方向の変化",
    heat_shift: "暑さ方向の変化",
    damp_shift: "湿気方向の変化",
    dry_shift: "乾燥方向の変化",
    season_shift: "季節の切り替わり",
  };
  return map[v] || v;
}

async function generateExplainText({ event }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const client = new OpenAI({ apiKey });

  const answers = event?.answers || {};
  const computed = event?.computed || {};

  const sf = answers.symptom_focus || event.symptom_focus || "fatigue";
  const envSens = Number(answers.env_sensitivity ?? 0) || 0;
  const envVec = safeArr(answers.env_vectors).filter((x) => x && x !== "none").slice(0, 2);

  const prompt = `
あなたは「未病レーダー」の結果解説AI。日本語で、読み物として満足度が高いが冗長すぎない。
不安を煽らない。医療行為ではなくセルフケア支援。断定しない（〜の傾向）。
専門用語は必要最小限。出す場合は括弧で一言訳す（例：気滞＝ストレスで詰まりやすい）。
数値（-1/0/1など）は出さない。ユーザーが理解できる言葉に変換する。

必ずこの構成で出力：
1) この結果の要約（2〜3行）
2) 主訴レンズから見るポイント（2〜4行）
3) 体質のコア（寒熱×回復）の読み方（2〜4行）
4) サブラベル（最大2）の意味（各1〜2行）
5) 経絡ライン（主・副）の読み方（各1〜2行）
6) 環境変化への反応性（1〜3行：強さ＋方向。ない場合は一言）
7) 今日から3日で効く「小さい一手」3つ（運動/休息/食・飲みのバランスで）
8) 注意（1行：強い症状は無理せず必要なら相談）

【入力（この結果）】
- 主訴：${symptomJa(sf)}
- コア：${computed.core_code || "unknown"}
- サブラベル：${safeArr(computed.sub_labels).join(",") || "none"}
- 気血津液（要約に使う）：qi=${computed.qi}, blood=${computed.blood}, fluid=${computed.fluid}
- 寒熱：thermo=${computed.thermo}, mixed=${computed.is_mixed ? "yes" : "no"}
- 回復：resilience=${computed.resilience}
- 経絡：primary=${computed.primary_meridian || "none"}, secondary=${computed.secondary_meridian || "none"}
- 環境感受性：強さ=${envSens}（0=ほぼない〜3=かなりある）
- 反応方向：${envVec.map(envVectorJa).join("・") || "特になし"}

出力はプレーンテキスト。箇条書きOK。過剰な注意書きを増やさない。
`.trim();

  const resp = await client.responses.create({
    model: "gpt-5.2",
    reasoning: { effort: "low" },
    input: prompt,
    max_output_tokens: 900,
  });

  return (resp.output_text || "").trim();
}

export async function POST(_req, { params }) {
  try {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // 1) diagnosis_events を取得（保存済みならそれを返す）
    const { data: ev, error: e0 } = await supabaseServer
      .from("diagnosis_events")
      .select("id, user_id, symptom_focus, answers, computed, version, created_at, ai_explain_text, ai_explain_model, ai_explain_created_at")
      .eq("id", id)
      .single();
    if (e0) throw e0;

    if (ev.ai_explain_text) {
      return NextResponse.json({
        data: {
          id: ev.id,
          text: ev.ai_explain_text,
          model: ev.ai_explain_model || null,
          created_at: ev.ai_explain_created_at || null,
          cached: true,
        },
      });
    }

    // 2) 生成
    const text = await generateExplainText({ event: ev });
    const model = "gpt-5.2";
    const now = new Date().toISOString();

    // 3) diagnosis_events に保存（idempotent：nullのときだけ更新）
    const { error: e1 } = await supabaseServer
      .from("diagnosis_events")
      .update({
        ai_explain_text: text,
        ai_explain_model: model,
        ai_explain_created_at: now,
      })
      .eq("id", id)
      .is("ai_explain_text", null);
    if (e1) throw e1;

    // 4) attach済みなら constitution_events にもコピー（あれば）
    // source_event_id が入っている設計前提
    const { error: e2 } = await supabaseServer
      .from("constitution_events")
      .update({
        ai_explain_text: text,
        ai_explain_model: model,
        ai_explain_created_at: now,
      })
      .eq("source_event_id", id)
      .is("ai_explain_text", null);
    // ここは失敗しても致命ではない（rowが無いこともある）
    if (e2) {
      console.warn("constitution_events update skipped:", e2?.message || e2);
    }

    return NextResponse.json({
      data: {
        id,
        text,
        model,
        created_at: now,
        cached: false,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
