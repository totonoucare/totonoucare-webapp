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

  // 指示文の混入（各◯行、必ずこの構成、番号見出しなど）
  const hasInstructionLeak =
    /各\d+行/.test(text) ||
    /必ずこの構成/.test(text) ||
    /【絶対ルール】/.test(text) ||
    /^\s*\d+\)/m.test(text);

  // 見出しが増えすぎてる（指定2つ以外が濃厚）
  const hasOtherHeadings =
    /「まとめ」|「整えポイント」|「体の張りやすい場所」|「環境変化との相性」|「3日で効く/.test(text);

  return hasSnake || hasCoreCode || hasInstructionLeak || hasOtherHeadings;
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
      ? `主：${meridianPrimary.title}\n  範囲：${meridianPrimary.body_area}（${meridianPrimary.meridians.join(
          "・"
        )}）\n  ヒント：${meridianPrimary.organs_hint}`
      : `主：なし`,
    meridianSecondary
      ? `副：${meridianSecondary.title}\n  範囲：${meridianSecondary.body_area}（${meridianSecondary.meridians.join(
          "・"
        )}）\n  ヒント：${meridianSecondary.organs_hint}`
      : `副：なし`,
  ].join("\n");

  // ---- prompt ----
  // 例文は入れない（口調/内容の引っ張りを防ぐ）
  const prompt = `
あなたは未病レーダーの案内役「トトノウくん」🤖。
親しみのある口調だが、煽らず、断定せず、「〜の傾向」「〜しやすい」で説明する。
医療行為ではなくセルフケア支援。

【絶対ルール】
- 英語のコード、snake_case、内部コード名を出力に一切出さない。
- 指示文（例：「各◯行」「必ずこの構成」など）を本文に混ぜない。
- 数値（-1/0/1、0〜3など）をそのまま出さない。日本語に言い換える。
- 病名推定・診断・危険の断定をしない（不安を煽らない）。
- 対策の「具体例」はここでは書かない（ツボ名/ストレッチ名/食材名/手順/回数などは出さない）。
  ※未病レーダーに進むと、予報に合わせた対策として表示される、と案内するだけ。

【未病レーダーでできること（事実）】
- 日々の気象（気圧/湿度/気温など）をもとに「揺れやすさ」を予報する
- その予報に合わせて「今日の対策」を提示する
- 対策は2枠：
  1) 生活のコツ（食を含む）
  2) 【鍼灸師監修】体質専用のツボケア＆ストレッチ
- この文章では“対策の中身”は書かず、未病レーダーに進むと見られる、と伝える

【出力フォーマット】
見出しは次の2つだけ。必ずカギ括弧つきで見出しを書く：
「いまの体のクセ（今回のまとめ）」
「体調の揺れを予報で先回り（未病レーダー）」
最後に1行だけ「※強い症状がある時は無理せず相談を。」を付ける。

全体は読み物として気持ちよく読める長さ（長すぎない）。
箇条書きOK。

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
`.trim();

  // 1st try
  const resp1 = await client.responses.create({
    model,
    reasoning: { effort: "low" },
    input: prompt,
    max_output_tokens: 1200,
  });

  let text = (resp1.output_text || "").trim();

  // light retry if leaks detected / too short
  if (looksBad(text) || text.length < 180) {
    const repairPrompt = `
次の文章を「ルール違反がない形」に書き直してください。

【守ること】
- 見出しは2つだけ（指定のカギ括弧つき）
- 英語のコード/内部コード名/snake_case を絶対に出さない
- 指示文を混ぜない
- 数値をそのまま出さない（日本語に言い換える）
- 対策の具体例は書かない（未病レーダーに進むと見られる、まで）
- 全体は長すぎない読み物

【元の文章】
${text}
`.trim();

    const resp2 = await client.responses.create({
      model,
      reasoning: { effort: "low" },
      input: repairPrompt,
      max_output_tokens: 1200,
    });

    const t2 = (resp2.output_text || "").trim();
    if (t2) text = t2;
  }

  // 最低限の保険：空なら簡易文（例文っぽくならないように最小限）
  if (!text) {
    text =
      "「いまの体のクセ（今回のまとめ）」\nいまは体の負担が特定のパターンで出やすい傾向があります。まずは“どこに出やすいか”と“何で揺れやすいか”を押さえるのが近道です。\n\n「体調の揺れを予報で先回り（未病レーダー）」\n未病レーダーでは、気象の変化から揺れやすさを予報し、予報に合わせた対策を提示して先回りしやすくします。\n\n※強い症状がある時は無理せず相談を。";
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
      // 競合で先に保存済みの可能性 → 再取得して返す
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
