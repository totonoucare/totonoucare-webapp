// app/api/diagnosis/v2/events/[id]/explain/route.js
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { generateText } from "@/lib/openai/server";
import { SYMPTOM_LABELS, getCoreLabel, getSubLabels, getMeridianLine } from "@/lib/diagnosis/v2/labels";

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
  return map[v] || v;
}

/**
 * ざっくり品質検知（強すぎる検閲はやめる）
 * - 英コード漏れ、見出し逸脱、プロンプト文言漏れ、過度な箇条書き命令の残骸などを軽く検知
 */
function looksBad(text) {
  if (!text) return true;

  // 英語コード / snake_case
  const hasSnake = /[a-z]+_[a-z]+/.test(text);

  // 見出しが2つあるか（両方の「」が存在するか）
  const hasHead1 = text.includes("「いまの体のクセ（今回のまとめ）」");
  const hasHead2 = text.includes("「体調の揺れを予報で先回り（未病レーダー）」");
  const missingHeads = !(hasHead1 && hasHead2);

  // メタ漏れ（ルールや禁止など）
  const hasMetaLeak = /絶対|禁止|出力|プロンプト|モデル|トークン|max_output/i.test(text);

  // 露骨な箇条書き命令の残骸
  const hasInstructionLeak = /必ずこの|見出しは|番号は付けない/.test(text);

  return hasSnake || missingHeads || hasMetaLeak || hasInstructionLeak;
}

async function generateExplainText({ event }) {
  const model = process.env.OPENAI_DIAG_EXPLAIN_MODEL || "gpt-5.2";

  const answers = event?.answers || {};
  const computed = event?.computed || {};

  // ---- 日本語素材に整形 ----
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

  // 「素材」を“説明しやすい形”で渡す（英コードは渡さない）
  const subJa =
    subItems.length > 0
      ? subItems
          .map((s) => {
            const parts = [s.title];
            if (s.short) parts.push(`（${s.short}）`);
            const head = parts.join("");
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

  // ---- prompt（縛りは最小限、品質要件を強める）----
  const prompt = `
あなたは未病レーダーの案内役「トトノウくん」🤖として、日本語で文章を書きます。
口調は丁寧な「です・ます調」で統一し、語尾のブレ（〜だ／〜である）は混ぜません。
読み物として自然で、途中で雑に感じない文章にします（接続が滑らかで、読了感がある）。

【今回の目的】
次の4要素（体質の軸／整えポイント／張りやすい場所／環境変化）を、お悩みと絡めて“統合”し、
「どういう流れで揺れやすいか」を因果っぽく説明してください。
※4要素を別々に順番解説するのは禁止です。必ず「つながり」を作って一本の説明にしてください。

【書き方のコツ（重要）】
- 「AがあるのでBになりやすく、そこにCが重なるとDとして出やすい」など、過不足なく繋げます。
- 飛躍しすぎず、断定もしません（〜の傾向／〜しやすい）。
- 具体的な対策（食材名、レシピ、ツボ名、ストレッチ手順、回数分量、運動メニュー）は書きません。
  ただし未病レーダーで「生活のコツ＋食養生（同じ枠）」や「鍼灸師監修のツボケア＆ストレッチ」の提案が“受けられる”ことは触れてOKです（中身は書かない）。

【禁止】
- 英語コード・snake_case・内部ラベルを出さない
- 価格/課金/支払いの話をしない
- ルールやプロンプトなどのメタな話を本文に混ぜない

【出力形式】
見出しは次の2つだけ。必ず「」付き。番号は付けません。
「いまの体のクセ（今回のまとめ）」
「体調の揺れを予報で先回り（未病レーダー）」
最後の注意文は付けません（出力しない）。

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

【未病レーダーでできること（本文で触れてよい範囲）】
- 日々の気象の変化とあなたの体質の組み合わせから「揺れやすい日」を予報として先回りできる
- 予報に合わせて「生活のコツ＋食養生（同じ枠）」や「鍼灸師監修のツボケア＆ストレッチ」などの対策提案につながる
`.trim();

  const text1 = await generateText({
    model,
    input: prompt,
    max_output_tokens: 1400,
    reasoning: { effort: "low" },
  });

  let text = (text1 || "").trim();

  // ざっくり再生成（“修正指示”ではなく“書き直し”で質を上げる）
  if (looksBad(text) || text.length < 350) {
    const rewritePrompt = `
同じ入力に基づいて、文章を「全文書き直し」してください。

改善したい点：
- です・ます調の統一（混ざらない）
- 2つの見出しの文章に読了感を出す（雑に繋げた印象をなくす）
- 4要素を統合して因果っぽく説明（別々に並べない）
- 具体対策は書かない（提案が“ある”ことだけ触れる）

【入力（再掲）】
${prompt}
`.trim();

    const text2 = await generateText({
      model,
      input: rewritePrompt,
      max_output_tokens: 1400,
      reasoning: { effort: "low" },
    });

    const t2 = (text2 || "").trim();
    if (t2) text = t2;
  }

  // 最低限の保険
  if (!text) {
    text =
      "「いまの体のクセ（今回のまとめ）」\n今の結果からは、お悩みが出るときに「体の土台」「整えの方向」「張りやすい場所」「環境の揺れ」が重なりやすい傾向が見えます。いくつかの条件が同時に重なるほど、同じ負担でも体調の揺れとして表に出やすいタイプかもしれません。\n\n「体調の揺れを予報で先回り（未病レーダー）」\n未病レーダーでは、日々の気象変化とあなたの体質の組み合わせから、揺れやすいタイミングを予報として捉えて先回りできます。さらに予報に合わせて、生活のコツ＋食養生や、鍼灸師監修のツボケア＆ストレッチなどの提案につなげられます。";
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
