// app/api/diagnosis/v2/events/[id]/explain/route.js
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  SYMPTOM_LABELS,
  getCoreLabel,
  getSubLabels,
  getMeridianLine,
} from "@/lib/diagnosis/v2/labels";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

/** ---- helpers ---- */
function safeArr(v) {
  return Array.isArray(v) ? v : [];
}

function clampInt(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function envSensitivityJa(level) {
  // 0..3
  if (level <= 0) return "ほとんど影響なし";
  if (level === 1) return "たまに影響を受ける";
  if (level === 2) return "わりと影響を受ける";
  return "かなり影響を受ける";
}

function envVectorJa(v) {
  const map = {
    cold_shift: "冷え方向の変化",
    heat_shift: "暑さ方向の変化",
    damp_shift: "湿気方向の変化",
    dry_shift: "乾燥方向の変化",
    season_shift: "季節の切り替わり",
  };
  return map[v] || "特になし";
}

/**
 * “コード漏れ”や“指示文漏れ”をざっくり検知して軽く修正要求をかける用
 */
function looksBad(text) {
  if (!text) return true;

  // snake_case / 英コードっぽいもの
  const hasSnake = /[a-z]+_[a-z]+/.test(text);

  // core_code のコード直出しっぽい
  const hasCoreCode = /(cold|heat|neutral|mixed)_(low|high)/.test(text);

  // 指示文の混入（各◯行、1)〜 等）
  const hasInstructionLeak =
    /各\d+行/.test(text) ||
    /必ずこの構成/.test(text) ||
    /^\s*\d+\)/m.test(text);

  return hasSnake || hasCoreCode || hasInstructionLeak;
}

/** ---- main generation ---- */
async function generateExplainText({ event }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  // モデルは環境変数で差し替え可能（なければ固定）
  const model = process.env.OPENAI_DIAG_EXPLAIN_MODEL || "gpt-5.2";

  const client = new OpenAI({ apiKey });

  const answers = event?.answers || {};
  const computed = event?.computed || {};

  // ---- UIに出したい日本語へ“先に”変換（重要） ----
  const symptomKey = answers?.symptom_focus || event?.symptom_focus || "fatigue";
  const symptomJa = SYMPTOM_LABELS?.[symptomKey] || "だるさ・疲労";

  const core = getCoreLabel(computed?.core_code);
  const sub = getSubLabels(safeArr(computed?.sub_labels)).slice(0, 2);

  const meridianPrimary = getMeridianLine(computed?.primary_meridian);
  const meridianSecondary = getMeridianLine(computed?.secondary_meridian);

  const envSens = clampInt(answers?.env_sensitivity ?? 0, 0, 3);
  const envVecRaw = safeArr(answers?.env_vectors).filter((x) => x && x !== "none").slice(0, 2);
  const envVecJa = envVecRaw.length ? envVecRaw.map(envVectorJa).join("・") : "特になし";

  // ---- “入力素材”を日本語で整形 ----
  const subJa =
    sub.length > 0
      ? sub
          .map((s) => `- ${s.title}${s.action_hint ? `：${s.action_hint}` : ""}`)
          .join("\n")
      : "- なし";

  const meridianJa = [
    meridianPrimary
      ? `主：${meridianPrimary.title}\n  体の範囲：${meridianPrimary.body_area}（${meridianPrimary.meridians.join("・")}）\n  ヒント：${meridianPrimary.organs_hint}`
      : `主：なし`,
    meridianSecondary
      ? `副：${meridianSecondary.title}\n  体の範囲：${meridianSecondary.body_area}（${meridianSecondary.meridians.join("・")}）\n  ヒント：${meridianSecondary.organs_hint}`
      : `副：なし`,
  ].join("\n");

  // ---- prompt（指示文漏れ・コード漏れを防ぐ）----
  // 行数指定はしない。代わりに“章ごとの最大文字数”で制御する。
  const prompt = `
あなたは未病レーダーの案内役「トトノウくん」🤖。
ユーザーに寄り添うが、煽らず、断定せず、「〜の傾向」「〜しやすい」で説明する。
医療行為ではなくセルフケア支援。

【絶対ルール】
- 英語のコード、snake_case、core_code（例：neutral_high）を出力に一切出さない。
- 指示文（例：「各◯行」「必ずこの構成」など）を本文に混ぜない。
- 数値（-1/0/1 等）を出さない。
- 不安を煽る表現（危険/重大/病気など）を避ける。

【出力フォーマット】
見出しは次の7つだけ。番号は付けない。
「まとめ」
「お悩み（今の見え方）」
「今の体質の軸」
「整えポイント」
「体の張りやすい場所」
「環境変化との相性」
「3日で効く小さな一手」
最後に1行だけ「※強い症状がある時は無理せず相談を。」を付ける。

各見出しは最大400文字程度で、全体は長すぎない読み物にする。

【入力（この結果）】
- お悩み：${symptomJa}

- 今の体質の軸：
  タイトル：${core?.title || "未設定"}
  説明：${core?.tcm_hint || "未設定"}

- 整えポイント（最大2つ）：
${subJa}

- 体の張りやすい場所：
${meridianJa}

- 環境変化：
  影響の受けやすさ：${envSensitivityJa(envSens)}
  影響の出やすい方向：${envVecJa}

文章は自然な日本語。箇条書きOK。`.trim();

  // 1st try
  const resp1 = await client.responses.create({
    model,
    reasoning: { effort: "low" },
    input: prompt,
    // 途中切れを減らす（結果ページ初回だけ生成＆保存なので少し余裕を持たせる）
    max_output_tokens: 1400,
  });

  let text = (resp1.output_text || "").trim();

  // light retry if leaks detected / empty
  if (looksBad(text) || text.length < 200) {
    const repairPrompt = `
次の文章は「英語コード漏れ」や「指示文混入」の可能性があります。
以下のルールで“書き直し”してください。

- 英語のコード、snake_case、core_code を絶対に出さない
- 見出しは指定の7つだけ（番号なし）
- 全体は読みやすく、長すぎず
- 内容は勝手に増やしすぎず、入力に沿う

【元の文章】
${text}

【入力（再掲）】
${prompt}
`.trim();

    const resp2 = await client.responses.create({
      model,
      reasoning: { effort: "low" },
      input: repairPrompt,
      max_output_tokens: 1400,
    });

    const t2 = (resp2.output_text || "").trim();
    if (t2) text = t2;
  }

  // 最低限の保険：空なら簡易文
  if (!text) {
    text =
      "まとめ\n今の結果からは、整え方の「型」を作ると安定しやすい傾向です。\n\n3日で効く小さな一手\n・睡眠前の深呼吸（ゆっくり5回）\n・軽い散歩（5〜10分）\n・冷たい飲食を控えめに\n\n※強い症状がある時は無理せず相談を。";
  }

  return { text, model };
}

export async function POST(_req, { params }) {
  try {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // 1) diagnosis_events を取得（保存済みならそれを返す）
    const { data: ev, error: e0 } = await supabaseServer
      .from("diagnosis_events")
      .select(
        [
          "id",
          "user_id",
          "symptom_focus",
          "answers",
          "computed",
          "version",
          "created_at",
          "ai_explain_text",
          "ai_explain_model",
          "ai_explain_created_at",
        ].join(",")
      )
      .eq("id", id)
      .single();
    if (e0) throw e0;

    if (ev?.ai_explain_text) {
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
    const { text, model } = await generateExplainText({ event: ev });
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
    if (e1) {
      // 競合で先に誰かが保存した可能性があるので、再取得して返す
      const { data: ev2 } = await supabaseServer
        .from("diagnosis_events")
        .select("id, ai_explain_text, ai_explain_model, ai_explain_created_at")
        .eq("id", id)
        .maybeSingle();

      if (ev2?.ai_explain_text) {
        return NextResponse.json({
          data: {
            id: ev2.id,
            text: ev2.ai_explain_text,
            model: ev2.ai_explain_model || null,
            created_at: ev2.ai_explain_created_at || null,
            cached: true,
          },
        });
      }
      throw e1;
    }

    // 4) attach済みなら constitution_events にもコピー（あれば）
    const { error: e2 } = await supabaseServer
      .from("constitution_events")
      .update({
        ai_explain_text: text,
        ai_explain_model: model,
        ai_explain_created_at: now,
      })
      .eq("source_event_id", id)
      .is("ai_explain_text", null);

    // rowがないこともあるので警告だけ
    if (e2) console.warn("constitution_events update skipped:", e2?.message || e2);

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
