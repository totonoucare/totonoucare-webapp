// app/api/diagnosis/v2/events/[id]/explain/route.js
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { generateText } from "@/lib/openai/server";
import { scoreDiagnosis } from "@/lib/diagnosis/v2/scoring";
import { SYMPTOM_LABELS, getCoreLabel, getSubLabels, getMeridianLine } from "@/lib/diagnosis/v2/labels";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

/* -----------------------------
 * helpers
 * ---------------------------- */
function safeArr(v) {
  return Array.isArray(v) ? v : [];
}
function clampInt(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function envSensitivityJa(level) {
  if (level <= 0) return "ほとんど影響なし";
  if (level === 1) return "たまに影響を受ける";
  if (level === 2) return "わりと影響を受ける";
  return "かなり影響を受ける";
}

function envVectorJa(v) {
  const map = {
    pressure_shift: "気圧の変化",
    temp_swing: "寒暖差",
    humidity_up: "湿度が上がる変化",
    dryness_up: "乾燥が強まる変化",
    wind_strong: "強風・冷風",
  };
  return map[v] || "特になし";
}

function obstructionLevelJa(obstructionScore) {
  const x = Number(obstructionScore);
  if (!Number.isFinite(x)) return "不明";
  if (x >= 0.7) return "やや強め";
  if (x >= 0.4) return "中くらい";
  return "軽め";
}

/**
 * ざっくり品質検知（軽め）
 * - 英コード漏れ / 見出し欠落 / メタ漏れ / 過剰な命令文残骸
 */
function looksBad(text) {
  if (!text) return true;

  // snake_case や英コードの混入をざっくり検知
  const hasSnake = /[a-z]+_[a-z]+/.test(text);

  const h1 = "いまの体のクセ（今回のまとめ）";
  const h2 = "体調の揺れを予報で先回り（未病レーダー）";
  const hasHeads = text.includes(h1) && text.includes(h2);

  // メタ漏れ（ルール/プロンプト/モデル等）
  const hasMetaLeak = /プロンプト|モデル|トークン|max_output|system|developer|禁止|出力形式/i.test(text);

  // 箇条書き命令が残ってる感じ
  const hasInstructionLeak = /必ず|見出しは|番号は付けない|Markdown禁止/.test(text);

  // 長さが極端
  const tooShort = text.trim().length < 260;
  const tooLong = text.trim().length > 1400;

  return hasSnake || !hasHeads || hasMetaLeak || hasInstructionLeak || tooShort || tooLong;
}

async function generateExplainText({ event }) {
  const model = process.env.OPENAI_DIAG_EXPLAIN_MODEL || "gpt-5.2";

  const answers = event?.answers || {};

  // ✅ computedは信用せず、必ず現行 scoring で再計算（ここが重要）
  const computed = scoreDiagnosis(answers);

  // ---- 日本語素材（英コードを渡さない）----
  const symptomKey = answers?.symptom_focus || event?.symptom_focus || "fatigue";
  const symptomJa = SYMPTOM_LABELS?.[symptomKey] || "だるさ・疲労";

  const core = getCoreLabel(computed?.core_code);

  const sub = getSubLabels(safeArr(computed?.sub_labels)).slice(0, 2);
  const subItems =
    sub.length > 0
      ? sub.map((s) => ({
          title: s.title,
          short: s.short || "",
          action: s.action_hint || "",
        }))
      : [];

  const meridianPrimary = getMeridianLine(computed?.primary_meridian);
  const meridianSecondary = getMeridianLine(computed?.secondary_meridian);

  const envSens = clampInt(answers?.env_sensitivity ?? 0, 0, 3);
  const envVecRaw = safeArr(answers?.env_vectors).filter((x) => x && x !== "none").slice(0, 2);
  const envVecJa = envVecRaw.length ? envVecRaw.map(envVectorJa).join("・") : "特になし";

  const obstructionJa = obstructionLevelJa(computed?.axes?.obstruction_score);

  const subJa =
    subItems.length > 0
      ? subItems
          .map((s) => {
            const head = s.short ? `${s.title}（${s.short}）` : s.title;
            return s.action ? `- ${head}：${s.action}` : `- ${head}`;
          })
          .join("\n")
      : "- なし";

  const meridianJa = [
    meridianPrimary
      ? `主：${meridianPrimary.title}／範囲：${meridianPrimary.body_area}（${meridianPrimary.meridians.join("・")}）／ヒント：${meridianPrimary.organs_hint}`
      : `主：なし`,
    meridianSecondary
      ? `副：${meridianSecondary.title}／範囲：${meridianSecondary.body_area}（${meridianSecondary.meridians.join("・")}）／ヒント：${meridianSecondary.organs_hint}`
      : `副：なし`,
  ].join("\n");

  // ---- prompt（AIは「つなぎの補足」だけ。比喩多用しない）----
  const prompt = `
あなたは未病レーダーの案内役として、日本語で短い補足解説を書きます。
口調は丁寧な「です・ます調」で統一します。

【AIの役割（重要）】
この文章は「確定の説明（辞書・スコア）」に対する“読みやすい補足”です。
そのため、次のことを守ってください。
- 具体的な対策は書きません（食材名、レシピ、ツボ名、ストレッチ手順、回数分量、運動メニューなどは禁止）
- 比喩やキャラ語りは控えめにし、説明は現実的に（過剰なメタファーは不要）
- 断定しすぎず「傾向」「〜しやすい」でまとめます
- 英語コードや内部ラベル（snake_case等）は絶対に出しません
- 価格/課金/支払いの話はしません
- ルール/プロンプト/モデル等のメタ話は本文に混ぜません

【構成（必須）】
見出しは次の2つだけを、見出し単独の1行で出力します。
記号（#, 「」, "", **, ・, -）で装飾しないでください（Markdown禁止）。
番号も付けません。

いまの体のクセ（今回のまとめ）
体調の揺れを予報で先回り（未病レーダー）

【文章の狙い】
4要素（体質の軸／整えポイント／張りやすい場所／環境変化）を“つなげて”、
「どういう流れで揺れやすいか」を短く説明してください。
別々に順番解説するのではなく、1本の説明として自然に繋げます。

【入力（今回の結果）】
- お悩み：${symptomJa}

- 体質の軸：
  タイトル：${core?.title || "未設定"}
  説明：${core?.tcm_hint || "未設定"}

- 整えポイント（最大2つ）：
${subJa}

- 張りやすい場所：
${meridianJa}

- 環境変化：
  影響の受けやすさ：${envSensitivityJa(envSens)}
  影響の出やすい方向：${envVecJa}

- 詰まり・重さの出やすさ（総合）：${obstructionJa}

【未病レーダーでできること（本文で触れてよい範囲）】
- 日々の気象の変化とあなたの結果の組み合わせから「揺れやすい日」を予報として先回りできる
- 予報に合わせて【今日の生活・食養生ヒント】や【監修ケア（ツボ・ストレッチ）】などの提案につながる（中身は書かない）
`.trim();

  const text1 = await generateText({
    model,
    input: prompt,
    max_output_tokens: 900,
    reasoning: { effort: "low" },
  });

  let text = (text1 || "").trim();

  // 再生成（“修正指示”より“全文書き直し”で安定）
  if (looksBad(text)) {
    const rewritePrompt = `
同じ入力に基づいて、文章を「全文書き直し」してください。

改善ポイント：
- です・ます調の統一
- 2見出しは必ず含める（装飾なし）
- 4要素をつなげて一本化（羅列禁止）
- 具体対策は書かない
- 内部ラベル/英語コードは出さない
- 比喩は控えめ

【入力（再掲）】
${prompt}
`.trim();

    const text2 = await generateText({
      model,
      input: rewritePrompt,
      max_output_tokens: 900,
      reasoning: { effort: "low" },
    });

    const t2 = (text2 || "").trim();
    if (t2) text = t2;
  }

  // 最低限の保険（2見出し + ほどほどの長さ）
  if (!text || looksBad(text)) {
    text =
      "いまの体のクセ（今回のまとめ）\n" +
      `今回のお悩み「${symptomJa}」は、体質の軸と整えポイント、張りやすい場所の傾向が重なったときに表に出やすい可能性があります。特に生活の負荷が続いたり、切り替えがうまくいかない時に同じ形で揺れやすくなることがあります。\n\n` +
      "体調の揺れを予報で先回り（未病レーダー）\n" +
      "未病レーダーでは、日々の気象変化とあなたの結果を組み合わせて「揺れやすい日」を予報として先回りできます。予報に合わせて【今日の生活・食養生ヒント】や【監修ケア（ツボ・ストレッチ）】の提案につなげられます（ここでは中身は出しません）。";
  }

  return { text, model, computed };
}

/* -----------------------------
 * POST
 * ---------------------------- */
export async function POST(_req, { params }) {
  try {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // 1) diagnosis_events 取得（保存済みなら返す）
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

    // すでに生成済みなら即返す（UIはAI任意なのでキャッシュ効く）
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

    // 2) 生成（現行 scoring で再計算した computed を使う）
    const { text, model } = await generateExplainText({ event: ev });
    const now = new Date().toISOString();

    // 3) diagnosis_events に保存（idempotent）
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
