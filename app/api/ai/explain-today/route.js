// app/api/ai/explain-today/route.js
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function tokyoDateISO() {
  // "YYYY-MM-DD" (Tokyo local)
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}

function levelLabel(level) {
  // あくまで自社表現（頭痛ーるの「注意/警戒」そのままは避ける）
  // 0=安定 1=注意 2=警戒 3=要対策
  if (level === 0) return "安定";
  if (level === 1) return "注意";
  if (level === 2) return "警戒";
  if (level === 3) return "要対策";
  return "不明";
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function pickSymptomJa(symptom_focus) {
  const map = {
    fatigue: "だるさ・疲労",
    sleep: "睡眠",
    mood: "気分の浮き沈み",
    neck_shoulder: "首肩のつらさ",
    low_back_pain: "腰のつらさ",
    swelling: "むくみ",
    headache: "頭痛",
    dizziness: "めまい・ふらつき",
  };
  return map[symptom_focus] || "なんとなく不調";
}

function mapSixinJa(code) {
  const map = {
    wind: "変化（風）",
    cold: "冷え",
    heat: "暑さ",
    damp: "湿気",
    dry: "乾燥",
  };
  return map[code] || code;
}

async function openaiExplain({ profile, radar, def, mainCard, foodCard }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const symptomJa = pickSymptomJa(profile?.symptom_focus);

  const topSixin = safeArray(radar?.top_sixin).slice(0, 2);
  const topSixinJa = topSixin.map(mapSixinJa);

  const prompt = `
あなたは「未病レーダー」の解説AI。日本語で、短く、読みやすく、冗長にしない。
ユーザーを不安に煽らない。医療行為ではなくセルフケア支援。専門用語（脾・湿・気虚など）は基本使わない。必要なら括弧で一言説明する程度。
構成は必ずこの順番：

1) 今日のひとこと（1行）
2) なぜそう言える？（2〜3行：天気の要点＋体質の要点）
3) 今日の一手（メインケア：1行／食の一手：1行）
4) 今日のゴール（1行）
5) 記録のコツ（1行）
6) 注意（1行：強い症状は無理しない／必要なら医療機関相談）

【ユーザーの固定情報（体質）】
- 主訴レンズ：${symptomJa}
- 体質ベクトル：qi=${profile?.qi}, blood=${profile?.blood}, fluid=${profile?.fluid}
- 寒熱：cold_heat=${profile?.cold_heat}
- 回復：resilience=${profile?.resilience}
- 体の張りやすいライン：${profile?.primary_meridian || "未設定"}

※数値は説明にそのまま出さず、日本語の言い換えで。

【今日の状態（レーダー）】
- レベル：${levelLabel(radar?.level)}
- 上位の影響：${topSixinJa.join("・") || "不明"}

【気象（今日）】
- 現在：気温 ${def?.temp ?? "?"}℃、湿度 ${def?.humidity ?? "?"}%、気圧 ${def?.pressure ?? "?"}hPa
- 24h変化：気圧 ${def?.d_pressure_24h ?? "?"}hPa、気温 ${def?.d_temp_24h ?? "?"}℃、湿度 ${def?.d_humidity_24h ?? "?"}%

【今日のカード（中身は短く使う）】
- メイン：${mainCard?.title || "未設定"}
  steps: ${JSON.stringify(mainCard?.body_steps || [])}
  cautions: ${JSON.stringify(mainCard?.cautions || [])}
- 食の一手：${foodCard?.title || "未設定"}
  steps: ${JSON.stringify(foodCard?.body_steps || [])}
  cautions: ${JSON.stringify(foodCard?.cautions || [])}

出力はプレーンテキスト。見出し記号は「今日の見立て（AI）」など自然な日本語でOK。
`.trim();

  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5.2",
      reasoning: { effort: "low" },
      input: prompt,
      max_output_tokens: 500,
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`OpenAI error: ${resp.status} ${t}`);
  }

  const json = await resp.json();
  // Responses API: output_text がある場合が多い
  const text =
    json.output_text ||
    (Array.isArray(json.output)
      ? json.output
          .flatMap((o) => o.content || [])
          .filter((c) => c.type === "output_text")
          .map((c) => c.text)
          .join("\n")
      : "");

  return (text || "").trim();
}

export async function POST(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const date = tokyoDateISO();

    // 1) latest constitution
    const { data: profile, error: e0 } = await supabaseServer
      .from("constitution_profiles")
      .select("user_id, symptom_focus, qi, blood, fluid, cold_heat, resilience, primary_meridian, secondary_meridian, version, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (e0) throw e0;

    if (!profile) {
      return NextResponse.json({
        data: {
          text: "体質情報はまだ未設定です（体質チェックで精度が上がります）。",
          date,
        },
      });
    }

    // 2) today radar + external factors
    const { data: radar, error: e1 } = await supabaseServer
      .from("daily_radar")
      .select("level, top_sixin, recommended_main_card_id, recommended_food_card_id, reason_text")
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

    // 3) cards (service role想定。RLSでcare_cardsは直接select不可なので、supabaseServerがservice-roleである必要あり)
    let mainCard = null;
    let foodCard = null;

    if (radar?.recommended_main_card_id) {
      const { data, error } = await supabaseServer
        .from("care_cards")
        .select("id,title,kind,body_steps,cautions")
        .eq("id", radar.recommended_main_card_id)
        .maybeSingle();
      if (error) throw error;
      mainCard = data || null;
    }

    if (radar?.recommended_food_card_id) {
      const { data, error } = await supabaseServer
        .from("care_cards")
        .select("id,title,kind,body_steps,cautions")
        .eq("id", radar.recommended_food_card_id)
        .maybeSingle();
      if (error) throw error;
      foodCard = data || null;
    }

    // 4) generate
    const text = await openaiExplain({ profile, radar, def, mainCard, foodCard });

    return NextResponse.json({
      data: {
        date,
        text,
        used: {
          has_profile: true,
          has_radar: Boolean(radar),
          has_def: Boolean(def),
          has_main_card: Boolean(mainCard),
          has_food_card: Boolean(foodCard),
        },
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
