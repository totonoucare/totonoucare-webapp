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
  return map[v] || v;
}

/**
 * 出力品質の最低限チェック
 * - 英コード漏れ / 指示文漏れ / 具体対策や医療っぽい断定をざっくり検知
 */
function looksBad(text) {
  if (!text) return true;

  // snake_case / 英コードっぽいもの（診断ラベルや経絡コード漏れ）
  const hasSnake = /[a-z]+_[a-z]+/.test(text);

  // 箇条書きの指示文っぽい残骸
  const hasInstructionLeak =
    /必ず|ルール|見出し|出力フォーマット|禁止/.test(text);

  // 具体対策っぽい単語（強すぎる禁止語は避け、最低限だけ）
  const hasConcreteCare =
    /ツボ|経穴|レシピ|食材|ストレッチ|筋トレ|何回|秒|分|セット|mg|サプリ/.test(text);

  // 見出しが2つ以外に増えてそう（「」が3つ以上）
  const quoteHeads = (text.match(/「/g) || []).length;
  const tooManyHeads = quoteHeads >= 3;

  return hasSnake || hasInstructionLeak || hasConcreteCare || tooManyHeads;
}

async function generateExplainText({ event }) {
  const model = process.env.OPENAI_DIAG_EXPLAIN_MODEL || "gpt-5.2";

  const answers = event?.answers || {};
  const computed = event?.computed || {};

  // ---- UIに出したい日本語へ“先に”変換 ----
  const symptomKey = answers?.symptom_focus || event?.symptom_focus || "fatigue";
  const symptomJa = SYMPTOM_LABELS?.[symptomKey] || "だるさ・疲労";

  const core = getCoreLabel(computed?.core_code);

  const sub = getSubLabels(safeArr(computed?.sub_labels)).slice(0, 2);
  const subJa =
    sub.length > 0
      ? sub
          .map((s) => `- ${s.title}${s.short ? `（${s.short}）` : ""}${s.action_hint ? `：${s.action_hint}` : ""}`)
          .join("\n")
      : "- なし";

  const meridianPrimary = getMeridianLine(computed?.primary_meridian);
  const meridianSecondary = getMeridianLine(computed?.secondary_meridian);

  const meridianJa = [
    meridianPrimary
      ? `主：${meridianPrimary.title}／範囲：${meridianPrimary.body_area}（${meridianPrimary.meridians.join("・")}）／ヒント：${meridianPrimary.organs_hint}`
      : `主：なし`,
    meridianSecondary
      ? `副：${meridianSecondary.title}／範囲：${meridianSecondary.body_area}（${meridianSecondary.meridians.join("・")}）／ヒント：${meridianSecondary.organs_hint}`
      : `副：なし`,
  ].join("\n");

  const envSens = clampInt(answers?.env_sensitivity ?? 0, 0, 3);
  const envVecRaw = safeArr(answers?.env_vectors).filter((x) => x && x !== "none").slice(0, 2);
  const envVecJa = envVecRaw.length ? envVecRaw.map(envVectorJa).join("・") : "特になし";

  // ---- prompt（今回の要件：4要素を統合して因果っぽく）----
  const prompt = `
あなたは未病レーダーの案内役「トトノウくん」🤖。
優しいが媚びない。煽らない。断定しない（〜の傾向／〜しやすい）。
医療ではなくセルフケア支援。

【最重要要件（ここは絶対）】
- 「体質の軸」「整えポイント」「張りやすい場所」「環境変化」を“別々に解説しない”。
  → 4つをつなげて、お悩みが起きやすい流れを「因果っぽく」1本の説明に統合する。
  → 例：A（体質の軸）＋B（整えポイント）＋C（張りやすい場所）＋D（環境） が重なると、お悩みが出やすい…という“つながり”を必ず作る。
- 同じ内容の言い換えで水増ししない。読み物として気持ちよく。

【絶対禁止】
- 英語コード・snake_case・内部ラベル名を一切出さない。
- 具体的な対策の提示（食材名/レシピ/ツボ名/ストレッチ手順/回数分量/運動メニュー）を一切書かない。
  ※対策は「レーダーで提案される」と“存在”だけ触れてOK。中身は書かない。
- 価格/課金/支払いの話はしない（UIが案内する）。
- 指示文やメタ説明（ルール、構成、〜行で等）を本文に混ぜない。

【出力】
見出しは次の2つだけ。必ず「」付き。番号は付けない。
「いまの体のクセ（今回のまとめ）」
「体調の揺れを予報で先回り（未病レーダー）」
最後に1行だけ：※強い症状がある時は無理せず相談を。

文章量：各見出し 250〜500文字くらい。長すぎない。

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
- 日々の気象（気圧/気温/湿度など）の変化と、あなたの体質の組み合わせから、
  “どんな日に揺れやすいか”を予報として先回りできる。
- さらに、予報に合わせて「生活のコツ＋食養生（同じ枠）」や「鍼灸師監修のツボケア＆ストレッチ」などの対策提案に繋がる。
  ※ただし本文では具体策の中身は出さない（存在と価値だけ）。

自然な日本語で。`.trim();

  // 1st try
  const text1 = await generateText({
    model,
    input: prompt,
    max_output_tokens: 1100,
    reasoning: { effort: "low" },
  });

  let text = (text1 || "").trim();

  // light retry if leaks detected / too short
  if (looksBad(text) || text.length < 250) {
    const repairPrompt = `
次の文章は、禁止事項（英コード/指示文/具体対策）が混ざっているか、統合が弱い可能性があります。
同じ入力に基づいて「全文を書き直して」ください。

【守ること】
- 見出しは2つだけ（指定の「」付き）
- 4要素を統合して因果っぽく1本の説明にする（別々に解説しない）
- 具体的な対策（食材/レシピ/ツボ/ストレッチ/回数分量）を書かない
- 英語コード/メタ指示を書かない
- 長すぎない

【入力】
${prompt}

【ダメだった文章（参考：直さないでよい）】
${text}
`.trim();

    const text2 = await generateText({
      model,
      input: repairPrompt,
      max_output_tokens: 1100,
      reasoning: { effort: "low" },
    });

    const t2 = (text2 || "").trim();
    if (t2) text = t2;
  }

  // 最低限の保険（空の場合）
  if (!text) {
    text =
      "「いまの体のクセ（今回のまとめ）」\n今の結果からは、お悩みが出るときに“体の土台”と“切り替え”と“張りやすい場所”と“環境の揺れ”が重なりやすい傾向が見えます。いくつかの条件が同時に重なるほど、同じ負担でも症状として表に出やすくなるタイプかもしれません。\n\n「体調の揺れを予報で先回り（未病レーダー）」\n未病レーダーでは、日々の気象変化とあなたの体質の組み合わせから、揺れやすいタイミングを予報として捉えて先回りできます。調子が落ちてから頑張るのではなく、前ぶれに気づける形にしていくのが強みです。\n\n※強い症状がある時は無理せず相談を。";
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
